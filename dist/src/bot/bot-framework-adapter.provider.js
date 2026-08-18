"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botFrameworkAdapterProvider = void 0;
const common_1 = require("@nestjs/common");
const botbuilder_1 = require("botbuilder");
const config_service_1 = require("../config/config.service");
const bot_constants_1 = require("./bot.constants");
const logger = new common_1.Logger('BotFrameworkAdapter');
exports.botFrameworkAdapterProvider = {
    provide: bot_constants_1.BOT_ADAPTER,
    inject: [config_service_1.AppConfigService],
    useFactory: (config) => {
        const { appId, appPassword, appType, appTenantId } = config.botFramework;
        const credentialsFactory = new botbuilder_1.ConfigurationServiceClientCredentialFactory({
            MicrosoftAppId: appId || undefined,
            MicrosoftAppPassword: appPassword || undefined,
            MicrosoftAppType: appType,
            MicrosoftAppTenantId: appTenantId || undefined,
        });
        const botFrameworkAuthentication = new botbuilder_1.ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
        const adapter = new botbuilder_1.CloudAdapter(botFrameworkAuthentication);
        adapter.onTurnError = async (context, error) => {
            logger.error(`Unhandled error processing a bot turn: ${error.message}`, error.stack);
            await context.sendActivity('Sorry, something went wrong on my end. Please try again.');
        };
        return adapter;
    },
};
//# sourceMappingURL=bot-framework-adapter.provider.js.map