import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KnowledgeBaseHit } from './interfaces/knowledge-base-hit.interface';
import { KnowledgeBaseService } from './knowledge-base.service';

/**
 * Lets the knowledge base search be exercised directly (Swagger, curl,
 * e2e tests) without going through the AI SDK tool-calling path.
 */
@ApiTags('knowledge-base')
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ): Promise<KnowledgeBaseHit[]> {
    if (!query?.trim()) {
      throw new BadRequestException('query is required');
    }

    return this.knowledgeBaseService.search(query, {
      limit: limit !== undefined ? this.parseLimit(limit) : undefined,
    });
  }

  private parseLimit(limit: string): number {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return parsed;
  }
}
