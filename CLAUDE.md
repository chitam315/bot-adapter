# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`bot-adapter` is a Microsoft Teams chatbot (NestJS) fronted by Azure Bot
Service. Replies are generated with Azure OpenAI (Vercel AI SDK), grounded by
a retrieval tool that runs a pgvector similarity search over an existing
Postgres knowledge base (Drizzle ORM). **Read
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) in full before making non-trivial
changes** — it's the canonical reference (module map, request flow, env vars,
DB schema workflow, testing conventions, deployment notes) and takes
precedence over this file for anything the two disagree on.

## Commands

```bash
npm run start:dev              # run with hot reload (port from .env, default 3000)
npm run build                  # compile to dist/
npm run lint                   # eslint --fix over src/apps/libs/test

npm test                       # unit tests (*.spec.ts, co-located with source)
npm run test:e2e               # e2e tests (test/*.e2e-spec.ts)
npm run test:cov               # unit tests with coverage
npx jest path/to/file.spec.ts                  # single unit test file
npx jest -t "test name substring"              # by test name (any file)
npx jest --config ./test/jest-e2e.json test/foo.e2e-spec.ts   # single e2e file

npm run db:pull                # introspect the live DB into src/database/schema/_generated/ (never overwrites schema.ts directly)
npm run db:push                # push schema.ts to a local/throwaway DB, no migration file
npm run db:generate            # write a migration from schema.ts vs. drizzle/ history
npm run db:migrate             # apply pending migrations (explicit release step, not run at boot)
npm run db:studio              # local Drizzle Studio GUI
```

Local dev: `cp .env.example .env`, fill in real values, then point the [Bot
Framework Emulator](https://github.com/microsoft/BotFramework-Emulator) at
`http://localhost:3000/api/messages` (leave `MICROSOFT_APP_ID` empty for
unauthenticated local testing).

## Architecture

Feature-based module layout — each feature owns its own
`*.module.ts`/`*.service.ts`/`*.controller.ts`/`*.spec.ts` in one folder
(`ai/`, `auth/`, `azure-openai/`, `bot/`, `config/`, `core/`, `database/`,
`health/`, `knowledge-base/`, `shared/`). `DatabaseModule` and `ConfigModule`
are the only modules imported by more than one feature; `ConfigModule` is the
one `@Global()` module.

**Constants are centralized, not per-module.** Every DI token (`Symbol`),
magic value, and enum lives under `src/constants/*.constants.ts`, barrel
re-exported from `src/constants/index.ts` — import from `'../constants'`
(or `'./constants'`), never a per-module constants file. When adding a new
DI token or shared literal, add it to the relevant file there (or create one)
rather than declaring it next to the class that uses it.

**Teams message flow is ACK-fast, not synchronous.**
`BotActivityHandler.handleMessage` ([teams-activity-handler.ts](src/bot/teams-activity-handler.ts))
deliberately does **not** await the LLM call — it fires a background task and
returns immediately, so `CloudAdapter` can ACK the inbound webhook POST
before the channel's own patience window elapses (~15s observed against Bot
Framework Emulator; awaiting the full turn showed as a false "send failed" on
the channel side even though the reply arrived correctly moments later). The
actual reply is delivered as a *proactive* message via
`adapter.continueConversationAsync(...)` once `GenerationService.generateReply`
resolves. Consequence: `adapter.onTurnError` no longer catches errors from
that background work — the background task has its own try/catch instead.
Keep this in mind before re-introducing an `await` on the reply-generation
path in that handler.

**RAG is a model-invoked tool, not hardcoded context.** The knowledge-base
search is registered as an AI SDK `tool()`
([knowledge-base.tool.ts](src/ai/tools/knowledge-base.tool.ts)) passed to
`generateText`; the model decides whether to call it. To add another tool,
mirror that file's pattern and register it in `ai.module.ts` behind its own
`Symbol` token from `src/constants/`.

**Two Azure OpenAI resources, one runtime-selectable chat model.**
`AzureOpenAiProvider` ([azure-openai.provider.ts](src/azure-openai/azure-openai.provider.ts))
holds two `createAzure()` clients (regions AUE and SEA — see
`AZURE_CHAT_MODEL_REGION` in `src/constants/azure-openai.constants.ts` for
which `AzureChatModel` lives where); `GenerationService.generateReply` takes
an optional `model` and defaults to `AppConfigService.azureOpenAi.defaultChatModel`
when omitted. Embeddings only exist in the SEA resource.

**Two separate auth guards, not one.** `JwtAuthGuard`
([jwt-auth.guard.ts](src/auth/jwt-auth.guard.ts)) verifies an SSO-issued JWT
from a cookie against a JWKS resolved via OIDC discovery (`SSO_ISSUER` +
`.well-known/openid-configuration`), protecting `POST /ai/generate`.
`AiaPlusAuthGuard` verifies a *different* token from a *different* cookie
against a static RSA public key (`AIA_PLUS_PUBLIC_KEY_PEM`, no discovery) for
the AIA+ integration — these are two unrelated identity sources with their
own cookie names and `request.user`/`request.aiaPlusUser` fields; don't
conflate or reuse one guard for the other's route. Both log at each
verification step (`PinoLogger` `.debug`/`.warn`) since a bad token otherwise
just looks like a generic 401.

**Config is zod-validated and centrally typed.** `envSchema`
([env.schema.ts](src/config/env.schema.ts)) fails fast at boot on a missing/
malformed var. Never read `process.env` directly outside that file — go
through `AppConfigService`'s grouped getters (`.database`, `.botFramework`,
`.azureOpenAi`, `.sso`, `.aiaPlus`, etc.). Azure Key Vault resolution
([key-vault-secrets.loader.ts](src/azure-key-vault/key-vault-secrets.loader.ts))
must run and resolve *before* `AppModule` is ever imported — `main.ts` awaits
it, then dynamically `import()`s `AppModule`, because `@nestjs/config`'s env
validation runs synchronously at that module's import time.

**Testing gotchas** (see docs/ARCHITECTURE.md §12 for the full list):
- `ai`, `@ai-sdk/azure`, and `pgvector` are ESM-only; Jest can't load them
  directly, so root-level manual mocks in [`__mocks__/`](__mocks__/) are
  applied automatically to every spec. A spec needing call-specific
  assertions overrides individual exports with its own `jest.mock(...)`.
- e2e specs (`test/*.e2e-spec.ts`) boot the full `AppModule` and override
  `PG_POOL`/`DRIZZLE` (no real Postgres needed) and whatever else would
  otherwise make a real network call (`GenerationService`, `BOT_ADAPTER`,
  `JwtAuthGuard`). `test/jest-env.setup.ts` seeds dummy required env vars for
  both unit and e2e configs.
- A mock object with a `.then` method gets silently unwrapped by Nest's DI
  when used as a `useValue` (treated as a thenable) — give the *terminal*
  method of a chained mock (e.g. Drizzle's `.limit()`) the Promise-returning
  implementation, not the whole chain object.
