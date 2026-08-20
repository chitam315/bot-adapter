import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AzureChatModel, AzureOpenAiRegion } from '../constants';
import { AppConfigService } from './config.service';
import { Env } from './env.schema';

describe('AppConfigService', () => {
  let service: AppConfigService;

  const env: Env = {
    NODE_ENV: 'test',
    PORT: 4000,
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/bot_adapter',
    MICROSOFT_APP_ID: 'app-id',
    MICROSOFT_APP_PASSWORD: 'app-password',
    MICROSOFT_APP_TYPE: 'MultiTenant',
    MICROSOFT_APP_TENANT_ID: 'tenant-id',
    AZURE_OPENAI_ENDPOINT: 'https://my-resource-aue.openai.azure.com',
    AZURE_OPENAI_API_KEY: 'aue-api-key',
    AZURE_OPENAI_GPT_4_1_DEPLOYMENT: 'aue-gpt-4.1-deployment',
    AZURE_OPENAI_GPT_5_DEPLOYMENT: 'aue-gpt-5-deployment',
    AZURE_OPENAI_O4_MINI_DEPLOYMENT: 'aue-o4-mini-deployment',
    AZURE_OPENAI2_ENDPOINT: 'https://my-resource-sea.openai.azure.com',
    AZURE_OPENAI2_API_KEY: 'sea-api-key',
    AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT: 'sea-gpt-4.1-mini-deployment',
    AZURE_OPENAI2_GPT_5_1_DEPLOYMENT: 'sea-gpt-5.1-deployment',
    AZURE_OPENAI2_EMBEDDING_DEPLOYMENT: 'sea-embedding-deployment',
    AZURE_OPENAI_DEFAULT_CHAT_MODEL: AzureChatModel.Gpt41,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: { get: (key: keyof Env) => env[key] },
        },
      ],
    }).compile();

    service = module.get(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('exposes grouped, typed config values', () => {
    expect(service.port).toBe(4000);
    expect(service.isProduction).toBe(false);
    expect(service.database).toEqual({ url: env.DATABASE_URL });
    expect(service.botFramework).toEqual({
      appId: env.MICROSOFT_APP_ID,
      appPassword: env.MICROSOFT_APP_PASSWORD,
      appType: env.MICROSOFT_APP_TYPE,
      appTenantId: env.MICROSOFT_APP_TENANT_ID,
    });
    expect(service.azureOpenAi).toEqual({
      defaultChatModel: env.AZURE_OPENAI_DEFAULT_CHAT_MODEL,
      regions: {
        [AzureOpenAiRegion.Aue]: {
          endpoint: env.AZURE_OPENAI_ENDPOINT,
          apiKey: env.AZURE_OPENAI_API_KEY,
        },
        [AzureOpenAiRegion.Sea]: {
          endpoint: env.AZURE_OPENAI2_ENDPOINT,
          apiKey: env.AZURE_OPENAI2_API_KEY,
        },
      },
      chatDeployments: {
        [AzureChatModel.Gpt41]: env.AZURE_OPENAI_GPT_4_1_DEPLOYMENT,
        [AzureChatModel.Gpt5]: env.AZURE_OPENAI_GPT_5_DEPLOYMENT,
        [AzureChatModel.O4Mini]: env.AZURE_OPENAI_O4_MINI_DEPLOYMENT,
        [AzureChatModel.Gpt41Mini]: env.AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT,
        [AzureChatModel.Gpt51]: env.AZURE_OPENAI2_GPT_5_1_DEPLOYMENT,
      },
      embeddingDeployment: env.AZURE_OPENAI2_EMBEDDING_DEPLOYMENT,
    });
  });
});
