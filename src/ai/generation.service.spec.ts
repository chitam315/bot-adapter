import { Test, TestingModule } from '@nestjs/testing';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { AppConfigService } from '../config/config.service';
import { ConversationLoggingService } from '../conversation-logging/conversation-logging.service';
import {
  AzureChatModel,
  CHAT_REPLY_PURPOSE,
  KNOWLEDGE_BASE_TOOL,
} from '../constants';
import { GenerationService } from './generation.service';

describe('GenerationService', () => {
  let service: GenerationService;
  let generateTextLogged: jest.Mock;
  const chatModel = { id: 'chat-deployment' };
  const knowledgeBaseTool = { description: 'search', inputSchema: {} };
  const config = {
    azureOpenAi: { defaultChatModel: AzureChatModel.Gpt41 },
  } as unknown as AppConfigService;

  beforeEach(async () => {
    generateTextLogged = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: AzureOpenAiProvider,
          useValue: { chatModel: () => chatModel },
        },
        { provide: AppConfigService, useValue: config },
        {
          provide: ConversationLoggingService,
          useValue: { generateTextLogged },
        },
        { provide: KNOWLEDGE_BASE_TOOL, useValue: knowledgeBaseTool },
      ],
    }).compile();

    service = module.get(GenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls generateTextLogged with the configured model, tool, conversation history, and logging context', async () => {
    generateTextLogged.mockResolvedValue({
      text: 'The answer is 42.',
      usage: {
        inputTokens: 10,
        inputTokenDetails: { cacheReadTokens: 2 },
        outputTokens: 5,
        outputTokenDetails: { reasoningTokens: 1 },
        totalTokens: 15,
      },
      toolCalls: [],
    });

    const reply = await service.generateReply({
      text: 'What is the answer?',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
      loggingContext: { conversationId: 'conversation-1' },
    });

    expect(reply).toEqual(
      expect.objectContaining({
        text: 'The answer is 42.',
        model: AzureChatModel.Gpt41,
        usage: {
          inputTokens: 10,
          cachedInputTokens: 2,
          outputTokens: 5,
          reasoningTokens: 1,
          totalTokens: 15,
        },
        toolCalls: [],
      }),
    );
    expect(typeof reply.latencyMs).toBe('number');
    expect(generateTextLogged).toHaveBeenCalledWith(
      expect.objectContaining({
        modelKey: AzureChatModel.Gpt41,
        purposes: [CHAT_REPLY_PURPOSE],
        model: chatModel,
        tools: { searchKnowledgeBase: knowledgeBaseTool },
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'What is the answer?' },
        ],
      }),
      { conversationId: 'conversation-1' },
    );
  });

  it('works with no prior history and no logging context', async () => {
    generateTextLogged.mockResolvedValue({
      text: 'Hello there.',
      usage: {},
      toolCalls: [],
    });

    const reply = await service.generateReply({ text: 'Hi' });

    expect(reply.text).toBe('Hello there.');
    expect(generateTextLogged).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'Hi' }] }),
      {},
    );
  });

  it('reports the resolved tool call names', async () => {
    generateTextLogged.mockResolvedValue({
      text: 'Found it.',
      usage: {},
      toolCalls: [{ toolName: 'searchKnowledgeBase' }],
    });

    const reply = await service.generateReply({ text: 'search for it' });

    expect(reply.toolCalls).toEqual(['searchKnowledgeBase']);
  });

  it('resolves an explicit model over the configured default', async () => {
    generateTextLogged.mockResolvedValue({
      text: 'ok',
      usage: {},
      toolCalls: [],
    });

    const reply = await service.generateReply({
      text: 'Hi',
      model: AzureChatModel.Gpt5,
    });

    expect(reply.model).toBe(AzureChatModel.Gpt5);
  });
});
