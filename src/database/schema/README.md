# Database schema — reconciliation workflow

The live Postgres database already has `document`, `faq`, and `embeddings`
tables (plus possibly others). This repo does not manage their creation —
they existed before this codebase did. The files in this folder are
**placeholders**: a reasonable guess at the shape, written so the rest of the
app has something to compile against before real DB credentials are available.

## Reconciling with the real database

Once you have credentials for the live database:

1. Set `DATABASE_URL` in `.env` to point at it.
2. Run `npm run db:pull`. This introspects the live database and writes the
   result into `src/database/schema/_generated/` — it never touches the
   files in this folder directly.
3. Diff `_generated/schema.ts` against `document.schema.ts`, `faq.schema.ts`,
   and `embeddings.schema.ts`. Port the real column definitions, types, and
   constraints into the corresponding placeholder file, replacing the guessed
   shape. Pay particular attention to:
   - The real column names (snake_case in Postgres, camelCase in the JS key).
   - `embeddings.embedding`'s actual vector dimension count — it must match
     the embedding model that produced the stored vectors, or every
     insert/query will fail.
   - Any additional tables under `embeddings`/`faq`/`document`'s domain that
     aren't represented here yet.
4. Update `index.ts` if table names or files changed.
5. Delete `src/database/schema/_generated/` once reconciliation is done —
   it's a staging area, not a permanent part of the schema.

## Why not overwrite in place?

`drizzle-kit pull` can't know about hand-added `relations()` calls, comments,
or naming conventions already present in the maintained schema files — an
in-place overwrite would silently discard them. Staging into `_generated/`
turns reconciliation into a reviewable diff instead of a blind overwrite.

## Going forward

Once the schema here matches the real database, future schema changes
**authored by this codebase** go through `npm run db:generate` (diffs
`schema/` against migration history in `drizzle/`) and `npm run db:migrate`
(applies pending migrations) — see `docs/ARCHITECTURE.md` for the full
workflow.
