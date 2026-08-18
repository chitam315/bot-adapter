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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const terminus_1 = require("@nestjs/terminus");
const pg_1 = require("pg");
const database_constants_1 = require("../database/database.constants");
let HealthController = class HealthController {
    health;
    indicatorService;
    pool;
    constructor(health, indicatorService, pool) {
        this.health = health;
        this.indicatorService = indicatorService;
        this.pool = pool;
    }
    check() {
        return this.health.check([
            async () => {
                const indicator = this.indicatorService.check('database');
                try {
                    await this.pool.query('SELECT 1');
                    return indicator.up();
                }
                catch (error) {
                    return indicator.down({ message: error.message });
                }
            },
        ]);
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, common_1.Controller)('health'),
    __param(2, (0, common_1.Inject)(database_constants_1.PG_POOL)),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        terminus_1.HealthIndicatorService,
        pg_1.Pool])
], HealthController);
//# sourceMappingURL=health.controller.js.map