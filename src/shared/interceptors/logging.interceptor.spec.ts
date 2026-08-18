import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  const buildContext = () =>
    ({
      getClass: () => ({ name: 'BotController' }),
      getHandler: () => ({ name: 'handleMessages' }),
    }) as unknown as ExecutionContext;

  const buildLogger = () => ({ setContext: jest.fn(), debug: jest.fn() });

  it('logs the handler name on success', (done) => {
    const logger = buildLogger();
    const interceptor = new LoggingInterceptor(logger as unknown as PinoLogger);
    const handler: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(buildContext(), handler).subscribe(() => {
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ handler: 'BotController.handleMessages' }),
        'Handler completed',
      );
      done();
    });
  });

  it('logs the handler name on failure', (done) => {
    const logger = buildLogger();
    const interceptor = new LoggingInterceptor(logger as unknown as PinoLogger);
    const handler: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    interceptor.intercept(buildContext(), handler).subscribe({
      error: () => {
        expect(logger.debug).toHaveBeenCalledWith(
          expect.objectContaining({ handler: 'BotController.handleMessages' }),
          'Handler failed',
        );
        done();
      },
    });
  });
});
