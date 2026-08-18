import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingService } from '../azure-openai/embedding.service';
import { DRIZZLE } from '../database/database.constants';
import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let embed: jest.Mock;
  let rows: unknown[];

  beforeEach(async () => {
    embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);
    rows = [];

    // Note: `limit` (the real chain's terminal call) resolves to a Promise
    // rather than the chain itself — giving the whole `queryChain` object a
    // `.then` would make Nest's DI treat the `useValue` itself as a
    // thenable and silently unwrap it during provider resolution.
    const queryChain = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() => Promise.resolve(rows)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: DRIZZLE, useValue: queryChain },
        { provide: EmbeddingService, useValue: { embed } },
      ],
    }).compile();

    service = module.get(KnowledgeBaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('embeds the query before searching', async () => {
    await service.search('how do I reset my password?');
    expect(embed).toHaveBeenCalledWith('how do I reset my password?');
  });

  it('maps a faq-sourced row to a KnowledgeBaseHit', async () => {
    rows.push({
      content: 'Click "forgot password" on the sign-in page.',
      documentId: null,
      faqId: 'faq-1',
      documentTitle: null,
      faqQuestion: 'How do I reset my password?',
      score: 0.92,
    });

    const [hit] = await service.search('reset password');

    expect(hit).toEqual({
      content: 'Click "forgot password" on the sign-in page.',
      sourceType: 'faq',
      sourceId: 'faq-1',
      title: 'How do I reset my password?',
      score: 0.92,
    });
  });

  it('maps a document-sourced row to a KnowledgeBaseHit', async () => {
    rows.push({
      content: 'Section 3 covers password resets.',
      documentId: 'doc-1',
      faqId: null,
      documentTitle: 'Account Recovery Guide',
      faqQuestion: null,
      score: 0.81,
    });

    const [hit] = await service.search('reset password');

    expect(hit).toEqual({
      content: 'Section 3 covers password resets.',
      sourceType: 'document',
      sourceId: 'doc-1',
      title: 'Account Recovery Guide',
      score: 0.81,
    });
  });
});
