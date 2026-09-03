import { Inject, Injectable } from '@nestjs/common';
import { generateText, ModelMessage, stepCountIs, Tool } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { AppConfigService } from '../config/config.service';
import {
  AzureChatModel,
  KNOWLEDGE_BASE_TOOL,
  MAX_STEPS,
  SYSTEM_PROMPT,
} from '../constants';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateReplyInput {
  text: string;
  history?: ConversationTurn[];
  // Defaults to AppConfigService's AZURE_OPENAI_DEFAULT_CHAT_MODEL when omitted.
  model?: AzureChatModel;
}

// Mirrors the ai SDK's LanguageModelUsage shape (see node_modules/ai's
// GenerateTextResult['usage']) but flattened, since every field there is
// `number | undefined` and ConversationLoggingService stores them flat.
export interface GenerateReplyUsage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
}

export interface GenerateReplyResult {
  text: string;
  // The model actually used — `model` from the input, or the configured
  // default when omitted. Callers that log this turn need the resolved
  // value, not the (possibly undefined) input.
  model: AzureChatModel;
  usage: GenerateReplyUsage;
  // Names of tools the model invoked this turn, e.g. ['searchKnowledgeBase'].
  toolCalls: string[];
  latencyMs: number;
}

/**
 * Orchestrates one Teams turn's reply generation. Returns metadata
 * (usage/tool calls/latency) alongside the text — see
 * docs/ARCHITECTURE.md for why Teams doesn't get token-by-token streaming
 * in this scaffold, and ConversationLoggingService for what consumes this
 * metadata.
 */
@Injectable()
export class GenerationService {
  constructor(
    private readonly azureOpenAi: AzureOpenAiProvider,
    private readonly config: AppConfigService,
    @Inject(KNOWLEDGE_BASE_TOOL) private readonly knowledgeBaseTool: Tool,
  ) {}

  async generateReply({
    text,
    history = [],
    model,
  }: GenerateReplyInput): Promise<GenerateReplyResult> {
    const resolvedModel = model ?? this.config.azureOpenAi.defaultChatModel;

    const messages: ModelMessage[] = [
      ...history.map((turn): ModelMessage => ({
        role: turn.role,
        content: turn.content,
      })),
      { role: 'user', content: text },
    ];

    const startedAt = Date.now();
    const result = await generateText({
      model: this.azureOpenAi.chatModel(resolvedModel),
      system: SYSTEM_PROMPT,
      messages,
      tools: { searchKnowledgeBase: this.knowledgeBaseTool },
      stopWhen: stepCountIs(MAX_STEPS),
    });
    const latencyMs = Date.now() - startedAt;

    return {
      text: result.text,
      model: resolvedModel,
      usage: {
        inputTokens: result.usage?.inputTokens,
        cachedInputTokens: result.usage?.inputTokenDetails?.cacheReadTokens,
        outputTokens: result.usage?.outputTokens,
        reasoningTokens: result.usage?.outputTokenDetails?.reasoningTokens,
        totalTokens: result.usage?.totalTokens,
      },
      toolCalls: (result.toolCalls ?? []).map((call) => call.toolName),
      latencyMs,
    };
  }
}
