---
paths:
  - "src/database/schema/**"
  - "drizzle.config.ts"
  - "drizzle.pull.config.ts"
---

## Editing bot_adapter's schema: don't run drizzle-kit yourself

When a task changes `bot-adapter.schema.ts`/`bot-adapter.relations.ts` (or
any other file under `src/database/schema/`), just edit the schema files
directly and stop there — do **not** run `db:generate`, `db:push`, or
`db:migrate` yourself afterwards. The user runs those by hand and decides
when.

Why this matters here specifically: this repo's `drizzle/` migration
history is stale relative to the live dev DB — the `bot_adapter` tables
were created by hand-run `db:push` calls, never through a tracked
migration, so `drizzle/meta/0000_snapshot.json` is an empty baseline. That
means `db:generate` right now produces a full `CREATE SCHEMA`/`CREATE
TABLE` migration for tables that likely already exist live, not a real
incremental diff — running it via `db:migrate` would fail with "relation
already exists". `db:push` (diffs directly against the live DB, not the
migration history) is the workflow that actually reflects reality here.
Since only the user can see which command is safe against their current DB
state, leave that call — and the moment to make it — to them.
