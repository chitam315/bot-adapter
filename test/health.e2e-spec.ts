import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckResult } from '@nestjs/terminus';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DRIZZLE, PG_POOL } from '../src/constants';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let pool: { query: jest.Mock; end: jest.Mock };

  beforeAll(async () => {
    pool = {
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
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) reports ok when the database ping succeeds', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    const body = response.body as HealthCheckResult;
    expect(body.status).toBe('ok');
    expect(body.info?.database?.status).toBe('up');
  });

  it('/health (GET) reports an error when the database ping fails', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection refused'));

    await request(app.getHttpServer()).get('/health').expect(503);
  });
});
