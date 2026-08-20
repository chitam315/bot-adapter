// Manual mock for the 'ai' package (Vercel AI SDK), applied automatically
// to every test by Jest since it lives in <projectRoot>/__mocks__/ adjacent
// to node_modules. 'ai' ships ESM-only with no CJS build, which our
// CommonJS Jest setup can't require() directly — and even if it could, we
// never want real LLM calls firing during unit tests anyway. Test files can
// still override individual exports with their own `jest.mock('ai', ...)`
// factory when they need call-specific assertions (e.g. generation.service.spec.ts).
export const generateText = jest.fn();
export const embed = jest.fn();
export const embedMany = jest.fn();
export const stepCountIs = jest.fn();

// The real `tool()` is close to an identity function around the object you
// pass it (schema/description/execute) — mirroring that here keeps specs
// that exercise a tool's inputSchema/execute (e.g. knowledge-base.tool.spec.ts)
// behaving the same as they would against the real implementation.
export function tool<T>(definition: T): T {
  return definition;
}
