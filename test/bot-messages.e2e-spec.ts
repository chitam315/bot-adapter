import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationReference, TestAdapter, TurnContext } from 'botbuilder';
import { Request, Response } from 'express';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { GenerationService } from '../src/ai/generation.service';
import { AppModule } from '../src/app.module';
import { BOT_ADAPTER, DRIZZLE, PG_POOL } from '../src/constants';

describe('Bot messages (e2e)', () => {
  let app: INestApplication<App>;

  // BotActivityHandler now calls generateReply from a fire-and-forget
  // background task (see the comment on handleMessage), so the response to
  // POST /api/messages resolves *before* generateReply necessarily has —
  // this promise lets the test wait for the actual call deterministically
  // instead of racing it with an arbitrary sleep.
  let resolveGenerateReplyCalled: () => void;
  const generateReplyCalled = new Promise<void>((resolve) => {
    resolveGenerateReplyCalled = resolve;
  });
  const generateReply = jest.fn().mockImplementation(() => {
    resolveGenerateReplyCalled();
    return Promise.resolve('This is a stubbed reply.');
  });

  beforeAll(async () => {
    const pool = {
      query: jest.fn().mockResolvedValue(undefined),
      end: jest.fn().mockResolvedValue(undefined),
    };

    // Real Bot Framework channel round-trips need a running Bot Framework
    // Emulator (see docs/ARCHITECTURE.md §13) — CloudAdapter's outbound
    // sendActivity call still hits the real Connector service even with no
    // MicrosoftAppId configured, and that rejects requests from a test
    // process. Route through botbuilder's own TestAdapter instead, so this
    // still exercises the real BotActivityHandler dispatch logic and the
    // full DI graph, without a live channel.
    //
    // BotActivityHandler now delivers replies via continueConversationAsync
    // (fire-and-forget from the inbound turn — see the comment on
    // handleMessage), not through the same call stack `process()` is on. One
    // shared TestAdapter, reused by both `process` and
    // `continueConversationAsync` below, keeps inbound dispatch and the
    // later proactive reply on the same simulated channel.
    let currentLogic: (context: TurnContext) => Promise<void>;
    const testAdapter = new TestAdapter((context) => currentLogic(context));

    const botAdapterStub = {
      process: async (
        req: Request,
        res: Response,
        logic: (context: TurnContext) => Promise<void>,
      ) => {
        currentLogic = logic;
        await testAdapter.receiveActivity(req.body as Record<string, unknown>);
        res.status(200).json({});
      },
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
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue(pool)
      .overrideProvider(DRIZZLE)
      .useValue({})
      .overrideProvider(GenerationService)
      .useValue({ generateReply })
      .overrideProvider(BOT_ADAPTER)
      .useValue(botAdapterStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/messages processes a Teams message activity and replies with the generated text', async () => {
    const activity = {
      type: 'message',
      id: '1',
      timestamp: new Date().toISOString(),
      channelId: 'test',
      from: { id: 'user1', name: 'User' },
      conversation: { id: 'conversation1' },
      recipient: { id: 'bot1', name: 'Bot' },
      text: 'hello there',
      locale: 'en-US',
    };

    await request(app.getHttpServer())
      .post('/api/messages')
      .send(activity)
      .expect(200);

    await generateReplyCalled;

    expect(generateReply).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello there' }),
    );
  });
});
