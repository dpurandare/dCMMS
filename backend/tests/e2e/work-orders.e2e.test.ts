import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Work Orders API E2E', () => {
    let server: TestServer;
    let token: string;
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

        // Login
        const loginRes = await server.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: {
                email: 'admin@dcmms.local',
                password: 'password123'
            }
        });
        token = JSON.parse(loginRes.body).accessToken;

        // Create Site
        const siteRes = await server.inject({
            method: 'POST',
            url: '/api/v1/sites',
            headers: { Authorization: `Bearer ${token}` },
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
            headers: { Authorization: `Bearer ${token}` },
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
                headers: { Authorization: `Bearer ${token}` },
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
                headers: { Authorization: `Bearer ${token}` },
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
                headers: { Authorization: `Bearer ${token}` },
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
                headers: { Authorization: `Bearer ${token}` },
                payload: { title: "Task WO", type: "inspection", priority: "low", siteId }
            });
            const woId = JSON.parse(createRes.body).id;

            // Add Task
            const taskRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/tasks`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { title: "Check voltage", taskOrder: 1 }
            });

            expect(taskRes.statusCode).toBe(200);
            const taskId = JSON.parse(taskRes.body).id;

            // Update Task
            const updateRes = await server.inject({
                method: 'PATCH',
                url: `/api/v1/work-orders/${woId}/tasks/${taskId}`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { isCompleted: true, notes: "Voltage OK" }
            });
            expect(updateRes.statusCode).toBe(200);
            expect(JSON.parse(updateRes.body).isCompleted).toBe(true);

            // Delete Task
            const delRes = await server.inject({
                method: 'DELETE',
                url: `/api/v1/work-orders/${woId}/tasks/${taskId}`,
                headers: { Authorization: `Bearer ${token}` }
            });
            expect(delRes.statusCode).toBe(200);
        });

        it('should manage parts', async () => {
            // Create Part manually in DB as API for parts might not exist or we want to bypass it
            const part = {
                tenantId: defaultTenant.id,
                partNumber: "P-100",
                name: "Fuse",
                quantity: 50,
                unitCost: "10.00"
            };
            const savedPart = await db.insert('parts', part);

            // Create WO
            const createRes = await server.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: { Authorization: `Bearer ${token}` },
                payload: { title: "Part WO", type: "corrective", priority: "high", siteId }
            });
            const woId = JSON.parse(createRes.body).id;

            // Add Part
            const partRes = await server.inject({
                method: 'POST',
                url: `/api/v1/work-orders/${woId}/parts`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { partId: savedPart.id, quantityRequired: 2 }
            });
            expect(partRes.statusCode).toBe(200);
            const partUsageId = JSON.parse(partRes.body).id;

            // Remove Part
            const delRes = await server.inject({
                method: 'DELETE',
                url: `/api/v1/work-orders/${woId}/parts/${partUsageId}`,
                headers: { Authorization: `Bearer ${token}` }
            });
            expect(delRes.statusCode).toBe(200);
        });
    });
});
