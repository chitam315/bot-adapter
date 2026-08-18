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
var LoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const nestjs_pino_1 = require("nestjs-pino");
let LoggingInterceptor = LoggingInterceptor_1 = class LoggingInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext(LoggingInterceptor_1.name);
    }
    intercept(context, next) {
        const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
        const startedAt = Date.now();
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                this.logger.debug({ handler: handlerName, durationMs: Date.now() - startedAt }, 'Handler completed');
            },
            error: (error) => {
                this.logger.debug({
                    handler: handlerName,
                    durationMs: Date.now() - startedAt,
                    err: error,
                }, 'Handler failed');
            },
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = LoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nestjs_pino_1.PinoLogger])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map