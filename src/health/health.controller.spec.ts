import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { PG_POOL } from '../database/database.constants';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let pool: { query: jest.Mock };

  beforeEach(async () => {
    pool = { query: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [{ provide: PG_POOL, useValue: pool }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('reports up when the database ping succeeds', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.info?.database?.status).toBe('up');
  });

  it('reports down when the database ping fails', async () => {
    pool.query.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).rejects.toBeDefined();
  });
});
