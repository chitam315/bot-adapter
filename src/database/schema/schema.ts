/**
 * Introspected from the real production database via `npm run db:pull`
 * (see src/database/schema/README.md) — not hand-authored. Only
 * documents/documentPages/faqs/embeddings are actually queried by this app
 * (see KnowledgeBaseService); the rest belongs to the wider application that
 * owns this database and is kept here for local-DB parity, not because
 * bot-adapter reads/writes it.
 *
 * Re-run `npm run db:pull` and diff against this file when the real schema
 * changes; don't let this drift from production.
 */
import {
  pgTable,
  text,
  jsonb,
  timestamp,
  uuid,
  index,
  foreignKey,
  check,
  smallint,
  integer,
  boolean,
  unique,
  vector,
  uniqueIndex,
  real,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

export const quizSessionStatus = pgEnum('quiz_session_status', [
  'in_progress',
  'finished',
]);

export const appSettings = pgTable('appSettings', {
  key: text().primaryKey().notNull(),

  value: jsonb().notNull(),

  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),

  updatedBy: uuid(),
});

export const auditLogs = pgTable(
  'auditLogs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    entityType: text().notNull(),

    entityId: uuid().notNull(),

    action: text().notNull(),

    before: jsonb(),

    after: jsonb(),

    metadata: jsonb(),
  },
  (table) => [
    index().using('btree', table.action.asc().nullsLast()),

    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.createdBy.asc().nullsLast()),

    index().using('btree', table.entityId.asc().nullsLast()),

    index().using(
      'btree',
      table.entityType.asc().nullsLast(),
      table.entityId.asc().nullsLast(),
    ),

    index().using('btree', table.entityType.asc().nullsLast()),
  ],
);

export const campaignEvents = pgTable(
  'campaignEvents',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    campaignId: text().notNull(),

    contactId: text().notNull(),

    eventType: text().notNull(),

    metadata: jsonb(),
  },
  (table) => [
    index().using(
      'btree',
      table.campaignId.asc().nullsLast(),
      table.contactId.asc().nullsLast(),
    ),

    index().using('btree', table.campaignId.asc().nullsLast()),

    index().using('btree', table.contactId.asc().nullsLast()),

    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.createdBy.asc().nullsLast()),

    index().using('btree', table.eventType.asc().nullsLast()),
  ],
);

export const chatRatings = pgTable(
  'chatRatings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    chatId: uuid().notNull(),

    eventType: text().notNull(),

    stars: smallint(),

    issues: text().array().default(['']),

    comment: text(),
  },
  (table) => [
    index().using('btree', table.chatId.asc().nullsLast()),

    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using(
      'btree',
      table.createdBy.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'chatRatings_chatId_chats_id_fk',
    }).onDelete('cascade'),

    check(
      'chat_ratings_event_type_stars_chk',
      sql`(("eventType" = 'submitted'::text) AND ((stars >= 1) AND (stars <= 5))) OR (("eventType" = 'dismissed'::text) AND (stars IS NULL))`,
    ),
  ],
);

export const documents = pgTable(
  'documents',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    name: text().notNull(),

    fileKey: text().notNull(),

    summary: text(),

    originalFileName: text().notNull(),

    status: text().default('PROCESSING').notNull(),

    processingProgress: integer().default(0).notNull(),

    processingStage: text().default('queued'),

    totalPages: integer(),

    scale: smallint().default(2).notNull(),

    allowViewInCitation: boolean().default(true).notNull(),

    downloadLink: text(),

    expiredAt: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.createdBy.asc().nullsLast()),

    index().using('btree', table.expiredAt.asc().nullsLast()),

    index().using('btree', table.fileKey.asc().nullsLast()),

    index().using('btree', table.name.asc().nullsLast()),

    index().using('btree', table.status.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    index().using('btree', table.updatedBy.asc().nullsLast()),
  ],
);

export const chats = pgTable(
  'chats',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    source: text().default('portal').notNull(),

    chatType: text().notNull(),

    summary: text(),

    lockNote: text(),

    status: text().default('pending').notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using(
      'btree',
      table.createdBy.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    index().using('btree', table.source.asc().nullsLast()),

    index().using('btree', table.status.asc().nullsLast()),
  ],
);

export const documentPages = pgTable(
  'documentPages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    documentId: uuid().notNull(),

    pageNumber: integer().notNull(),

    content: text().notNull(),

    summary: text(),

    imageBase64: text(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.documentId.asc().nullsLast()),

    index().using('btree', table.pageNumber.asc().nullsLast()),

    foreignKey({
      columns: [table.documentId],

      foreignColumns: [documents.id],

      name: 'documentPages_documentId_documents_id_fk',
    }).onDelete('cascade'),
  ],
);

export const departments = pgTable(
  'departments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    name: text().notNull(),

    description: text().default('').notNull(),

    userTypeId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.name.asc().nullsLast()),

    index().using('btree', table.userTypeId.asc().nullsLast()),

    foreignKey({
      columns: [table.userTypeId],

      foreignColumns: [userTypes.id],

      name: 'departments_userTypeId_userTypes_id_fk',
    }).onDelete('cascade'),
  ],
);

export const eventLogs = pgTable(
  'eventLogs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    eventType: text().notNull(),

    userId: uuid(),

    userAgent: text(),

    trackingData: jsonb(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.eventType.asc().nullsLast()),

    index().using('btree', table.userId.asc().nullsLast()),

    foreignKey({
      columns: [table.userId],

      foreignColumns: [users.id],

      name: 'eventLogs_userId_users_id_fk',
    }),
  ],
);

export const faqs = pgTable(
  'faqs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    question: text().notNull(),

    answer: text().notNull(),

    instruction: text(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.createdBy.asc().nullsLast()),

    index().using('btree', table.question.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    index().using('btree', table.updatedBy.asc().nullsLast()),
  ],
);

export const feedbacks = pgTable(
  'feedbacks',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    messageId: uuid(),

    chatId: uuid(),

    mode: text().notNull(),

    isLiked: boolean().notNull(),

    feedback: text(),

    markedAsReadAt: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    foreignKey({
      columns: [table.messageId],

      foreignColumns: [messages.id],

      name: 'feedbacks_messageId_messages_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'feedbacks_chatId_chats_id_fk',
    }).onDelete('cascade'),
  ],
);

export const messageLogs = pgTable(
  'messageLogs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    messageId: uuid(),

    chatId: uuid().notNull(),

    parts: jsonb(),

    object: jsonb(),

    role: text().notNull(),

    description: text(),

    agent: text(),
  },
  (table) => [
    index().using('btree', table.messageId.asc().nullsLast()),

    foreignKey({
      columns: [table.messageId],

      foreignColumns: [messages.id],

      name: 'messageLogs_messageId_messages_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'messageLogs_chatId_chats_id_fk',
    }).onDelete('cascade'),
  ],
);

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    title: text().notNull(),

    tagIds: uuid().array().notNull(),

    tagNames: text().array().notNull(),

    questions: jsonb().notNull(),

    llmFeedback: text(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.createdBy.asc().nullsLast()),
  ],
);

export const prompts = pgTable(
  'prompts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    prompt: text().notNull(),

    tag: text().notNull(),
  },
  (table) => [
    index().using('btree', table.tag.asc().nullsLast()),

    unique('prompts_tag_unique').on(table.tag),
  ],
);

export const roles = pgTable(
  'roles',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    name: text().notNull(),

    description: text().default('').notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.name.asc().nullsLast()),

    unique('roles_name_unique').on(table.name),
  ],
);

export const llmCalls = pgTable(
  'llmCalls',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    chatId: uuid(),

    messageId: uuid(),

    startedAt: timestamp({ withTimezone: true, mode: 'string' }),

    data: jsonb().notNull(),

    tags: jsonb().default([]),

    outputType: text().notNull(),

    cachedInputTokens: integer().notNull(),

    inputTokens: integer().notNull(),

    outputTokens: integer().notNull(),

    reasoningTokens: integer().notNull(),

    totalTokens: integer().notNull(),

    timeToFirstTokenMs: integer(),

    timeToFirstResponseMs: integer(),
  },
  (table) => [
    index().using(
      'btree',
      table.messageId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'llmCalls_chatId_chats_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.messageId],

      foreignColumns: [messages.id],

      name: 'llmCalls_messageId_messages_id_fk',
    }).onDelete('cascade'),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    chatId: uuid().notNull(),

    parts: jsonb().notNull(),

    role: text().notNull(),

    relatedEmbeddings: jsonb().default([]),
  },
  (table) => [
    index().using(
      'btree',
      table.chatId.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'messages_chatId_chats_id_fk',
    }).onDelete('cascade'),
  ],
);

export const memories = pgTable(
  'memories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    userId: uuid().notNull(),

    chatType: text().notNull(),

    content: text().notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using(
      'btree',
      table.userId.asc().nullsLast(),
      table.chatType.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.userId],

      foreignColumns: [users.id],

      name: 'memories_userId_users_id_fk',
    }).onDelete('cascade'),
  ],
);

export const userTypes = pgTable(
  'userTypes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    name: text().notNull(),

    description: text().default('').notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.name.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    unique('userTypes_name_unique').on(table.name),
  ],
);

export const terminologies = pgTable(
  'terminologies',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    term: text().notNull(),

    description: text().notNull(),

    context: text(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    tag: text().notNull(),

    description: text().default('').notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.tag.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    fullname: text(),

    username: text(),

    email: text(),

    displayName: text().generatedAlwaysAs(
      sql`COALESCE(email, fullname, username)`,
    ),

    producerCode: text(),

    roles: jsonb().default([]).notNull(),

    channels: jsonb().default([]).notNull(),

    type: text(),

    userTypeId: uuid(),

    roleId: uuid(),

    departmentId: uuid(),

    source: text(),

    mdmSetupAt: timestamp({ withTimezone: true, mode: 'string' }),

    contactId: text(),

    partyId: text(),

    nextTimeToShowRating: timestamp({ withTimezone: true, mode: 'string' }),

    position: jsonb(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using('btree', table.departmentId.asc().nullsLast()),

    index().using('btree', table.email.asc().nullsLast()),

    index().using('btree', table.roleId.asc().nullsLast()),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    index().using('btree', table.username.asc().nullsLast()),

    foreignKey({
      columns: [table.userTypeId],

      foreignColumns: [userTypes.id],

      name: 'users_userTypeId_userTypes_id_fk',
    }),

    foreignKey({
      columns: [table.roleId],

      foreignColumns: [roles.id],

      name: 'users_roleId_roles_id_fk',
    }),

    foreignKey({
      columns: [table.departmentId],

      foreignColumns: [departments.id],

      name: 'users_departmentId_departments_id_fk',
    }),
  ],
);

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    faqId: uuid(),

    documentPageId: uuid(),

    content: text().notNull(),

    embedding: vector({ dimensions: 2000 }).notNull(),
  },
  (table) => [
    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using(
      'hnsw',
      table.embedding.asc().nullsLast().op('vector_cosine_ops'),
    ),

    index().using('btree', table.updatedAt.asc().nullsLast()),

    foreignKey({
      columns: [table.faqId],

      foreignColumns: [faqs.id],

      name: 'embeddings_faqId_faqs_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.documentPageId],

      foreignColumns: [documentPages.id],

      name: 'embeddings_documentPageId_documentPages_id_fk',
    }).onDelete('cascade'),

    unique('embeddings_faqId_unique').on(table.faqId),

    unique('embeddings_documentPageId_unique').on(table.documentPageId),
  ],
);

export const quizSessions = pgTable(
  'quizSessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    quizId: uuid().notNull(),

    userId: uuid().notNull(),

    answers: jsonb().default([]).notNull(),

    currentIndex: integer().default(0).notNull(),

    status: quizSessionStatus().default('in_progress').notNull(),

    score: integer(),

    total: integer(),

    startedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    finishedAt: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index().using('btree', table.status.asc().nullsLast()),

    index().using('btree', table.userId.asc().nullsLast()),

    foreignKey({
      columns: [table.quizId],

      foreignColumns: [quizzes.id],

      name: 'quizSessions_quizId_quizzes_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.userId],

      foreignColumns: [users.id],

      name: 'quizSessions_userId_users_id_fk',
    }).onDelete('cascade'),

    unique('uq_quiz_sessions_user_quiz').on(table.quizId, table.userId),
  ],
);

export const campaignSurveys = pgTable(
  'campaignSurveys',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    campaignId: text().default('').notNull(),

    chatId: uuid().notNull(),

    eventType: text().notNull(),

    surveyType: text().notNull(),

    actionConnected: text(),

    outcome: text(),
  },
  (table) => [
    uniqueIndex().using(
      'btree',
      table.campaignId.asc().nullsLast(),
      table.chatId.asc().nullsLast(),
      table.createdBy.asc().nullsLast(),
    ),

    index().using('btree', table.campaignId.asc().nullsLast()),

    index().using('btree', table.chatId.asc().nullsLast()),

    index().using(
      'btree',
      table.createdBy.asc().nullsLast(),
      table.createdAt.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'campaignSurveys_chatId_chats_id_fk',
    }).onDelete('cascade'),

    check(
      'campaign_sales_follow_up_event_contact_chk',
      sql`(("eventType" = 'submitted'::text) AND ("actionConnected" IS NOT NULL) AND (outcome IS NOT NULL)) OR (("eventType" = 'dismissed'::text) AND ("actionConnected" IS NULL) AND (outcome IS NULL))`,
    ),
  ],
);

export const agentLogs = pgTable(
  'agentLogs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    chatId: uuid().notNull(),

    messageId: uuid(),

    userId: uuid(),

    userMessage: text(),

    agentResponse: text(),

    steps: integer(),

    totalTokens: integer(),

    toolsUsed: jsonb(),

    latencyMs: integer(),

    model: text(),

    memoriesRetrieved: integer(),

    compactionTriggered: boolean(),

    windowUtilization: real(),

    status: text(),

    timeToFirstTokenMs: integer(),
  },
  (table) => [
    index().using('btree', table.chatId.asc().nullsLast()),

    index().using('btree', table.createdAt.asc().nullsLast()),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'agentLogs_chatId_chats_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.messageId],

      foreignColumns: [messages.id],

      name: 'agentLogs_messageId_messages_id_fk',
    }).onDelete('cascade'),
  ],
);

export const toolLogs = pgTable(
  'toolLogs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    createdBy: uuid(),

    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),

    updatedBy: uuid(),

    chatId: uuid().notNull(),

    messageId: uuid(),

    toolCallId: text().notNull(),

    toolName: text().notNull(),

    status: text().notNull(),

    errorMessage: text(),

    latencyMs: integer(),
  },
  (table) => [
    index().using('btree', table.chatId.asc().nullsLast()),

    index().using('btree', table.createdAt.asc().nullsLast()),

    index().using(
      'btree',
      table.toolName.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),

    foreignKey({
      columns: [table.chatId],

      foreignColumns: [chats.id],

      name: 'toolLogs_chatId_chats_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.messageId],

      foreignColumns: [messages.id],

      name: 'toolLogs_messageId_messages_id_fk',
    }).onDelete('cascade'),
  ],
);

export const documentsToTags = pgTable(
  'documentsToTags',
  {
    documentId: uuid().notNull(),

    tagId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.tagId.asc().nullsLast()),

    foreignKey({
      columns: [table.documentId],

      foreignColumns: [documents.id],

      name: 'documentsToTags_documentId_documents_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.tagId],

      foreignColumns: [tags.id],

      name: 'documentsToTags_tagId_tags_id_fk',
    }).onDelete('cascade'),

    primaryKey({
      columns: [table.documentId, table.tagId],
      name: 'documentsToTags_documentId_tagId_pk',
    }),
  ],
);

export const faqDepartments = pgTable(
  'faqDepartments',
  {
    faqId: uuid().notNull(),

    departmentId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.departmentId.asc().nullsLast()),

    foreignKey({
      columns: [table.faqId],

      foreignColumns: [faqs.id],

      name: 'faqDepartments_faqId_faqs_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.departmentId],

      foreignColumns: [departments.id],

      name: 'faqDepartments_departmentId_departments_id_fk',
    }).onDelete('cascade'),

    primaryKey({
      columns: [table.faqId, table.departmentId],
      name: 'faqDepartments_faqId_departmentId_pk',
    }),
  ],
);

export const faqsToTags = pgTable(
  'faqsToTags',
  {
    faqId: uuid().notNull(),

    tagId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.tagId.asc().nullsLast()),

    foreignKey({
      columns: [table.faqId],

      foreignColumns: [faqs.id],

      name: 'faqsToTags_faqId_faqs_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.tagId],

      foreignColumns: [tags.id],

      name: 'faqsToTags_tagId_tags_id_fk',
    }).onDelete('cascade'),

    primaryKey({
      columns: [table.faqId, table.tagId],
      name: 'faqsToTags_faqId_tagId_pk',
    }),
  ],
);

export const documentsToUserTypes = pgTable(
  'documentsToUserTypes',
  {
    documentId: uuid().notNull(),

    userTypeId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.userTypeId.asc().nullsLast()),

    foreignKey({
      columns: [table.documentId],

      foreignColumns: [documents.id],

      name: 'documentsToUserTypes_documentId_documents_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.userTypeId],

      foreignColumns: [userTypes.id],

      name: 'documentsToUserTypes_userTypeId_userTypes_id_fk',
    }).onDelete('cascade'),

    primaryKey({
      columns: [table.documentId, table.userTypeId],
      name: 'documentsToUserTypes_documentId_userTypeId_pk',
    }),
  ],
);

export const faqsToUserTypes = pgTable(
  'faqsToUserTypes',
  {
    faqId: uuid().notNull(),

    userTypeId: uuid().notNull(),
  },
  (table) => [
    index().using('btree', table.userTypeId.asc().nullsLast()),

    foreignKey({
      columns: [table.faqId],

      foreignColumns: [faqs.id],

      name: 'faqsToUserTypes_faqId_faqs_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.userTypeId],

      foreignColumns: [userTypes.id],

      name: 'faqsToUserTypes_userTypeId_userTypes_id_fk',
    }).onDelete('cascade'),

    primaryKey({
      columns: [table.faqId, table.userTypeId],
      name: 'faqsToUserTypes_faqId_userTypeId_pk',
    }),
  ],
);

export const documentDepartments = pgTable(
  'documentDepartments',
  {
    documentId: uuid().notNull(),

    departmentId: uuid().notNull(),

    approvalStatus: text().default('pending_approval').notNull(),

    approvedBy: uuid(),

    approvedAt: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index().using('btree', table.approvalStatus.asc().nullsLast()),

    index().using('btree', table.departmentId.asc().nullsLast()),

    foreignKey({
      columns: [table.documentId],

      foreignColumns: [documents.id],

      name: 'documentDepartments_documentId_documents_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.departmentId],

      foreignColumns: [departments.id],

      name: 'documentDepartments_departmentId_departments_id_fk',
    }).onDelete('cascade'),

    foreignKey({
      columns: [table.approvedBy],

      foreignColumns: [users.id],

      name: 'documentDepartments_approvedBy_users_id_fk',
    }),

    primaryKey({
      columns: [table.documentId, table.departmentId],
      name: 'documentDepartments_documentId_departmentId_pk',
    }),
  ],
);
