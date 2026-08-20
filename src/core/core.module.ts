import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { Pool } from 'pg';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { DatabaseModule } from '../database/database.module';
import { PG_POOL } from '../constants';

/**
 * One-time boot wiring: structured logging and a fail-fast database
 * connectivity check. Imported only by AppModule.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          genReqId: (req: {
            headers: Record<string, string | string[] | undefined>;
          }) =>
            (req.headers['x-correlation-id'] as string | undefined) ??
            randomUUID(),
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["ocp-apim-subscription-key"]',
          ],
          transport: config.isProduction
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        },
      }),
    }),
    DatabaseModule,
  ],
})
export class CoreModule implements OnModuleInit {
  private readonly logger = new Logger(CoreModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleInit(): Promise<void> {
    await this.pool.query('SELECT 1');
    this.logger.log('bot-adapter booted; database connection verified');
  }
}
