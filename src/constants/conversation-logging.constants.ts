// Status of one bot_adapter.llm_calls row — mirrors whether
// GenerationService.generateReply resolved or threw for that turn.
export enum LlmCallStatus {
  Success = 'success',
  Error = 'error',
}

// Only value bot_adapter.conversations.status takes today — kept as a
// named constant (not inlined) since a future /reset-style command would
// introduce more values here.
export const ACTIVE_CONVERSATION_STATUS = 'active';
