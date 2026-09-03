import { Test, TestingModule } from '@nestjs/testing';
import { generateText } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { AppConfigService } from '../config/config.service';
import { AzureChatModel, KNOWLEDGE_BASE_TOOL } from '../constants';
import { GenerationService } from './generation.service';

// 'ai' is auto-mocked project-wide via __mocks__/ai.ts (see that file for why).

describe('GenerationService', () => {
  let service: GenerationService;
  const chatModel = { id: 'chat-deployment' };
  const knowledgeBaseTool = { description: 'search', inputSchema: {} };
  const config = {
    azureOpenAi: { defaultChatModel: AzureChatModel.Gpt41 },
  } as unknown as AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: AzureOpenAiProvider,
          useValue: { chatModel: () => chatModel },
        },
        { provide: AppConfigService, useValue: config },
        { provide: KNOWLEDGE_BASE_TOOL, useValue: knowledgeBaseTool },
      ],
    }).compile();

    service = module.get(GenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls generateText with the configured model, tool, and conversation history', async () => {
    jest.mocked(generateText).mockResolvedValue({
      text: 'The answer is 42.',
      usage: {
        inputTokens: 10,
        inputTokenDetails: { cacheReadTokens: 2 },
        outputTokens: 5,
        outputTokenDetails: { reasoningTokens: 1 },
        totalTokens: 15,
      },
      toolCalls: [],
    } as never);

    const reply = await service.generateReply({
      text: 'What is the answer?',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
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
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: chatModel,
        tools: { searchKnowledgeBase: knowledgeBaseTool },
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'What is the answer?' },
        ],
      }),
    );
  });

  it('works with no prior history', async () => {
    jest.mocked(generateText).mockResolvedValue({
      text: 'Hello there.',
      usage: {},
      toolCalls: [],
    } as never);

    const reply = await service.generateReply({ text: 'Hi' });

    expect(reply.text).toBe('Hello there.');
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'Hi' }] }),
    );
  });

  it('reports the resolved tool call names', async () => {
    jest.mocked(generateText).mockResolvedValue({
      text: 'Found it.',
      usage: {},
      toolCalls: [{ toolName: 'searchKnowledgeBase' }],
    } as never);

    const reply = await service.generateReply({ text: 'search for it' });

    expect(reply.toolCalls).toEqual(['searchKnowledgeBase']);
  });

  it('resolves an explicit model over the configured default', async () => {
    jest.mocked(generateText).mockResolvedValue({
      text: 'ok',
      usage: {},
      toolCalls: [],
    } as never);

    const reply = await service.generateReply({
      text: 'Hi',
      model: AzureChatModel.Gpt5,
    });

    expect(reply.model).toBe(AzureChatModel.Gpt5);
  });
});
