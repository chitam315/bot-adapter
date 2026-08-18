import { Injectable } from '@nestjs/common';
import { createAzure } from '@ai-sdk/azure';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { AppConfigService } from '../config/config.service';

/**
 * Wraps the Vercel AI SDK's Azure OpenAI provider, binding it to this app's
 * configured deployment names so callers never hardcode a deployment string.
 */
@Injectable()
export class AzureOpenAiProvider {
  private readonly provider: ReturnType<typeof createAzure>;

  constructor(private readonly config: AppConfigService) {
    this.provider = createAzure({
      baseURL: config.azureOpenAi.endpoint,
      apiKey: config.azureOpenAi.apiKey,
      apiVersion: config.azureOpenAi.apiVersion,
    });
  }

  chatModel(): LanguageModel {
    return this.provider.chat(this.config.azureOpenAi.chatDeployment);
  }

  embeddingModel(): EmbeddingModel {
    return this.provider.embedding(this.config.azureOpenAi.embeddingDeployment);
  }
}
