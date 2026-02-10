import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';

/**
 * CSRF Protection Middleware
 * 
 * Validates CSRF tokens for state-changing requests (POST, PUT, PATCH, DELETE)
 * Tokens are stored in Redis with the user ID as key
 */

const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 3600; // 1 hour in seconds

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Store CSRF token in Redis
 */
export async function storeCsrfToken(
    redis: any,
    userId: string,
    token: string
): Promise<void> {
    const key = `csrf:${userId}`;
    await redis.set(key, token, 'EX', CSRF_TOKEN_EXPIRY);
}

/**
 * Get CSRF token from Redis
 */
export async function getCsrfToken(
    redis: any,
    userId: string
): Promise<string | null> {
    const key = `csrf:${userId}`;
    return await redis.get(key);
}

/**
 * Delete CSRF token from Redis
 */
export async function deleteCsrfToken(
    redis: any,
    userId: string
): Promise<void> {
    const key = `csrf:${userId}`;
    await redis.del(key);
}

/**
 * CSRF Protection Middleware
 * 
 * Validates CSRF token for state-changing requests
 */
export async function csrfProtection(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Skip CSRF check for safe methods
    if (!PROTECTED_METHODS.includes(request.method)) {
        return;
    }

    // Skip CSRF check for auth routes (login already happened)
    const isAuthRoute = request.url.startsWith('/api/v1/auth/');
    if (isAuthRoute) {
        return;
    }

    // Get user from request (set by authenticate middleware)
    const user = request.user as { id: string } | undefined;

    if (!user || !user.id) {
        return reply.status(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Authentication required',
        });
    }

    // Get CSRF token from request header
    const csrfToken = request.headers[CSRF_HEADER] as string;

    if (!csrfToken) {
        request.log.warn(
            { userId: user.id, method: request.method, url: request.url },
            'CSRF token missing'
        );
        return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'CSRF token missing',
        });
    }

    // Get stored token from Redis
    const redis = (request.server as any).redis;
    const storedToken = await getCsrfToken(redis, user.id);

    if (!storedToken) {
        request.log.warn(
            { userId: user.id },
            'CSRF token not found in storage - may have expired'
        );
        return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'CSRF token expired or invalid',
        });
    }

    // Validate token
    if (csrfToken !== storedToken) {
        request.log.warn(
            { userId: user.id, method: request.method, url: request.url },
            'CSRF token mismatch'
        );
        return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Invalid CSRF token',
        });
    }

    // Token is valid, proceed
    request.log.debug({ userId: user.id }, 'CSRF token validated');
}
