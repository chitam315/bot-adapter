import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';

/**
 * Business-operation-level logging: which controller/handler ran and how
 * long it took. `pino-http` (wired in CoreModule) already logs every raw
 * HTTP request/response, so this interceptor's value-add is a log line
 * scoped to the handler itself, easy to correlate with the retrieval/LLM
 * work it triggers downstream.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug(
            { handler: handlerName, durationMs: Date.now() - startedAt },
            'Handler completed',
          );
        },
        error: (error: Error) => {
          this.logger.debug(
            {
              handler: handlerName,
              durationMs: Date.now() - startedAt,
              err: error,
            },
            'Handler failed',
          );
        },
      }),
    );
  }
}
