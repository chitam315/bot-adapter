"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddings = exports.EMBEDDING_DIMENSIONS = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const document_schema_1 = require("./document.schema");
const faq_schema_1 = require("./faq.schema");
exports.EMBEDDING_DIMENSIONS = 1536;
exports.embeddings = (0, pg_core_1.pgTable)('embeddings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    content: (0, pg_core_1.text)('content').notNull(),
    embedding: (0, pg_core_1.vector)('embedding', {
        dimensions: exports.EMBEDDING_DIMENSIONS,
    }).notNull(),
    documentId: (0, pg_core_1.uuid)('document_id').references(() => document_schema_1.document.id),
    faqId: (0, pg_core_1.uuid)('faq_id').references(() => faq_schema_1.faq.id),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('embeddings_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
]);
//# sourceMappingURL=embeddings.schema.js.map