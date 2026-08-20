import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Pool } from 'pg';
import { PG_POOL } from '../constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicatorService: HealthIndicatorService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        const indicator = this.indicatorService.check('database');
        try {
          await this.pool.query('SELECT 1');
          return indicator.up();
        } catch (error) {
          return indicator.down({ message: (error as Error).message });
        }
      },
    ]);
  }
}
