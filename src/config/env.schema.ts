import { z } from 'zod';
import { AzureChatModel } from '../constants';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Postgres connection string, e.g. postgres://user:pass@host:5432/db?sslmode=require
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Azure Bot Service / Bot Framework registration. App ID/password may be left empty
  // for local development against the Bot Framework Emulator (unauthenticated mode).
  MICROSOFT_APP_ID: z.string().default(''),
  MICROSOFT_APP_PASSWORD: z.string().default(''),
  MICROSOFT_APP_TYPE: z
    .enum(['MultiTenant', 'SingleTenant', 'UserAssignedMSI'])
    .default('MultiTenant'),
  MICROSOFT_APP_TENANT_ID: z.string().default(''),

  // Azure OpenAI, consumed via the Vercel AI SDK (@ai-sdk/azure). Two
  // separate resources (AUE, SEA), each with its own endpoint/key and its
  // own subset of chat model deployments — see AZURE_CHAT_MODEL_REGION in
  // src/constants/azure-openai.constants.ts for which model lives where.
  // Embeddings (text-embedding-3-large) are only deployed in SEA.
  AZURE_OPENAI_ENDPOINT: z
    .string()
    .url('AZURE_OPENAI_ENDPOINT must be a valid URL'),
  AZURE_OPENAI_API_KEY: z.string().min(1, 'AZURE_OPENAI_API_KEY is required'),
  AZURE_OPENAI_GPT_4_1_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI_GPT_4_1_DEPLOYMENT is required'),
  AZURE_OPENAI_GPT_5_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI_GPT_5_DEPLOYMENT is required'),
  AZURE_OPENAI_O4_MINI_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI_O4_MINI_DEPLOYMENT is required'),

  AZURE_OPENAI2_ENDPOINT: z
    .string()
    .url('AZURE_OPENAI2_ENDPOINT must be a valid URL'),
  AZURE_OPENAI2_API_KEY: z.string().min(1, 'AZURE_OPENAI2_API_KEY is required'),
  AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT is required'),
  AZURE_OPENAI2_GPT_5_1_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI2_GPT_5_1_DEPLOYMENT is required'),
  AZURE_OPENAI2_EMBEDDING_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI2_EMBEDDING_DEPLOYMENT is required'),

  // Chat model used when a caller doesn't ask for a specific one at runtime.
  AZURE_OPENAI_DEFAULT_CHAT_MODEL: z
    .nativeEnum(AzureChatModel)
    .default(AzureChatModel.Gpt41),

  // SSO/OIDC — verifies the bearer token in SSO_COOKIE_NAME's cookie against
  // the issuer's JWKS (fetched via OIDC discovery, see JwtVerifierService).
  SSO_ISSUER: z.string().url('SSO_ISSUER must be a valid URL'),
  SSO_CLIENT_ID: z.string().min(1, 'SSO_CLIENT_ID is required'),
  SSO_COOKIE_NAME: z.string().min(1).default('idToken'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Passed to @nestjs/config's `validate` option so the app fails fast on boot
 * with a readable error instead of crashing obscurely later when a value is first read.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  return result.data;
}
