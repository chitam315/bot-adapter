import { Test, TestingModule } from '@nestjs/testing';
import { generateText } from 'ai';
import { PinoLogger } from 'nestjs-pino';
import { DRIZZLE, LlmCallStatus } from '../constants';
import * as schema from '../database/schema';
import { ConversationLoggingService } from './conversation-logging.service';

// 'ai' is auto-mocked project-wide via __mocks__/ai.ts (see that file for why).

describe('ConversationLoggingService', () => {
  const USER_ID = 'user-1';
  const CONVERSATION_ID = 'conversation-1';

  let service: ConversationLoggingService;
  let insertedTables: unknown[];
  let insertedValues: Record<string, unknown>[];
  let selectResult: Array<{ email: string | null }>;
  let logger: { setContext: jest.Mock; error: jest.Mock; warn: jest.Mock };

  /**
   * insert(table).values(v) is called three ways in the real service:
   *   - botUsers / botConversations: .values(v).onConflictDoUpdate(...).returning(...)
   *   - botMessages: .values(v).returning(...), no onConflictDoUpdate.
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
    let messageIdCounter = 0;

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
                : table === schema.botMessages
                  ? [{ id: `message-${++messageIdCounter}` }]
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
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest
              .fn()
              .mockImplementation(() => Promise.resolve(selectResult)),
          }),
        }),
      }),
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
    logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };
    selectResult = [];
    jest.mocked(generateText).mockReset();
    service = await buildService(buildDb());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveUserAndConversation', () => {
    it('upserts the user then the conversation, and returns both ids', async () => {
      const result = await service.resolveUserAndConversation(
        { teamsUserId: 'teams-user-1', name: 'Jane Doe' },
        {
          channelConversationId: 'conv-1',
          channelId: 'msteams',
          conversationType: 'personal',
        },
      );

      expect(result).toEqual({
        userId: USER_ID,
        conversationId: CONVERSATION_ID,
      });
      expect(insertedTables).toEqual([
        schema.botUsers,
        schema.botConversations,
      ]);
      expect(insertedValues[0]).toMatchObject({
        teamsUserId: 'teams-user-1',
        name: 'Jane Doe',
      });
      expect(insertedValues[1]).toMatchObject({
        userId: USER_ID,
        channelConversationId: 'conv-1',
        channelId: 'msteams',
        conversationType: 'personal',
      });
    });

    it('resolves to empty ids instead of throwing when the DB insert fails', async () => {
      const throwingDb = {
        insert: jest.fn(() => {
          throw new Error('connection refused');
        }),
        select: jest.fn(),
      } as unknown as ReturnType<typeof buildDb>;
      const failingService = await buildService(throwingDb);

      await expect(
        failingService.resolveUserAndConversation(
          { teamsUserId: 'teams-user-2' },
          { channelConversationId: 'conv-2', channelId: 'msteams' },
        ),
      ).resolves.toEqual({});

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('logUserMessage', () => {
    it('inserts a user-role message row and returns its id', async () => {
      const messageId = await service.logUserMessage({
        conversationId: CONVERSATION_ID,
        activityId: 'activity-1',
        content: 'Hi there',
      });

      expect(messageId).toBe('message-1');
      expect(insertedTables).toEqual([schema.botMessages]);
      expect(insertedValues[0]).toMatchObject({
        conversationId: CONVERSATION_ID,
        role: 'user',
        content: 'Hi there',
        activityId: 'activity-1',
      });
    });

    it('returns undefined without touching the DB when conversationId is missing', async () => {
      const messageId = await service.logUserMessage({ content: 'Hi there' });

      expect(messageId).toBeUndefined();
      expect(insertedTables).toEqual([]);
    });
  });

  describe('hasEnrichedProfile', () => {
    it('returns true when the stored user already has an email', async () => {
      selectResult = [{ email: 'jane@example.com' }];

      await expect(service.hasEnrichedProfile('teams-user-1')).resolves.toBe(
        true,
      );
    });

    it('returns false for a new or unenriched user', async () => {
      selectResult = [];

      await expect(service.hasEnrichedProfile('teams-user-1')).resolves.toBe(
        false,
      );
    });
  });

  describe('generateTextLogged', () => {
    const context = {
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
      userMessageId: 'message-1',
      activityId: 'activity-1',
    };

    it('calls generateText, logs the assistant message and a successful llmCalls row, and returns the result', async () => {
      jest.mocked(generateText).mockResolvedValue({
        text: 'Hello!',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        toolCalls: [{ toolName: 'searchKnowledgeBase' }],
      } as never);

      const result = await service.generateTextLogged(
        { modelKey: 'gpt-4.1', purposes: ['chat-reply'], model: {} } as never,
        context,
      );

      expect(result.text).toBe('Hello!');
      expect(insertedTables).toEqual([schema.botMessages, schema.botLlmCalls]);
      expect(insertedValues[0]).toMatchObject({
        conversationId: CONVERSATION_ID,
        role: 'assistant',
        content: 'Hello!',
      });
      expect(insertedValues[1]).toMatchObject({
        conversationId: CONVERSATION_ID,
        userId: USER_ID,
        userMessageId: 'message-1',
        assistantMessageId: 'message-1',
        model: 'gpt-4.1',
        purposes: ['chat-reply'],
        status: LlmCallStatus.Success,
        errorMessage: null,
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        toolCalls: ['searchKnowledgeBase'],
      });
    });

    it('logs an error llmCalls row with no assistant message and rethrows on a generateText failure', async () => {
      jest
        .mocked(generateText)
        .mockRejectedValue(new Error('Azure OpenAI timed out'));

      await expect(
        service.generateTextLogged(
          { modelKey: 'gpt-4.1', purposes: ['chat-reply'], model: {} } as never,
          context,
        ),
      ).rejects.toThrow('Azure OpenAI timed out');

      expect(insertedTables).toEqual([schema.botLlmCalls]);
      expect(insertedValues[0]).toMatchObject({
        status: LlmCallStatus.Error,
        errorMessage: 'Azure OpenAI timed out',
        assistantMessageId: undefined,
        purposes: ['chat-reply'],
      });
    });

    it('skips logging the assistant message but still logs the llmCalls row when conversationId is missing', async () => {
      jest.mocked(generateText).mockResolvedValue({
        text: 'ok',
        usage: {},
        toolCalls: [],
      } as never);

      await service.generateTextLogged(
        { modelKey: 'gpt-4.1', purposes: ['chat-reply'], model: {} } as never,
        {},
      );

      expect(insertedTables).toEqual([schema.botLlmCalls]);
    });

    it('still returns the real generateText result even if logging the llmCalls row fails', async () => {
      jest.mocked(generateText).mockResolvedValue({
        text: 'Hello!',
        usage: {},
        toolCalls: [],
      } as never);
      const throwingDb = {
        insert: jest.fn(() => {
          throw new Error('connection refused');
        }),
        select: jest.fn(),
      } as unknown as ReturnType<typeof buildDb>;
      const failingService = await buildService(throwingDb);

      const result = await failingService.generateTextLogged(
        { modelKey: 'gpt-4.1', purposes: ['chat-reply'], model: {} } as never,
        context,
      );

      expect(result.text).toBe('Hello!');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
