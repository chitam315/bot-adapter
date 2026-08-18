import { z } from 'zod';
export declare const keyVaultEnvSchema: z.ZodObject<{
    AZURE_KEY_VAULT_URL: z.ZodOptional<z.ZodString>;
    AZURE_KEY_VAULT_TENANT_ID: z.ZodOptional<z.ZodString>;
    AZURE_KEY_VAULT_CLIENT_ID: z.ZodOptional<z.ZodString>;
    AZURE_KEY_VAULT_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type KeyVaultEnv = z.infer<typeof keyVaultEnvSchema>;
export type KeyVaultEnabledEnv = Required<KeyVaultEnv>;
export declare function parseKeyVaultEnv(env?: Record<string, string | undefined>): KeyVaultEnv;
export declare function isKeyVaultEnabled(env: KeyVaultEnv): env is KeyVaultEnabledEnv;
