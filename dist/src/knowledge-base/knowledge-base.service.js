"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const embedding_service_1 = require("../azure-openai/embedding.service");
const database_constants_1 = require("../database/database.constants");
const schema = require("../database/schema");
const DEFAULT_LIMIT = 5;
let KnowledgeBaseService = class KnowledgeBaseService {
    db;
    embeddingService;
    constructor(db, embeddingService) {
        this.db = db;
        this.embeddingService = embeddingService;
    }
    async search(query, opts = {}) {
        const limit = opts.limit ?? DEFAULT_LIMIT;
        const queryEmbedding = await this.embeddingService.embed(query);
        const similarity = (0, drizzle_orm_1.sql) `1 - (${(0, drizzle_orm_1.cosineDistance)(schema.embeddings.embedding, queryEmbedding)})`;
        const rows = await this.db
            .select({
            content: schema.embeddings.content,
            documentId: schema.embeddings.documentId,
            faqId: schema.embeddings.faqId,
            documentTitle: schema.document.title,
            faqQuestion: schema.faq.question,
            score: similarity,
        })
            .from(schema.embeddings)
            .leftJoin(schema.document, (0, drizzle_orm_1.eq)(schema.embeddings.documentId, schema.document.id))
            .leftJoin(schema.faq, (0, drizzle_orm_1.eq)(schema.embeddings.faqId, schema.faq.id))
            .orderBy((0, drizzle_orm_1.desc)(similarity))
            .limit(limit);
        return rows.map((row) => this.toHit(row));
    }
    toHit(row) {
        if (row.faqId) {
            return {
                content: row.content,
                sourceType: 'faq',
                sourceId: row.faqId,
                title: row.faqQuestion,
                score: row.score,
            };
        }
        return {
            content: row.content,
            sourceType: 'document',
            sourceId: row.documentId ?? '',
            title: row.documentTitle,
            score: row.score,
        };
    }
};
exports.KnowledgeBaseService = KnowledgeBaseService;
exports.KnowledgeBaseService = KnowledgeBaseService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        embedding_service_1.EmbeddingService])
], KnowledgeBaseService);
//# sourceMappingURL=knowledge-base.service.js.map