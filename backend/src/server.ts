import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import workOrderRoutes from './routes/work-orders';
import assetRoutes from './routes/assets';
import siteRoutes from './routes/sites';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      ...(process.env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // ==========================================
  // PLUGINS
  // ==========================================

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for Swagger UI
  });

  // CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIMEWINDOW || '60000', 10),
  });

  // Swagger documentation
  if (process.env.SWAGGER_ENABLED !== 'false') {
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'dCMMS API',
          description: 'Distributed Computerized Maintenance Management System API',
          version: '1.0.0',
        },
        servers: [
          {
            url: `http://${process.env.SWAGGER_HOST || 'localhost:3000'}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
      staticCSP: true,
    });
  }

  // ==========================================
  // GLOBAL HOOKS
  // ==========================================

  // Request logging
  server.addHook('onRequest', async (request, reply) => {
    request.log.info({ url: request.url, method: request.method }, 'incoming request');
  });

  // Response time tracking
  server.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
      'request completed'
    );
  });

  // ==========================================
  // ERROR HANDLER
  // ==========================================

  server.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details: error.validation,
      });
    }

    // JWT errors
    if (error.message?.includes('Authorization')) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error.message,
      });
    }

    // Database errors
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Resource already exists',
      });
    }

    // Foreign key errors
    if (error.code === '23503') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Referenced resource does not exist',
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
    });
  });

  // ==========================================
  // ROUTES
  // ==========================================

  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(workOrderRoutes, { prefix: '/api/v1/work-orders' });
  await server.register(assetRoutes, { prefix: '/api/v1/assets' });
  await server.register(siteRoutes, { prefix: '/api/v1/sites' });

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  return server;
}
