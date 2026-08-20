import { createAzure } from '@ai-sdk/azure';
import { AzureChatModel, AzureOpenAiRegion } from '../constants';
import { AppConfigService } from '../config/config.service';
import { AzureOpenAiProvider } from './azure-openai.provider';

jest.mock('@ai-sdk/azure', () => ({ createAzure: jest.fn() }));

describe('AzureOpenAiProvider', () => {
  const buildFakeProvider = (region: string) => ({
    chat: jest.fn((deployment: string) => ({
      region,
      deployment,
      kind: 'chat',
    })),
    embeddingModel: jest.fn((deployment: string) => ({
      region,
      deployment,
      kind: 'embedding',
    })),
  });

  const aueProvider = buildFakeProvider('aue');
  const seaProvider = buildFakeProvider('sea');

  const config = {
    azureOpenAi: {
      defaultChatModel: AzureChatModel.Gpt41,
      regions: {
        [AzureOpenAiRegion.Aue]: {
          endpoint: 'https://aue.openai.azure.com',
          apiKey: 'aue-key',
        },
        [AzureOpenAiRegion.Sea]: {
          endpoint: 'https://sea.openai.azure.com',
          apiKey: 'sea-key',
        },
      },
      chatDeployments: {
        [AzureChatModel.Gpt41]: 'aue-gpt-4.1-deployment',
        [AzureChatModel.Gpt5]: 'aue-gpt-5-deployment',
        [AzureChatModel.O4Mini]: 'aue-o4-mini-deployment',
        [AzureChatModel.Gpt41Mini]: 'sea-gpt-4.1-mini-deployment',
        [AzureChatModel.Gpt51]: 'sea-gpt-5.1-deployment',
      },
      embeddingDeployment: 'sea-embedding-deployment',
    },
  } as unknown as AppConfigService;

  let provider: AzureOpenAiProvider;

  beforeEach(() => {
    jest.mocked(createAzure).mockReset();
    jest
      .mocked(createAzure)
      .mockImplementation(
        ({ baseURL }: { baseURL: string }) =>
          (baseURL.includes('aue') ? aueProvider : seaProvider) as never,
      );

    provider = new AzureOpenAiProvider(config);
  });

  it("creates one Azure provider per region, using that region's endpoint/key", () => {
    expect(createAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://aue.openai.azure.com',
        apiKey: 'aue-key',
      }),
    );
    expect(createAzure).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://sea.openai.azure.com',
        apiKey: 'sea-key',
      }),
    );
  });

  it('resolves a chat model to its own region and deployment', () => {
    expect(provider.chatModel(AzureChatModel.Gpt5)).toEqual({
      region: 'aue',
      deployment: 'aue-gpt-5-deployment',
      kind: 'chat',
    });
    expect(provider.chatModel(AzureChatModel.Gpt51)).toEqual({
      region: 'sea',
      deployment: 'sea-gpt-5.1-deployment',
      kind: 'chat',
    });
  });

  it('falls back to the configured default chat model when none is given', () => {
    provider.chatModel();

    expect(aueProvider.chat).toHaveBeenCalledWith('aue-gpt-4.1-deployment');
  });

  it('always resolves the embedding model from the SEA region', () => {
    expect(provider.embeddingModel()).toEqual({
      region: 'sea',
      deployment: 'sea-embedding-deployment',
      kind: 'embedding',
    });
  });
});
