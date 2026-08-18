import { Provider } from '@nestjs/common';
import { MemoryStorage } from 'botbuilder';
import { BOT_STORAGE } from '../bot.constants';

/**
 * In-memory conversation/user state — resets on restart/redeploy. BOT_STORAGE
 * is typed as botbuilder's `Storage` interface, so swapping this for a
 * durable implementation (e.g. Blob or Cosmos DB storage) later is a
 * one-file change; nothing else in the bot module depends on MemoryStorage directly.
 */
export const memoryStorageProvider: Provider = {
  provide: BOT_STORAGE,
  useValue: new MemoryStorage(),
};
