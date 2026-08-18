"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyVaultEnvSchema = void 0;
exports.parseKeyVaultEnv = parseKeyVaultEnv;
exports.isKeyVaultEnabled = isKeyVaultEnabled;
const zod_1 = require("zod");
exports.keyVaultEnvSchema = zod_1.z
    .object({
    AZURE_KEY_VAULT_URL: zod_1.z
        .string()
        .url('AZURE_KEY_VAULT_URL must be a valid URL')
        .optional(),
    AZURE_KEY_VAULT_TENANT_ID: zod_1.z.string().min(1).optional(),
    AZURE_KEY_VAULT_CLIENT_ID: zod_1.z.string().min(1).optional(),
    AZURE_KEY_VAULT_CLIENT_SECRET: zod_1.z.string().min(1).optional(),
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
            message: 'AZURE_KEY_VAULT_URL, AZURE_KEY_VAULT_TENANT_ID, AZURE_KEY_VAULT_CLIENT_ID, and ' +
                'AZURE_KEY_VAULT_CLIENT_SECRET must all be set together, or all left unset to disable ' +
                'Key Vault integration.',
        });
    }
});
function parseKeyVaultEnv(env = process.env) {
    const result = exports.keyVaultEnvSchema.safeParse(env);
    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `  - ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid Key Vault bootstrap configuration:\n${formatted}`);
    }
    return result.data;
}
function isKeyVaultEnabled(env) {
    return env.AZURE_KEY_VAULT_URL !== undefined;
}
//# sourceMappingURL=key-vault-env.schema.js.map