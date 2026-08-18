"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureOpenAiModule = void 0;
const common_1 = require("@nestjs/common");
const config_module_1 = require("../config/config.module");
const azure_openai_provider_1 = require("./azure-openai.provider");
const embedding_service_1 = require("./embedding.service");
let AzureOpenAiModule = class AzureOpenAiModule {
};
exports.AzureOpenAiModule = AzureOpenAiModule;
exports.AzureOpenAiModule = AzureOpenAiModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule],
        providers: [azure_openai_provider_1.AzureOpenAiProvider, embedding_service_1.EmbeddingService],
        exports: [azure_openai_provider_1.AzureOpenAiProvider, embedding_service_1.EmbeddingService],
    })
], AzureOpenAiModule);
//# sourceMappingURL=azure-openai.module.js.map