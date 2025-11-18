import { FastifyPluginAsync } from 'fastify';

const authRoutes: FastifyPluginAsync = async (server) => {
  // POST /api/v1/auth/login
  server.post(
    '/login',
    {
      schema: {
        description: 'User login with email and password',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'number' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // TODO: Implement authentication logic in Sprint 1
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Authentication not yet implemented',
      });
    }
  );

  // POST /api/v1/auth/refresh
  server.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Token refresh not yet implemented',
      });
    }
  );

  // POST /api/v1/auth/logout
  server.post(
    '/logout',
    {
      schema: {
        description: 'User logout',
        tags: ['auth'],
      },
    },
    async (request, reply) => {
      return reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Logout not yet implemented',
      });
    }
  );
};

export default authRoutes;
