---
paths:
  - "src/bot/**"
---

## Teams message flow is ACK-fast, not synchronous

`BotActivityHandler.handleMessage`
([teams-activity-handler.ts](../../src/bot/teams-activity-handler.ts))
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
