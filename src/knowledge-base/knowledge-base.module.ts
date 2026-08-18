import { Module } from '@nestjs/common';
import { AzureOpenAiModule } from '../azure-openai/azure-openai.module';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [DatabaseModule, AzureOpenAiModule],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
