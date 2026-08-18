import type { EmbeddingModel, LanguageModel } from 'ai';
import { AppConfigService } from '../config/config.service';
export declare class AzureOpenAiProvider {
    private readonly config;
    private readonly provider;
    constructor(config: AppConfigService);
    chatModel(): LanguageModel;
    embeddingModel(): EmbeddingModel;
}
