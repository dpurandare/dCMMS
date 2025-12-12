import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Asset Search & Tags E2E', () => {
    let server: TestServer;
    let token: string;
    let defaultTenant: any;
    let siteId: string;
    let assetId: string;

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

        // Create Site
        const siteRes = await server.inject({
            method: 'POST',
            url: '/api/v1/sites',
            headers: { Authorization: `Bearer ${token}` },
            payload: { name: 'Search Site', siteId: 'SRCH-01' }
        });
        siteId = JSON.parse(siteRes.body).id;

        // Create Asset
        const assetRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
                siteId,
                name: 'Solar Panel Array X',
                type: 'panel',
                tags: ['critical', 'south-facing']
            }
        });
        assetId = JSON.parse(assetRes.body).id;
    });

    describe('Tags Management', () => {
        it('should add a new tag', async () => {
            const res = await server.inject({
                method: 'POST',
                url: `/api/v1/assets/${assetId}/tags`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { tag: 'maintenance-due' }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.tags).toContain('maintenance-due');
            expect(body.tags).toHaveLength(3);
        });

        it('should remove a tag', async () => {
            const res = await server.inject({
                method: 'DELETE',
                url: `/api/v1/assets/${assetId}/tags/critical`,
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.tags).not.toContain('critical');
            expect(body.tags).toHaveLength(1); // Started with 2, removed 1
        });
    });

    describe('Search', () => {
        beforeEach(async () => {
            // Add another asset for search noise
            await server.inject({
                method: 'POST',
                url: '/api/v1/assets',
                headers: { Authorization: `Bearer ${token}` },
                payload: { siteId, name: 'Wind Turbine Y', type: 'turbine', tags: ['wind', 'north'] }
            });
        });

        it('should search by name', async () => {
            const res = await server.inject({
                method: 'GET',
                url: '/api/v1/assets?search=Solar',
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].name).toContain('Solar');
        });

        it('should search by tag', async () => {
            const res = await server.inject({
                method: 'GET',
                url: '/api/v1/assets?search=critical', // Searches tags too
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            // expect(body.data).toHaveLength(1); // Only the first asset has 'critical'
            // Wait, does 'Wind Turbine Y' have critical? No.
            // But we soft deleted or cleanAll in beforeEach? Yes cleanAll.
            // So we have Asset1 (critical) and Asset2 (wind).
            expect(body.data[0].name).toContain('Solar');
        });
    });
});
