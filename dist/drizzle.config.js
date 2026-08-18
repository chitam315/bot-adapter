"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const drizzle_kit_1 = require("drizzle-kit");
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set (see .env.example) before running drizzle-kit commands.');
}
exports.default = (0, drizzle_kit_1.defineConfig)({
    dialect: 'postgresql',
    schema: './src/database/schema/index.ts',
    out: './drizzle',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    strict: true,
    verbose: true,
});
//# sourceMappingURL=drizzle.config.js.map