import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PinoLogger } from 'nestjs-pino';
import {
  ACTIVE_CONVERSATION_STATUS,
  DRIZZLE,
  LlmCallStatus,
} from '../constants';
import * as schema from '../database/schema';

export interface TeamsUserInput {
  teamsUserId: string;
  aadObjectId?: string;
  tenantId?: string;
  name?: string;
}

export interface TeamsConversationInput {
  channelConversationId: string;
  channelId: string;
}

export interface LlmUsageInput {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  totalTokens?: number;
}

interface LogTurnBase {
  user: TeamsUserInput;
  conversation: TeamsConversationInput;
  activityId?: string;
  userMessage: string;
  model: string;
  latencyMs?: number;
  toolCalls?: string[];
}

export type LogTurnInput =
  | (LogTurnBase & {
      status: LlmCallStatus.Success;
      assistantMessage: string;
      usage: LlmUsageInput;
    })
  | (LogTurnBase & {
      status: LlmCallStatus.Error;
      errorMessage: string;
    });

/**
 * Persists one Teams turn — the user identity, the conversation it belongs
 * to, and the resulting LLM call — into the bot_adapter.* tables (see
 * src/database/schema/bot-adapter.schema.ts). `logTurn` is the only method
 * meant to be called from the bot turn-handling path: it never throws, so a
 * DB problem here can never take down the actual chat turn — callers should
 * still fire it without awaiting if they don't want it on the reply's
 * critical path (see BotActivityHandler.generateAndSendReply).
 */
@Injectable()
export class ConversationLoggingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConversationLoggingService.name);
  }

  async logTurn(input: LogTurnInput): Promise<void> {
    try {
      const userId = await this.upsertUser(input.user);
      const conversationId = await this.upsertConversation(
        userId,
        input.conversation,
      );
      await this.insertLlmCall(userId, conversationId, input);
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to log conversation turn — continuing without it',
      );
    }
  }

  /**
   * Upserts on `teamsUserId`: the same Teams identity messaging again
   * refreshes name/tenant/aadObjectId rather than creating a duplicate row.
   */
  private async upsertUser(input: TeamsUserInput): Promise<string> {
    const [row] = await this.db
      .insert(schema.botUsers)
      .values({
        teamsUserId: input.teamsUserId,
        aadObjectId: input.aadObjectId,
        tenantId: input.tenantId,
        name: input.name,
      })
      .onConflictDoUpdate({
        target: schema.botUsers.teamsUserId,
        set: {
          aadObjectId: input.aadObjectId,
          tenantId: input.tenantId,
          name: input.name,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: schema.botUsers.id });

    return row.id;
  }

  /**
   * Upserts on `channelConversationId`. `userId` only takes effect on the
   * first insert (a conversation belongs to whoever started it); a later
   * message in the same conversation just bumps `lastMessageAt`.
   */
  private async upsertConversation(
    userId: string,
    input: TeamsConversationInput,
  ): Promise<string> {
    const [row] = await this.db
      .insert(schema.botConversations)
      .values({
        userId,
        channelConversationId: input.channelConversationId,
        channelId: input.channelId,
        status: ACTIVE_CONVERSATION_STATUS,
        lastMessageAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: schema.botConversations.channelConversationId,
        set: {
          lastMessageAt: sql`now()`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: schema.botConversations.id });

    return row.id;
  }

  private async insertLlmCall(
    userId: string,
    conversationId: string,
    input: LogTurnInput,
  ): Promise<void> {
    const isSuccess = input.status === LlmCallStatus.Success;

    await this.db.insert(schema.botLlmCalls).values({
      conversationId,
      userId,
      activityId: input.activityId,
      userMessage: input.userMessage,
      model: input.model,
      latencyMs: input.latencyMs,
      toolCalls: input.toolCalls ?? [],
      status: input.status,
      assistantMessage: isSuccess ? input.assistantMessage : null,
      errorMessage: isSuccess ? null : input.errorMessage,
      inputTokens: isSuccess ? (input.usage.inputTokens ?? null) : null,
      cachedInputTokens: isSuccess
        ? (input.usage.cachedInputTokens ?? null)
        : null,
      outputTokens: isSuccess ? (input.usage.outputTokens ?? null) : null,
      reasoningTokens: isSuccess ? (input.usage.reasoningTokens ?? null) : null,
      totalTokens: isSuccess ? (input.usage.totalTokens ?? null) : null,
    });
  }
}
