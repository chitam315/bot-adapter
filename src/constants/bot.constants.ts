export const BOT_ADAPTER = Symbol('BOT_ADAPTER');
export const BOT_STORAGE = Symbol('BOT_STORAGE');

// Bounds how much conversation history is kept/sent to the model per turn.
export const MAX_HISTORY_TURNS = 10;
export const HISTORY_STATE_KEY = 'conversationHistory';
