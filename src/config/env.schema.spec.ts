import { AzureChatModel } from '../constants';
import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/bot_adapter',
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
  };

  it('returns typed, defaulted config for valid input', () => {
    const env = validateEnv(validConfig);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.MICROSOFT_APP_TYPE).toBe('MultiTenant');
    expect(env.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(env.AZURE_OPENAI_DEFAULT_CHAT_MODEL).toBe(AzureChatModel.Gpt41);
  });

  it('accepts an explicit default chat model', () => {
    const env = validateEnv({
      ...validConfig,
      AZURE_OPENAI_DEFAULT_CHAT_MODEL: AzureChatModel.Gpt51,
    });

    expect(env.AZURE_OPENAI_DEFAULT_CHAT_MODEL).toBe(AzureChatModel.Gpt51);
  });

  it('throws when the default chat model is not a known model', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        AZURE_OPENAI_DEFAULT_CHAT_MODEL: 'gpt-3',
      }),
    ).toThrow();
  });

  it('throws a readable error when required vars are missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws when an enum value is invalid', () => {
    expect(() =>
      validateEnv({ ...validConfig, NODE_ENV: 'staging' }),
    ).toThrow();
  });
});
