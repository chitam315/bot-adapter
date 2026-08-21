import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureChatModel, AzureOpenAiRegion } from '../constants';
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
      defaultChatModel: this.configService.get(
        'AZURE_OPENAI_DEFAULT_CHAT_MODEL',
        { infer: true },
      ),
      regions: {
        [AzureOpenAiRegion.Aue]: {
          endpoint: this.configService.get('AZURE_OPENAI_ENDPOINT', {
            infer: true,
          }),
          apiKey: this.configService.get('AZURE_OPENAI_API_KEY', {
            infer: true,
          }),
        },
        [AzureOpenAiRegion.Sea]: {
          endpoint: this.configService.get('AZURE_OPENAI2_ENDPOINT', {
            infer: true,
          }),
          apiKey: this.configService.get('AZURE_OPENAI2_API_KEY', {
            infer: true,
          }),
        },
      },
      chatDeployments: {
        [AzureChatModel.Gpt41]: this.configService.get(
          'AZURE_OPENAI_GPT_4_1_DEPLOYMENT',
          { infer: true },
        ),
        [AzureChatModel.Gpt5]: this.configService.get(
          'AZURE_OPENAI_GPT_5_DEPLOYMENT',
          { infer: true },
        ),
        [AzureChatModel.O4Mini]: this.configService.get(
          'AZURE_OPENAI_O4_MINI_DEPLOYMENT',
          { infer: true },
        ),
        [AzureChatModel.Gpt41Mini]: this.configService.get(
          'AZURE_OPENAI2_GPT_4_1_MINI_DEPLOYMENT',
          { infer: true },
        ),
        [AzureChatModel.Gpt51]: this.configService.get(
          'AZURE_OPENAI2_GPT_5_1_DEPLOYMENT',
          { infer: true },
        ),
      },
      embeddingDeployment: this.configService.get(
        'AZURE_OPENAI2_EMBEDDING_DEPLOYMENT',
        { infer: true },
      ),
    };
  }

  get sso() {
    return {
      issuer: this.configService.get('SSO_ISSUER', { infer: true }),
      clientId: this.configService.get('SSO_CLIENT_ID', { infer: true }),
      cookieName: this.configService.get('SSO_COOKIE_NAME', { infer: true }),
    };
  }

  get aiaPlus() {
    const rawPem = this.configService.get('AIA_PLUS_PUBLIC_KEY_PEM', {
      infer: true,
    });

    return {
      // Supports both a real multi-line PEM (dotenv preserves newlines in a
      // quoted multi-line value) and a flattened one using literal "\n" —
      // the replace is a no-op when the value already has real newlines.
      publicKeyPem: rawPem.replace(/\\n/g, '\n'),
      cookieName: this.configService.get('AIA_PLUS_COOKIE_NAME', {
        infer: true,
      }),
    };
  }
}
