export const KNOWLEDGE_BASE_TOOL = Symbol('KNOWLEDGE_BASE_TOOL');

export const SYSTEM_PROMPT = `You are a helpful assistant answering questions inside Microsoft Teams.
Use the searchKnowledgeBase tool whenever a question might be answered by internal FAQs or documents.
If the knowledge base doesn't have a relevant answer, say so honestly instead of guessing.`;

// Caps model <-> tool round trips for a single turn, not just tool call count.
export const MAX_STEPS = 5;
