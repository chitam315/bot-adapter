import { Test, TestingModule } from '@nestjs/testing';
import { embed } from 'ai';
import { EmbeddingService } from './embedding.service';
import { AzureOpenAiProvider } from './azure-openai.provider';

jest.mock('ai', () => ({
  embed: jest.fn(),
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  const embeddingModel = { id: 'embedding-deployment' };

  beforeEach(async () => {
    jest.mocked(embed).mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      value: 'hello world',
      usage: { tokens: 3 },
      warnings: [],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: AzureOpenAiProvider,
          useValue: { embeddingModel: () => embeddingModel },
        },
      ],
    }).compile();

    service = module.get(EmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('embeds text using the configured Azure OpenAI embedding model', async () => {
    const result = await service.embed('hello world');

    expect(embed).toHaveBeenCalledWith({
      model: embeddingModel,
      value: 'hello world',
    });
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });
});
