# Azure architecture

This is the infra-level companion to [ARCHITECTURE.md](ARCHITECTURE.md),
which covers the NestJS module/code structure. This document covers the
**Azure resources** `bot-adapter` runs against and how they authenticate
with each other — Azure Bot Service, the Azure AD App Registration, Azure
OpenAI, and Azure Database for PostgreSQL. Read this once alongside
ARCHITECTURE.md §2 (message flow) and §7 (env vars) — most of what's below
is "where does that env var actually come from, and why."

## 1. Resource topology

```
Microsoft Teams (client)
        │
        ▼
Teams service (Microsoft-hosted)
        │  Bot Framework channel
        ▼
┌───────────────────────────┐
│   Azure Bot Service        │  ← Azure resource: "Bot Service" / "Azure Bot"
│   (channel registration)   │     Owns: messaging endpoint URL, channel list
└───────────────────────────┘     (Teams, DirectLine, ...)
        │  HTTPS POST, JWT-signed
        │  using the App Registration below
        ▼
┌───────────────────────────┐
│  bot-adapter compute        │  ← App Service / Container Apps / AKS —
│  POST /api/messages         │    whatever you deploy the NestJS app to
└───────────────────────────┘
        │                    │                        │
        │ chat + embeddings  │ pgvector search +       │ Bot Framework
        │                    │ bot_adapter.* writes    │ Connector (outbound
        ▼                    ▼                         │ reply, same App
┌───────────────┐   ┌──────────────────────┐           │ Registration)
│ Azure OpenAI   │   │ Azure Database for    │          ▼
│ (AUE resource) │   │ PostgreSQL            │   (back up through Bot
│ gpt-4.1/5/     │   │ - public.* (owned by  │    Service → Teams service
│ o4-mini        │   │   another app)        │    → Teams client)
├────────────────┤   │ - bot_adapter.* (owned │
│ Azure OpenAI   │   │   by this app)         │
│ (SEA resource) │   └──────────────────────┘
│ gpt-4.1-mini/  │
│ 5.1/embedding  │
└────────────────┘

Optional: Azure Key Vault, holding DATABASE_URL / MICROSOFT_APP_PASSWORD /
Azure OpenAI API keys — see ARCHITECTURE.md §7's "Azure Key Vault fallback".
```

Four Azure resource families are involved, and only one of them
(bot-adapter's own compute) is something this repo directly controls:

| Resource | Who owns/manages it | This repo's relationship to it |
|---|---|---|
| Azure Bot Service (+ Teams channel) | Whoever registered the bot in the Azure portal | Config only — messaging endpoint URL points at this app's `/api/messages` |
| Azure AD App Registration | Same team as the Bot Service registration (they're created together) | Its App ID/Password/tenant are `MICROSOFT_APP_ID`/`MICROSOFT_APP_PASSWORD`/`MICROSOFT_APP_TENANT_ID` — see §2 |
| Azure OpenAI (× 2 resources, AUE + SEA) | Whoever provisioned the two Cognitive Services resources | Config only — endpoints/keys/deployment names, see ARCHITECTURE.md §7 and [azure-openai.md](../.claude/rules/azure-openai.md) |
| Azure Database for PostgreSQL | The *other* application that owns the `public` schema | Shares the same server — `bot_adapter` schema is this app's own, `public` is read-only from this app's point of view (see ARCHITECTURE.md §6) |

## 2. The App Registration: one identity, two directions

Azure Bot Service and bot-adapter don't trust each other directly — both
sides trust the same **Azure AD App Registration**, and use it in opposite
directions:

- **Inbound** (Teams → bot-adapter): every `POST /api/messages` from Azure
  Bot Service carries a JWT in its `Authorization` header, signed using
  that App Registration's credentials. `CloudAdapter.process()`
  ([bot-framework-adapter.provider.ts](../src/bot/bot-framework-adapter.provider.ts))
  validates that JWT via `ConfigurationBotFrameworkAuthentication` *before*
  any application code runs — a request that doesn't carry a valid token
  for this exact App ID is rejected at the framework layer, never reaching
  `BotController`.
- **Outbound** (bot-adapter → Teams): sending a reply — including the
  proactive `continueConversationAsync` send this app uses (see
  ARCHITECTURE.md §11) — means bot-adapter itself calls the **Bot Framework
  Connector service's** REST API. To be allowed to do that, it first
  acquires its own OAuth2 access token from Azure AD (client-credentials
  flow, using `MICROSOFT_APP_ID` + `MICROSOFT_APP_PASSWORD`) via
  `ConfigurationServiceClientCredentialFactory`, and attaches it as a
  Bearer token on that outbound call. `TeamsInfo.getMember` (used for the
  Teams profile enrichment in `BotActivityHandler.enrichTeamsProfile` —
  see [conversation-logging.md](../.claude/rules/conversation-logging.md))
  goes through this same authenticated Connector client.

Both directions depend on the same four env vars
(`MICROSOFT_APP_ID`/`_PASSWORD`/`_TYPE`/`_TENANT_ID`, see ARCHITECTURE.md
§7) matching what's actually configured on the Azure Bot Service resource.
**A mismatch shows up differently depending on direction**: wrong/missing
credentials break *outbound* sends (replies silently fail to leave
bot-adapter, or `TeamsInfo` calls throw — caught and logged, not fatal, per
`enrichTeamsProfile`'s design), while a Bot Service pointed at the wrong
App ID, or a messaging endpoint that doesn't match, breaks *inbound*
delivery (Azure Bot Service can't reach or won't sign requests to this
app). If either direction misbehaves, check that the same App ID/tenant is
configured in three places: the Azure Bot Service resource, the App
Registration itself, and this app's env vars — they must all agree.

Local development (`MICROSOFT_APP_ID` left empty, per ARCHITECTURE.md §13)
skips this entirely: the Bot Framework Emulator neither signs inbound
requests nor requires outbound auth, so no App Registration is involved
when testing locally.

## 3. One Teams message, end to end

Numbered against the resource diagram in §1 (code-level detail is
ARCHITECTURE.md §2 — this is the same flow with the Azure hops made
explicit):

1. User sends a message in Teams. The Teams client relays it to the Teams
   service, which forwards it to Azure Bot Service over the registered
   Teams channel.
2. Azure Bot Service POSTs the `Activity` to this app's messaging endpoint
   (`https://<your-host>/api/messages`), signed with the App Registration's
   JWT (§2, inbound).
3. `CloudAdapter` validates that JWT, `BotController` hands off to
   `BotActivityHandler`, which ACKs the webhook immediately and continues
   the real work in the background (ARCHITECTURE.md §11).
4. `GenerationService.generateReply` calls one of the two Azure OpenAI
   resources (model choice decides AUE vs. SEA — see
   [azure-openai.md](../.claude/rules/azure-openai.md)). If the model
   invokes the knowledge-base tool, `KnowledgeBaseService` embeds the query
   (SEA resource — embeddings only exist there) and runs a pgvector search
   against Azure Database for PostgreSQL's `public` schema.
5. `ConversationLoggingService` writes the user/assistant messages and the
   LLM call's telemetry into the same Postgres server's `bot_adapter`
   schema (fire-and-forget, never blocks the reply — see
   [conversation-logging.md](../.claude/rules/conversation-logging.md)).
6. The reply goes back out via `continueConversationAsync`, which calls the
   Bot Framework Connector service authenticated as the bot (§2, outbound).
7. Azure Bot Service delivers it back through the Teams service to the
   Teams client.

## 4. Azure Database for PostgreSQL: a shared server

There is **one** Postgres server, and `bot-adapter` is not the only tenant
on it — it's owned and provisioned by whoever runs the *other* application
that this bot's knowledge base comes from. Two Postgres schemas, one
connection string:

- `public` — that other app's tables (`documents`, `documentPages`, `faqs`,
  `embeddings`, and more this app never touches). Read-only from
  bot-adapter's point of view; `schema.ts` is an introspected mirror, never
  hand-edited (ARCHITECTURE.md §6).
- `bot_adapter` — this app's own tables (`users`, `conversations`,
  `messages`, `llmCalls`), hand-authored in
  [bot-adapter.schema.ts](../src/database/schema/bot-adapter.schema.ts) and
  owned exclusively by this app (see
  [database-schema.md](../.claude/rules/database-schema.md) for the
  drizzle-kit workflow around it).

Practical consequence: bot-adapter's compute needs network reachability to
that Postgres server (firewall rule, VNet peering, or private endpoint,
depending on how it's provisioned) — that's configured on the Postgres
resource, outside this repo, and worth confirming with whoever manages it
before deploying to a new environment. `DATABASE_URL` is the only thing
this repo needs to know about that setup.

## 5. Where secrets actually live

Every credential above (`MICROSOFT_APP_PASSWORD`, both Azure OpenAI API
keys, `DATABASE_URL`) is read through `AppConfigService`, sourced from
either plain environment variables or Azure Key Vault — see
ARCHITECTURE.md §7's "Azure Key Vault fallback" for exactly which secrets
Key Vault can supply and how the fallback behaves. For anything beyond
local development, prefer App Service/Container Apps "Application
Settings" backed by Key Vault references (or this repo's own
`AZURE_KEY_VAULT_*` integration) over plain env vars on the compute
resource — see ARCHITECTURE.md §14 for the deployment checklist.

## 6. What this document doesn't cover

Resource group layout, the specific compute platform chosen (App Service
vs. Container Apps vs. AKS), networking topology (VNet/private endpoints),
and monitoring (Application Insights, alerting) are all environment-specific
decisions made outside this repo. If you're setting up a new environment,
that's a checklist to work through with whoever manages the Azure
subscription — this document only covers what bot-adapter itself assumes
about those resources once they exist.
