`bot-adapter` is a Microsoft Teams chatbot (NestJS) fronted by Azure Bot
Service. Replies are generated with Azure OpenAI (Vercel AI SDK), grounded by
a retrieval tool that runs a pgvector similarity search over an existing
Postgres knowledge base (Drizzle ORM). **Read
[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) in full before making
non-trivial changes** — it's the canonical reference (module map, request
flow, env vars, DB schema workflow, testing conventions, deployment notes)
and takes precedence over `.claude/rules/` for anything the two disagree on.
