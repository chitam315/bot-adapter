/**
 * Hand-authored — NOT introspected via `npm run db:pull`, unlike schema.ts.
 * These tables belong to bot-adapter itself (Teams users, conversations,
 * and LLM call telemetry) and live in their own Postgres schema
 * (`bot_adapter`) inside the same database as the knowledge-base tables in
 * schema.ts, so:
 *  - table names never collide with the other app's `users`/`chats`/
 *    `messages`/`llmCalls` tables, which live in `public` (see schema.ts's
 *    own header comment — that file is a mirror of their schema, not ours).
 *  - `npm run db:generate` only ever diffs/emits statements for this
 *    schema's tables — never touches the other app's tables in `public`.
 *  - a Postgres role can eventually be scoped to this schema plus
 *    read-only access on the `public` knowledge-base tables, if we want to
 *    tighten bot-adapter's DB credential later.
 *
 * Being in a different Postgres *schema* (not a different database) does
 * NOT block reading documents/documentPages/faqs/embeddings from `public`
 * — KnowledgeBaseService is completely unaffected by this file and keeps
 * querying those tables exactly as before.
 *
 * Unlike schema.ts, this file IS meant to be hand-authored: edit it
 * directly and run `npm run db:generate` + `npm run db:migrate` as usual.
 * See src/database/schema/README.md for the full workflow.
 */
import {
  pgSchema,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  foreignKey,
  unique,
} from 'drizzle-orm/pg-core';

export const botAdapterSchema = pgSchema('bot_adapter');

/**
 * One row per Teams identity that has ever messaged the bot. Keyed on the
 * Teams/AAD identifiers — not on the other app's `public.users` table;
 * bot-adapter doesn't assume a Teams user has (or needs) an account there.
 */
export const botUsers = botAdapterSchema.table(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    // context.activity.from.id — stable per user per channel/tenant.
    teamsUserId: text().notNull(),

    // context.activity.from.aadObjectId — present for AAD-backed Teams
    // users, absent for e.g. anonymous Bot Framework Emulator testing.
    aadObjectId: text(),

    // context.activity.conversation.tenantId
    tenantId: text(),

    // context.activity.from.name — display name as Teams reports it.
    name: text(),

    // Fetched once via TeamsInfo.getMember(context, teamsUserId) the first
    // time this user is seen (not re-fetched on later turns — see
    // BotActivityHandler.enrichTeamsProfile). Stay null against the Bot
    // Framework Emulator, which has no real tenant to resolve these from.
    email: text(),
    givenName: text(),
    surname: text(),
    userPrincipalName: text(),
  },
  (table) => [
    unique('bot_users_teams_user_id_unique').on(table.teamsUserId),

    index().using('btree', table.aadObjectId.asc().nullsLast()),
  ],
);

/**
 * One row per Teams conversation (1:1 with a Bot Framework conversation
 * reference). `channelConversationId` is the natural external key — it's
 * what every inbound activity carries.
 */
export const botConversations = botAdapterSchema.table(
  'conversations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    userId: uuid().notNull(),

    // context.activity.conversation.id
    channelConversationId: text().notNull(),

    // context.activity.channelId — 'msteams' in production, 'emulator'
    // locally against the Bot Framework Emulator.
    channelId: text().notNull(),

    // Reserved for future use (e.g. an explicit /reset command); every
    // conversation is 'active' today.
    status: text().default('active').notNull(),

    lastMessageAt: timestamp({ withTimezone: true, mode: 'string' }),

    // The rest of these are free — no extra API call, sourced straight off
    // the activity — and refreshed on every turn (unlike the users.email/
    // etc. profile fields below, which are fetched once and kept).
    // context.activity.conversation.conversationType ('personal' |
    // 'groupChat' | 'channel' on Teams).
    conversationType: text(),
    // context.activity.conversation.isGroup
    isGroup: boolean(),
    // context.activity.locale
    locale: text(),
    // (context.activity.channelData as TeamsChannelData).team — absent for
    // 1:1 personal chat, the common case for this bot.
    teamId: text(),
    teamName: text(),
    // (context.activity.channelData as TeamsChannelData).channel?.name
    channelName: text(),
  },
  (table) => [
    unique('bot_conversations_channel_conversation_id_unique').on(
      table.channelConversationId,
    ),

    index().using('btree', table.userId.asc().nullsLast()),

    index().using('btree', table.lastMessageAt.asc().nullsLast()),

    foreignKey({
      columns: [table.userId],
      foreignColumns: [botUsers.id],
      name: 'bot_conversations_user_id_bot_users_id_fk',
    }).onDelete('cascade'),
  ],
);

/**
 * One row per user or assistant message. Split out from llmCalls (which
 * used to carry userMessage/assistantMessage text columns directly) so a
 * turn's text and its LLM-call telemetry are independently queryable, and
 * so generateTextLogged (see ConversationLoggingService) can be called by
 * anything invoking generateText — not just a Teams turn — without forcing
 * a text column onto every llmCalls row.
 */
export const botMessages = botAdapterSchema.table(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    conversationId: uuid().notNull(),

    // ConversationLoggingConstants.MessageRole
    role: text().notNull(),

    content: text().notNull(),

    // context.activity.id — set on the user's message; the assistant's
    // reply doesn't have its own inbound activity id.
    activityId: text(),
  },
  (table) => [
    index().using(
      'btree',
      table.conversationId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [botConversations.id],
      name: 'bot_messages_conversation_id_bot_conversations_id_fk',
    }).onDelete('cascade'),
  ],
);

/**
 * One row per generateTextLogged call (see ConversationLoggingService) —
 * the LLM call's token/latency metrics, linked to the message row(s) it
 * produced. conversationId/userId/userMessageId/assistantMessageId are all
 * nullable so this table can log a call made outside a Teams conversation
 * too (e.g. a future HTTP-triggered generateText call) — generateTextLogged
 * is meant to be the only sanctioned way to call generateText anywhere in
 * this codebase, Teams or not.
 */
export const botLlmCalls = botAdapterSchema.table(
  'llmCalls',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    conversationId: uuid(),

    // Denormalized off conversations.userId — avoids a join for per-user
    // analytics (token usage by user, turns per user, etc.).
    userId: uuid(),

    userMessageId: uuid(),
    // Null on an errored call, or when the caller has no message to link.
    assistantMessageId: uuid(),

    // context.activity.id of the inbound message activity — correlates a
    // row back to the exact Teams activity, and helps dedupe if the
    // channel ever redelivers.
    activityId: text(),

    // AzureChatModel key (e.g. 'gpt-4.1'), not the raw Azure deployment
    // name — see src/constants/azure-openai.constants.ts.
    model: text().notNull(),

    // What this call was for, e.g. ["chat-reply"] — generateTextLogged is
    // called for more than just answering a Teams message (summarization,
    // extraction, etc. are expected to reuse it too), so this is what
    // distinguishes those rows from each other. Caller-supplied, not a
    // closed enum — jsonb array, same reasoning as toolCalls below.
    purposes: jsonb().default([]),

    // ConversationLoggingConstants.LlmCallStatus
    status: text().notNull(),
    errorMessage: text(),

    // ai SDK's LanguageModelUsage fields — nullable because the SDK types
    // them as `number | undefined`, and an errored call has none of them.
    inputTokens: integer(),
    cachedInputTokens: integer(),
    outputTokens: integer(),
    reasoningTokens: integer(),
    totalTokens: integer(),

    latencyMs: integer(),

    // Names of the tools the model invoked this turn, e.g.
    // ["searchKnowledgeBase"]. Kept as jsonb (not a join table) since this
    // is for observability, not relational querying.
    toolCalls: jsonb().default([]),
  },
  (table) => [
    index().using(
      'btree',
      table.conversationId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    index().using('btree', table.userId.asc().nullsLast()),

    index().using('btree', table.status.asc().nullsLast()),

    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [botConversations.id],
      name: 'bot_llm_calls_conversation_id_bot_conversations_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.userId],
      foreignColumns: [botUsers.id],
      name: 'bot_llm_calls_user_id_bot_users_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.userMessageId],
      foreignColumns: [botMessages.id],
      name: 'bot_llm_calls_user_message_id_bot_messages_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.assistantMessageId],
      foreignColumns: [botMessages.id],
      name: 'bot_llm_calls_assistant_message_id_bot_messages_id_fk',
    }).onDelete('cascade'),
  ],
);
