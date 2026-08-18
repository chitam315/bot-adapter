/**
 * PLACEHOLDER SCHEMA — documents our *assumed* shape only, not the real table.
 * See src/database/schema/document.schema.ts header and
 * src/database/schema/README.md for the introspection/reconciliation workflow.
 */
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const faq = pgTable('faq', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
