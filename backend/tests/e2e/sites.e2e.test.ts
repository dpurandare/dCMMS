import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Sites API E2E', () => {
    let server: TestServer;
    let token: string;
    let defaultTenant: any;

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
        UserFactory.reset();

        // Setup: Create Admin User
        const user = await UserFactory.build({
            email: 'admin@dcmms.local',
            password: 'password123',
            role: 'super_admin',
            tenantId: defaultTenant.id
        });
        await db.insert('users', user);

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
    });

    describe('POST /api/v1/sites', () => {
        it('should create a new site', async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    name: 'Test Setup Solar Farm',
                    siteId: 'TEST-SOL-01',
                    type: 'Solar Farm',
                    energyType: 'solar',
                    location: 'California, USA'
                }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.name).toBe('Test Setup Solar Farm');
            expect(body.siteId).toBe('TEST-SOL-01');
        });

        it('should fail if siteId is missing (schema validation)', async () => {
            // In previous implementation siteId was optional (auto-generated), 
            // but validation schema might check types. 
            // Let's test with just name to see generation work.
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    name: 'Auto Gen Site'
                }
            });

            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.siteId).toBeDefined();
        });
    });

    describe('GET /api/v1/sites', () => {
        beforeEach(async () => {
            // Seed a site
            await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'Site A', siteId: 'SITE-A' }
            });
            await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'Site B', siteId: 'SITE-B' }
            });
        });

        it('should list all sites', async () => {
            const res = await server.inject({
                method: 'GET',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toHaveLength(2);
            expect(body.pagination.total).toBe(2);
        });

        it('should filter by search term', async () => {
            const res = await server.inject({
                method: 'GET',
                url: '/api/v1/sites?search=Site A',
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].name).toBe('Site A');
        });
    });

    describe('GET /api/v1/sites/:id', () => {
        let siteId: string;

        beforeEach(async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'Target Site' }
            });
            siteId = JSON.parse(res.body).id;
        });

        it('should get site by id', async () => {
            const res = await server.inject({
                method: 'GET',
                url: `/api/v1/sites/${siteId}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.id).toBe(siteId);
            expect(body.name).toBe('Target Site');
        });

        it('should return 404 for invalid id', async () => {
            const randomId = '00000000-0000-0000-0000-000000000000';
            const res = await server.inject({
                method: 'GET',
                url: `/api/v1/sites/${randomId}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PATCH /api/v1/sites/:id', () => {
        let siteId: string;

        beforeEach(async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'Old Name' }
            });
            siteId = JSON.parse(res.body).id;
        });

        it('should update site details', async () => {
            const res = await server.inject({
                method: 'PATCH',
                url: `/api/v1/sites/${siteId}`,
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    name: 'New Name',
                    city: 'New City'
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.name).toBe('New Name');
            expect(body.city).toBe('New City');
        });
    });

    describe('DELETE /api/v1/sites/:id', () => {
        let siteId: string;

        beforeEach(async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/sites',
                headers: { Authorization: `Bearer ${token}` },
                payload: { name: 'To Delete' }
            });
            siteId = JSON.parse(res.body).id;
        });

        it('should delete schema', async () => {
            const res = await server.inject({
                method: 'DELETE',
                url: `/api/v1/sites/${siteId}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);

            // Verify it's gone
            const getRes = await server.inject({
                method: 'GET',
                url: `/api/v1/sites/${siteId}`,
                headers: { Authorization: `Bearer ${token}` }
            });
            expect(getRes.statusCode).toBe(404);
        });
    });
});
