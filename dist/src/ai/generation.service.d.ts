import { Tool } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: string;
}
export interface GenerateReplyInput {
    text: string;
    history?: ConversationTurn[];
}
export declare class GenerationService {
    private readonly azureOpenAi;
    private readonly knowledgeBaseTool;
    constructor(azureOpenAi: AzureOpenAiProvider, knowledgeBaseTool: Tool);
    generateReply({ text, history, }: GenerateReplyInput): Promise<string>;
}
