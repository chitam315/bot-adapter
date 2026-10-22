import { Inject, Injectable } from '@nestjs/common';
import {
  Activity,
  ActivityTypes,
  CloudAdapter,
  ConversationState,
  StatePropertyAccessor,
  Storage,
  TeamsActivityHandler,
  TeamsChannelData,
  TeamsInfo,
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

    // Resolved eagerly, before generating a reply — doesn't slow down the
    // webhook ACK (this whole flow already runs in the background, see the
    // comment on handleMessage above) and gives generateTextLogged real ids
    // to link its llmCalls row to in one shot, instead of the old
    // fire-and-forget-after-the-reply logTurn timing.
    const userInput = await this.toTeamsUserInput(context, activity);
    const conversationInput = this.toTeamsConversationInput(activity);
    const { userId, conversationId } =
      await this.conversationLoggingService.resolveUserAndConversation(
        userInput,
        conversationInput,
      );
    const userMessageId = await this.conversationLoggingService.logUserMessage({
      conversationId,
      activityId: activity.id,
      content: userText,
    });

    let result: Awaited<ReturnType<GenerationService['generateReply']>>;
    try {
      result = await this.withTypingIndicator(context, () =>
        this.generationService.generateReply({
          text: userText,
          history,
          loggingContext: {
            conversationId,
            userId,
            userMessageId,
            activityId: activity.id,
          },
        }),
      );
    } catch (error) {
      // The error llmCalls row is already written inside
      // GenerationService.generateReply -> generateTextLogged — this catch
      // only needs to handle the user-facing fallback.
      this.logger.error({ err: error as Error }, 'Failed to generate a reply');

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
  }

  /**
   * Builds the base TeamsUserInput from the activity, then merges in a
   * richer Teams profile (email/givenName/surname/UPN) the first time this
   * Teams identity is seen — see enrichTeamsProfile.
   */
  private async toTeamsUserInput(
    context: TurnContext,
    activity: Activity,
  ): Promise<TeamsUserInput> {
    const base: TeamsUserInput = {
      teamsUserId: activity.from.id,
      aadObjectId: activity.from.aadObjectId,
      tenantId: activity.conversation.tenantId,
      name: activity.from.name,
    };

    const enrichment = await this.enrichTeamsProfile(context, base.teamsUserId);
    return { ...base, ...enrichment };
  }

  /**
   * Fetches email/givenName/surname/userPrincipalName via
   * TeamsInfo.getMember — but only the first time this Teams identity is
   * seen (checked via ConversationLoggingService.hasEnrichedProfile), to
   * avoid a Bot Framework Connector API round-trip on every single turn.
   * Never blocks or fails the turn: TeamsInfo.getMember has nothing real to
   * resolve against the Bot Framework Emulator (no tenant), and can fail
   * even against real Teams (permissions, throttling) — either way this
   * just logs a warning and the turn proceeds without the extra fields.
   */
  private async enrichTeamsProfile(
    context: TurnContext,
    teamsUserId: string,
  ): Promise<Partial<TeamsUserInput>> {
    const alreadyEnriched =
      await this.conversationLoggingService.hasEnrichedProfile(teamsUserId);
    if (alreadyEnriched) {
      return {};
    }

    try {
      const member = await TeamsInfo.getMember(context, teamsUserId);
      return {
        email: member.email,
        givenName: member.givenName,
        surname: member.surname,
        userPrincipalName: member.userPrincipalName,
      };
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'TeamsInfo.getMember failed — continuing without an enriched profile',
      );
      return {};
    }
  }

  private toTeamsConversationInput(activity: Activity): TeamsConversationInput {
    const channelData = activity.channelData as TeamsChannelData | undefined;

    return {
      channelConversationId: activity.conversation.id,
      channelId: activity.channelId,
      conversationType: activity.conversation.conversationType,
      isGroup: activity.conversation.isGroup,
      locale: activity.locale,
      teamId: channelData?.team?.id,
      teamName: channelData?.team?.name,
      channelName: channelData?.channel?.name,
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
