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
var BotActivityHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotActivityHandler = void 0;
const common_1 = require("@nestjs/common");
const botbuilder_1 = require("botbuilder");
const nestjs_pino_1 = require("nestjs-pino");
const generation_service_1 = require("../ai/generation.service");
const bot_constants_1 = require("./bot.constants");
const MAX_HISTORY_TURNS = 10;
const HISTORY_STATE_KEY = 'conversationHistory';
let BotActivityHandler = BotActivityHandler_1 = class BotActivityHandler extends botbuilder_1.TeamsActivityHandler {
    generationService;
    logger;
    conversationState;
    historyProperty;
    constructor(storage, generationService, logger) {
        super();
        this.generationService = generationService;
        this.logger = logger;
        this.logger.setContext(BotActivityHandler_1.name);
        this.conversationState = new botbuilder_1.ConversationState(storage);
        this.historyProperty =
            this.conversationState.createProperty(HISTORY_STATE_KEY);
        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });
        this.onMembersAdded(async (context, next) => {
            await this.handleMembersAdded(context);
            await next();
        });
    }
    async handleMessage(context) {
        const userText = context.activity.text?.trim();
        if (!userText) {
            return;
        }
        await context.sendActivity({ type: botbuilder_1.ActivityTypes.Typing });
        const history = await this.historyProperty.get(context, []);
        let replyText;
        try {
            replyText = await this.generationService.generateReply({
                text: userText,
                history,
            });
        }
        catch (error) {
            this.logger.error({ err: error }, 'Failed to generate a reply');
            await context.sendActivity('Sorry, something went wrong while I was thinking about that. Please try again.');
            return;
        }
        const fullHistory = [
            ...history,
            { role: 'user', content: userText },
            { role: 'assistant', content: replyText },
        ];
        const updatedHistory = fullHistory.slice(-MAX_HISTORY_TURNS);
        await this.historyProperty.set(context, updatedHistory);
        await this.conversationState.saveChanges(context);
        await context.sendActivity(replyText);
    }
    async handleMembersAdded(context) {
        const membersAdded = context.activity.membersAdded ?? [];
        for (const member of membersAdded) {
            if (member.id !== context.activity.recipient?.id) {
                await context.sendActivity("Hi! I'm your Teams assistant. Ask me anything.");
            }
        }
    }
};
exports.BotActivityHandler = BotActivityHandler;
exports.BotActivityHandler = BotActivityHandler = BotActivityHandler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(bot_constants_1.BOT_STORAGE)),
    __metadata("design:paramtypes", [Object, generation_service_1.GenerationService,
        nestjs_pino_1.PinoLogger])
], BotActivityHandler);
//# sourceMappingURL=teams-activity-handler.js.map