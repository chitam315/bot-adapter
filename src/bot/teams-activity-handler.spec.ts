import {
  CloudAdapter,
  ConversationReference,
  MemoryStorage,
  TestAdapter,
  TurnContext,
} from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { GenerationService } from '../ai/generation.service';
import { BotActivityHandler } from './teams-activity-handler';

describe('BotActivityHandler', () => {
  const buildLogger = () => ({
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  });
  const asLogger = (logger: ReturnType<typeof buildLogger>) =>
    logger as unknown as PinoLogger;

  const config = {
    botFramework: { appId: 'test-app-id' },
  } as unknown as AppConfigService;

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
    );
    return { handler, testAdapter };
  };

  it('shows typing then replies with the generated text', async () => {
    const generateReply = jest.fn().mockResolvedValue('42 is the answer.');
    const generationService = { generateReply } as unknown as GenerationService;
    const { testAdapter } = buildHandlerAndAdapter(
      generationService,
      buildLogger(),
    );

    await testAdapter
      .send('what is the answer?')
      .assertReply((activity) => expect(activity.type).toBe('typing'))
      .assertReply('42 is the answer.');

    expect(generateReply).toHaveBeenCalledWith({
      text: 'what is the answer?',
      history: [],
    });
  });

  it('carries prior turns as history on the next message', async () => {
    const generateReply = jest.fn().mockResolvedValue('Follow-up answer.');
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

    expect(generateReply).toHaveBeenLastCalledWith({
      text: 'second question',
      history: [
        { role: 'user', content: 'first question' },
        { role: 'assistant', content: 'Follow-up answer.' },
      ],
    });
  });

  it('sends a fallback message when generation fails', async () => {
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
        'Sorry, something went wrong while I was thinking about that. Please try again.',
      );

    expect(logger.error).toHaveBeenCalled();
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
