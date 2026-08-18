import { ClientSecretCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import {
  isKeyVaultEnabled,
  KeyVaultEnv,
  parseKeyVaultEnv,
} from './key-vault-env.schema';

/**
 * Maps process.env keys to their Azure Key Vault secret name. Key Vault
 * secret names may only contain letters, digits, and hyphens (no
 * underscores), hence the separate kebab-case names. Only genuinely
 * sensitive values are listed here — add more as needed.
 */
const SECRET_NAME_BY_ENV_KEY: Readonly<Record<string, string>> = {
  DATABASE_URL: 'database-url',
  MICROSOFT_APP_PASSWORD: 'microsoft-app-password',
  AZURE_OPENAI_API_KEY: 'azure-openai-api-key',
};

/**
 * Overrides select process.env values with secrets fetched from Azure Key
 * Vault, when Key Vault is configured (AZURE_KEY_VAULT_URL set). For each
 * secret, Key Vault takes priority; if Key Vault doesn't have that secret,
 * whatever's already in process.env (e.g. from .env) is left untouched. If
 * Key Vault isn't configured at all, this is a no-op.
 *
 * Must run, and resolve, before ConfigModule is imported anywhere:
 * @nestjs/config's `validate` option runs synchronously as an import-time
 * side effect of config.module.ts's `@Module()` decorator, so it can't wait
 * on an async secret fetch initiated from inside Nest's own bootstrap
 * lifecycle. See main.ts, which defers importing AppModule until after this
 * resolves.
 */
export async function loadKeyVaultSecrets(
  env: KeyVaultEnv = parseKeyVaultEnv(),
): Promise<void> {
  if (!isKeyVaultEnabled(env)) {
    return;
  }

  const credential = new ClientSecretCredential(
    env.AZURE_KEY_VAULT_TENANT_ID,
    env.AZURE_KEY_VAULT_CLIENT_ID,
    env.AZURE_KEY_VAULT_CLIENT_SECRET,
  );
  const client = new SecretClient(env.AZURE_KEY_VAULT_URL, credential);

  await Promise.all(
    Object.entries(SECRET_NAME_BY_ENV_KEY).map(async ([envKey, secretName]) => {
      try {
        const secret = await client.getSecret(secretName);
        if (secret.value) {
          process.env[envKey] = secret.value;
        }
      } catch (error) {
        if (isSecretNotFoundError(error)) {
          return;
        }
        throw new Error(
          `Failed to read Key Vault secret "${secretName}" (for ${envKey}): ${(error as Error).message}`,
        );
      }
    }),
  );
}

function isSecretNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}
