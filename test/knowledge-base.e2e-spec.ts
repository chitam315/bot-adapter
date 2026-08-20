import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DRIZZLE, PG_POOL } from '../src/constants';
import { EmbeddingService } from '../src/azure-openai/embedding.service';

describe('Knowledge base (e2e)', () => {
  let app: INestApplication<App>;
  const embed = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

  beforeAll(async () => {
    const pool = {
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };

    const queryChain = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            content: 'Click "forgot password" on the sign-in page.',
            faqId: 'faq-1',
            faqQuestion: 'How do I reset my password?',
            documentId: null,
            documentName: null,
            documentPageNumber: null,
            score: 0.92,
          },
        ]),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(DRIZZLE)
      .useValue(queryChain)
      .overrideProvider(EmbeddingService)
      .useValue({ embed })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /knowledge-base/search returns hits including a relevance score', async () => {
    const response = await request(app.getHttpServer())
      .get('/knowledge-base/search')
      .query({ query: 'reset password' })
      .expect(200);

    expect(embed).toHaveBeenCalledWith('reset password');
    expect(response.body).toEqual([
      {
        content: 'Click "forgot password" on the sign-in page.',
        sourceType: 'faq',
        sourceId: 'faq-1',
        title: 'How do I reset my password?',
        score: 0.92,
      },
    ]);
  });

  it('GET /knowledge-base/search without a query returns 400', async () => {
    await request(app.getHttpServer())
      .get('/knowledge-base/search')
      .expect(400);
  });
});
