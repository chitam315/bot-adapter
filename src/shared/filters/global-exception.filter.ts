import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

interface NormalizedErrorBody {
  statusCode: number;
  message: string;
  correlationId: string;
  timestamp: string;
  path: string;
}

/**
 * Catch-all HTTP exception filter. Normalizes every thrown error into a
 * consistent JSON shape and logs it with the request's correlation ID.
 * Covers HTTP request/response paths only — errors during bot turn
 * processing are handled separately by the adapter's `onTurnError` (see
 * src/bot/bot-framework-adapter.provider.ts), since by the time a turn
 * errors the HTTP response has usually already been sent.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException
      ? this.extractMessage(exception)
      : 'Internal server error';

    const body: NormalizedErrorBody = {
      statusCode,
      message,
      correlationId: this.toCorrelationId(request.id),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const error =
      exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error({ err: error, ...body }, 'Unhandled exception');

    response.status(statusCode).json(body);
  }

  // pino-http's req.id is typed as `string | number | object`, though in
  // practice CoreModule's genReqId always produces a string.
  private toCorrelationId(id: unknown): string {
    return typeof id === 'string' || typeof id === 'number'
      ? String(id)
      : JSON.stringify(id);
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const { message } = response as { message: string | string[] };
      return Array.isArray(message) ? message.join(', ') : message;
    }
    return exception.message;
  }
}
