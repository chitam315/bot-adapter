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

    // embeddings links to exactly one of faqs (direct) or documentPages
    // (which in turn belongs to a document) — never both.
    const rows = await this.db
      .select({
        content: schema.embeddings.content,
        faqId: schema.embeddings.faqId,
        faqQuestion: schema.faqs.question,
        documentId: schema.documents.id,
        documentName: schema.documents.name,
        documentPageNumber: schema.documentPages.pageNumber,
        score: similarity,
      })
      .from(schema.embeddings)
      .leftJoin(schema.faqs, eq(schema.embeddings.faqId, schema.faqs.id))
      .leftJoin(
        schema.documentPages,
        eq(schema.embeddings.documentPageId, schema.documentPages.id),
      )
      .leftJoin(
        schema.documents,
        eq(schema.documentPages.documentId, schema.documents.id),
      )
      .orderBy(desc(similarity))
      .limit(limit);

    return rows.map((row) => this.toHit(row));
  }

  private toHit(row: {
    content: string;
    faqId: string | null;
    faqQuestion: string | null;
    documentId: string | null;
    documentName: string | null;
    documentPageNumber: number | null;
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
      title:
        row.documentName && row.documentPageNumber != null
          ? `${row.documentName} (page ${row.documentPageNumber})`
          : row.documentName,
      score: row.score,
    };
  }
}
