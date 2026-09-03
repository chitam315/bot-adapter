import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ConversationLoggingService } from './conversation-logging.service';

@Module({
  imports: [DatabaseModule],
  providers: [ConversationLoggingService],
  exports: [ConversationLoggingService],
})
export class ConversationLoggingModule {}
