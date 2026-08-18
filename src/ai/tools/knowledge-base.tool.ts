import { tool, Tool } from 'ai';
import { z } from 'zod';
import { KnowledgeBaseHit } from '../../knowledge-base/interfaces/knowledge-base-hit.interface';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';

const knowledgeBaseToolInputSchema = z.object({
  query: z
    .string()
    .describe(
      'The user question or topic to search the internal knowledge base for.',
    ),
});

type KnowledgeBaseToolInput = z.infer<typeof knowledgeBaseToolInputSchema>;

/**
 * Wraps KnowledgeBaseService as a model-invoked AI SDK tool, so retrieval
 * happens only when the model decides a question needs grounding — not as
 * hardcoded context-stuffing on every turn.
 */
export function createKnowledgeBaseTool(
  knowledgeBaseService: KnowledgeBaseService,
): Tool<KnowledgeBaseToolInput, KnowledgeBaseHit[]> {
  return tool({
    description:
      "Search the internal FAQ and document knowledge base for information relevant to the user's " +
      'question. Use this whenever the question might be answered by internal company documentation ' +
      'or FAQs, rather than general knowledge.',
    inputSchema: knowledgeBaseToolInputSchema,
    execute: async ({ query }: KnowledgeBaseToolInput) =>
      knowledgeBaseService.search(query),
  });
}
