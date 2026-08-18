"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const config_module_1 = require("../config/config.module");
const database_constants_1 = require("./database.constants");
const database_providers_1 = require("./database.providers");
let DatabaseModule = class DatabaseModule {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async onApplicationShutdown() {
        await this.pool.end();
    }
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule],
        providers: [database_providers_1.pgPoolProvider, database_providers_1.drizzleProvider],
        exports: [database_constants_1.DRIZZLE, database_constants_1.PG_POOL],
    }),
    __param(0, (0, common_1.Inject)(database_constants_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], DatabaseModule);
//# sourceMappingURL=database.module.js.map