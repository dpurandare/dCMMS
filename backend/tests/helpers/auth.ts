import type { TestServer } from './test-server';

/**
 * Log in through the real /auth/login endpoint and return the headers a real
 * client sends on state-changing requests.
 *
 * Login returns a `csrfToken` alongside the access token; `csrfProtection`
 * (applied to POST/PUT/PATCH/DELETE on most routes) rejects any request
 * without it as `403 CSRF token missing`. The frontend does this in
 * `frontend/src/lib/api-client.ts`. E2E specs written before CSRF was wired
 * in never sent it, so every mutating call in their setup 403'd and the
 * failure cascaded into misleading 400s further down.
 */
export async function loginHeaders(
    server: TestServer,
    email: string,
    password: string
): Promise<{ Authorization: string; 'x-csrf-token': string }> {
    const res = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
    });

    if (res.statusCode !== 200) {
        throw new Error(`Test login failed for ${email}: ${res.statusCode} ${res.body}`);
    }

    const { accessToken, csrfToken } = JSON.parse(res.body);
    if (!accessToken || !csrfToken) {
        throw new Error(`Login response for ${email} is missing accessToken or csrfToken`);
    }

    return { Authorization: `Bearer ${accessToken}`, 'x-csrf-token': csrfToken };
}
