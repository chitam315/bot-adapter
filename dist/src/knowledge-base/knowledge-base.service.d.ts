import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { EmbeddingService } from '../azure-openai/embedding.service';
import * as schema from '../database/schema';
import { KnowledgeBaseHit } from './interfaces/knowledge-base-hit.interface';
export declare class KnowledgeBaseService {
    private readonly db;
    private readonly embeddingService;
    constructor(db: NodePgDatabase<typeof schema>, embeddingService: EmbeddingService);
    search(query: string, opts?: {
        limit?: number;
    }): Promise<KnowledgeBaseHit[]>;
    private toHit;
}
