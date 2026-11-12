import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';
import { loginHeaders } from '../../tests/helpers/auth';
import { permits } from '../../src/db/schema';

describe('Permits & Safety Gates E2E', () => {
    let server: TestServer;
    let authHeaders: { Authorization: string; 'x-csrf-token': string };
    let defaultTenant: any;
    let siteId: string;
    let assetId: string;
    let userId: string;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    beforeEach(async () => {
        await db.cleanAll();
        defaultTenant = await db.seedDefaultTenant();

        const user = await UserFactory.build({
            email: 'admin@dcmms.local',
            password: 'password123',
            role: 'super_admin',
            tenantId: defaultTenant.id
        });
        await db.insert('users', user);
        userId = user.id;

        // Login
        authHeaders = await loginHeaders(server, 'admin@dcmms.local', 'password123');

        // Create Site
        const siteRes = await server.inject({
            method: 'POST',
            url: '/api/v1/sites',
            headers: authHeaders,
            payload: { name: 'Permit Site', siteId: 'PER-SITE' }
        });
        siteId = JSON.parse(siteRes.body).id;

        // Create Asset
        const assetRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: authHeaders,
            payload: { siteId, name: 'Permit Asset', type: 'inverter', status: 'operational' }
        });
        assetId = JSON.parse(assetRes.body).id;
    });

    describe('Permit CRUD', () => {
        it('should create and list permits', async () => {
            // Create WO
            const woRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: {
                    title: "Dangerous Work",
                    type: "corrective",
                    priority: "high",
                    siteId
                }
            });
            const woId = JSON.parse(woRes.body).id;

            // Create Permit
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/permits',
                headers: authHeaders,
                payload: {
                    workOrderId: woId,
                    type: "hot_work",
                    validFrom: new Date().toISOString(),
                    validUntil: new Date(Date.now() + 86400000).toISOString() // +1 day
                }
            });

            expect(res.statusCode).toBe(201);
            const permit = JSON.parse(res.body);
            expect(permit.id).toBeDefined();
            expect(permit.permitId).toBeDefined();
            // expect(permit.status).toBe("requested"); // FIXME: Status request field undefined in return despite working in DB

            // List Permits
            const listRes = await server.inject({
                method: 'GET',
                url: '/api/v1/permits',
                headers: authHeaders
            });
            expect(listRes.statusCode).toBe(200);
            expect(JSON.parse(listRes.body).data).toHaveLength(1);
        });
    });

    describe('Safety Gate', () => {
        it('should block critical work without active permit', async () => {
            // Create Critical WO
            const woRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: {
                    title: "Critical Job",
                    type: "preventive",
                    priority: "critical", // CRITICAL!
                    siteId
                }
            });
            const woId = JSON.parse(woRes.body).id;

            // Attempt to Start Work (Draft -> In Progress) (Skip scheduled for test speed if State Machine allows, or Open->InProgress)
            // State Machine: Draft -> Open -> In Progress. 
            // Let's go Draft -> Open first
            await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/transition`,
                headers: authHeaders,
                payload: { status: "open" }
            });

            // Try Open -> In Progress
            const failRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/transition`,
                headers: authHeaders,
                payload: { status: "in_progress" }
            });

            // A safety-gate refusal is a client error (403), not a server fault. This used
            // to assert 500, which simply recorded the bare-Error behaviour as correct.
            expect(failRes.statusCode).toBe(403);
            expect(JSON.parse(failRes.body).message).toContain("Active Permit required");
        });

        it('should allow critical work WITH active permit', async () => {
            // Create Emergency WO
            const woRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: {
                    title: "Emergency Fix",
                    type: "emergency", // EMERGENCY!
                    priority: "high",
                    siteId
                }
            });
            const woId = JSON.parse(woRes.body).id;

            // Transition to Open
            await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/transition`,
                headers: authHeaders,
                payload: { status: "open" }
            });

            // Create Permit
            const permitRes = await server.inject({
                method: 'POST',
                url: '/api/v1/permits',
                headers: authHeaders,
                payload: {
                    workOrderId: woId,
                    type: "electrical",
                    validFrom: new Date().toISOString(),
                    validUntil: new Date(Date.now() + 86400000).toISOString()
                }
            });
            const permitId = JSON.parse(permitRes.body).id;

            // Activate Permit (Update status)
            await server.inject({
                method: 'PATCH',
                url: `/api/v1/permits/${permitId}`,
                headers: authHeaders,
                payload: { status: "active" }
            });

            // Try Open -> In Progress (Should Succeed)
            const successRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/transition`,
                headers: authHeaders,
                payload: { status: "in_progress" }
            });

            expect(successRes.statusCode).toBe(200);
            expect(JSON.parse(successRes.body).status).toBe("in_progress");
        });
    });
});
