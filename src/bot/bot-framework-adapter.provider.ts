import { Logger, Provider } from '@nestjs/common';
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
} from 'botbuilder';
import { AppConfigService } from '../config/config.service';
import { BOT_ADAPTER } from './bot.constants';

const logger = new Logger('BotFrameworkAdapter');

export const botFrameworkAdapterProvider: Provider = {
  provide: BOT_ADAPTER,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): CloudAdapter => {
    const { appId, appPassword, appType, appTenantId } = config.botFramework;

    // Empty MicrosoftAppId is a supported, intentional path: it puts the
    // adapter in unauthenticated mode for local dev against the Bot
    // Framework Emulator. Azure Bot Service / Teams requires a real App ID.
    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
      MicrosoftAppId: appId || undefined,
      MicrosoftAppPassword: appPassword || undefined,
      MicrosoftAppType: appType,
      MicrosoftAppTenantId: appTenantId || undefined,
    });

    const botFrameworkAuthentication =
      new ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
    const adapter = new CloudAdapter(botFrameworkAuthentication);

    adapter.onTurnError = async (
      context: TurnContext,
      error: Error,
    ): Promise<void> => {
      logger.error(
        `Unhandled error processing a bot turn: ${error.message}`,
        error.stack,
      );

      // Bot-turn counterpart to GlobalExceptionFilter: by the time a turn
      // errors, the HTTP response for /api/messages may already be
      // committed, so this is the last place we can tell the user something
      // went wrong.
      await context.sendActivity(
        'Sorry, something went wrong on my end. Please try again.',
      );
    };

    return adapter;
  },
};
