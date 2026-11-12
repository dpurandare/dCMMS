import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';
import { loginHeaders } from '../../tests/helpers/auth';

describe('Work Orders API E2E', () => {
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
        // seedDefaultTenant creates a user usually? Or we create one.
        // UserFactory helps.

        // Setup: Create Admin User
        const user = await UserFactory.build({
            email: 'admin@dcmms.local',
            password: 'password123',
            role: 'super_admin',
            tenantId: defaultTenant.id
        });
        await db.insert('users', user);
        userId = user.id;

        // Login (returns Authorization + x-csrf-token, as the real frontend sends)
        authHeaders = await loginHeaders(server, 'admin@dcmms.local', 'password123');

        // Create Site
        const siteRes = await server.inject({
            method: 'POST',
            url: '/api/v1/sites',
            headers: authHeaders,
            payload: {
                name: 'WO Test Site',
                siteId: 'WO-SITE'
            }
        });
        siteId = JSON.parse(siteRes.body).id;

        // Create Asset
        const assetRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: authHeaders,
            payload: {
                siteId,
                name: 'WO Test Asset',
                type: 'inverter',
                status: 'operational'
            }
        });
        assetId = JSON.parse(assetRes.body).id;
    });

    describe('Work Order CRUD', () => {
        it('should create a work order', async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: {
                    title: "Test WO",
                    type: "preventive",
                    priority: "medium",
                    siteId,
                    assetId,
                    estimatedHours: 4
                }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.status).toBe("draft");
            expect(body.workOrderId).toBeDefined();
            expect(body.id).toBeDefined();
        });

        it('should transition work order status', async () => {
            // Create
            const createRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: {
                    title: "Transition WO",
                    type: "corrective",
                    priority: "high",
                    siteId
                }
            });
            const woId = JSON.parse(createRes.body).id;

            // Transition
            const transRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/transition`,
                headers: authHeaders,
                payload: { status: "open" }
            });

            expect(transRes.statusCode).toBe(200);
            expect(JSON.parse(transRes.body).status).toBe("open");
        });

        it('should manage tasks', async () => {
            // Create WO
            const createRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: { title: "Task WO", type: "inspection", priority: "low", siteId }
            });
            const woId = JSON.parse(createRes.body).id;

            // Add Task
            const taskRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/tasks`,
                headers: authHeaders,
                payload: { title: "Check voltage", taskOrder: 1 }
            });

            expect(taskRes.statusCode).toBe(200);
            const taskId = JSON.parse(taskRes.body).id;

            // Update Task
            const updateRes = await server.inject({
                method: 'PATCH',
                url: `/api/v1/work-orders/${woId}/tasks/${taskId}`,
                headers: authHeaders,
                payload: { isCompleted: true, notes: "Voltage OK" }
            });
            expect(updateRes.statusCode).toBe(200);
            expect(JSON.parse(updateRes.body).isCompleted).toBe(true);

            // Delete Task
            const delRes = await server.inject({
                method: 'DELETE',
                url: `/api/v1/work-orders/${woId}/tasks/${taskId}`,
                headers: authHeaders
            });
            expect(delRes.statusCode).toBe(200);
        });

        it('should manage parts', async () => {
            // Create Part manually in DB as API for parts might not exist or we want to bypass it
            const part = {
                tenantId: defaultTenant.id,
                partNumber: "P-100",
                name: "Fuse",
                unitPrice: "10.00"
            };
            const savedPart = await db.insert('parts', part);

            // Create WO
            const createRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: authHeaders,
                payload: { title: "Part WO", type: "corrective", priority: "high", siteId }
            });
            const woId = JSON.parse(createRes.body).id;

            // Add Part
            const partRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/parts`,
                headers: authHeaders,
                payload: { partId: savedPart.id, quantity: 2 }
            });
            expect(partRes.statusCode).toBe(200);
            const partUsageId = JSON.parse(partRes.body).id;

            // Remove Part
            const delRes = await server.inject({
                method: 'DELETE',
                url: `/api/v1/work-orders/${woId}/parts/${partUsageId}`,
                headers: authHeaders
            });
            expect(delRes.statusCode).toBe(200);
        });
    });
});
