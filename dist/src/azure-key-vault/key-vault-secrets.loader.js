"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadKeyVaultSecrets = loadKeyVaultSecrets;
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const key_vault_env_schema_1 = require("./key-vault-env.schema");
const SECRET_NAME_BY_ENV_KEY = {
    DATABASE_URL: 'database-url',
    MICROSOFT_APP_PASSWORD: 'microsoft-app-password',
    AZURE_OPENAI_API_KEY: 'azure-openai-api-key',
};
async function loadKeyVaultSecrets(env = (0, key_vault_env_schema_1.parseKeyVaultEnv)()) {
    if (!(0, key_vault_env_schema_1.isKeyVaultEnabled)(env)) {
        return;
    }
    const credential = new identity_1.ClientSecretCredential(env.AZURE_KEY_VAULT_TENANT_ID, env.AZURE_KEY_VAULT_CLIENT_ID, env.AZURE_KEY_VAULT_CLIENT_SECRET);
    const client = new keyvault_secrets_1.SecretClient(env.AZURE_KEY_VAULT_URL, credential);
    await Promise.all(Object.entries(SECRET_NAME_BY_ENV_KEY).map(async ([envKey, secretName]) => {
        try {
            const secret = await client.getSecret(secretName);
            if (secret.value) {
                process.env[envKey] = secret.value;
            }
        }
        catch (error) {
            if (isSecretNotFoundError(error)) {
                return;
            }
            throw new Error(`Failed to read Key Vault secret "${secretName}" (for ${envKey}): ${error.message}`);
        }
    }));
}
function isSecretNotFoundError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 404);
}
//# sourceMappingURL=key-vault-secrets.loader.js.map