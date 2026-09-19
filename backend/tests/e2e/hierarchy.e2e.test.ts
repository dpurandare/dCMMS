import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Asset Hierarchy E2E', () => {
    let server: TestServer;
    let token: string;
    let defaultTenant: any;
    let siteId: string;
    let parentId: string;
    let childId: string;

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
            payload: { name: 'Hierarchy Site', siteId: 'HIER-01' }
        });
        siteId = JSON.parse(siteRes.body).id;

        // Create Parent Asset
        const parentRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: { Authorization: `Bearer ${token}` },
            payload: { siteId, name: 'Parent Asset', type: 'inverter' } // Changed type to inverter to match enum
        });
        parentId = JSON.parse(parentRes.body).id;
        console.log('Parent ID:', parentId);

        // Create Child Asset
        const childRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
                siteId,
                name: 'Child Asset',
                type: 'sensor', // Valid enum
                parentAssetId: parentId
            }
        });
        childId = JSON.parse(childRes.body).id;
    });

    describe('GET /api/v1/assets/:id/hierarchy', () => {
        it('should return asset with children recursively', async () => {
            const res = await server.inject({
                method: 'GET',
                url: `/api/v1/assets/${parentId}/hierarchy`,
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.statusCode !== 200) console.log('GET Hierarchy Error:', res.body);

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.id).toBe(parentId);
            expect(body.children).toHaveLength(1);
            expect(body.children[0].id).toBe(childId);
        });
    });

    describe('PATCH /api/v1/assets/:id (Circular Reference)', () => {
        it('should prevent setting self as parent', async () => {
            const res = await server.inject({
                method: 'PATCH',
                url: `/api/v1/assets/${parentId}`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { parentAssetId: parentId }
            });

            if (res.statusCode !== 500) console.log('PATCH Circular Error:', res.body);

            expect(res.statusCode).toBe(500); // Or 400 if we handled it better, currently Service throws Error
            const body = JSON.parse(res.body);
            expect(body.message).toMatch(/Circular reference/);
        });

        it('should prevent circular loop (Parent -> Child -> Parent)', async () => {
            // Try to set Parent's parent to Child
            const res = await server.inject({
                method: 'PATCH',
                url: `/api/v1/assets/${parentId}`,
                headers: { Authorization: `Bearer ${token}` },
                payload: { parentAssetId: childId }
            });

            if (res.statusCode !== 500) console.log('PATCH Loop Error:', res.body);

            expect(res.statusCode).toBe(500);
            const body = JSON.parse(res.body);
            expect(body.message).toMatch(/Circular reference/);
        });
    });
});
