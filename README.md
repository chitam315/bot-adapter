# bot-adapter

A Microsoft Teams chatbot on Azure Bot Service, built with NestJS. Answers
are generated with Azure OpenAI (via the Vercel AI SDK), grounded by a
retrieval tool that runs a pgvector similarity search over an existing
Postgres knowledge base (FAQ/document/embeddings tables), managed with
Drizzle ORM.

**Start here: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — module map,
how a Teams message flows through the system, environment variables, the
database schema reconciliation workflow, testing conventions, and how to add
a new feature module.

## Quick start

```bash
cp .env.example .env   # fill in real values — see docs/ARCHITECTURE.md §7
npm install
npm run start:dev
```

Point the [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator)
at `http://localhost:3000/api/messages` to test locally (no App
Registration needed with `MICROSOFT_APP_ID` left empty).

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm test` / `npm run test:e2e` | Unit / e2e tests |
| `npm run db:pull` | Introspect the live DB schema (see docs/ARCHITECTURE.md §6) |
| `npm run db:generate` / `npm run db:migrate` | Author and apply schema migrations |
| `npm run db:studio` | Local Drizzle Studio GUI |
