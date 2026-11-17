/**
 * The ClickHouse ETL must refuse to start (REV-066).
 *
 * Enabling it copies every tenant's data into ClickHouse, whose query builders are
 * SQL-injectable. A log line saying "ETL disabled" is easy to miss and "enabled" is a single env
 * var, so the guard fails the boot instead.
 */
import { ETLSchedulerService } from '../../src/services/etl-scheduler.service';

const fakeFastify: any = { log: { info: () => undefined, error: () => undefined, warn: () => undefined } };

describe('ClickHouse ETL guard', () => {
    const original = process.env.CLICKHOUSE_ETL_ENABLED;
    afterEach(() => {
        if (original === undefined) delete process.env.CLICKHOUSE_ETL_ENABLED;
        else process.env.CLICKHOUSE_ETL_ENABLED = original;
    });

    it('throws when CLICKHOUSE_ETL_ENABLED=true', async () => {
        process.env.CLICKHOUSE_ETL_ENABLED = 'true';
        await expect(new ETLSchedulerService(fakeFastify).start()).rejects.toThrow(/blocked.*REV-066/);
    });

    it('is a quiet no-op when it is unset (the default)', async () => {
        delete process.env.CLICKHOUSE_ETL_ENABLED;
        await expect(new ETLSchedulerService(fakeFastify).start()).resolves.toBeUndefined();
    });

    it('is a quiet no-op when it is explicitly false', async () => {
        process.env.CLICKHOUSE_ETL_ENABLED = 'false';
        await expect(new ETLSchedulerService(fakeFastify).start()).resolves.toBeUndefined();
    });
});
