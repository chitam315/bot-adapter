import { Tool } from 'ai';
import { z } from 'zod';
import { KnowledgeBaseHit } from '../../knowledge-base/interfaces/knowledge-base-hit.interface';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
declare const knowledgeBaseToolInputSchema: z.ZodObject<{
    query: z.ZodString;
}, z.core.$strip>;
type KnowledgeBaseToolInput = z.infer<typeof knowledgeBaseToolInputSchema>;
export declare function createKnowledgeBaseTool(knowledgeBaseService: KnowledgeBaseService): Tool<KnowledgeBaseToolInput, KnowledgeBaseHit[]>;
export {};
