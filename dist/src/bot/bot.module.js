"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotModule = void 0;
const common_1 = require("@nestjs/common");
const ai_module_1 = require("../ai/ai.module");
const config_module_1 = require("../config/config.module");
const bot_framework_adapter_provider_1 = require("./bot-framework-adapter.provider");
const bot_controller_1 = require("./bot.controller");
const memory_storage_provider_1 = require("./storage/memory-storage.provider");
const teams_activity_handler_1 = require("./teams-activity-handler");
let BotModule = class BotModule {
};
exports.BotModule = BotModule;
exports.BotModule = BotModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule, ai_module_1.AiModule],
        controllers: [bot_controller_1.BotController],
        providers: [
            bot_framework_adapter_provider_1.botFrameworkAdapterProvider,
            memory_storage_provider_1.memoryStorageProvider,
            teams_activity_handler_1.BotActivityHandler,
        ],
    })
], BotModule);
//# sourceMappingURL=bot.module.js.map