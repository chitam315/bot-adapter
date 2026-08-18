import { Inject, Injectable } from '@nestjs/common';
import { cosineDistance, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { EmbeddingService } from '../azure-openai/embedding.service';
import { DRIZZLE } from '../database/database.constants';
import * as schema from '../database/schema';
import { KnowledgeBaseHit } from './interfaces/knowledge-base-hit.interface';

const DEFAULT_LIMIT = 5;

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(
    query: string,
    opts: { limit?: number } = {},
  ): Promise<KnowledgeBaseHit[]> {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const queryEmbedding = await this.embeddingService.embed(query);
    const similarity = sql<number>`1 - (${cosineDistance(schema.embeddings.embedding, queryEmbedding)})`;

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
      .leftJoin(
        schema.document,
        eq(schema.embeddings.documentId, schema.document.id),
      )
      .leftJoin(schema.faq, eq(schema.embeddings.faqId, schema.faq.id))
      .orderBy(desc(similarity))
      .limit(limit);

    return rows.map((row) => this.toHit(row));
  }

  private toHit(row: {
    content: string;
    documentId: string | null;
    faqId: string | null;
    documentTitle: string | null;
    faqQuestion: string | null;
    score: number;
  }): KnowledgeBaseHit {
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
}
