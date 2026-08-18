import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const buildHost = (
    request: { id?: string; url: string },
    response: { status: jest.Mock; json: jest.Mock },
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ArgumentsHost;

  const buildResponse = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json };
  };

  const buildLogger = () => ({ setContext: jest.fn(), error: jest.fn() });

  it('normalizes an HttpException into the standard error body', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger as unknown as PinoLogger);
    const response = buildResponse();
    const host = buildHost({ id: 'corr-1', url: '/api/messages' }, response);

    filter.catch(new HttpException('bad input', HttpStatus.BAD_REQUEST), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'bad input',
        correlationId: 'corr-1',
        path: '/api/messages',
      }),
    );
  });

  it('normalizes an unknown error to a 500 without leaking internals', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger as unknown as PinoLogger);
    const response = buildResponse();
    const host = buildHost({ id: 'corr-2', url: '/health' }, response);

    filter.catch(new Error('exploded'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
    expect(logger.error).toHaveBeenCalled();
  });
});
