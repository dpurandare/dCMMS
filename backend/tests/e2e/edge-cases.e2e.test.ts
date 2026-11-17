/**
 * Small behaviours found by the REV-038 sweeps that belong to no single resource (REV-065).
 */
import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';
import { loginHeaders } from '../../tests/helpers/auth';

describe('Edge cases E2E', () => {
    let server: TestServer;
    let admin: Awaited<ReturnType<typeof loginHeaders>>;
    let other: Awaited<ReturnType<typeof loginHeaders>>;
    let adminId: string;
    let otherId: string;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
        await db.cleanAll();
        const tenant = await db.seedDefaultTenant();
        const a = await UserFactory.build({ email: 'edge-a@dcmms.local', password: 'password123', role: 'tenant_admin', tenantId: tenant.id });
        const b = await UserFactory.build({ email: 'edge-b@dcmms.local', password: 'password123', role: 'tenant_admin', tenantId: tenant.id });
        await db.insert('users', a);
        await db.insert('users', b);
        adminId = a.id;
        otherId = b.id;
        admin = await loginHeaders(server, 'edge-a@dcmms.local', 'password123');
        other = await loginHeaders(server, 'edge-b@dcmms.local', 'password123');
    }, 60000);

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    describe('reports', () => {
        it.each(['work_orders', 'assets', 'telemetry', 'alarms'])('accepts datasource %s', async (datasource) => {
            const res = await server.inject({
                method: 'POST', url: '/api/v1/reports', headers: admin,
                payload: { name: `r-${datasource}`, datasource, config: {} },
            });
            expect(res.statusCode).toBe(200);
        });

        // Used to return 200 and store the report; it only failed later, when run, with a 500.
        it('rejects an unknown datasource up front with a 400', async () => {
            const res = await server.inject({
                method: 'POST', url: '/api/v1/reports', headers: admin,
                payload: { name: 'bad', datasource: 'definitely_not_a_datasource', config: {} },
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('report execution (disabled, REV-066)', () => {
        // Execution built ClickHouse SQL by pasting stored filter values into the query: a proven
        // SQL injection. It is off until the report builder is ported to Postgres/Timescale with
        // parameterized SQL. This pins the OFF state so it cannot quietly come back.
        it('answers 503 for a report the caller owns, and never runs it', async () => {
            const created = await server.inject({
                method: 'POST', url: '/api/v1/reports', headers: admin,
                payload: {
                    name: 'inj', datasource: 'work_orders',
                    config: {
                        datasource: 'work_orders', columns: ['wo_id'],
                        filters: [{ field: 'status', operator: 'eq', value: "x' AND (SELECT throwIf(1, 'INJECTED')) = 0 --" }],
                    },
                },
            });
            expect(created.statusCode).toBe(200);
            const id = JSON.parse(created.body).id;

            const res = await server.inject({ method: 'POST', url: `/api/v1/reports/${id}/execute`, headers: admin, payload: {} });
            expect(res.statusCode).toBe(503);
            // the injected function must not have been evaluated (it would surface in an error body)
            expect(res.body).not.toContain('INJECTED');
            expect(res.body).toContain('REV-066');
        });
    });

    describe('compliance', () => {
        // Used to be a 500 "Failed to generate compliance report".
        it('answers 404, not 500, for a report on an unknown template', async () => {
            const res = await server.inject({
                method: 'POST', url: '/api/v1/compliance/reports', headers: admin,
                payload: { templateId: 'NO-SUCH-TEMPLATE' },
            });
            expect(res.statusCode).toBe(404);
        });
    });

    describe('device tokens', () => {
        const TOKEN = 'edge-case-device-token-0001';

        const isActive = async () =>
            (await db.query('select is_active from device_tokens where token = $1', [TOKEN])).rows[0]?.is_active;

        beforeAll(async () => {
            const res = await server.inject({
                method: 'POST', url: '/api/v1/users/device-token', headers: admin,
                payload: { userId: adminId, token: TOKEN, deviceType: 'ios' },
            });
            expect(res.statusCode).toBe(201);
            expect(await isActive()).toBe(true);
        });

        it("another user cannot unregister someone else's token", async () => {
            const res = await server.inject({
                method: 'DELETE', url: '/api/v1/users/device-token', headers: other,
                payload: { token: TOKEN },
            });
            expect(res.statusCode).toBe(200); // idempotent: not an error, but it must change nothing
            expect(await isActive()).toBe(true);
            expect(otherId).not.toBe(adminId);
        });

        it('the owner can unregister their own token', async () => {
            const res = await server.inject({
                method: 'DELETE', url: '/api/v1/users/device-token', headers: admin,
                payload: { token: TOKEN },
            });
            expect(res.statusCode).toBe(200);
            expect(await isActive()).toBe(false);
        });
    });
});
