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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get nodeEnv() {
        return this.configService.get('NODE_ENV', { infer: true });
    }
    get isProduction() {
        return this.nodeEnv === 'production';
    }
    get port() {
        return this.configService.get('PORT', { infer: true });
    }
    get logLevel() {
        return this.configService.get('LOG_LEVEL', { infer: true });
    }
    get database() {
        return {
            url: this.configService.get('DATABASE_URL', { infer: true }),
        };
    }
    get botFramework() {
        return {
            appId: this.configService.get('MICROSOFT_APP_ID', { infer: true }),
            appPassword: this.configService.get('MICROSOFT_APP_PASSWORD', {
                infer: true,
            }),
            appType: this.configService.get('MICROSOFT_APP_TYPE', { infer: true }),
            appTenantId: this.configService.get('MICROSOFT_APP_TENANT_ID', {
                infer: true,
            }),
        };
    }
    get azureOpenAi() {
        return {
            endpoint: this.configService.get('AZURE_OPENAI_ENDPOINT', {
                infer: true,
            }),
            region: this.configService.get('AZURE_OPENAI_REGION', { infer: true }),
            apiKey: this.configService.get('AZURE_OPENAI_API_KEY', { infer: true }),
            apiVersion: this.configService.get('AZURE_OPENAI_API_VERSION', {
                infer: true,
            }),
            chatDeployment: this.configService.get('AZURE_OPENAI_CHAT_DEPLOYMENT', {
                infer: true,
            }),
            embeddingDeployment: this.configService.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', { infer: true }),
        };
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=config.service.js.map