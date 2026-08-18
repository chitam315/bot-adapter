import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger;
    constructor(logger: PinoLogger);
    catch(exception: unknown, host: ArgumentsHost): void;
    private toCorrelationId;
    private extractMessage;
}
