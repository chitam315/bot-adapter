import { relations } from 'drizzle-orm/relations';

import {
  chats,
  chatRatings,
  documents,
  documentPages,
  userTypes,
  departments,
  users,
  eventLogs,
  messages,
  feedbacks,
  messageLogs,
  llmCalls,
  memories,
  roles,
  faqs,
  embeddings,
  quizzes,
  quizSessions,
  campaignSurveys,
  agentLogs,
  toolLogs,
  documentsToTags,
  tags,
  faqDepartments,
  faqsToTags,
  documentsToUserTypes,
  faqsToUserTypes,
  documentDepartments,
} from './schema';

export const chatRatingsRelations = relations(chatRatings, ({ one }) => ({
  chat: one(chats, {
    fields: [chatRatings.chatId],

    references: [chats.id],
  }),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  chatRatings: many(chatRatings),

  feedbacks: many(feedbacks),

  messageLogs: many(messageLogs),

  llmCalls: many(llmCalls),

  messages: many(messages),

  campaignSurveys: many(campaignSurveys),

  agentLogs: many(agentLogs),

  toolLogs: many(toolLogs),
}));

export const documentPagesRelations = relations(
  documentPages,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentPages.documentId],

      references: [documents.id],
    }),

    embeddings: many(embeddings),
  }),
);

export const documentsRelations = relations(documents, ({ many }) => ({
  documentPages: many(documentPages),

  documentsToTags: many(documentsToTags),

  documentsToUserTypes: many(documentsToUserTypes),

  documentDepartments: many(documentDepartments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  userType: one(userTypes, {
    fields: [departments.userTypeId],

    references: [userTypes.id],
  }),

  users: many(users),

  faqDepartments: many(faqDepartments),

  documentDepartments: many(documentDepartments),
}));

export const userTypesRelations = relations(userTypes, ({ many }) => ({
  departments: many(departments),

  users: many(users),

  documentsToUserTypes: many(documentsToUserTypes),

  faqsToUserTypes: many(faqsToUserTypes),
}));

export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  user: one(users, {
    fields: [eventLogs.userId],

    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  eventLogs: many(eventLogs),

  memories: many(memories),

  userType: one(userTypes, {
    fields: [users.userTypeId],

    references: [userTypes.id],
  }),

  role: one(roles, {
    fields: [users.roleId],

    references: [roles.id],
  }),

  department: one(departments, {
    fields: [users.departmentId],

    references: [departments.id],
  }),

  quizSessions: many(quizSessions),

  documentDepartments: many(documentDepartments),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
  message: one(messages, {
    fields: [feedbacks.messageId],

    references: [messages.id],
  }),

  chat: one(chats, {
    fields: [feedbacks.chatId],

    references: [chats.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  feedbacks: many(feedbacks),

  messageLogs: many(messageLogs),

  llmCalls: many(llmCalls),

  chat: one(chats, {
    fields: [messages.chatId],

    references: [chats.id],
  }),

  agentLogs: many(agentLogs),

  toolLogs: many(toolLogs),
}));

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
  message: one(messages, {
    fields: [messageLogs.messageId],

    references: [messages.id],
  }),

  chat: one(chats, {
    fields: [messageLogs.chatId],

    references: [chats.id],
  }),
}));

export const llmCallsRelations = relations(llmCalls, ({ one }) => ({
  chat: one(chats, {
    fields: [llmCalls.chatId],

    references: [chats.id],
  }),

  message: one(messages, {
    fields: [llmCalls.messageId],

    references: [messages.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(users, {
    fields: [memories.userId],

    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  faq: one(faqs, {
    fields: [embeddings.faqId],

    references: [faqs.id],
  }),

  documentPage: one(documentPages, {
    fields: [embeddings.documentPageId],

    references: [documentPages.id],
  }),
}));

export const faqsRelations = relations(faqs, ({ many }) => ({
  embeddings: many(embeddings),

  faqDepartments: many(faqDepartments),

  faqsToTags: many(faqsToTags),

  faqsToUserTypes: many(faqsToUserTypes),
}));

export const quizSessionsRelations = relations(quizSessions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizSessions.quizId],

    references: [quizzes.id],
  }),

  user: one(users, {
    fields: [quizSessions.userId],

    references: [users.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  quizSessions: many(quizSessions),
}));

export const campaignSurveysRelations = relations(
  campaignSurveys,
  ({ one }) => ({
    chat: one(chats, {
      fields: [campaignSurveys.chatId],

      references: [chats.id],
    }),
  }),
);

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  chat: one(chats, {
    fields: [agentLogs.chatId],

    references: [chats.id],
  }),

  message: one(messages, {
    fields: [agentLogs.messageId],

    references: [messages.id],
  }),
}));

export const toolLogsRelations = relations(toolLogs, ({ one }) => ({
  chat: one(chats, {
    fields: [toolLogs.chatId],

    references: [chats.id],
  }),

  message: one(messages, {
    fields: [toolLogs.messageId],

    references: [messages.id],
  }),
}));

export const documentsToTagsRelations = relations(
  documentsToTags,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentsToTags.documentId],

      references: [documents.id],
    }),

    tag: one(tags, {
      fields: [documentsToTags.tagId],

      references: [tags.id],
    }),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  documentsToTags: many(documentsToTags),

  faqsToTags: many(faqsToTags),
}));

export const faqDepartmentsRelations = relations(faqDepartments, ({ one }) => ({
  faq: one(faqs, {
    fields: [faqDepartments.faqId],

    references: [faqs.id],
  }),

  department: one(departments, {
    fields: [faqDepartments.departmentId],

    references: [departments.id],
  }),
}));

export const faqsToTagsRelations = relations(faqsToTags, ({ one }) => ({
  faq: one(faqs, {
    fields: [faqsToTags.faqId],

    references: [faqs.id],
  }),

  tag: one(tags, {
    fields: [faqsToTags.tagId],

    references: [tags.id],
  }),
}));

export const documentsToUserTypesRelations = relations(
  documentsToUserTypes,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentsToUserTypes.documentId],

      references: [documents.id],
    }),

    userType: one(userTypes, {
      fields: [documentsToUserTypes.userTypeId],

      references: [userTypes.id],
    }),
  }),
);

export const faqsToUserTypesRelations = relations(
  faqsToUserTypes,
  ({ one }) => ({
    faq: one(faqs, {
      fields: [faqsToUserTypes.faqId],

      references: [faqs.id],
    }),

    userType: one(userTypes, {
      fields: [faqsToUserTypes.userTypeId],

      references: [userTypes.id],
    }),
  }),
);

export const documentDepartmentsRelations = relations(
  documentDepartments,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentDepartments.documentId],

      references: [documents.id],
    }),

    department: one(departments, {
      fields: [documentDepartments.departmentId],

      references: [departments.id],
    }),

    user: one(users, {
      fields: [documentDepartments.approvedBy],

      references: [users.id],
    }),
  }),
);
