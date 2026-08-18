import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { Pool } from 'pg';
export declare class HealthController {
    private readonly health;
    private readonly indicatorService;
    private readonly pool;
    constructor(health: HealthCheckService, indicatorService: HealthIndicatorService, pool: Pool);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & (import("@nestjs/terminus").HealthIndicatorResult<"database", "up", Record<string, any>> | import("@nestjs/terminus").HealthIndicatorResult<"database", "down", {
        message: string;
    }>), Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & (import("@nestjs/terminus").HealthIndicatorResult<"database", "up", Record<string, any>> | import("@nestjs/terminus").HealthIndicatorResult<"database", "down", {
        message: string;
    }>)> | undefined, Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & (import("@nestjs/terminus").HealthIndicatorResult<"database", "up", Record<string, any>> | import("@nestjs/terminus").HealthIndicatorResult<"database", "down", {
        message: string;
    }>)> | undefined>>;
}
