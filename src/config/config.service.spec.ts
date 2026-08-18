import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
    AZURE_OPENAI_ENDPOINT: 'https://my-resource.openai.azure.com',
    AZURE_OPENAI_REGION: 'eastus',
    AZURE_OPENAI_API_KEY: 'api-key',
    AZURE_OPENAI_API_VERSION: '2024-10-01-preview',
    AZURE_OPENAI_CHAT_DEPLOYMENT: 'chat-deployment',
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: 'embedding-deployment',
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
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      region: env.AZURE_OPENAI_REGION,
      apiKey: env.AZURE_OPENAI_API_KEY,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
      chatDeployment: env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      embeddingDeployment: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    });
  });
});
