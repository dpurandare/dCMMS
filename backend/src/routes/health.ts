import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool } from '../db';

const healthRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    '/',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['health'],
      },
    },
    async (request, reply) => {
      let dbStatus = 'disconnected';

      try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
      } catch (error) {
        request.log.error({ err: error }, 'Database health check failed');
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
