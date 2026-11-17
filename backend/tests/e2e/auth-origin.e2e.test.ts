/**
 * Origin check on the two cookie endpoints (REV-018a, ADR-005). The CSRF token system is gone;
 * POST /auth/refresh and /auth/logout act on the ambient HttpOnly cookie, so a request carrying a
 * foreign Origin is refused. Requests with no Origin (mobile app, curl) must still work.
 */
import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Auth Origin check E2E', () => {
    let server: TestServer;
    let cookie: string;
    let accessToken: string;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
        await db.cleanAll();
        const tenant = await db.seedDefaultTenant();
        await db.insert('users', await UserFactory.build({ email: 'origin@dcmms.local', password: 'password123', role: 'tenant_admin', tenantId: tenant.id }));
    }, 60000);

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    // Each test logs in afresh: refresh rotates the token and logout revokes it.
    beforeEach(async () => {
        const res = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'origin@dcmms.local', password: 'password123' } });
        expect(res.statusCode).toBe(200);
        accessToken = JSON.parse(res.body).accessToken;
        const set = ([] as string[]).concat((res.headers as any)['set-cookie'] || []);
        cookie = set.map((c) => c.split(';')[0]).join('; ');
        expect(cookie).toContain('dcmms_refresh_token=');
    });

    it('login no longer returns a CSRF token', async () => {
        const res = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'origin@dcmms.local', password: 'password123' } });
        expect(JSON.parse(res.body).csrfToken).toBeUndefined();
    });

    describe('POST /auth/refresh', () => {
        it('refuses a foreign Origin with 403 and does not rotate the token', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie, origin: 'https://evil.example' } });
            expect(res.statusCode).toBe(403);
            // the cookie is still valid: the refused request did not consume it
            const ok = await server.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } });
            expect(ok.statusCode).toBe(200);
        });

        it('accepts an allowed Origin', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie, origin: 'http://localhost:3000' } });
            expect(res.statusCode).toBe(200);
        });

        it('accepts a request with NO Origin (mobile app, curl, server-to-server)', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/auth/refresh', headers: { cookie } });
            expect(res.statusCode).toBe(200);
        });
    });

    describe('POST /auth/logout', () => {
        const logout = (headers: Record<string, string>) =>
            server.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { Authorization: `Bearer ${accessToken}`, cookie, ...headers }, payload: {} });

        it('refuses a foreign Origin with 403', async () => {
            expect((await logout({ origin: 'https://evil.example' })).statusCode).toBe(403);
        });

        it('accepts an allowed Origin and no Origin', async () => {
            expect((await logout({ origin: 'http://localhost:3000' })).statusCode).toBe(200);
        });

        it('accepts no Origin', async () => {
            expect((await logout({})).statusCode).toBe(200);
        });
    });

    describe('mutating routes no longer need a CSRF token', () => {
        it('POST /sites with only the Bearer token is not rejected for CSRF', async () => {
            const res = await server.inject({ method: 'POST', url: '/api/v1/sites', headers: { Authorization: `Bearer ${accessToken}` }, payload: { name: 'No csrf', siteId: 'NOCSRF' } });
            expect(res.statusCode).toBe(201);
        });
    });

    describe('deprecated GET /csrf/token', () => {
        it('still answers, with a dummy token and a deprecated flag', async () => {
            const res = await server.inject({ method: 'GET', url: '/api/v1/csrf/token' });
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toMatchObject({ deprecated: true });
        });
    });
});
