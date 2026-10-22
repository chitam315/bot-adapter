import { generateText } from 'ai';

export interface FlatUsage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
}

type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;

/**
 * Flattens the ai SDK's nested LanguageModelUsage shape (see node_modules/ai's
 * GenerateTextResult['usage']) into the flat fields ConversationLoggingService
 * and GenerationService both store/return.
 */
export function mapUsage(usage: GenerateTextResult['usage']): FlatUsage {
  return {
    inputTokens: usage?.inputTokens,
    cachedInputTokens: usage?.inputTokenDetails?.cacheReadTokens,
    outputTokens: usage?.outputTokens,
    reasoningTokens: usage?.outputTokenDetails?.reasoningTokens,
    totalTokens: usage?.totalTokens,
  };
}

/** Names of the tools the model invoked, e.g. ['searchKnowledgeBase']. */
export function mapToolCalls(
  toolCalls: GenerateTextResult['toolCalls'] | undefined,
): string[] {
  return (toolCalls ?? []).map((call) => call.toolName);
}
