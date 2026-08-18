import { Injectable } from '@nestjs/common';
import { embed } from 'ai';
import { AzureOpenAiProvider } from './azure-openai.provider';

@Injectable()
export class EmbeddingService {
  constructor(private readonly azureOpenAi: AzureOpenAiProvider) {}

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.azureOpenAi.embeddingModel(),
      value: text,
    });

    return embedding;
  }
}
