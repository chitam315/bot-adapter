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
exports.AzureOpenAiProvider = void 0;
const common_1 = require("@nestjs/common");
const azure_1 = require("@ai-sdk/azure");
const config_service_1 = require("../config/config.service");
let AzureOpenAiProvider = class AzureOpenAiProvider {
    config;
    provider;
    constructor(config) {
        this.config = config;
        this.provider = (0, azure_1.createAzure)({
            baseURL: config.azureOpenAi.endpoint,
            apiKey: config.azureOpenAi.apiKey,
            apiVersion: config.azureOpenAi.apiVersion,
        });
    }
    chatModel() {
        return this.provider.chat(this.config.azureOpenAi.chatDeployment);
    }
    embeddingModel() {
        return this.provider.embedding(this.config.azureOpenAi.embeddingDeployment);
    }
};
exports.AzureOpenAiProvider = AzureOpenAiProvider;
exports.AzureOpenAiProvider = AzureOpenAiProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.AppConfigService])
], AzureOpenAiProvider);
//# sourceMappingURL=azure-openai.provider.js.map