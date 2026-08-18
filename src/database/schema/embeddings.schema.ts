/**
 * PLACEHOLDER SCHEMA — documents our *assumed* shape only, not the real table.
 * See src/database/schema/document.schema.ts header and
 * src/database/schema/README.md for the introspection/reconciliation workflow.
 *
 * EMBEDDING_DIMENSIONS is a guess (matches OpenAI/Azure OpenAI
 * text-embedding-3-small). Confirm the real dimension count during
 * reconciliation — a mismatch will fail every insert/query against the real table.
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { document } from './document.schema';
import { faq } from './faq.schema';

export const EMBEDDING_DIMENSIONS = 1536;

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    embedding: vector('embedding', {
      dimensions: EMBEDDING_DIMENSIONS,
    }).notNull(),
    // Exactly one of documentId/faqId is expected to be set per row.
    documentId: uuid('document_id').references(() => document.id),
    faqId: uuid('faq_id').references(() => faq.id),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('embeddings_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);
