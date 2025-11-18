import { FastifyPluginAsync } from 'fastify';
import { pool } from '../db';

const healthRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    '/',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
              uptime: { type: 'number' },
              database: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      let dbStatus = 'disconnected';

      try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
      } catch (error) {
        request.log.error('Database health check failed:', error);
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
      };
    }
  );

  server.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe for Kubernetes',
        tags: ['health'],
      },
    },
    async (request, reply) => {
      try {
        await pool.query('SELECT 1');
        return reply.status(200).send({ status: 'ready' });
      } catch (error) {
        return reply.status(503).send({ status: 'not ready' });
      }
    }
  );

  server.get(
    '/live',
    {
      schema: {
        description: 'Liveness probe for Kubernetes',
        tags: ['health'],
      },
    },
    async (request, reply) => {
      return { status: 'alive' };
    }
  );
};

export default healthRoutes;
