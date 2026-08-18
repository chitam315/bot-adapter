"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const azure_openai_module_1 = require("../azure-openai/azure-openai.module");
const knowledge_base_module_1 = require("../knowledge-base/knowledge-base.module");
const knowledge_base_service_1 = require("../knowledge-base/knowledge-base.service");
const ai_constants_1 = require("./ai.constants");
const generation_service_1 = require("./generation.service");
const knowledge_base_tool_1 = require("./tools/knowledge-base.tool");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [azure_openai_module_1.AzureOpenAiModule, knowledge_base_module_1.KnowledgeBaseModule],
        providers: [
            {
                provide: ai_constants_1.KNOWLEDGE_BASE_TOOL,
                inject: [knowledge_base_service_1.KnowledgeBaseService],
                useFactory: knowledge_base_tool_1.createKnowledgeBaseTool,
            },
            generation_service_1.GenerationService,
        ],
        exports: [generation_service_1.GenerationService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map