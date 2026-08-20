import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { GenerationService } from '../src/ai/generation.service';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { DRIZZLE, PG_POOL } from '../src/constants';

describe('AI generate (e2e)', () => {
  let app: INestApplication<App>;
  const generateReply = jest.fn().mockResolvedValue('This is a stubbed reply.');

  beforeAll(async () => {
    const pool = {
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(DRIZZLE)
      .useValue({})
      .overrideProvider(GenerationService)
      .useValue({ generateReply })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /ai/generate returns the generated reply when authorized', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/generate')
      .send({ text: 'What is the answer?' })
      .expect(201);

    expect(generateReply).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'What is the answer?' }),
    );
    expect(response.body).toEqual({ reply: 'This is a stubbed reply.' });
  });

  it('POST /ai/generate rejects a blank text body', async () => {
    await request(app.getHttpServer())
      .post('/ai/generate')
      .send({ text: '   ' })
      .expect(400);
  });
});

describe('AI generate (e2e) — unauthenticated', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const pool = {
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };

    // Real JwtAuthGuard here (not overridden) — this proves the route is
    // actually guarded. The missing-cookie path short-circuits before any
    // JWKS discovery/network call, so no further mocking is needed.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(DRIZZLE)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /ai/generate without the auth cookie returns 401', async () => {
    await request(app.getHttpServer())
      .post('/ai/generate')
      .send({ text: 'What is the answer?' })
      .expect(401);
  });
});
