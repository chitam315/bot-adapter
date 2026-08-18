"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStorageProvider = void 0;
const botbuilder_1 = require("botbuilder");
const bot_constants_1 = require("../bot.constants");
exports.memoryStorageProvider = {
    provide: bot_constants_1.BOT_STORAGE,
    useValue: new botbuilder_1.MemoryStorage(),
};
//# sourceMappingURL=memory-storage.provider.js.map