import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigModule } from '../config/config.module';
import { DRIZZLE, PG_POOL } from './database.constants';
import { drizzleProvider, pgPoolProvider } from './database.providers';

@Module({
  imports: [ConfigModule],
  providers: [pgPoolProvider, drizzleProvider],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Paired with app.enableShutdownHooks() in main.ts, so the pool closes
  // cleanly on SIGTERM instead of leaking connections on redeploy.
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
