import { Module } from '@nestjs/common';
import { AzureOpenAiModule } from '../azure-openai/azure-openai.module';
import { DatabaseModule } from '../database/database.module';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [DatabaseModule, AzureOpenAiModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
