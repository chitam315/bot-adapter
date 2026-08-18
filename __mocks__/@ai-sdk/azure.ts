// Manual mock for '@ai-sdk/azure', applied automatically by Jest (root-level
// __mocks__/, adjacent to node_modules). Same rationale as __mocks__/ai.ts:
// ESM-only with no CJS build, and we never want a real Azure OpenAI client
// constructed during unit tests anyway.
export function createAzure(): { chat: jest.Mock; embedding: jest.Mock } {
  return {
    chat: jest.fn(),
    embedding: jest.fn(),
  };
}
