import { CloudAdapter, TurnContext } from 'botbuilder';
import { Request, Response } from 'express';
import { BotController } from './bot.controller';
import { BotActivityHandler } from './teams-activity-handler';

// CloudAdapter.process is overloaded (HTTP + two websocket variants);
// pin down the HTTP signature explicitly rather than letting
// Parameters<CloudAdapter['process']> resolve to the wrong overload.
type ProcessHttp = (
  req: Request,
  res: Response,
  logic: (context: TurnContext) => Promise<void>,
) => Promise<void>;

describe('BotController', () => {
  it('delegates the request to the adapter, running the activity handler as the turn logic', async () => {
    const process = jest
      .fn<ReturnType<ProcessHttp>, Parameters<ProcessHttp>>()
      .mockResolvedValue(undefined);
    const adapter = { process } as unknown as CloudAdapter;
    const run = jest
      .fn<
        ReturnType<BotActivityHandler['run']>,
        Parameters<BotActivityHandler['run']>
      >()
      .mockResolvedValue(undefined);
    const activityHandler = { run } as unknown as BotActivityHandler;

    const controller = new BotController(adapter, activityHandler);
    const req = {} as Request;
    const res = {} as Response;

    await controller.handleMessages(req, res);

    expect(process).toHaveBeenCalledWith(req, res, expect.any(Function));

    const turnLogic = process.mock.calls[0][2];
    const context = {} as TurnContext;
    await turnLogic(context);

    expect(run).toHaveBeenCalledWith(context);
  });
});
