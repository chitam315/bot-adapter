import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: PinoLogger);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
