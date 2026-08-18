import { z } from 'zod';

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

  // Azure OpenAI, consumed via the Vercel AI SDK (@ai-sdk/azure).
  // ENDPOINT/REGION/API_KEY match the "Keys and Endpoint" page in the Azure
  // Portal for the resource. REGION isn't used in the API call itself
  // (routing is fully determined by ENDPOINT) — it's captured for
  // reference/observability (e.g. logging, future region-aware routing).
  AZURE_OPENAI_ENDPOINT: z
    .string()
    .url('AZURE_OPENAI_ENDPOINT must be a valid URL'),
  AZURE_OPENAI_REGION: z.string().min(1, 'AZURE_OPENAI_REGION is required'),
  AZURE_OPENAI_API_KEY: z.string().min(1, 'AZURE_OPENAI_API_KEY is required'),
  AZURE_OPENAI_API_VERSION: z.string().optional(),
  AZURE_OPENAI_CHAT_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI_CHAT_DEPLOYMENT is required'),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z
    .string()
    .min(1, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT is required'),
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
