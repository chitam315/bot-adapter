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
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger;
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isHttpException = exception instanceof common_1.HttpException;
        const statusCode = isHttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = isHttpException
            ? this.extractMessage(exception)
            : 'Internal server error';
        const body = {
            statusCode,
            message,
            correlationId: this.toCorrelationId(request.id),
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        const error = exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error({ err: error, ...body }, 'Unhandled exception');
        response.status(statusCode).json(body);
    }
    toCorrelationId(id) {
        return typeof id === 'string' || typeof id === 'number'
            ? String(id)
            : JSON.stringify(id);
    }
    extractMessage(exception) {
        const response = exception.getResponse();
        if (typeof response === 'string') {
            return response;
        }
        if (typeof response === 'object' &&
            response !== null &&
            'message' in response) {
            const { message } = response;
            return Array.isArray(message) ? message.join(', ') : message;
        }
        return exception.message;
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [nestjs_pino_1.PinoLogger])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map