// Dummy values so ConfigModule's fail-fast env validation passes for both
// unit and e2e tests — @nestjs/config validates process.env as soon as
// config.module.ts is imported (even indirectly), before any DI overrides
// in an individual spec take effect. Real DB/Azure OpenAI calls are
// avoided by mocking at the provider boundary (see __mocks__/) and, for
// e2e, by overriding PG_POOL/DRIZZLE/GenerationService per spec.
process.env.DATABASE_URL ??=
  'postgres://user:password@localhost:5432/bot_adapter_test';
process.env.AZURE_OPENAI_ENDPOINT ??=
  'https://test-resource-aue.openai.azure.com';
process.env.AZURE_OPENAI_API_KEY ??= 'test-aue-api-key';
process.env.AZURE_OPENAI_GPT_4_1_DEPLOYMENT ??= 'test-gpt-4.1-deployment';
process.env.AZURE_OPENAI_GPT_5_DEPLOYMENT ??= 'test-gpt-5-deployment';
process.env.AZURE_OPENAI_O4_MINI_DEPLOYMENT ??= 'test-o4-mini-deployment';
process.env.AZURE_OPENAI2_ENDPOINT ??=
  'https://test-resource-sea.openai.azure.com';
process.env.AZURE_OPENAI2_API_KEY ??= 'test-sea-api-key';
process.env.AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT ??=
  'test-gpt-4.1-mini-deployment';
process.env.AZURE_OPENAI2_GPT_5_1_DEPLOYMENT ??= 'test-gpt-5.1-deployment';
process.env.AZURE_OPENAI2_EMBEDDING_DEPLOYMENT ??= 'test-embedding-deployment';
process.env.SSO_ISSUER ??= 'https://sso.test.example.com';
process.env.SSO_CLIENT_ID ??= 'test-sso-client-id';
process.env.AIA_PLUS_PUBLIC_KEY_PEM ??=
  '-----BEGIN PUBLIC KEY-----\ntest-key\n-----END PUBLIC KEY-----';
