import { relations } from 'drizzle-orm/relations';

import { botUsers, botConversations, botLlmCalls } from './bot-adapter.schema';

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

    llmCalls: many(botLlmCalls),
  }),
);

export const botLlmCallsRelations = relations(botLlmCalls, ({ one }) => ({
  conversation: one(botConversations, {
    fields: [botLlmCalls.conversationId],

    references: [botConversations.id],
  }),

  user: one(botUsers, {
    fields: [botLlmCalls.userId],

    references: [botUsers.id],
  }),
}));
