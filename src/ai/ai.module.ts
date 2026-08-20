import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AzureOpenAiModule } from '../azure-openai/azure-openai.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { KNOWLEDGE_BASE_TOOL } from '../constants';
import { AiController } from './ai.controller';
import { GenerationService } from './generation.service';
import { createKnowledgeBaseTool } from './tools/knowledge-base.tool';

@Module({
  imports: [AzureOpenAiModule, KnowledgeBaseModule, AuthModule],
  controllers: [AiController],
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
