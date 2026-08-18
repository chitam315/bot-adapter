import { OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
export declare class CoreModule implements OnModuleInit {
    private readonly pool;
    private readonly logger;
    constructor(pool: Pool);
    onModuleInit(): Promise<void>;
}
