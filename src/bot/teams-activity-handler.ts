import { Inject, Injectable } from '@nestjs/common';
import {
  Activity,
  ActivityTypes,
  CloudAdapter,
  ConversationState,
  StatePropertyAccessor,
  Storage,
  TeamsActivityHandler,
  TurnContext,
} from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { ConversationTurn, GenerationService } from '../ai/generation.service';
import { AppConfigService } from '../config/config.service';
import {
  ConversationLoggingService,
  TeamsConversationInput,
  TeamsUserInput,
} from '../conversation-logging/conversation-logging.service';
import {
  BOT_ADAPTER,
  BOT_STORAGE,
  HISTORY_STATE_KEY,
  LlmCallStatus,
  MAX_HISTORY_TURNS,
  TYPING_INDICATOR_INTERVAL_MS,
} from '../constants';

type ConversationReference = ReturnType<
  typeof TurnContext.getConversationReference
>;

@Injectable()
export class BotActivityHandler extends TeamsActivityHandler {
  private readonly conversationState: ConversationState;
  private readonly historyProperty: StatePropertyAccessor<ConversationTurn[]>;

  constructor(
    @Inject(BOT_STORAGE) storage: Storage,
    @Inject(BOT_ADAPTER) private readonly adapter: CloudAdapter,
    private readonly generationService: GenerationService,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
    private readonly conversationLoggingService: ConversationLoggingService,
  ) {
    super();
    this.logger.setContext(BotActivityHandler.name);

    this.conversationState = new ConversationState(storage);
    this.historyProperty =
      this.conversationState.createProperty<ConversationTurn[]>(
        HISTORY_STATE_KEY,
      );

    this.onMessage(async (context, next) => {
      this.handleMessage(context);
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      await this.handleMembersAdded(context);
      await next();
    });
  }

  /**
   * Deliberately fire-and-forget (not awaited by the onMessage handler):
   * CloudAdapter only ACKs the inbound webhook POST once the whole turn
   * handler resolves, so awaiting a potentially slow generateReply here
   * would delay that ACK past the channel's own patience window (~15s
   * observed against the Bot Framework Emulator) and show as a false
   * "send failed" on the channel side — even though the reply itself would
   * still arrive correctly a moment later via the separate outbound
   * activity channel (typing indicators proved this: they kept arriving on
   * schedule throughout, unaffected by the channel's "send failed" marker).
   *
   * Fix: return from the turn handler immediately (fast ACK), then deliver
   * the actual reply as a *proactive* message via continueConversationAsync
   * once it's ready — the standard Bot Framework pattern for turns whose
   * real work runs longer than the channel's inbound-request patience.
   */
  private handleMessage(context: TurnContext): void {
    const userText = context.activity.text?.trim();
    this.logger.info({ userText }, 'Received message from user');
    if (!userText) {
      return;
    }

    const conversationReference = TurnContext.getConversationReference(
      context.activity,
    );

    this.processAndReply(conversationReference, userText).catch((error) => {
      this.logger.error(
        { err: error as Error },
        'Unhandled error processing a message in the background',
      );
    });
  }

  private async processAndReply(
    conversationReference: ConversationReference,
    userText: string,
  ): Promise<void> {
    await this.adapter.continueConversationAsync(
      this.config.botFramework.appId,
      conversationReference,
      (context) => this.generateAndSendReply(context, userText),
    );
  }

  private async generateAndSendReply(
    context: TurnContext,
    userText: string,
  ): Promise<void> {
    const history = await this.historyProperty.get(context, []);
    const { activity } = context;

    let result: Awaited<ReturnType<GenerationService['generateReply']>>;
    try {
      // TEMP: artificial delay to manually verify the ACK-fast + proactive
      // reply fix on Emulator — remove before deploying.
      result = await this.withTypingIndicator(context, () =>
        this.generationService.generateReply({
          text: userText,
          history,
        }),
      );
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Failed to generate a reply');

      // Fire-and-forget: logTurn never throws (see
      // ConversationLoggingService), and the fallback reply below has
      // already been decided regardless of whether this write succeeds.
      void this.conversationLoggingService.logTurn({
        user: this.toTeamsUserInput(activity),
        conversation: this.toTeamsConversationInput(activity),
        activityId: activity.id,
        userMessage: userText,
        model: this.config.azureOpenAi.defaultChatModel,
        status: LlmCallStatus.Error,
        errorMessage: (error as Error).message,
      });

      await context.sendActivity({
        type: ActivityTypes.Message,
        text: 'This is fake message for testing error handling. The real message would be: Sorry, I encountered an error while generating a reply. Please try again later.',
      });
      return;
    }

    const fullHistory: ConversationTurn[] = [
      ...history,
      { role: 'user', content: userText },
      { role: 'assistant', content: result.text },
    ];
    const updatedHistory = fullHistory.slice(-MAX_HISTORY_TURNS);

    await this.historyProperty.set(context, updatedHistory);
    await this.conversationState.saveChanges(context);

    await context.sendActivity({
      type: ActivityTypes.Message,
      text: result.text,
    });

    // Fire-and-forget, after the reply is already on its way to the user —
    // a slow or failing DB write here must never delay or affect the turn.
    void this.conversationLoggingService.logTurn({
      user: this.toTeamsUserInput(activity),
      conversation: this.toTeamsConversationInput(activity),
      activityId: activity.id,
      userMessage: userText,
      model: result.model,
      latencyMs: result.latencyMs,
      toolCalls: result.toolCalls,
      status: LlmCallStatus.Success,
      assistantMessage: result.text,
      usage: result.usage,
    });
  }

  private toTeamsUserInput(activity: Activity): TeamsUserInput {
    return {
      teamsUserId: activity.from.id,
      aadObjectId: activity.from.aadObjectId,
      tenantId: activity.conversation.tenantId,
      name: activity.from.name,
    };
  }

  private toTeamsConversationInput(activity: Activity): TeamsConversationInput {
    return {
      channelConversationId: activity.conversation.id,
      channelId: activity.channelId,
    };
  }

  /**
   * Sends a typing activity immediately, then re-sends one every
   * TYPING_INDICATOR_INTERVAL_MS for as long as `operation` is pending — a
   * single typing activity fades from the Teams/Emulator UI well before a
   * slow step (e.g. generateReply retrying against Azure OpenAI) resolves.
   */
  private async withTypingIndicator<T>(
    context: TurnContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    await context.sendActivity({ type: ActivityTypes.Typing });

    const interval = setInterval(() => {
      context.sendActivity({ type: ActivityTypes.Typing }).catch((error) => {
        this.logger.debug(
          { err: error as Error },
          'Typing indicator re-send failed — ignoring, main operation continues',
        );
      });
    }, TYPING_INDICATOR_INTERVAL_MS);

    try {
      return await operation();
    } finally {
      clearInterval(interval);
    }
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
