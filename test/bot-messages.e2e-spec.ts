import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestAdapter, TurnContext } from 'botbuilder';
import { Request, Response } from 'express';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { GenerationService } from '../src/ai/generation.service';
import { AppModule } from '../src/app.module';
import { BOT_ADAPTER, DRIZZLE, PG_POOL } from '../src/constants';

describe('Bot messages (e2e)', () => {
  let app: INestApplication<App>;
  const generateReply = jest.fn().mockResolvedValue('This is a stubbed reply.');

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
    const botAdapterStub = {
      process: async (
        req: Request,
        res: Response,
        logic: (context: TurnContext) => Promise<void>,
      ) => {
        const testAdapter = new TestAdapter(logic);
        await testAdapter.receiveActivity(req.body as Record<string, unknown>);
        res.status(200).json({});
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

    expect(generateReply).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'hello there' }),
    );
  });
});
