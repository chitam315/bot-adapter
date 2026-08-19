# Database schema

`schema.ts` is introspected from the real production database via
`npm run db:pull` — not hand-authored. It mirrors the full database (27
tables as of the last pull: `users`, `chats`, `messages`, `documents`,
`documentPages`, `faqs`, `embeddings`, and others belonging to the wider
application that owns this database).

`bot-adapter` itself only ever queries `documents`, `documentPages`, `faqs`,
and `embeddings` (see [KnowledgeBaseService](../../knowledge-base/knowledge-base.service.ts)).
The rest of the tables are kept here for local-DB parity with production —
so a local Postgres migrated from this schema matches reality — not because
this app reads or writes them.

## Re-syncing when the real schema changes

1. Set `DATABASE_URL` to the real database (temporarily, on the command line — don't edit `.env`):
   ```bash
   DATABASE_URL="postgres://..." npm run db:pull
   ```
   This writes into `src/database/schema/_generated/schema.ts` — it never touches `schema.ts` directly.
2. Diff `_generated/schema.ts` against `schema.ts`. Port over whatever changed.
3. Delete `src/database/schema/_generated/` once done — it's a staging area, not a permanent part of the schema.

## Applying schema to a database (e.g. local Postgres for testing)

- **`npm run db:push`** — diffs `schema.ts` against the target database's actual structure and applies changes directly, no migration file. Fast, good for a local/throwaway database (like the Docker Postgres this repo's `docker-compose.yml` sets up) that doesn't need migration history.
- **`npm run db:generate` + `npm run db:migrate`** — diffs `schema.ts` against migration history in `drizzle/`, generates SQL, then applies it. Use this for any environment where you want a reviewable, versioned migration trail (staging/production).

`DATABASE_URL` in `.env` decides which database either command targets.
