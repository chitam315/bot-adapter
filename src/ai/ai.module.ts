import { Module } from '@nestjs/common';
import { AzureOpenAiModule } from '../azure-openai/azure-openai.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { KNOWLEDGE_BASE_TOOL } from '../constants';
import { GenerationService } from './generation.service';
import { createKnowledgeBaseTool } from './tools/knowledge-base.tool';

@Module({
  imports: [AzureOpenAiModule, KnowledgeBaseModule],
  providers: [
    {
      provide: KNOWLEDGE_BASE_TOOL,
      inject: [KnowledgeBaseService],
      useFactory: createKnowledgeBaseTool,
    },
    GenerationService,
  ],
  exports: [GenerationService],
})
export class AiModule {}
