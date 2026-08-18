"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: zod_1.z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
        .default('info'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    MICROSOFT_APP_ID: zod_1.z.string().default(''),
    MICROSOFT_APP_PASSWORD: zod_1.z.string().default(''),
    MICROSOFT_APP_TYPE: zod_1.z
        .enum(['MultiTenant', 'SingleTenant', 'UserAssignedMSI'])
        .default('MultiTenant'),
    MICROSOFT_APP_TENANT_ID: zod_1.z.string().default(''),
    AZURE_OPENAI_ENDPOINT: zod_1.z
        .string()
        .url('AZURE_OPENAI_ENDPOINT must be a valid URL'),
    AZURE_OPENAI_REGION: zod_1.z.string().min(1, 'AZURE_OPENAI_REGION is required'),
    AZURE_OPENAI_API_KEY: zod_1.z.string().min(1, 'AZURE_OPENAI_API_KEY is required'),
    AZURE_OPENAI_API_VERSION: zod_1.z.string().optional(),
    AZURE_OPENAI_CHAT_DEPLOYMENT: zod_1.z
        .string()
        .min(1, 'AZURE_OPENAI_CHAT_DEPLOYMENT is required'),
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: zod_1.z
        .string()
        .min(1, 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT is required'),
});
function validateEnv(config) {
    const result = exports.envSchema.safeParse(config);
    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    return result.data;
}
//# sourceMappingURL=env.schema.js.map