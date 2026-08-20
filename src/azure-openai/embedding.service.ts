import { Injectable } from '@nestjs/common';
import { embed, embedMany } from 'ai';
import { EMBEDDING_DIMENSIONS } from '../constants';
import { AzureOpenAiProvider } from './azure-openai.provider';

// text-embedding-3-large natively outputs more dimensions than this; the
// `openai` provider options key is correct even against the Azure endpoint
// (@ai-sdk/azure's embedding model is the OpenAI-compatible implementation).
const EMBEDDING_PROVIDER_OPTIONS = {
  openai: { dimensions: EMBEDDING_DIMENSIONS },
};

@Injectable()
export class EmbeddingService {
  constructor(private readonly azureOpenAi: AzureOpenAiProvider) {}

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.azureOpenAi.embeddingModel(),
      value: text,
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    });

    return embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const { embeddings } = await embedMany({
      model: this.azureOpenAi.embeddingModel(),
      values: texts,
      providerOptions: EMBEDDING_PROVIDER_OPTIONS,
    });

    return embeddings;
  }
}
