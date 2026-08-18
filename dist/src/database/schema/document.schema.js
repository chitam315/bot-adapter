"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.document = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.document = (0, pg_core_1.pgTable)('document', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
//# sourceMappingURL=document.schema.js.map