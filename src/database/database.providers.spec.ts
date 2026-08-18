import { Test, TestingModule } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfigService } from '../config/config.service';
import { DRIZZLE, PG_POOL } from './database.constants';
import { drizzleProvider, pgPoolProvider } from './database.providers';

type DrizzleClient = ReturnType<typeof drizzle>;

describe('database providers', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        pgPoolProvider,
        drizzleProvider,
        {
          provide: AppConfigService,
          useValue: {
            database: {
              url: 'postgres://user:pass@localhost:5432/bot_adapter',
            },
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    const pool = module.get<Pool>(PG_POOL);
    await pool.end();
  });

  it('builds a pg Pool from AppConfigService', () => {
    const pool = module.get<Pool>(PG_POOL);
    expect(pool).toBeDefined();
  });

  it('wraps the pool in a Drizzle client', () => {
    const drizzleClient = module.get<DrizzleClient>(DRIZZLE);
    expect(drizzleClient).toBeDefined();
    expect(drizzleClient.query).toBeDefined();
  });
});
