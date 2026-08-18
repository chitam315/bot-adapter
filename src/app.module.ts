import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ConfigModule } from './config/config.module';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [ConfigModule, CoreModule, SharedModule, HealthModule, BotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
