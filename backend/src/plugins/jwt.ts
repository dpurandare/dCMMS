import { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

export async function registerJwt(server: FastifyInstance) {
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'changeme-secret-key',
    sign: {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    },
  });

  // Decorator to verify JWT token
  server.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
      });
    }
  });
}
