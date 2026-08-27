export const BOT_ADAPTER = Symbol('BOT_ADAPTER');
export const BOT_STORAGE = Symbol('BOT_STORAGE');

// Bounds how much conversation history is kept/sent to the model per turn.
export const MAX_HISTORY_TURNS = 10;
export const HISTORY_STATE_KEY = 'conversationHistory';

// Teams/Emulator only show a "typing..." indicator for a short window after
// each typing activity — re-send one on this interval while a long-running
// step (e.g. generateReply with LLM retries) is in flight, or the UI treats
// the turn as stalled well before the real response arrives.
export const TYPING_INDICATOR_INTERVAL_MS = 3000;
