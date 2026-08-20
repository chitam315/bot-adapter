import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AzureChatModel } from '../../constants';
import { ConversationTurn } from '../generation.service';

export class ConversationTurnDto implements ConversationTurn {
  @ApiProperty({ enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @ApiProperty()
  content: string;
}

export class GenerateTextDto {
  @ApiProperty({
    description: 'The user message to generate a reply for.',
    example: 'What is our refund policy?',
  })
  text: string;

  @ApiPropertyOptional({
    type: [ConversationTurnDto],
    description: 'Prior conversation turns, oldest first.',
  })
  history?: ConversationTurn[];

  @ApiPropertyOptional({
    enum: AzureChatModel,
    description:
      "Chat model to use. Defaults to the server's configured default when omitted.",
  })
  model?: AzureChatModel;
}
