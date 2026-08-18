import { CloudAdapter } from 'botbuilder';
import { Request, Response } from 'express';
import { BotActivityHandler } from './teams-activity-handler';
export declare class BotController {
    private readonly adapter;
    private readonly activityHandler;
    constructor(adapter: CloudAdapter, activityHandler: BotActivityHandler);
    handleMessages(req: Request, res: Response): Promise<void>;
}
