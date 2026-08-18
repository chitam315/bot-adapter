import { OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
export declare class DatabaseModule implements OnApplicationShutdown {
    private readonly pool;
    constructor(pool: Pool);
    onApplicationShutdown(): Promise<void>;
}
