import { Injectable } from '@nestjs/common';
import { createAzure } from '@ai-sdk/azure';
import type { EmbeddingModel, LanguageModel } from 'ai';
import {
  AZURE_CHAT_MODEL_REGION,
  AZURE_EMBEDDING_REGION,
  AzureChatModel,
  AzureOpenAiRegion,
} from '../constants';
import { AppConfigService } from '../config/config.service';

/**
 * Wraps the Vercel AI SDK's Azure OpenAI provider for both Azure OpenAI
 * resources (AUE, SEA) — each region has its own endpoint/key and its own
 * subset of chat model deployments, so callers pick a model by
 * AzureChatModel and this class resolves which resource + deployment name
 * that maps to. Embeddings only exist in one resource (SEA), so
 * embeddingModel() takes no argument.
 */
@Injectable()
export class AzureOpenAiProvider {
  private readonly providers: Record<
    AzureOpenAiRegion,
    ReturnType<typeof createAzure>
  >;

  constructor(private readonly config: AppConfigService) {
    const { regions } = config.azureOpenAi;

    this.providers = {
      [AzureOpenAiRegion.Aue]: createAzure({
        baseURL: regions[AzureOpenAiRegion.Aue].endpoint,
        apiKey: regions[AzureOpenAiRegion.Aue].apiKey,
        apiVersion: regions[AzureOpenAiRegion.Aue].apiVersion,
      }),
      [AzureOpenAiRegion.Sea]: createAzure({
        baseURL: regions[AzureOpenAiRegion.Sea].endpoint,
        apiKey: regions[AzureOpenAiRegion.Sea].apiKey,
        apiVersion: regions[AzureOpenAiRegion.Sea].apiVersion,
      }),
    };
  }

  chatModel(
    model: AzureChatModel = this.config.azureOpenAi.defaultChatModel,
  ): LanguageModel {
    const region = AZURE_CHAT_MODEL_REGION[model];
    const deployment = this.config.azureOpenAi.chatDeployments[model];

    return this.providers[region].chat(deployment);
  }

  embeddingModel(): EmbeddingModel {
    return this.providers[AZURE_EMBEDDING_REGION].embeddingModel(
      this.config.azureOpenAi.embeddingDeployment,
    );
  }
}
