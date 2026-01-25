import { describe, it, expect, beforeEach } from '@jest/globals';
import { generateCsrfToken, csrfProtection } from '../../src/middleware/csrf';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('CSRF Middleware', () => {
    describe('generateCsrfToken', () => {
        it('should generate a 64-character hexadecimal token', () => {
            const token = generateCsrfToken();

            expect(token).toHaveLength(64);
            expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
        });

        it('should generate unique tokens', () => {
            const token1 = generateCsrfToken();
            const token2 = generateCsrfToken();

            expect(token1).not.toBe(token2);
        });

        it('should generate cryptographically secure tokens', () => {
            const tokens = new Set();
            for (let i = 0; i < 100; i++) {
                tokens.add(generateCsrfToken());
            }

            // All tokens should be unique
            expect(tokens.size).toBe(100);
        });
    });

    describe('csrfProtection middleware', () => {
        let mockRequest: Partial<FastifyRequest>;
        let mockReply: Partial<FastifyReply>;
        let mockRedis: any;

        beforeEach(() => {
            mockRedis = {
                get: jest.fn(),
                set: jest.fn(),
                del: jest.fn(),
            };

            mockRequest = {
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: {},
                user: { id: 'user-123' },
                server: { redis: mockRedis } as any,
                log: {
                    warn: jest.fn(),
                    debug: jest.fn(),
                } as any,
            };

            mockReply = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn().mockReturnThis(),
            };
        });

        it('should skip CSRF check for GET requests', async () => {
            mockRequest.method = 'GET';

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalled();
        });

        it('should skip CSRF check for HEAD requests', async () => {
            mockRequest.method = 'HEAD';

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalled();
        });

        it('should skip CSRF check for OPTIONS requests', async () => {
            mockRequest.method = 'OPTIONS';

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalled();
        });

        it('should skip CSRF check for auth routes', async () => {
            mockRequest.url = '/api/v1/auth/login';

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalled();
        });

        it('should return 401 if user is not authenticated', async () => {
            mockRequest.user = undefined;

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(401);
            expect(mockReply.send).toHaveBeenCalledWith({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        });

        it('should return 403 if CSRF token is missing', async () => {
            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                statusCode: 403,
                error: 'Forbidden',
                message: 'CSRF token missing',
            });
        });

        it('should return 403 if CSRF token is not found in storage', async () => {
            (mockRequest.headers as any)['x-csrf-token'] = 'some-token';
            mockRedis.get.mockResolvedValue(null);

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                statusCode: 403,
                error: 'Forbidden',
                message: 'CSRF token expired or invalid',
            });
        });

        it('should return 403 if CSRF token does not match', async () => {
            (mockRequest.headers as any)['x-csrf-token'] = 'invalid-token';
            mockRedis.get.mockResolvedValue('valid-token');

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
            expect(mockReply.send).toHaveBeenCalledWith({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Invalid CSRF token',
            });
        });

        it('should pass validation if CSRF token matches', async () => {
            const token = 'valid-token-123';
            (mockRequest.headers as any)['x-csrf-token'] = token;
            mockRedis.get.mockResolvedValue(token);

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalled();
            expect(mockReply.send).not.toHaveBeenCalled();
        });

        it('should validate POST requests', async () => {
            mockRequest.method = 'POST';
            (mockRequest.headers as any)['x-csrf-token'] = undefined;

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
        });

        it('should validate PUT requests', async () => {
            mockRequest.method = 'PUT';
            (mockRequest.headers as any)['x-csrf-token'] = undefined;

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
        });

        it('should validate PATCH requests', async () => {
            mockRequest.method = 'PATCH';
            (mockRequest.headers as any)['x-csrf-token'] = undefined;

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
        });

        it('should validate DELETE requests', async () => {
            mockRequest.method = 'DELETE';
            (mockRequest.headers as any)['x-csrf-token'] = undefined;

            await csrfProtection(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(403);
        });
    });
});
