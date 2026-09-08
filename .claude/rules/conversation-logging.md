---
paths:
  - "src/conversation-logging/**"
  - "src/bot/teams-activity-handler.ts"
  - "src/database/schema/bot-adapter.schema.ts"
---

## Every Teams turn is persisted for observability, off the reply's critical path

`ConversationLoggingService.logTurn`
([conversation-logging.service.ts](../../src/conversation-logging/conversation-logging.service.ts))
writes the user, conversation, and LLM call (status, usage, latency, tool
calls) into the `bot_adapter.*` tables (see §6 of
[ARCHITECTURE.md](../../docs/ARCHITECTURE.md) and
[bot-adapter.schema.ts](../../src/database/schema/bot-adapter.schema.ts)) —
a separate Postgres schema from the introspected `public` tables,
hand-authored rather than pulled. `logTurn` never throws, so call it
fire-and-forget from `BotActivityHandler` rather than awaiting it on the
reply path.
