import { FastifyPluginAsync } from 'fastify';
import { generateCsrfToken, storeCsrfToken } from '../middleware/csrf';

/**
 * CSRF Token Routes
 * Provides endpoints for CSRF token management
 */
const csrfRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /api/v1/csrf/token
   * Generate and return a CSRF token for the authenticated user
   */
  server.get(
    '/token',
    {
      schema: {
        description: 'Get CSRF token for authenticated user',
        tags: ['csrf'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              csrfToken: { type: 'string' },
              expiresIn: { type: 'number' },
            },
          },
          401: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [server.authenticate],
    },
    async (request, reply) => {
      const user = request.user as { id: string };

      if (!user || !user.id) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Generate new CSRF token
      const csrfToken = generateCsrfToken();

      // Store in Redis
      const redis = (server as any).redis;
      await storeCsrfToken(redis, user.id, csrfToken);

      request.log.debug({ userId: user.id }, 'CSRF token generated');

      return reply.send({
        csrfToken,
        expiresIn: 3600, // 1 hour in seconds
      });
    }
  );
};

export default csrfRoutes;
