import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ConfigModule } from '../config/config.module';
import { botFrameworkAdapterProvider } from './bot-framework-adapter.provider';
import { BotController } from './bot.controller';
import { memoryStorageProvider } from './storage/memory-storage.provider';
import { BotActivityHandler } from './teams-activity-handler';

@Module({
  imports: [ConfigModule, AiModule],
  controllers: [BotController],
  providers: [
    botFrameworkAdapterProvider,
    memoryStorageProvider,
    BotActivityHandler,
  ],
})
export class BotModule {}
