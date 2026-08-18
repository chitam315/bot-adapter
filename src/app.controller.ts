import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * A pure "is the Node process alive at all" smoke route, with zero
 * dependencies. Kept distinct from GET /health, which additionally verifies
 * database connectivity.
 */
@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo(): { name: string; status: string } {
    return this.appService.getInfo();
  }
}
