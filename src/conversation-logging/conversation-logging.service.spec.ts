import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { DRIZZLE, LlmCallStatus } from '../constants';
import * as schema from '../database/schema';
import { ConversationLoggingService } from './conversation-logging.service';

describe('ConversationLoggingService', () => {
  const USER_ID = 'user-1';
  const CONVERSATION_ID = 'conversation-1';

  let service: ConversationLoggingService;
  let insertedTables: unknown[];
  let insertedValues: Record<string, unknown>[];
  let logger: { setContext: jest.Mock; error: jest.Mock };

  /**
   * insert(table).values(v) is called three ways in the real service:
   *   - botUsers / botConversations: .values(v).onConflictDoUpdate(...).returning(...)
   *   - botLlmCalls: .values(v) awaited bare, no further chain call.
   * So the object .values() returns needs to be both chainable
   * (onConflictDoUpdate/returning) and directly awaitable (a `.then`).
   * That's safe here because this chain object is never itself the
   * DRIZZLE `useValue` — only the top-level `db` object below is, and it
   * has no `.then` — see docs/ARCHITECTURE.md §12 on why a thenable
   * `useValue` gets silently unwrapped by Nest's DI.
   */
  const buildDb = () => {
    insertedTables = [];
    insertedValues = [];

    return {
      insert: jest.fn((table: unknown) => ({
        values: jest.fn((values: Record<string, unknown>) => {
          insertedTables.push(table);
          insertedValues.push(values);

          const returningRows =
            table === schema.botUsers
              ? [{ id: USER_ID }]
              : table === schema.botConversations
                ? [{ id: CONVERSATION_ID }]
                : [];

          return {
            onConflictDoUpdate: jest.fn().mockReturnThis(),
            returning: jest
              .fn()
              .mockImplementation(() => Promise.resolve(returningRows)),
            then: (resolve: (value: undefined) => void) => resolve(undefined),
          };
        }),
      })),
    };
  };

  const buildService = async (
    db: ReturnType<typeof buildDb>,
  ): Promise<ConversationLoggingService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationLoggingService,
        { provide: DRIZZLE, useValue: db },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    return module.get(ConversationLoggingService);
  };

  beforeEach(async () => {
    logger = { setContext: jest.fn(), error: jest.fn() };
    service = await buildService(buildDb());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('upserts the user, the conversation, and inserts a successful llm_calls row', async () => {
    await service.logTurn({
      user: { teamsUserId: 'teams-user-1', name: 'Jane Doe' },
      conversation: { channelConversationId: 'conv-1', channelId: 'msteams' },
      activityId: 'activity-1',
      userMessage: 'Hi there',
      model: 'gpt-4.1',
      latencyMs: 1200,
      toolCalls: ['searchKnowledgeBase'],
      status: LlmCallStatus.Success,
      assistantMessage: 'Hello!',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    expect(insertedTables).toEqual([
      schema.botUsers,
      schema.botConversations,
      schema.botLlmCalls,
    ]);

    expect(insertedValues[0]).toMatchObject({
      teamsUserId: 'teams-user-1',
      name: 'Jane Doe',
    });

    expect(insertedValues[1]).toMatchObject({
      userId: USER_ID,
      channelConversationId: 'conv-1',
      channelId: 'msteams',
    });

    expect(insertedValues[2]).toMatchObject({
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
      activityId: 'activity-1',
      userMessage: 'Hi there',
      assistantMessage: 'Hello!',
      model: 'gpt-4.1',
      status: LlmCallStatus.Success,
      errorMessage: null,
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      toolCalls: ['searchKnowledgeBase'],
    });
  });

  it('inserts an error llm_calls row without assistant text or usage', async () => {
    await service.logTurn({
      user: { teamsUserId: 'teams-user-2' },
      conversation: { channelConversationId: 'conv-2', channelId: 'msteams' },
      userMessage: 'Hi there',
      model: 'gpt-4.1',
      status: LlmCallStatus.Error,
      errorMessage: 'Azure OpenAI timed out',
    });

    expect(insertedValues[2]).toMatchObject({
      status: LlmCallStatus.Error,
      errorMessage: 'Azure OpenAI timed out',
      assistantMessage: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    });
  });

  it('never throws — logs and swallows a DB failure instead', async () => {
    const throwingDb = {
      insert: jest.fn(() => {
        throw new Error('connection refused');
      }),
    } as unknown as ReturnType<typeof buildDb>;
    const failingService = await buildService(throwingDb);

    await expect(
      failingService.logTurn({
        user: { teamsUserId: 'teams-user-3' },
        conversation: {
          channelConversationId: 'conv-3',
          channelId: 'msteams',
        },
        userMessage: 'Hi',
        model: 'gpt-4.1',
        status: LlmCallStatus.Error,
        errorMessage: 'boom',
      }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });
});
