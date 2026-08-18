import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from './env.schema';

/**
 * Thin, typed wrapper around @nestjs/config's ConfigService, grouped by
 * consumer so callers never touch raw env var names.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get logLevel(): string {
    return this.configService.get('LOG_LEVEL', { infer: true });
  }

  get database() {
    return {
      url: this.configService.get('DATABASE_URL', { infer: true }),
    };
  }

  get botFramework() {
    return {
      appId: this.configService.get('MICROSOFT_APP_ID', { infer: true }),
      appPassword: this.configService.get('MICROSOFT_APP_PASSWORD', {
        infer: true,
      }),
      appType: this.configService.get('MICROSOFT_APP_TYPE', { infer: true }),
      appTenantId: this.configService.get('MICROSOFT_APP_TENANT_ID', {
        infer: true,
      }),
    };
  }

  get azureOpenAi() {
    return {
      endpoint: this.configService.get('AZURE_OPENAI_ENDPOINT', {
        infer: true,
      }),
      region: this.configService.get('AZURE_OPENAI_REGION', { infer: true }),
      apiKey: this.configService.get('AZURE_OPENAI_API_KEY', { infer: true }),
      apiVersion: this.configService.get('AZURE_OPENAI_API_VERSION', {
        infer: true,
      }),
      chatDeployment: this.configService.get('AZURE_OPENAI_CHAT_DEPLOYMENT', {
        infer: true,
      }),
      embeddingDeployment: this.configService.get(
        'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
        { infer: true },
      ),
    };
  }
}
