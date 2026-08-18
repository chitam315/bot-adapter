import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const validConfig = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/bot_adapter',
    AZURE_OPENAI_ENDPOINT: 'https://my-resource.openai.azure.com',
    AZURE_OPENAI_REGION: 'eastus',
    AZURE_OPENAI_API_KEY: 'api-key',
    AZURE_OPENAI_CHAT_DEPLOYMENT: 'chat-deployment',
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: 'embedding-deployment',
  };

  it('returns typed, defaulted config for valid input', () => {
    const env = validateEnv(validConfig);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.MICROSOFT_APP_TYPE).toBe('MultiTenant');
    expect(env.DATABASE_URL).toBe(validConfig.DATABASE_URL);
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
