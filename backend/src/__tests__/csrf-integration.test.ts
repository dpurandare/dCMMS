import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { build } from '../helper';
import { FastifyInstance } from 'fastify';

describe('CSRF Integration Tests', () => {
    let app: FastifyInstance;
    let csrfToken: string;
    let accessToken: string;
    let userId: string;

    beforeAll(async () => {
        app = await build();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Login Flow', () => {
        it('should return CSRF token on successful login', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'admin@example.com',
                    password: 'Password123!',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('csrfToken');
            expect(body.csrfToken).toBeTruthy();
            expect(typeof body.csrfToken).toBe('string');
            expect(body.csrfToken).toHaveLength(64);

            // Store for later tests
            csrfToken = body.csrfToken;
            accessToken = body.accessToken;
            userId = body.user.id;
        });
    });

    describe('Protected Endpoints', () => {
        describe('Work Orders', () => {
            it('should reject POST /work-orders without CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/work-orders',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    payload: {
                        title: 'Test Work Order',
                        description: 'Test',
                        priority: 'medium',
                        assetId: '123e4567-e89b-12d3-a456-426614174000',
                        siteId: '123e4567-e89b-12d3-a456-426614174001',
                        status: 'open',
                        type: 'corrective',
                    },
                });

                expect(response.statusCode).toBe(403);
                const body = JSON.parse(response.body);
                expect(body.message).toBe('CSRF token missing');
            });

            it('should reject POST /work-orders with invalid CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/work-orders',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'X-CSRF-Token': 'invalid-token-123',
                    },
                    payload: {
                        title: 'Test Work Order',
                        description: 'Test',
                        priority: 'medium',
                        assetId: '123e4567-e89b-12d3-a456-426614174000',
                        siteId: '123e4567-e89b-12d3-a456-426614174001',
                        status: 'open',
                        type: 'corrective',
                    },
                });

                expect(response.statusCode).toBe(403);
                const body = JSON.parse(response.body);
                expect(body.message).toMatch(/Invalid CSRF token|CSRF token expired/);
            });

            it('should accept POST /work-orders with valid CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/work-orders',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'X-CSRF-Token': csrfToken,
                    },
                    payload: {
                        title: 'Test Work Order',
                        description: 'Test',
                        type: 'corrective',
                        priority: 'medium',
                        assetId: '123e4567-e89b-12d3-a456-426614174000',
                        siteId: '123e4567-e89b-12d3-a456-426614174001',
                    },
                });

                // Should not be 403 (may be 201, 400, etc depending on data validity)
                expect(response.statusCode).not.toBe(403);
            });
        });

        describe('Assets', () => {
            it('should reject POST /assets without CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/assets',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    payload: {
                        name: 'Test Asset',
                        type: 'inverter',
                        siteId: '123e4567-e89b-12d3-a456-426614174001',
                    },
                });

                expect(response.statusCode).toBe(403);
                const body = JSON.parse(response.body);
                expect(body.message).toBe('CSRF token missing');
            });

            it('should accept POST /assets with valid CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/assets',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'X-CSRF-Token': csrfToken,
                    },
                    payload: {
                        name: 'Test Asset',
                        type: 'inverter',
                        siteId: '123e4567-e89b-12d3-a456-426614174001',
                    },
                });

                expect(response.statusCode).not.toBe(403);
            });
        });

        describe('Users', () => {
            it('should reject POST /users without CSRF token', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/users',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    payload: {
                        email: 'newuser@example.com',
                        username: 'newuser',
                        firstName: 'New',
                        lastName: 'User',
                        role: 'viewer',
                        password: 'Password123!',
                    },
                });

                expect(response.statusCode).toBe(403);
                const body = JSON.parse(response.body);
                expect(body.message).toBe('CSRF token missing');
            });
        });
    });

    describe('Safe Methods (GET)', () => {
        it('should allow GET /work-orders without CSRF token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/work-orders',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            expect(response.statusCode).not.toBe(403);
        });

        it('should allow GET /assets without CSRF token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/assets',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            expect(response.statusCode).not.toBe(403);
        });

        it('should allow GET /users without CSRF token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/users',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            expect(response.statusCode).not.toBe(403);
        });
    });

    describe('Logout Flow', () => {
        it('should clear CSRF token on logout', async () => {
            // Logout
            await app.inject({
                method: 'POST',
                url: '/api/v1/auth/logout',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-CSRF-Token': csrfToken,
                },
            });

            // Try to use old CSRF token (should fail)
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/work-orders',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'X-CSRF-Token': csrfToken,
                },
                payload: {
                    title: 'Test',
                    description: 'Test',
                    type: 'corrective',
                    priority: 'medium',
                    assetId: '123e4567-e89b-12d3-a456-426614174000',
                    siteId: '123e4567-e89b-12d3-a456-426614174001',
                },
            });

            expect(response.statusCode).toBe(403);
        });
    });
});
