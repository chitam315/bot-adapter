import { z } from 'zod';

/**
 * Credentials for connecting to Azure Key Vault itself. These are read
 * directly from process.env (not through the main env.schema.ts /
 * AppConfigService pipeline) because they must be resolved *before*
 * ConfigModule's fail-fast validation runs — see key-vault-secrets.loader.ts
 * for why.
 */
export const keyVaultEnvSchema = z
  .object({
    AZURE_KEY_VAULT_URL: z
      .string()
      .url('AZURE_KEY_VAULT_URL must be a valid URL')
      .optional(),
    AZURE_KEY_VAULT_TENANT_ID: z.string().min(1).optional(),
    AZURE_KEY_VAULT_CLIENT_ID: z.string().min(1).optional(),
    AZURE_KEY_VAULT_CLIENT_SECRET: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const values = [
      value.AZURE_KEY_VAULT_URL,
      value.AZURE_KEY_VAULT_TENANT_ID,
      value.AZURE_KEY_VAULT_CLIENT_ID,
      value.AZURE_KEY_VAULT_CLIENT_SECRET,
    ];
    const presentCount = values.filter((v) => v !== undefined).length;

    if (presentCount !== 0 && presentCount !== values.length) {
      ctx.addIssue({
        code: 'custom',
        message:
          'AZURE_KEY_VAULT_URL, AZURE_KEY_VAULT_TENANT_ID, AZURE_KEY_VAULT_CLIENT_ID, and ' +
          'AZURE_KEY_VAULT_CLIENT_SECRET must all be set together, or all left unset to disable ' +
          'Key Vault integration.',
      });
    }
  });

export type KeyVaultEnv = z.infer<typeof keyVaultEnvSchema>;
export type KeyVaultEnabledEnv = Required<KeyVaultEnv>;

export function parseKeyVaultEnv(
  env: Record<string, string | undefined> = process.env,
): KeyVaultEnv {
  const result = keyVaultEnvSchema.safeParse(env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid Key Vault bootstrap configuration:\n${formatted}`);
  }

  return result.data;
}

export function isKeyVaultEnabled(env: KeyVaultEnv): env is KeyVaultEnabledEnv {
  return env.AZURE_KEY_VAULT_URL !== undefined;
}
