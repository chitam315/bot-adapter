import { Inject, Injectable } from '@nestjs/common';
import { generateText, ModelMessage, stepCountIs, Tool } from 'ai';
import { AzureOpenAiProvider } from '../azure-openai/azure-openai.provider';
import { KNOWLEDGE_BASE_TOOL } from './ai.constants';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateReplyInput {
  text: string;
  history?: ConversationTurn[];
}

const SYSTEM_PROMPT = `You are a helpful assistant answering questions inside Microsoft Teams.
Use the searchKnowledgeBase tool whenever a question might be answered by internal FAQs or documents.
If the knowledge base doesn't have a relevant answer, say so honestly instead of guessing.`;

// Caps model <-> tool round trips for a single turn, not just tool call count.
const MAX_STEPS = 5;

/**
 * Orchestrates one Teams turn's reply generation. Returns the full text
 * rather than a stream — see docs/ARCHITECTURE.md for why Teams doesn't get
 * token-by-token streaming in this scaffold.
 */
@Injectable()
export class GenerationService {
  constructor(
    private readonly azureOpenAi: AzureOpenAiProvider,
    @Inject(KNOWLEDGE_BASE_TOOL) private readonly knowledgeBaseTool: Tool,
  ) {}

  async generateReply({
    text,
    history = [],
  }: GenerateReplyInput): Promise<string> {
    const messages: ModelMessage[] = [
      ...history.map((turn): ModelMessage => ({
        role: turn.role,
        content: turn.content,
      })),
      { role: 'user', content: text },
    ];

    const result = await generateText({
      model: this.azureOpenAi.chatModel(),
      system: SYSTEM_PROMPT,
      messages,
      tools: { searchKnowledgeBase: this.knowledgeBaseTool },
      stopWhen: stepCountIs(MAX_STEPS),
    });

    return result.text;
  }
}
