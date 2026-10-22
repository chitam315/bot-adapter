import { relations } from 'drizzle-orm/relations';

import {
  botUsers,
  botConversations,
  botMessages,
  botLlmCalls,
} from './bot-adapter.schema';

export const botUsersRelations = relations(botUsers, ({ many }) => ({
  conversations: many(botConversations),

  llmCalls: many(botLlmCalls),
}));

export const botConversationsRelations = relations(
  botConversations,
  ({ one, many }) => ({
    user: one(botUsers, {
      fields: [botConversations.userId],

      references: [botUsers.id],
    }),

    messages: many(botMessages),

    llmCalls: many(botLlmCalls),
  }),
);

export const botMessagesRelations = relations(botMessages, ({ one }) => ({
  conversation: one(botConversations, {
    fields: [botMessages.conversationId],

    references: [botConversations.id],
  }),
}));

export const botLlmCallsRelations = relations(botLlmCalls, ({ one }) => ({
  conversation: one(botConversations, {
    fields: [botLlmCalls.conversationId],

    references: [botConversations.id],
  }),

  user: one(botUsers, {
    fields: [botLlmCalls.userId],

    references: [botUsers.id],
  }),

  userMessage: one(botMessages, {
    fields: [botLlmCalls.userMessageId],

    references: [botMessages.id],
    relationName: 'llmCallUserMessage',
  }),

  assistantMessage: one(botMessages, {
    fields: [botLlmCalls.assistantMessageId],

    references: [botMessages.id],
    relationName: 'llmCallAssistantMessage',
  }),
}));
