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
 * One row per Teams turn that reached GenerationService.generateReply —
 * both the user/assistant text for that turn and the LLM call's token/
 * latency metrics. Merged into one table (rather than separate `messages`
 * + `llmCalls` tables like the other app's schema) because this bot makes
 * exactly one generateText call per turn today — split them apart later if
 * that stops being true (e.g. multi-message batching per turn).
 */
export const botLlmCalls = botAdapterSchema.table(
  'llmCalls',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    conversationId: uuid().notNull(),

    // Denormalized off conversations.userId — avoids a join for per-user
    // analytics (token usage by user, turns per user, etc.).
    userId: uuid().notNull(),

    // context.activity.id of the inbound message activity — correlates a
    // row back to the exact Teams activity, and helps dedupe if the
    // channel ever redelivers.
    activityId: text(),

    userMessage: text().notNull(),
    assistantMessage: text(),

    // AzureChatModel key (e.g. 'gpt-4.1'), not the raw Azure deployment
    // name — see src/constants/azure-openai.constants.ts.
    model: text().notNull(),

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
  ],
);
