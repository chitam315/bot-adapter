# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project instructions live in [`.claude/rules/`](.claude/rules/), split by topic:

- [`overview.md`](.claude/rules/overview.md) — what this project is, and the pointer to `docs/ARCHITECTURE.md`
- [`commands.md`](.claude/rules/commands.md) — build/lint/test/db commands, local dev setup
- [`architecture.md`](.claude/rules/architecture.md) — module layout, constants centralization
- [`bot-messaging.md`](.claude/rules/bot-messaging.md) — Teams message ACK-fast flow (`src/bot/**`)
- [`ai-tools.md`](.claude/rules/ai-tools.md) — RAG-as-model-invoked-tool pattern (`src/ai/**`)
- [`azure-openai.md`](.claude/rules/azure-openai.md) — dual Azure OpenAI resources/models (`src/azure-openai/**`, `src/ai/**`)
- [`auth.md`](.claude/rules/auth.md) — the two unrelated auth guards (`src/auth/**`)
- [`conversation-logging.md`](.claude/rules/conversation-logging.md) — persisting Teams turns (`src/conversation-logging/**`)
- [`config-secrets.md`](.claude/rules/config-secrets.md) — zod env validation + Key Vault boot ordering (`src/config/**`, `src/azure-key-vault/**`)
- [`testing.md`](.claude/rules/testing.md) — Jest/ESM-mocking gotchas (`**/*.spec.ts`, `test/**`)

The `overview.md`, `commands.md`, and `architecture.md` rules load every
session. The rest are path-scoped and load only when you touch matching
files.
