import { Pool } from 'pg';
import { CoreModule } from './core.module';

describe('CoreModule', () => {
  it('pings the database on module init and fails fast if unreachable', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const pool = { query } as unknown as Pool;

    const coreModule = new CoreModule(pool);
    await coreModule.onModuleInit();

    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('propagates the connectivity error instead of swallowing it', async () => {
    const error = new Error('connection refused');
    const pool = {
      query: jest.fn().mockRejectedValue(error),
    } as unknown as Pool;

    const coreModule = new CoreModule(pool);

    await expect(coreModule.onModuleInit()).rejects.toThrow(
      'connection refused',
    );
  });
});
