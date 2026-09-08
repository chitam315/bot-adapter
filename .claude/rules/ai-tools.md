---
paths:
  - "src/ai/**"
---

## RAG is a model-invoked tool, not hardcoded context

The knowledge-base search is registered as an AI SDK `tool()`
([knowledge-base.tool.ts](../../src/ai/tools/knowledge-base.tool.ts)) passed
to `generateText`; the model decides whether to call it. To add another
tool:

1. Write a factory function returning
   `tool({ description, inputSchema: z.object({...}), execute })` — mirror
   `knowledge-base.tool.ts`.
2. Register it as a provider in `ai.module.ts` behind its own `Symbol` token
   from `src/constants/`.
3. Inject it into `GenerationService` and add it to the `tools: {...}` map
   passed to `generateText`.

Write the tool's `description` for the *model*, not for a human reader —
it's the only signal the model has for deciding when to call the tool.
