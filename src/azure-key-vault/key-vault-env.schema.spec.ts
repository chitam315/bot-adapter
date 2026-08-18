import { isKeyVaultEnabled, parseKeyVaultEnv } from './key-vault-env.schema';

describe('parseKeyVaultEnv', () => {
  it('allows all four vars to be unset (Key Vault disabled)', () => {
    const env = parseKeyVaultEnv({});
    expect(isKeyVaultEnabled(env)).toBe(false);
  });

  it('allows all four vars to be set together (Key Vault enabled)', () => {
    const env = parseKeyVaultEnv({
      AZURE_KEY_VAULT_URL: 'https://my-vault.vault.azure.net',
      AZURE_KEY_VAULT_TENANT_ID: 'tenant-id',
      AZURE_KEY_VAULT_CLIENT_ID: 'client-id',
      AZURE_KEY_VAULT_CLIENT_SECRET: 'client-secret',
    });
    expect(isKeyVaultEnabled(env)).toBe(true);
  });

  it('throws when only some of the four vars are set', () => {
    expect(() =>
      parseKeyVaultEnv({
        AZURE_KEY_VAULT_URL: 'https://my-vault.vault.azure.net',
        AZURE_KEY_VAULT_TENANT_ID: 'tenant-id',
      }),
    ).toThrow(/must all be set together/);
  });

  it('throws when the URL is not a valid URL', () => {
    expect(() =>
      parseKeyVaultEnv({
        AZURE_KEY_VAULT_URL: 'not-a-url',
        AZURE_KEY_VAULT_TENANT_ID: 'tenant-id',
        AZURE_KEY_VAULT_CLIENT_ID: 'client-id',
        AZURE_KEY_VAULT_CLIENT_SECRET: 'client-secret',
      }),
    ).toThrow();
  });
});
