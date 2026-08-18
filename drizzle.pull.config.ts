import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Separate from drizzle.config.ts because drizzle-kit ignores the config
// file's fields for any param also passed on the CLI (e.g. `--out`) — so
// `drizzle-kit pull --out=...` alone can't reuse the main config's dialect/
// dbCredentials. Keeping `out` here instead, as a full config file, avoids
// that. See package.json's `db:pull` script and docs/ARCHITECTURE.md §6.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set (see .env.example) before running drizzle-kit commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/schema/_generated',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
