import { ClientSecretCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { loadKeyVaultSecrets } from './key-vault-secrets.loader';
import { KeyVaultEnv } from './key-vault-env.schema';

jest.mock('@azure/identity', () => ({ ClientSecretCredential: jest.fn() }));
jest.mock('@azure/keyvault-secrets', () => ({ SecretClient: jest.fn() }));

describe('loadKeyVaultSecrets', () => {
  const disabledEnv: KeyVaultEnv = {
    AZURE_KEY_VAULT_URL: undefined,
    AZURE_KEY_VAULT_TENANT_ID: undefined,
    AZURE_KEY_VAULT_CLIENT_ID: undefined,
    AZURE_KEY_VAULT_CLIENT_SECRET: undefined,
  };

  const enabledEnv: KeyVaultEnv = {
    AZURE_KEY_VAULT_URL: 'https://test-vault.vault.azure.net',
    AZURE_KEY_VAULT_TENANT_ID: 'tenant-id',
    AZURE_KEY_VAULT_CLIENT_ID: 'client-id',
    AZURE_KEY_VAULT_CLIENT_SECRET: 'client-secret',
  };

  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it('does nothing when Key Vault is not configured', async () => {
    await loadKeyVaultSecrets(disabledEnv);

    expect(SecretClient).not.toHaveBeenCalled();
  });

  it('authenticates with a ClientSecretCredential built from the four vars', async () => {
    jest
      .mocked(SecretClient)
      .mockImplementation(
        () => ({ getSecret: jest.fn().mockResolvedValue({}) }) as never,
      );

    await loadKeyVaultSecrets(enabledEnv);

    expect(ClientSecretCredential).toHaveBeenCalledWith(
      'tenant-id',
      'client-id',
      'client-secret',
    );
    expect(SecretClient).toHaveBeenCalledWith(
      'https://test-vault.vault.azure.net',
      expect.anything(),
    );
  });

  it('overrides process.env for secrets Key Vault has, and leaves the rest alone', async () => {
    const getSecret = jest.fn().mockImplementation((name: string) => {
      if (name === 'database-url') {
        return Promise.resolve({
          value: 'postgres://from-vault',
          name,
          properties: {},
        });
      }
      return Promise.reject(
        Object.assign(new Error('not found'), { statusCode: 404 }),
      );
    });
    jest
      .mocked(SecretClient)
      .mockImplementation(() => ({ getSecret }) as never);

    process.env.DATABASE_URL = 'postgres://from-env';
    process.env.MICROSOFT_APP_PASSWORD = 'env-password';
    process.env.AZURE_OPENAI_API_KEY = 'env-key';

    await loadKeyVaultSecrets(enabledEnv);

    expect(process.env.DATABASE_URL).toBe('postgres://from-vault');
    expect(process.env.MICROSOFT_APP_PASSWORD).toBe('env-password');
    expect(process.env.AZURE_OPENAI_API_KEY).toBe('env-key');
  });

  it('throws on a non-404 Key Vault error instead of silently falling back to .env', async () => {
    const getSecret = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('unauthorized'), { statusCode: 403 }),
      );
    jest
      .mocked(SecretClient)
      .mockImplementation(() => ({ getSecret }) as never);

    await expect(loadKeyVaultSecrets(enabledEnv)).rejects.toThrow(
      /unauthorized/,
    );
  });
});
