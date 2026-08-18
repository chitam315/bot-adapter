// Manual mock for 'pgvector/pg', applied automatically by Jest (root-level
// __mocks__/, adjacent to node_modules). Like 'ai', pgvector ships ESM-only
// with no CJS build; unit tests never exercise a real Postgres connection
// anyway (DRIZZLE/PG_POOL are always mocked at the DI boundary), so this
// avoids the ESM-transform problem entirely rather than working around it.
export async function registerTypes(): Promise<void> {
  // no-op in tests
}
