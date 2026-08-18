// Dummy values so ConfigModule's fail-fast env validation passes for both
// unit and e2e tests — @nestjs/config validates process.env as soon as
// config.module.ts is imported (even indirectly), before any DI overrides
// in an individual spec take effect. Real DB/Azure OpenAI calls are
// avoided by mocking at the provider boundary (see __mocks__/) and, for
// e2e, by overriding PG_POOL/DRIZZLE/GenerationService per spec.
process.env.DATABASE_URL ??=
  'postgres://user:password@localhost:5432/bot_adapter_test';
process.env.AZURE_OPENAI_ENDPOINT ??= 'https://test-resource.openai.azure.com';
process.env.AZURE_OPENAI_REGION ??= 'eastus';
process.env.AZURE_OPENAI_API_KEY ??= 'test-api-key';
process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ??= 'test-chat-deployment';
process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ??= 'test-embedding-deployment';
