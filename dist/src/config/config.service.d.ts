import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';
export declare class AppConfigService {
    private readonly configService;
    constructor(configService: ConfigService<Env, true>);
    get nodeEnv(): Env['NODE_ENV'];
    get isProduction(): boolean;
    get port(): number;
    get logLevel(): string;
    get database(): {
        url: string;
    };
    get botFramework(): {
        appId: string;
        appPassword: string;
        appType: "MultiTenant" | "SingleTenant" | "UserAssignedMSI";
        appTenantId: string;
    };
    get azureOpenAi(): {
        endpoint: string;
        region: string;
        apiKey: string;
        apiVersion: string | undefined;
        chatDeployment: string;
        embeddingDeployment: string;
    };
}
