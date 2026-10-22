// Status of one bot_adapter.llm_calls row — mirrors whether
// GenerationService.generateReply resolved or threw for that turn.
export enum LlmCallStatus {
  Success = 'success',
  Error = 'error',
}

// bot_adapter.messages.role — who a message row was authored by.
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

// Only value bot_adapter.conversations.status takes today — kept as a
// named constant (not inlined) since a future /reset-style command would
// introduce more values here.
export const ACTIVE_CONVERSATION_STATUS = 'active';

// bot_adapter.llmCalls.purposes value GenerationService.generateReply tags
// its own generateTextLogged calls with — see the column's comment in
// bot-adapter.schema.ts. Not a closed enum: other future callers of
// generateTextLogged are expected to invent their own purpose strings.
export const CHAT_REPLY_PURPOSE = 'chat-reply';
