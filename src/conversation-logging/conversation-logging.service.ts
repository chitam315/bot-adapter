import { Inject, Injectable } from '@nestjs/common';
import { generateText } from 'ai';
import { eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PinoLogger } from 'nestjs-pino';
import { FlatUsage, mapToolCalls, mapUsage } from '../ai/generation.util';
import {
  ACTIVE_CONVERSATION_STATUS,
  DRIZZLE,
  LlmCallStatus,
  MessageRole,
} from '../constants';
import * as schema from '../database/schema';

export interface TeamsUserInput {
  teamsUserId: string;
  aadObjectId?: string;
  tenantId?: string;
  name?: string;
  // Fetched once via TeamsInfo.getMember — see
  // BotActivityHandler.enrichTeamsProfile. Omitted (not `null`) on turns
  // where enrichment wasn't attempted, so upsertUser knows not to clobber
  // an already-stored profile with empty values.
  email?: string;
  givenName?: string;
  surname?: string;
  userPrincipalName?: string;
}

export interface TeamsConversationInput {
  channelConversationId: string;
  channelId: string;
  conversationType?: string;
  isGroup?: boolean;
  locale?: string;
  teamId?: string;
  teamName?: string;
  channelName?: string;
}

export interface ResolvedConversation {
  userId?: string;
  conversationId?: string;
}

export interface LogUserMessageInput {
  conversationId?: string;
  activityId?: string;
  content: string;
}

export interface GenerateTextLoggedContext {
  conversationId?: string;
  userId?: string;
  userMessageId?: string;
  activityId?: string;
}

type GenerateTextParams = Parameters<typeof generateText>[0] & {
  // AzureChatModel key (e.g. 'gpt-4.1') — stored in llmCalls.model instead
  // of the raw Azure deployment name baked into `params.model`.
  modelKey: string;
  // What this call is for, e.g. ['chat-reply'] — see the comment on
  // botLlmCalls.purposes in bot-adapter.schema.ts. Required so every
  // caller consciously tags its calls, same reasoning as generateTextLogged
  // itself being the only sanctioned way to call generateText.
  purposes: string[];
};

interface InsertMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  activityId?: string;
}

interface InsertLlmCallInput {
  conversationId?: string;
  userId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  activityId?: string;
  model: string;
  purposes?: string[];
  status: LlmCallStatus;
  errorMessage?: string;
  usage?: FlatUsage;
  toolCalls?: string[];
  latencyMs?: number;
}

/**
 * Persists Teams identities/conversations/messages, and is the only
 * sanctioned way to call the AI SDK's generateText anywhere in this
 * codebase (via generateTextLogged) — every call is logged into
 * bot_adapter.llmCalls by construction, not by a caller remembering to log
 * it afterwards. Every public write here is best-effort: a DB problem is
 * logged and swallowed rather than thrown, so it can never take down the
 * actual chat turn or mask a real generateText result/error.
 */
@Injectable()
export class ConversationLoggingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConversationLoggingService.name);
  }

  /**
   * Whether this Teams identity already has an enriched profile stored.
   * BotActivityHandler.enrichTeamsProfile uses this to decide whether a
   * TeamsInfo.getMember round-trip is worth making this turn — false for
   * both a brand-new user and one whose enrichment hasn't succeeded yet.
   */
  async hasEnrichedProfile(teamsUserId: string): Promise<boolean> {
    try {
      const [row] = await this.db
        .select({ email: schema.botUsers.email })
        .from(schema.botUsers)
        .where(eq(schema.botUsers.teamsUserId, teamsUserId))
        .limit(1);

      return row?.email != null;
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to check for an existing Teams profile — treating as unenriched',
      );
      return false;
    }
  }

  /**
   * Upserts the user and the conversation for one Teams turn. Called
   * eagerly, before generating a reply, so generateTextLogged has real ids
   * to link its llmCalls row to (see BotActivityHandler.generateAndSendReply)
   * instead of the old fire-and-forget-after-the-reply timing.
   */
  async resolveUserAndConversation(
    user: TeamsUserInput,
    conversation: TeamsConversationInput,
  ): Promise<ResolvedConversation> {
    try {
      const userId = await this.upsertUser(user);
      const conversationId = await this.upsertConversation(
        userId,
        conversation,
      );
      return { userId, conversationId };
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to resolve the Teams user/conversation — continuing without them',
      );
      return {};
    }
  }

  async logUserMessage(
    input: LogUserMessageInput,
  ): Promise<string | undefined> {
    if (!input.conversationId) {
      return undefined;
    }

    return this.tryInsertMessage({
      conversationId: input.conversationId,
      role: MessageRole.User,
      content: input.content,
      activityId: input.activityId,
    });
  }

  /**
   * The only sanctioned way to call the AI SDK's generateText. Wraps the
   * real call and always writes a bot_adapter.llmCalls row (plus the
   * assistant's bot_adapter.messages row on success). `context` fields are
   * all optional so this can be called without an existing Teams
   * conversation (see the header comment on botLlmCalls in
   * bot-adapter.schema.ts) — a future non-Teams caller just gets a row with
   * null conversation/user/message links. A logging failure never masks or
   * replaces the real generateText result/error: only genuine generateText
   * failures are rethrown.
   */
  async generateTextLogged(
    { modelKey, purposes, ...params }: GenerateTextParams,
    context: GenerateTextLoggedContext,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    const startedAt = Date.now();

    let result: Awaited<ReturnType<typeof generateText>>;
    try {
      result = await generateText(params);
    } catch (error) {
      await this.tryInsertLlmCall({
        ...context,
        model: modelKey,
        purposes,
        status: LlmCallStatus.Error,
        errorMessage: (error as Error).message,
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }

    const latencyMs = Date.now() - startedAt;
    const assistantMessageId = context.conversationId
      ? await this.tryInsertMessage({
          conversationId: context.conversationId,
          role: MessageRole.Assistant,
          content: result.text,
        })
      : undefined;

    await this.tryInsertLlmCall({
      ...context,
      assistantMessageId,
      model: modelKey,
      purposes,
      status: LlmCallStatus.Success,
      usage: mapUsage(result.usage),
      toolCalls: mapToolCalls(result.toolCalls),
      latencyMs,
    });

    return result;
  }

  /**
   * Upserts on `teamsUserId`. Profile fields (email/givenName/surname/UPN)
   * are only overwritten when the caller actually fetched them this turn
   * (input.email set) — most turns don't re-run TeamsInfo.getMember, and
   * they must not clobber a previously-enriched profile with empty values.
   */
  private async upsertUser(input: TeamsUserInput): Promise<string> {
    const [row] = await this.db
      .insert(schema.botUsers)
      .values({
        teamsUserId: input.teamsUserId,
        aadObjectId: input.aadObjectId,
        tenantId: input.tenantId,
        name: input.name,
        email: input.email,
        givenName: input.givenName,
        surname: input.surname,
        userPrincipalName: input.userPrincipalName,
      })
      .onConflictDoUpdate({
        target: schema.botUsers.teamsUserId,
        set: {
          aadObjectId: input.aadObjectId,
          tenantId: input.tenantId,
          name: input.name,
          updatedAt: sql`now()`,
          ...(input.email != null && {
            email: input.email,
            givenName: input.givenName,
            surname: input.surname,
            userPrincipalName: input.userPrincipalName,
          }),
        },
      })
      .returning({ id: schema.botUsers.id });

    return row.id;
  }

  /**
   * Upserts on `channelConversationId`. `userId` only takes effect on the
   * first insert (a conversation belongs to whoever started it); a later
   * message just bumps `lastMessageAt` and refreshes the free Teams fields
   * (channel/team renames, locale changes, etc. — cheap, no extra API call,
   * so unlike the user profile fields these are always refreshed).
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
        conversationType: input.conversationType,
        isGroup: input.isGroup,
        locale: input.locale,
        teamId: input.teamId,
        teamName: input.teamName,
        channelName: input.channelName,
      })
      .onConflictDoUpdate({
        target: schema.botConversations.channelConversationId,
        set: {
          lastMessageAt: sql`now()`,
          updatedAt: sql`now()`,
          conversationType: input.conversationType,
          isGroup: input.isGroup,
          locale: input.locale,
          teamId: input.teamId,
          teamName: input.teamName,
          channelName: input.channelName,
        },
      })
      .returning({ id: schema.botConversations.id });

    return row.id;
  }

  private async tryInsertMessage(
    input: InsertMessageInput,
  ): Promise<string | undefined> {
    try {
      const [row] = await this.db
        .insert(schema.botMessages)
        .values(input)
        .returning({ id: schema.botMessages.id });

      return row.id;
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to log a message — continuing without it',
      );
      return undefined;
    }
  }

  private async tryInsertLlmCall(input: InsertLlmCallInput): Promise<void> {
    try {
      const isSuccess = input.status === LlmCallStatus.Success;

      await this.db.insert(schema.botLlmCalls).values({
        conversationId: input.conversationId,
        userId: input.userId,
        userMessageId: input.userMessageId,
        assistantMessageId: input.assistantMessageId,
        activityId: input.activityId,
        model: input.model,
        purposes: input.purposes ?? [],
        latencyMs: input.latencyMs,
        toolCalls: input.toolCalls ?? [],
        status: input.status,
        errorMessage: isSuccess ? null : (input.errorMessage ?? null),
        inputTokens: isSuccess ? (input.usage?.inputTokens ?? null) : null,
        cachedInputTokens: isSuccess
          ? (input.usage?.cachedInputTokens ?? null)
          : null,
        outputTokens: isSuccess ? (input.usage?.outputTokens ?? null) : null,
        reasoningTokens: isSuccess
          ? (input.usage?.reasoningTokens ?? null)
          : null,
        totalTokens: isSuccess ? (input.usage?.totalTokens ?? null) : null,
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to log an LLM call — continuing without it',
      );
    }
  }
}
