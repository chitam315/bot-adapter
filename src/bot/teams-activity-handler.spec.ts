import {
  CloudAdapter,
  ConversationReference,
  MemoryStorage,
  TeamsInfo,
  TestAdapter,
  TurnContext,
} from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { GenerationService } from '../ai/generation.service';
import { ConversationLoggingService } from '../conversation-logging/conversation-logging.service';
import { BotActivityHandler } from './teams-activity-handler';

describe('BotActivityHandler', () => {
  const USER_ID = 'user-1';
  const CONVERSATION_ID = 'conversation-1';
  const USER_MESSAGE_ID = 'message-1';

  const buildLogger = () => ({
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });
  const asLogger = (logger: ReturnType<typeof buildLogger>) =>
    logger as unknown as PinoLogger;

  const config = {
    botFramework: { appId: 'test-app-id' },
    azureOpenAi: { defaultChatModel: 'gpt-4.1' },
  } as unknown as AppConfigService;

  /**
   * hasEnrichedProfile defaults to true so most tests never exercise the
   * real TeamsInfo.getMember call (no live Bot Framework Connector in a
   * TestAdapter-driven test) — the one test that cares about that path
   * spies on TeamsInfo.getMember directly and sets this to false.
   */
  const buildConversationLogging = () => ({
    hasEnrichedProfile: jest.fn().mockResolvedValue(true),
    resolveUserAndConversation: jest.fn().mockResolvedValue({
      userId: USER_ID,
      conversationId: CONVERSATION_ID,
    }),
    logUserMessage: jest.fn().mockResolvedValue(USER_MESSAGE_ID),
  });

  /**
   * BotActivityHandler now delivers replies via continueConversationAsync on
   * the injected BOT_ADAPTER (fire-and-forget from the inbound turn — see
   * the comment on handleMessage), not through the TestAdapter that
   * receives the inbound message. For assertReply() to still observe those
   * replies, this fake continueConversationAsync builds a new TurnContext
   * bound to that *same* TestAdapter and runs the logic through it — the
   * same technique a real CloudAdapter uses internally to resume a
   * conversation.
   */
  const buildProactiveAdapter = (testAdapter: TestAdapter): CloudAdapter =>
    ({
      continueConversationAsync: async (
        _botAppId: string,
        reference: Partial<ConversationReference>,
        logic: (context: TurnContext) => Promise<void>,
      ) => {
        const activity = TurnContext.applyConversationReference(
          { type: 'event', name: 'continueConversation' },
          reference,
          true,
        );
        await logic(new TurnContext(testAdapter, activity));
      },
    }) as unknown as CloudAdapter;

  const buildHandlerAndAdapter = (
    generationService: GenerationService,
    logger: ReturnType<typeof buildLogger>,
    conversationLogging: ReturnType<
      typeof buildConversationLogging
    > = buildConversationLogging(),
  ) => {
    // Forward reference: testAdapter's closure needs `handler`, but
    // `handler`'s constructor needs `testAdapter` — can't be const.
    // eslint-disable-next-line prefer-const
    let handler: BotActivityHandler;
    const testAdapter = new TestAdapter((context) => handler.run(context));
    handler = new BotActivityHandler(
      new MemoryStorage(),
      buildProactiveAdapter(testAdapter),
      generationService,
      config,
      asLogger(logger),
      conversationLogging as unknown as ConversationLoggingService,
    );
    return { handler, testAdapter, conversationLogging };
  };

  it('shows typing then replies with the generated text, resolving identity before generating', async () => {
    const generateReply = jest.fn().mockResolvedValue({
      text: '42 is the answer.',
      model: 'gpt-4.1',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      toolCalls: ['searchKnowledgeBase'],
      latencyMs: 250,
    });
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter, conversationLogging } = buildHandlerAndAdapter(
      generationService,
      buildLogger(),
    );

    await testAdapter
      .send('what is the answer?')
      .assertReply((activity) => expect(activity.type).toBe('typing'))
      .assertReply('42 is the answer.');

    expect(conversationLogging.resolveUserAndConversation).toHaveBeenCalled();
    expect(conversationLogging.logUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: CONVERSATION_ID,
        content: 'what is the answer?',
      }),
    );
    expect(generateReply).toHaveBeenCalledTimes(1);
    const [callArgs] = generateReply.mock.calls[0] as [
      { text: string; history: unknown[]; loggingContext: unknown },
    ];
    expect(callArgs).toMatchObject({
      text: 'what is the answer?',
      history: [],
      loggingContext: {
        conversationId: CONVERSATION_ID,
        userId: USER_ID,
        userMessageId: USER_MESSAGE_ID,
      },
    });
  });

  it('carries prior turns as history on the next message', async () => {
    const generateReply = jest.fn().mockResolvedValue({
      text: 'Follow-up answer.',
      model: 'gpt-4.1',
      usage: {},
      toolCalls: [],
      latencyMs: 100,
    });
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter } = buildHandlerAndAdapter(
      generationService,
      buildLogger(),
    );

    await testAdapter
      .send('first question')
      .assertReply(() => undefined)
      .assertReply('Follow-up answer.')
      .send('second question')
      .assertReply(() => undefined)
      .assertReply('Follow-up answer.');

    expect(generateReply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: 'second question',
        history: [
          { role: 'user', content: 'first question' },
          { role: 'assistant', content: 'Follow-up answer.' },
        ],
      }),
    );
  });

  it('sends a fallback message when generation fails (the error llmCalls row is logged inside generateTextLogged, not here)', async () => {
    const generateReply = jest
      .fn()
      .mockRejectedValue(new Error('LLM unavailable'));
    const logger = buildLogger();
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter } = buildHandlerAndAdapter(generationService, logger);

    await testAdapter
      .send('hello')
      .assertReply(() => undefined)
      .assertReply(
        'This is fake message for testing error handling. The real message would be: Sorry, I encountered an error while generating a reply. Please try again later.',
      );

    expect(logger.error).toHaveBeenCalled();
  });

  it('skips TeamsInfo.getMember for a user with an already-enriched profile', async () => {
    const getMemberSpy = jest.spyOn(TeamsInfo, 'getMember');
    const generateReply = jest.fn().mockResolvedValue({
      text: 'ok',
      model: 'gpt-4.1',
      usage: {},
      toolCalls: [],
      latencyMs: 10,
    });
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter } = buildHandlerAndAdapter(
      generationService,
      buildLogger(),
    );

    await testAdapter
      .send('hello')
      .assertReply(() => undefined)
      .assertReply('ok');

    expect(getMemberSpy).not.toHaveBeenCalled();
    getMemberSpy.mockRestore();
  });

  it('continues the turn normally when TeamsInfo.getMember fails for a not-yet-enriched user', async () => {
    const getMemberSpy = jest
      .spyOn(TeamsInfo, 'getMember')
      .mockRejectedValue(new Error('not available in this channel'));
    const generateReply = jest.fn().mockResolvedValue({
      text: 'ok',
      model: 'gpt-4.1',
      usage: {},
      toolCalls: [],
      latencyMs: 10,
    });
    const generationService = { generateReply } as unknown as GenerationService;
    const logger = buildLogger();
    const conversationLogging = buildConversationLogging();
    conversationLogging.hasEnrichedProfile.mockResolvedValue(false);
    const { testAdapter } = buildHandlerAndAdapter(
      generationService,
      logger,
      conversationLogging,
    );

    await testAdapter
      .send('hello')
      .assertReply(() => undefined)
      .assertReply('ok');

    expect(getMemberSpy).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    getMemberSpy.mockRestore();
  });

  it('greets new members without calling the generation service', async () => {
    const generateReply = jest.fn();
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter } = buildHandlerAndAdapter(
      generationService,
      buildLogger(),
    );

    await testAdapter
      .send({
        type: 'conversationUpdate',
        membersAdded: [{ id: 'new-user', name: 'New User' }],
      })
      .assertReply("Hi! I'm your Teams assistant. Ask me anything.");

    expect(generateReply).not.toHaveBeenCalled();
  });
});
