import { Logger, Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { registerTypes } from 'pgvector/pg';
import { AppConfigService } from '../config/config.service';
import { DRIZZLE, PG_POOL } from './database.constants';
import * as schema from './schema';

const logger = new Logger('DatabaseModule');

export const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): Pool => {
    const pool = new Pool({ connectionString: config.database.url });

    // Registers the pgvector type parser on every new physical connection so
    // `vector` columns deserialize into number[] instead of a raw string.
    pool.on('connect', (client: PoolClient) => {
      registerTypes(client).catch((error: Error) => {
        logger.warn(`pgvector type registration skipped: ${error.message}`);
      });
    });

    pool.on('error', (error: Error) => {
      logger.error(
        `Unexpected Postgres pool error: ${error.message}`,
        error.stack,
      );
    });

    return pool;
  },
};

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [PG_POOL],
  useFactory: (pool: Pool) => drizzle(pool, { schema }),
};
