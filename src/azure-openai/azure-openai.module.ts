import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { AzureOpenAiProvider } from './azure-openai.provider';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ConfigModule],
  providers: [AzureOpenAiProvider, EmbeddingService],
  exports: [AzureOpenAiProvider, EmbeddingService],
})
export class AzureOpenAiModule {}
