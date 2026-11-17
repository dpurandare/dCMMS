import type { TestServer } from './test-server';

/**
 * Log in through the real /auth/login endpoint and return the headers a real client sends: the
 * Bearer access token (the refresh token goes to an HttpOnly cookie and is not needed here).
 */
export async function loginHeaders(
    server: TestServer,
    email: string,
    password: string
): Promise<{ Authorization: string }> {
    const res = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
    });

    if (res.statusCode !== 200) {
        throw new Error(`Test login failed for ${email}: ${res.statusCode} ${res.body}`);
    }

    const { accessToken } = JSON.parse(res.body);
    if (!accessToken) {
        throw new Error(`Login response for ${email} is missing accessToken`);
    }

    return { Authorization: `Bearer ${accessToken}` };
}
