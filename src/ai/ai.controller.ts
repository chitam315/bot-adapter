import {
  // BadRequestException,
  Body,
  Controller,
  // Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { GenerateTextDto } from './dto/generate-text.dto';
import { GenerationService } from './generation.service';

/**
 * Direct HTTP entry point into GenerationService.generateReply — the same
 * generateText + searchKnowledgeBase-tool pipeline the Teams bot uses
 * internally (see teams-activity-handler.ts), exposed for non-Teams callers.
 */
@ApiTags('ai')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly generationService: GenerationService) {}

  // @Post('generate')
  // async generate(@Body() body: GenerateTextDto): Promise<{ reply: string }> {
  //   if (!body?.text?.trim()) {
  //     throw new BadRequestException('text is required');
  //   }

  //   const reply = await this.generationService.generateReply({
  //     text: body.text,
  //     history: body.history,
  //     model: body.model,
  //   });

  //   return { reply };
  // }
}
