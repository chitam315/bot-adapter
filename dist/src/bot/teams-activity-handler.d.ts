import { Storage, TeamsActivityHandler } from 'botbuilder';
import { PinoLogger } from 'nestjs-pino';
import { GenerationService } from '../ai/generation.service';
export declare class BotActivityHandler extends TeamsActivityHandler {
    private readonly generationService;
    private readonly logger;
    private readonly conversationState;
    private readonly historyProperty;
    constructor(storage: Storage, generationService: GenerationService, logger: PinoLogger);
    private handleMessage;
    private handleMembersAdded;
}
