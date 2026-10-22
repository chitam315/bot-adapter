import { Inject, Injectable } from '@nestjs/common';
import { ModelMessage, stepCountIs, Tool } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { AppConfigService } from '../config/config.service';
import {
  ConversationLoggingService,
  GenerateTextLoggedContext,
} from '../conversation-logging/conversation-logging.service';
import {
  AzureChatModel,
  CHAT_REPLY_PURPOSE,
  KNOWLEDGE_BASE_TOOL,
  MAX_STEPS,
  SYSTEM_PROMPT,
} from '../constants';
import { FlatUsage, mapToolCalls, mapUsage } from './generation.util';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateReplyInput {
  text: string;
  history?: ConversationTurn[];
  // Defaults to AppConfigService's AZURE_OPENAI_DEFAULT_CHAT_MODEL when omitted.
  model?: AzureChatModel;
  // Ids already resolved by the caller (e.g. BotActivityHandler, ahead of
  // this call) that generateTextLogged links its llmCalls row to. Omitted
  // entirely by a caller with no Teams conversation.
  loggingContext?: GenerateTextLoggedContext;
}

export type GenerateReplyUsage = FlatUsage;

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
 * in this scaffold. The actual generateText call is made through
 * ConversationLoggingService.generateTextLogged (not the ai SDK directly),
 * which is what persists this turn's LLM call into bot_adapter.llmCalls.
 */
@Injectable()
export class GenerationService {
  constructor(
    private readonly azureOpenAi: AzureOpenAiProvider,
    private readonly config: AppConfigService,
    private readonly conversationLoggingService: ConversationLoggingService,
    @Inject(KNOWLEDGE_BASE_TOOL) private readonly knowledgeBaseTool: Tool,
  ) {}

  async generateReply({
    text,
    history = [],
    model,
    loggingContext = {},
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
    const result = await this.conversationLoggingService.generateTextLogged(
      {
        modelKey: resolvedModel,
        purposes: [CHAT_REPLY_PURPOSE],
        model: this.azureOpenAi.chatModel(resolvedModel),
        system: SYSTEM_PROMPT,
        messages,
        tools: { searchKnowledgeBase: this.knowledgeBaseTool },
        stopWhen: stepCountIs(MAX_STEPS),
      },
      loggingContext,
    );
    const latencyMs = Date.now() - startedAt;

    return {
      text: result.text,
      model: resolvedModel,
      usage: mapUsage(result.usage),
      toolCalls: mapToolCalls(result.toolCalls),
      latencyMs,
    };
  }
}
