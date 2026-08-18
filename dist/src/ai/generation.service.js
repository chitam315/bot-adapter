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
exports.GenerationService = void 0;
const common_1 = require("@nestjs/common");
const ai_1 = require("ai");
const azure_openai_provider_1 = require("../azure-openai/azure-openai.provider");
const ai_constants_1 = require("./ai.constants");
const SYSTEM_PROMPT = `You are a helpful assistant answering questions inside Microsoft Teams.
Use the searchKnowledgeBase tool whenever a question might be answered by internal FAQs or documents.
If the knowledge base doesn't have a relevant answer, say so honestly instead of guessing.`;
const MAX_STEPS = 5;
let GenerationService = class GenerationService {
    azureOpenAi;
    knowledgeBaseTool;
    constructor(azureOpenAi, knowledgeBaseTool) {
        this.azureOpenAi = azureOpenAi;
        this.knowledgeBaseTool = knowledgeBaseTool;
    }
    async generateReply({ text, history = [], }) {
        const messages = [
            ...history.map((turn) => ({
                role: turn.role,
                content: turn.content,
            })),
            { role: 'user', content: text },
        ];
        const result = await (0, ai_1.generateText)({
            model: this.azureOpenAi.chatModel(),
            system: SYSTEM_PROMPT,
            messages,
            tools: { searchKnowledgeBase: this.knowledgeBaseTool },
            stopWhen: (0, ai_1.stepCountIs)(MAX_STEPS),
        });
        return result.text;
    }
};
exports.GenerationService = GenerationService;
exports.GenerationService = GenerationService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ai_constants_1.KNOWLEDGE_BASE_TOOL)),
    __metadata("design:paramtypes", [azure_openai_provider_1.AzureOpenAiProvider, Object])
], GenerationService);
//# sourceMappingURL=generation.service.js.map