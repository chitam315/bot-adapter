# Architecture

`bot-adapter` is a Microsoft Teams chatbot fronted by Azure Bot Service. It
retrieves answers from an existing Postgres knowledge base (FAQ/document
tables with pgvector embeddings) and generates replies with Azure OpenAI via
the Vercel AI SDK.

The folder structure follows a **feature-based module** layout (each feature
owns its own `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.spec.ts`),
as described in
[encore.dev's NestJS project structure guide](https://encore.dev/articles/nestjs-project-structure-best-practices).
The short version: a change to one feature touches one folder, not four
parallel `controllers/`/`services/`/`dtos/` trees.

If you're new to this repo, read this document once end to end — it's the
map for everything below.

## 1. Module map

```
ConfigModule (global) ─┐
                        ├─ DatabaseModule ─┐
CoreModule (App-only) ──┘                  ├─ KnowledgeBaseModule ─┐
                                            │                       ├─ AiModule ─ BotModule
AzureOpenAiModule ──────────────────────────┴───────────────────────┘
SharedModule (App-only, APP_FILTER/APP_INTERCEPTOR)
HealthModule ── DatabaseModule
```

| Module | Responsibility |
|---|---|
| `config/` | Env var loading + validation (zod), typed `AppConfigService` |
| `core/` | Boots structured logging; runs a boot-time DB connectivity check. Imported only by `AppModule`. |
| `shared/` | Global HTTP exception filter + logging interceptor |
| `database/` | Drizzle client, Postgres pool, table schema |
| `health/` | `GET /health` (Terminus) |
| `azure-openai/` | Azure OpenAI provider (Vercel AI SDK) + embedding generation |
| `knowledge-base/` | pgvector similarity search over `embeddings`/`documentPages`/`documents`/`faqs` |
| `ai/` | LLM generation orchestration; wraps knowledge-base search as a model-invoked tool |
| `bot/` | Bot Framework adapter, Teams activity handler, `POST /api/messages` |

**Why `AzureOpenAiModule` has zero dependents on other feature modules:**
`EmbeddingService` lives there instead of inside `KnowledgeBaseModule`. If it
lived in `KnowledgeBaseModule`, you'd get `AiModule → KnowledgeBaseModule`
(for the search tool) and `KnowledgeBaseModule → AiModule` (for embeddings) —
a circular module dependency. Keeping `AzureOpenAiModule` a leaf breaks that
cycle. Keep this in mind if you're tempted to move embedding logic "closer"
to where it's used.

`DatabaseModule` is deliberately **not** `@Global()` — it's imported
explicitly wherever it's needed (`CoreModule`, `KnowledgeBaseModule`,
`HealthModule`). Nest treats module imports as DI singletons regardless of
how many modules import them, so this costs nothing at runtime, and it keeps
`@Global()` reserved for things that are genuinely needed everywhere
(`ConfigModule` is the one intentional exception, matching `@nestjs/config`'s
own `isGlobal` convention).

## 2. How a Teams message flows through the system

1. Azure Bot Service POSTs an `Activity` to `POST /api/messages`
   ([bot.controller.ts](../src/bot/bot.controller.ts)).
2. The controller hands the raw request/response to
   `CloudAdapter.process(req, res, ...)`
   ([bot-framework-adapter.provider.ts](../src/bot/bot-framework-adapter.provider.ts)),
   which validates the Bot Framework JWT before anything else runs.
3. `BotActivityHandler.onMessage`
   ([teams-activity-handler.ts](../src/bot/teams-activity-handler.ts)) sends a
   `typing` activity, then loads recent conversation history from
   `ConversationState` (backed by in-memory `Storage`, see §8).
4. `GenerationService.generateReply`
   ([generation.service.ts](../src/ai/generation.service.ts)) calls the AI
   SDK's `generateText` against the Azure OpenAI chat deployment, with the
   knowledge-base search registered as a **tool** the model can choose to call.
5. If the model calls the tool, `KnowledgeBaseService.search`
   ([knowledge-base.service.ts](../src/knowledge-base/knowledge-base.service.ts))
   embeds the query, runs a pgvector `cosineDistance` query against
   `embeddings`, and joins `document`/`faq` for citation metadata.
6. The tool result feeds back into the model, which produces a final answer
   (possibly after further tool rounds, capped by `MAX_STEPS`).
7. `GenerationService` returns the full text (not a stream — see §7);
   the handler saves the updated history and sends **one** final
   `sendActivity` reply.

## 3. RAG as a model-invoked tool, not hardcoded context

The knowledge-base search is registered as an AI SDK `tool()`
([knowledge-base.tool.ts](../src/ai/tools/knowledge-base.tool.ts)), not
prepended to every prompt. The model decides whether a question needs
grounding in internal docs/FAQs before calling it. This keeps irrelevant
retrieval out of simple conversational turns and gives the model room to ask
follow-up tool calls if the first search doesn't answer the question.

**To add a new tool:**
1. Write a factory function returning `tool({ description, inputSchema: z.object({...}), execute })` (see `knowledge-base.tool.ts` for the pattern).
2. Register it as a provider in `ai.module.ts` behind its own `Symbol` token (see `KNOWLEDGE_BASE_TOOL` in [ai.constants.ts](../src/ai/ai.constants.ts)).
3. Inject it into `GenerationService` and add it to the `tools: {...}` map passed to `generateText`.

Write the `description` for the *model*, not for a human reader — it's the
only signal the model has for deciding when to call the tool.

## 4. Why Teams gets one final message, not streaming

Teams (via the Bot Framework Connector) doesn't support token-by-token
streaming into a single message the way a browser SSE chat UI does. The only
approximation is repeated `context.updateActivity` edits against a
previously-sent activity, which is a visible flicker rather than smooth
rendering, must be rate-limited (~1/sec) to avoid Connector throttling, and
behaves inconsistently across Teams clients.

This scaffold's default: **await `generateText` fully server-side, send
exactly one `sendActivity` reply**, relying on the `typing` indicator for
"it's working" feedback. `GenerationService.generateReply` deliberately
returns `Promise<string>` rather than a stream, which keeps the door open to
add incremental `updateActivity` sends later entirely inside
`GenerationService`/`teams-activity-handler.ts`, without touching anything
upstream.

## 5. Adding a new feature module

Follow the pattern of any existing module (e.g. `knowledge-base/`). Use the
Nest CLI:

```bash
nest g module my-feature
nest g service my-feature
nest g controller my-feature   # only if it exposes HTTP endpoints
```

Then:
- If it needs the database, `imports: [DatabaseModule]` and inject `DRIZZLE` (or `PG_POOL` for raw SQL) from [database.constants.ts](../src/database/database.constants.ts).
- If it exposes an HTTP endpoint with a request body, validate it with a zod schema (see §9 — this repo uses zod uniformly, not `class-validator`).
- Add unit specs co-located as `*.spec.ts`. Only add e2e coverage in `test/` if the feature needs a full app boot to test meaningfully (e.g. it's a new HTTP endpoint).
- Wire the module into `AppModule` only if nothing else already imports it transitively — check the module map in §1 first.

## 6. Database schema: introspect vs. hand-author

[src/database/schema/schema.ts](../src/database/schema/schema.ts) is
introspected from the real production database via `npm run db:pull` — not
hand-authored. It mirrors the *full* database (27 tables as of the last
pull — `users`, `chats`, `messages`, `documents`, `documentPages`, `faqs`,
`embeddings`, and others belonging to the wider application that owns this
database). `bot-adapter` itself only ever queries `documents`,
`documentPages`, `faqs`, and `embeddings` (see
[KnowledgeBaseService](../src/knowledge-base/knowledge-base.service.ts)) —
the rest is kept for local-DB parity with production, not because this app
reads or writes it.

**Re-syncing when the real schema changes** (see
[src/database/schema/README.md](../src/database/schema/README.md) for the
full version):

```bash
DATABASE_URL="postgres://..." npm run db:pull   # introspects into src/database/schema/_generated/, never touches schema.ts directly
# diff _generated/schema.ts against schema.ts, port over what changed
# delete src/database/schema/_generated/ once done
```

`db:pull` never overwrites `schema.ts` directly — it stages into
`_generated/` so this stays a reviewed diff, not a blind overwrite.

**Applying `schema.ts` to a database** — two options, both driven by
whatever `DATABASE_URL` points at:

```bash
npm run db:push        # diffs schema.ts against the target DB's actual structure, applies directly — no migration file. Good for a local/throwaway DB (e.g. this repo's docker-compose Postgres).
npm run db:generate    # diffs schema.ts against drizzle/ migration history, writes SQL
npm run db:migrate     # applies pending migrations — use this + db:generate for staging/production, where a reviewable migration trail matters
npm run db:studio      # local GUI for browsing the DB
```

Run `db:migrate` as an explicit release step, not automatically at app boot.

## 7. Environment variables

Copy `.env.example` to `.env` and fill in real values before running
anything — `ConfigModule` validates all of these at boot via
[env.schema.ts](../src/config/env.schema.ts) and **fails fast with a readable
error** if a required var is missing or malformed, rather than crashing
obscurely later when a value is first read.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | no (default `development`) | `development` \| `production` \| `test` |
| `PORT` | no (default `3000`) | HTTP port |
| `LOG_LEVEL` | no (default `info`) | Pino level |
| `DATABASE_URL` | **yes** | Postgres connection string |
| `MICROSOFT_APP_ID` | no (default empty) | Empty = unauthenticated/emulator mode; required for real Teams traffic |
| `MICROSOFT_APP_PASSWORD` | no (default empty) | Paired with `MICROSOFT_APP_ID` |
| `MICROSOFT_APP_TYPE` | no (default `MultiTenant`) | `MultiTenant` \| `SingleTenant` \| `UserAssignedMSI` |
| `MICROSOFT_APP_TENANT_ID` | no (default empty) | Required for `SingleTenant` |
| `AZURE_OPENAI_ENDPOINT` | **yes** | AUE resource URL, e.g. `https://<resource-name>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | **yes** | |
| `AZURE_OPENAI_GPT_4_1_DEPLOYMENT` | **yes** | Deployment name, not model name |
| `AZURE_OPENAI_GPT_5_DEPLOYMENT` | **yes** | Deployment name, not model name |
| `AZURE_OPENAI_O4_MINI_DEPLOYMENT` | **yes** | Deployment name, not model name |
| `AZURE_OPENAI2_ENDPOINT` | **yes** | SEA resource URL |
| `AZURE_OPENAI2_API_KEY` | **yes** | |
| `AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT` | **yes** | Deployment name, not model name |
| `AZURE_OPENAI2_GPT_5_1_DEPLOYMENT` | **yes** | Deployment name, not model name |
| `AZURE_OPENAI2_EMBEDDING_DEPLOYMENT` | **yes** | Deployment name for `text-embedding-3-large`, the only embedding model deployed |
| `AZURE_OPENAI_DEFAULT_CHAT_MODEL` | no (default `gpt-4.1`) | One of `gpt-4.1` \| `gpt-5` \| `o4-mini` \| `gpt-4.1-mini` \| `gpt-5.1`; used when a caller doesn't pick a model at runtime |
| `SSO_ISSUER` | **yes** | OIDC issuer URL; `JwtAuthGuard` fetches `{SSO_ISSUER}/.well-known/openid-configuration` to find the JWKS |
| `SSO_CLIENT_ID` | **yes** | Expected `aud` claim on the verified token |
| `SSO_COOKIE_NAME` | no (default `idToken`) | Cookie `JwtAuthGuard` reads the bearer token from (not the `Authorization` header) |
| `AIA_PLUS_PUBLIC_KEY_PEM` | **yes** | RSA public key (SPKI/PEM) `AiaPlusAuthGuard` verifies tokens against — a fixed key, not a JWKS; see `AiaPlusJwtVerifierService`. Real multi-line PEM or literal `\n` both work |
| `AIA_PLUS_COOKIE_NAME` | no (default `myaiaAccessToken`) | Cookie `AiaPlusAuthGuard` reads the AIA+ token from |
| `AZURE_KEY_VAULT_URL` | no | Set to enable Key Vault secret resolution — see below |
| `AZURE_KEY_VAULT_TENANT_ID` | no | Required together with the other three `AZURE_KEY_VAULT_*` vars |
| `AZURE_KEY_VAULT_CLIENT_ID` | no | Service principal client ID |
| `AZURE_KEY_VAULT_CLIENT_SECRET` | no | Service principal client secret |

Never read `process.env` directly outside of `env.schema.ts` — go through
`AppConfigService`'s grouped getters (`.database`, `.botFramework`,
`.azureOpenAi`, etc.) instead, so every consumer stays typed and there's one
place that knows the actual env var names.

### Azure Key Vault fallback

The four `AZURE_KEY_VAULT_*` vars are optional as a group — leave all four
empty/unset to skip Key Vault entirely and resolve every value from `.env` /
`process.env` as normal. If you set any one of them, you must set all four
(validated by [key-vault-env.schema.ts](../src/azure-key-vault/key-vault-env.schema.ts));
this is checked separately from, and before, the main `env.schema.ts`
validation described above.

When enabled, [key-vault-secrets.loader.ts](../src/azure-key-vault/key-vault-secrets.loader.ts)
authenticates with a `ClientSecretCredential` and looks up a fixed list of
secrets by name (`DATABASE_URL` → `database-url`, `MICROSOFT_APP_PASSWORD` →
`microsoft-app-password`, `AZURE_OPENAI_API_KEY` →
`azure-openai-api-key`, `AZURE_OPENAI2_API_KEY` →
`azure-openai2-api-key` — Key Vault secret names can't contain
underscores, hence the kebab-case mapping). **Key Vault wins for any secret
it has; a secret Key Vault doesn't
have quietly falls back to whatever's already in `.env`/`process.env`.** A
real Key Vault error (auth failure, network error, wrong permissions) is
*not* swallowed the same way — it throws and aborts boot, since Key Vault
was explicitly configured and a real failure there usually means a broken
deployment, not an absent optional secret. Add more entries to
`SECRET_NAME_BY_ENV_KEY` in that file if you want additional values sourced
from the vault.

**This has to run before `AppModule` is imported, not inside Nest's own
bootstrap lifecycle.** `@nestjs/config`'s `validate` option (wired in
`config.module.ts`) runs synchronously as an import-time side effect of that
file's `@Module()` decorator — by the time any Nest lifecycle hook could run,
env validation has already happened against whatever was in `process.env` at
import time. [main.ts](../src/main.ts) works around this by awaiting
`loadKeyVaultSecrets()` and only then dynamically `import()`-ing `AppModule`,
so Key Vault secrets are already in `process.env` before `config.module.ts`
is ever loaded. Keep this ordering in mind if you refactor `main.ts` — moving
the `AppModule` import back to a static top-level import would silently skip
Key Vault resolution.

## 8. Bot Framework state

Conversation/user state uses `MemoryStorage`
([memory-storage.provider.ts](../src/bot/storage/memory-storage.provider.ts))
— it resets on restart/redeploy. `BOT_STORAGE` is typed as botbuilder's
`Storage` interface, so swapping in a durable implementation (Blob storage,
Cosmos DB) later is a one-file change: replace the `useValue` in that file,
nothing else references `MemoryStorage` directly.

## 9. Validation: zod everywhere

This repo uses **zod** uniformly — for env validation, AI SDK tool input
schemas, and (via `drizzle-zod`, once installed schema is reconciled) DB-shape
validation — instead of `class-validator`/`class-transformer`. This is a
deliberate deviation from some NestJS conventions: one validation library
end-to-end was judged more valuable than matching every NestJS starter's
default, given this service currently has no DTO-bearing HTTP endpoints (the
Bot Framework Activity schema is validated by `botbuilder` itself, and
`/health` has no body). If a future endpoint needs request validation, use
`nestjs-zod`'s `createZodDto`/`ZodValidationPipe` rather than introducing
`class-validator` as a second ecosystem.

## 10. Logging conventions

Structured logging via `nestjs-pino`, wired in
[core.module.ts](../src/core/core.module.ts):
- Every HTTP request/response is logged automatically by `pino-http`.
- A correlation ID (`x-correlation-id` header, or a generated UUID) is
  attached to every request as `req.id` and appears in every log line for
  that request — use it to trace one Teams turn through retrieval and the
  LLM call.
- `LoggingInterceptor` ([logging.interceptor.ts](../src/shared/interceptors/logging.interceptor.ts))
  adds a debug-level line per handler invocation, scoped to the
  controller/method name — use this to spot which handler is slow, not to
  duplicate what `pino-http` already logs.
- Inject `PinoLogger` (from `nestjs-pino`) into any service that needs to
  log, and call `.setContext(MyService.name)` in the constructor.
- **Never log:** secrets, full request bodies containing user PII, or raw
  embedding vectors. `core.module.ts` wires pino-http's `redact` option
  (paths + censor) from [logging.constants.ts](../src/constants/logging.constants.ts)
  — add a path there if you introduce another header/field carrying secrets.

## 11. Error handling

Two separate paths, because they occur at different points in the request lifecycle:

- **HTTP request/response path**: any thrown error is caught by
  `GlobalExceptionFilter`
  ([global-exception.filter.ts](../src/shared/filters/global-exception.filter.ts)),
  normalized to `{ statusCode, message, correlationId, timestamp, path }`,
  and logged. Throw a standard Nest `HttpException` subclass for expected
  error cases (`BadRequestException`, etc.) — the filter extracts its message
  automatically.
- **Bot turn processing path**: once `CloudAdapter.process` hands control to
  the activity handler, an HTTP response may already be in flight, so errors
  there are caught by `adapter.onTurnError`
  ([bot-framework-adapter.provider.ts](../src/bot/bot-framework-adapter.provider.ts)),
  which logs and sends a fallback Teams message instead. `BotActivityHandler`
  additionally wraps its own `GenerationService` call in a try/catch so a
  failed LLM call degrades to a friendly in-chat message rather than a silent
  failure or an unrelated Teams-side error.

## 12. Testing conventions

- **`ai`, `@ai-sdk/azure`, and `pgvector` are ESM-only packages with no CommonJS build.** This project compiles to CommonJS (Nest's default), and while Node 22's native `require(esm)` support means the real app runs fine, Jest's own module system can't load them directly. Rather than reconfiguring the whole project for ESM (or wiring a Babel transform for just these packages — brittle, since their transitive dependency tree is deep and changes often), root-level manual mocks in [`__mocks__/`](../__mocks__/) (`ai.ts`, `@ai-sdk/azure.ts`, `pgvector/pg.ts`) are applied by Jest automatically to every spec, adjacent to `node_modules`. This also happens to be the right call anyway: unit tests should never make real LLM or Postgres-driver calls. A spec can still override an individual export with its own `jest.mock('ai', factory)` when it needs call-specific assertions (see [embedding.service.spec.ts](../src/azure-openai/embedding.service.spec.ts)) — an explicit per-file mock always takes precedence over the root-level one.
- This root-level manual-mock discovery only works when Jest's `rootDir` resolves to the actual project root (where `__mocks__/` and `node_modules` live) — **not** the directory containing whichever jest config file is active. `test/jest-e2e.json` sets `"rootDir": ".."` for exactly this reason (a JSON config file's `"."` resolves relative to *that file's own location*, i.e. `test/`, unlike `package.json`'s `"jest"` block, where `"."` already means the project root). If you ever see `SyntaxError: Cannot use import statement outside a module` pointing at one of these three packages, this is almost certainly why — check that both jest configs still resolve `rootDir` to the true project root.
- **Watch out when a test double doubles as a Nest `useValue`:** if a mock object has a `.then` method (a common trick to make a fluent builder awaitable), Nest's DI treats it as a thenable and silently unwraps it during provider resolution — the injected value ends up being whatever `.then` resolves to, not the mock object itself. Give the *terminal* method of a chained mock (e.g. Drizzle's `.limit()`) a Promise-returning implementation instead of putting `.then` on the whole chain object (see [knowledge-base.service.spec.ts](../src/knowledge-base/knowledge-base.service.spec.ts)).
- **Unit tests** (`*.spec.ts`, co-located with the code): mock the `DRIZZLE`/`PG_POOL` DI tokens for anything touching the database, and use botbuilder's own `TestAdapter` (see [teams-activity-handler.spec.ts](../src/bot/teams-activity-handler.spec.ts)) for testing activity handlers end-to-end through the real Bot Framework dispatch logic rather than hand-rolling a fake `TurnContext`.
- **e2e tests** (`test/*.e2e-spec.ts`): boot the full `AppModule`, override `PG_POOL`/`DRIZZLE` with stubs (no real Postgres required) and `GenerationService` where a real LLM call would otherwise fire. `bot-messages.e2e-spec.ts` also overrides `BOT_ADAPTER` with a stub backed by botbuilder's `TestAdapter` — `CloudAdapter`'s outbound `sendActivity` still calls the real Bot Framework Connector service even with no `MicrosoftAppId` configured, and that rejects requests from a test process; only a running Bot Framework Emulator or a real channel can complete that round-trip (see §13). `test/jest-env.setup.ts` seeds dummy required env vars so `ConfigModule`'s fail-fast validation doesn't block the app from booting under test — shared between both unit and e2e configs, since importing `config.module.ts` triggers real env validation as an import-time side effect, before any DI overrides in a spec take effect.
- Run `npm test` for unit tests, `npm run test:e2e` for e2e, `npm run test:cov` for coverage.

## 13. Local development setup

1. `cp .env.example .env` and fill in real values (§7).
2. `npm install`
3. `npm run start:dev`
4. Point the [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator) at `http://localhost:3000/api/messages` — with `MICROSOFT_APP_ID` empty, no credentials are needed for local testing.
5. To test against real Teams, expose the local server via a dev tunnel (e.g. `devtunnel` or `ngrok`) and point the Azure Bot Service registration's messaging endpoint at the tunnel URL.
6. If you need a local Postgres with pgvector for manual testing, run one via Docker (e.g. the `pgvector/pgvector:pg16` image) and point `DATABASE_URL` at it — this repo doesn't ship a `docker-compose.yml` yet; that's a reasonable next addition.

## 14. Deployment notes

- Target: Azure (App Service or Container Apps).
- Wire the platform's health probe to `GET /health`, not `GET /` — only `/health` verifies database connectivity.
- Run `npm run db:migrate` as an explicit step in your release pipeline, not automatically at app boot.
- Store secrets (both Azure OpenAI API keys, Microsoft App Password, `DATABASE_URL`) in Azure App Service application settings or Key Vault, not in a committed `.env`.
- `main.ts` calls `app.enableShutdownHooks()`, and `DatabaseModule` closes its Postgres pool on `onApplicationShutdown` — make sure your platform sends `SIGTERM` (not `SIGKILL`) on redeploy so this runs.
