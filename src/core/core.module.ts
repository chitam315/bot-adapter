import { Inject, Logger, Module, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { LoggerModule } from 'nestjs-pino';
import { Pool } from 'pg';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { DatabaseModule } from '../database/database.module';
import {
  PG_POOL,
  PINO_REDACT_CENSOR,
  PINO_REDACT_PATHS,
  PINO_ROLL_OPTIONS,
} from '../constants';

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
          redact: {
            paths: PINO_REDACT_PATHS,
            censor: PINO_REDACT_CENSOR,
          },
          // Multiple targets run in parallel worker threads. Add a target
          // here (e.g. Graylog) rather than switching this back to a single
          // object — a single `transport` value replaces the whole pipeline.
          transport: {
            targets: [
              {
                target: 'pino-roll',
                level: config.logLevel,
                options: {
                  file: join(process.cwd(), 'logs', 'app'),
                  ...PINO_ROLL_OPTIONS,
                },
              },
              config.isProduction
                ? {
                    // Raw NDJSON to stdout (fd 1) — mirrors the old
                    // `transport: undefined` production behavior, now
                    // explicit because `targets` replaces pino's default
                    // destination entirely.
                    target: 'pino/file',
                    level: config.logLevel,
                    options: { destination: 1 },
                  }
                : {
                    target: 'pino-pretty',
                    level: config.logLevel,
                    options: { singleLine: true },
                  },
            ],
          },
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
