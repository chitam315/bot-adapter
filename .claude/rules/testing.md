---
paths:
  - "**/*.spec.ts"
  - "test/**"
  - "__mocks__/**"
---

## Testing gotchas

(see [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §12 for the full list)

- `ai`, `@ai-sdk/azure`, and `pgvector` are ESM-only; Jest can't load them
  directly, so root-level manual mocks in
  [`__mocks__/`](../../__mocks__/) are applied automatically to every spec.
  A spec needing call-specific assertions overrides individual exports with
  its own `jest.mock(...)`.
- e2e specs (`test/*.e2e-spec.ts`) boot the full `AppModule` and override
  `PG_POOL`/`DRIZZLE` (no real Postgres needed) and whatever else would
  otherwise make a real network call (`GenerationService`, `BOT_ADAPTER`,
  `JwtAuthGuard`). `test/jest-env.setup.ts` seeds dummy required env vars for
  both unit and e2e configs.
- A mock object with a `.then` method gets silently unwrapped by Nest's DI
  when used as a `useValue` (treated as a thenable) — give the *terminal*
  method of a chained mock (e.g. Drizzle's `.limit()`) the Promise-returning
  implementation, not the whole chain object.
