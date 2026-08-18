import { Inject, Injectable } from '@nestjs/common';
import {
  ActivityTypes,
  ConversationState,
  StatePropertyAccessor,
  Storage,
  TeamsActivityHandler,
  TurnContext,
} from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { ConversationTurn, GenerationService } from '../ai/generation.service';
import { BOT_STORAGE } from './bot.constants';

// Bounds how much conversation history is kept/sent to the model per turn.
const MAX_HISTORY_TURNS = 10;
const HISTORY_STATE_KEY = 'conversationHistory';

@Injectable()
export class BotActivityHandler extends TeamsActivityHandler {
  private readonly conversationState: ConversationState;
  private readonly historyProperty: StatePropertyAccessor<ConversationTurn[]>;

  constructor(
    @Inject(BOT_STORAGE) storage: Storage,
    private readonly generationService: GenerationService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(BotActivityHandler.name);

    this.conversationState = new ConversationState(storage);
    this.historyProperty =
      this.conversationState.createProperty<ConversationTurn[]>(
        HISTORY_STATE_KEY,
      );

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await this.handleMembersAdded(context);
      await next();
    });
  }

  private async handleMessage(context: TurnContext): Promise<void> {
    const userText = context.activity.text?.trim();
    if (!userText) {
      return;
    }

    await context.sendActivity({ type: ActivityTypes.Typing });

    const history = await this.historyProperty.get(context, []);

    let replyText: string;
    try {
      replyText = await this.generationService.generateReply({
        text: userText,
        history,
      });
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Failed to generate a reply');
      await context.sendActivity(
        'Sorry, something went wrong while I was thinking about that. Please try again.',
      );
      return;
    }

    const fullHistory: ConversationTurn[] = [
      ...history,
      { role: 'user', content: userText },
      { role: 'assistant', content: replyText },
    ];
    const updatedHistory = fullHistory.slice(-MAX_HISTORY_TURNS);

    await this.historyProperty.set(context, updatedHistory);
    await this.conversationState.saveChanges(context);

    await context.sendActivity(replyText);
  }

  private async handleMembersAdded(context: TurnContext): Promise<void> {
    const membersAdded = context.activity.membersAdded ?? [];

    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient?.id) {
        await context.sendActivity(
          "Hi! I'm your Teams assistant. Ask me anything.",
        );
      }
    }
  }
}
