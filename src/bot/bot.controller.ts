import { Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CloudAdapter } from 'botbuilder';
import { Request, Response } from 'express';
import { BOT_ADAPTER } from '../constants';
import { BotActivityHandler } from './teams-activity-handler';

/**
 * The single endpoint Azure Bot Service / Teams calls for every activity.
 * Uses raw Express req/res because CloudAdapter.process needs to write the
 * HTTP response itself and validate the Bot Framework JWT before any
 * business logic runs.
 */
@ApiTags('bot')
@Controller('api/messages')
export class BotController {
  constructor(
    @Inject(BOT_ADAPTER) private readonly adapter: CloudAdapter,
    private readonly activityHandler: BotActivityHandler,
  ) {}

  @Post()
  async handleMessages(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.adapter.process(req, res, (context) =>
      this.activityHandler.run(context),
    );
  }
}
