import { AzureOpenAiProvider } from './azure-openai.provider';
export declare class EmbeddingService {
    private readonly azureOpenAi;
    constructor(azureOpenAi: AzureOpenAiProvider);
    embed(text: string): Promise<number[]>;
}
