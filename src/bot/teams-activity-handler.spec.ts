import { MemoryStorage, TestAdapter } from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { GenerationService } from '../ai/generation.service';
import { BotActivityHandler } from './teams-activity-handler';

describe('BotActivityHandler', () => {
  const buildLogger = () => ({ setContext: jest.fn(), error: jest.fn() });
  const asLogger = (logger: ReturnType<typeof buildLogger>) =>
    logger as unknown as PinoLogger;

  it('shows typing then replies with the generated text', async () => {
    const generateReply = jest.fn().mockResolvedValue('42 is the answer.');
    const generationService = { generateReply } as unknown as GenerationService;
    const handler = new BotActivityHandler(
      new MemoryStorage(),
      generationService,
      asLogger(buildLogger()),
    );
    const adapter = new TestAdapter((context) => handler.run(context));

    await adapter
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
    const handler = new BotActivityHandler(
      new MemoryStorage(),
      generationService,
      asLogger(buildLogger()),
    );
    const adapter = new TestAdapter((context) => handler.run(context));

    await adapter
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
    const handler = new BotActivityHandler(
      new MemoryStorage(),
      generationService,
      asLogger(logger),
    );
    const adapter = new TestAdapter((context) => handler.run(context));

    await adapter
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
    const handler = new BotActivityHandler(
      new MemoryStorage(),
      generationService,
      asLogger(buildLogger()),
    );
    const adapter = new TestAdapter((context) => handler.run(context));

    await adapter
      .send({
        type: 'conversationUpdate',
        membersAdded: [{ id: 'new-user', name: 'New User' }],
      })
      .assertReply("Hi! I'm your Teams assistant. Ask me anything.");

    expect(generateReply).not.toHaveBeenCalled();
  });
});
