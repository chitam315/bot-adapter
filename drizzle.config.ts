import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set (see .env.example) before running drizzle-kit commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  // Only the files bot-adapter actually owns — deliberately NOT
  // schema/index.ts, which also re-exports schema.ts (the introspected
  // mirror of the other app's `public` schema). Loading schema.ts here would
  // pull in its pgEnum()s (e.g. quiz_session_status) too — `schemaFilter`
  // below scopes *tables* to the bot_adapter Postgres schema, but Postgres
  // enums aren't schema-filtered the same way, so generate/push would still
  // try to touch that public-schema enum otherwise. Excluding schema.ts
  // entirely from the CLI's view is the only reliable fix.
  schema: [
    './src/database/schema/bot-adapter.schema.ts',
    './src/database/schema/bot-adapter.relations.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Belt-and-suspenders alongside the `schema` scoping above: also refuse to
  // consider anything outside the bot_adapter Postgres schema when diffing
  // against the live database.
  schemaFilter: ['bot_adapter'],
  strict: true,
  verbose: true,
});
