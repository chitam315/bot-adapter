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
var CoreModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const nestjs_pino_1 = require("nestjs-pino");
const pg_1 = require("pg");
const config_module_1 = require("../config/config.module");
const config_service_1 = require("../config/config.service");
const database_module_1 = require("../database/database.module");
const database_constants_1 = require("../database/database.constants");
let CoreModule = CoreModule_1 = class CoreModule {
    pool;
    logger = new common_1.Logger(CoreModule_1.name);
    constructor(pool) {
        this.pool = pool;
    }
    async onModuleInit() {
        await this.pool.query('SELECT 1');
        this.logger.log('bot-adapter booted; database connection verified');
    }
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = CoreModule_1 = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.ConfigModule,
            nestjs_pino_1.LoggerModule.forRootAsync({
                imports: [config_module_1.ConfigModule],
                inject: [config_service_1.AppConfigService],
                useFactory: (config) => ({
                    pinoHttp: {
                        level: config.logLevel,
                        genReqId: (req) => req.headers['x-correlation-id'] ??
                            (0, node_crypto_1.randomUUID)(),
                        redact: [
                            'req.headers.authorization',
                            'req.headers.cookie',
                            'req.headers["ocp-apim-subscription-key"]',
                        ],
                        transport: config.isProduction
                            ? undefined
                            : { target: 'pino-pretty', options: { singleLine: true } },
                    },
                }),
            }),
            database_module_1.DatabaseModule,
        ],
    }),
    __param(0, (0, common_1.Inject)(database_constants_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], CoreModule);
//# sourceMappingURL=core.module.js.map