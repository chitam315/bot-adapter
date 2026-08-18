import { Test, TestingModule } from '@nestjs/testing';
import { generateText } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { KNOWLEDGE_BASE_TOOL } from './ai.constants';
import { GenerationService } from './generation.service';

// 'ai' is auto-mocked project-wide via __mocks__/ai.ts (see that file for why).

describe('GenerationService', () => {
  let service: GenerationService;
  const chatModel = { id: 'chat-deployment' };
  const knowledgeBaseTool = { description: 'search', inputSchema: {} };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: AzureOpenAiProvider,
          useValue: { chatModel: () => chatModel },
        },
        { provide: KNOWLEDGE_BASE_TOOL, useValue: knowledgeBaseTool },
      ],
    }).compile();

    service = module.get(GenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls generateText with the configured model, tool, and conversation history', async () => {
    jest
      .mocked(generateText)
      .mockResolvedValue({ text: 'The answer is 42.' } as never);

    const reply = await service.generateReply({
      text: 'What is the answer?',
      history: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
    });

    expect(reply).toBe('The answer is 42.');
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
    jest
      .mocked(generateText)
      .mockResolvedValue({ text: 'Hello there.' } as never);

    const reply = await service.generateReply({ text: 'Hi' });

    expect(reply).toBe('Hello there.');
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [{ role: 'user', content: 'Hi' }] }),
    );
  });
});
