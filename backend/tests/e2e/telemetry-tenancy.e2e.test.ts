/**
 * Telemetry tenancy (REV-054 finding). Readings carry a site_id but no tenant column, so tenancy is
 * enforced through site ownership. Before the fix, GET /telemetry returned every tenant's rows
 * (WHERE 1=1) and POST /telemetry accepted readings for any site.
 */
import { Pool } from 'pg';
import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';
import { loginHeaders } from '../../tests/helpers/auth';

const mockPublish = jest.fn();
jest.mock('../../src/services/kafka.service', () => ({
    kafkaService: { publishTelemetry: (...a: any[]) => mockPublish(...a), disconnect: async () => undefined },
}));

describe('Telemetry tenancy E2E', () => {
    let server: TestServer;
    let a: Awaited<ReturnType<typeof loginHeaders>>;
    let siteA: string;
    let siteB: string;
    let telemetrySql: Array<{ sql: string; params: any[] }>;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
        await db.cleanAll();
        const tenantA = await db.seedDefaultTenant();
        const tenantB = await db.insert('tenants', { tenant_id: 'tele-b', name: 'B', domain: 'tele-b.local', is_active: true, config: '{}' });
        await db.insert('users', await UserFactory.build({ email: 'tele-a@dcmms.local', password: 'password123', role: 'tenant_admin', tenantId: tenantA.id }));
        await db.insert('users', await UserFactory.build({ email: 'tele-b@dcmms.local', password: 'password123', role: 'tenant_admin', tenantId: tenantB.id }));
        a = await loginHeaders(server, 'tele-a@dcmms.local', 'password123');
        const b = await loginHeaders(server, 'tele-b@dcmms.local', 'password123');
        siteA = JSON.parse((await server.inject({ method: 'POST', url: '/api/v1/sites', headers: a, payload: { name: 'A site', siteId: 'TELE-A' } })).body).id;
        siteB = JSON.parse((await server.inject({ method: 'POST', url: '/api/v1/sites', headers: b, payload: { name: 'B site', siteId: 'TELE-B' } })).body).id;
    }, 60000);

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    // The time-series store is not under test: capture what would be sent to it. (Spies are
    // re-installed per test because the jest config restores mocks between tests.)
    beforeEach(() => {
        telemetrySql = [];
        mockPublish.mockResolvedValue({});
        const original = Pool.prototype.query as any;
        jest.spyOn(Pool.prototype, 'query').mockImplementation(function (this: any, sql: any, params?: any) {
            if (typeof sql === 'string' && sql.includes('sensor_readings')) {
                telemetrySql.push({ sql, params: params || [] });
                return Promise.resolve({ rows: [] });
            }
            return original.call(this, sql, params);
        } as any);
    });

    const event = (site: string) => ({
        timestamp: Date.now(), site_id: site, asset_id: 'x', sensor_type: 'TEMPERATURE', sensor_id: 's1', value: 20, unit: 'C',
    });

    describe('reading', () => {
        it('always restricts the query to the caller\'s own sites, even with no filter', async () => {
            const res = await server.inject({ method: 'GET', url: '/api/v1/telemetry', headers: a });
            expect(res.statusCode).toBe(200);
            expect(telemetrySql).toHaveLength(1);
            expect(telemetrySql[0].params[0]).toEqual([siteA]);
            expect(JSON.stringify(telemetrySql[0].params)).not.toContain(siteB);
        });

        it('answers 404 for another tenant\'s site and never queries the store', async () => {
            const res = await server.inject({ method: 'GET', url: `/api/v1/telemetry?site_id=${siteB}`, headers: a });
            expect(res.statusCode).toBe(404);
            expect(telemetrySql).toHaveLength(0);
        });

        it('allows an explicit filter on its own site', async () => {
            const res = await server.inject({ method: 'GET', url: `/api/v1/telemetry?site_id=${siteA}`, headers: a });
            expect(res.statusCode).toBe(200);
            expect(telemetrySql[0].params).toContain(siteA);
        });
    });

    describe('writing', () => {
        it('publishes readings for its own site', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/telemetry', headers: a, payload: [event(siteA)] });
            expect(JSON.parse(res.body)).toMatchObject({ accepted: 1, rejected: 0 });
            expect(mockPublish).toHaveBeenCalledTimes(1);
        });

        it('rejects readings for another tenant\'s site and does not publish them', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/telemetry', headers: a, payload: [event(siteB)] });
            expect(JSON.parse(res.body)).toMatchObject({ accepted: 0, rejected: 1 });
            expect(mockPublish).not.toHaveBeenCalled();
        });

        it('a mixed batch publishes only the caller\'s own readings', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/telemetry', headers: a, payload: [event(siteA), event(siteB)] });
            expect(JSON.parse(res.body)).toMatchObject({ accepted: 1, rejected: 1 });
            const published = mockPublish.mock.calls[0][1];
            expect(published.map((e: any) => e.site_id)).toEqual([siteA]);
        });
    });
});
