"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drizzleProvider = exports.pgPoolProvider = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const pg_2 = require("pgvector/pg");
const config_service_1 = require("../config/config.service");
const database_constants_1 = require("./database.constants");
const schema = require("./schema");
const logger = new common_1.Logger('DatabaseModule');
exports.pgPoolProvider = {
    provide: database_constants_1.PG_POOL,
    inject: [config_service_1.AppConfigService],
    useFactory: (config) => {
        const pool = new pg_1.Pool({ connectionString: config.database.url });
        pool.on('connect', (client) => {
            (0, pg_2.registerTypes)(client).catch((error) => {
                logger.warn(`pgvector type registration skipped: ${error.message}`);
            });
        });
        pool.on('error', (error) => {
            logger.error(`Unexpected Postgres pool error: ${error.message}`, error.stack);
        });
        return pool;
    },
};
exports.drizzleProvider = {
    provide: database_constants_1.DRIZZLE,
    inject: [database_constants_1.PG_POOL],
    useFactory: (pool) => (0, node_postgres_1.drizzle)(pool, { schema }),
};
//# sourceMappingURL=database.providers.js.map