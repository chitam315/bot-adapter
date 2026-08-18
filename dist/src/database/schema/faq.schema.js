"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faq = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.faq = (0, pg_core_1.pgTable)('faq', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    question: (0, pg_core_1.text)('question').notNull(),
    answer: (0, pg_core_1.text)('answer').notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
//# sourceMappingURL=faq.schema.js.map