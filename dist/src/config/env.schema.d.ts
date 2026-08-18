import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        error: "error";
        fatal: "fatal";
        warn: "warn";
        info: "info";
        debug: "debug";
        trace: "trace";
        silent: "silent";
    }>>;
    DATABASE_URL: z.ZodString;
    MICROSOFT_APP_ID: z.ZodDefault<z.ZodString>;
    MICROSOFT_APP_PASSWORD: z.ZodDefault<z.ZodString>;
    MICROSOFT_APP_TYPE: z.ZodDefault<z.ZodEnum<{
        MultiTenant: "MultiTenant";
        SingleTenant: "SingleTenant";
        UserAssignedMSI: "UserAssignedMSI";
    }>>;
    MICROSOFT_APP_TENANT_ID: z.ZodDefault<z.ZodString>;
    AZURE_OPENAI_ENDPOINT: z.ZodString;
    AZURE_OPENAI_REGION: z.ZodString;
    AZURE_OPENAI_API_KEY: z.ZodString;
    AZURE_OPENAI_API_VERSION: z.ZodOptional<z.ZodString>;
    AZURE_OPENAI_CHAT_DEPLOYMENT: z.ZodString;
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.ZodString;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(config: Record<string, unknown>): Env;
