/**
 * PLACEHOLDER SCHEMA — documents our *assumed* shape only, not the real table.
 *
 * The real `document` table already exists in the live Postgres database and
 * has not been introspected yet. Once DB credentials are available:
 *   1. npm run db:pull   (writes into src/database/schema/_generated/)
 *   2. Diff _generated/schema.ts against this file, port the real columns in
 *   3. Update src/database/schema/index.ts, then delete _generated/
 * See src/database/schema/README.md for the full workflow.
 */
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
