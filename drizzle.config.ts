import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set (see .env.example) before running drizzle-kit commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // schema.ts mirrors the other app's `public` schema (introspected,
  // read-only) — bot-adapter only owns tables in the `bot_adapter` schema
  // (bot-adapter.schema.ts). Without this, generate/push still load
  // schema.ts's tables too and would emit statements against `public` the
  // moment it ever drifts from the real DB. This makes that impossible: the
  // CLI only ever diffs/touches `bot_adapter`, regardless of schema.ts's
  // state.
  schemaFilter: ['bot_adapter'],
  strict: true,
  verbose: true,
});
