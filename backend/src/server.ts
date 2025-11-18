import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// Plugins
import { registerJwt } from './plugins/jwt';

// Routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import workOrderRoutes from './routes/work-orders';
import assetRoutes from './routes/assets';
import siteRoutes from './routes/sites';
import telemetryRoutes from './routes/telemetry';
import notificationRoutes from './routes/notifications';
import webhookRoutes from './routes/webhooks';
import alertRoutes from './routes/alerts';
import integrationRoutes from './routes/integrations';
import analyticsAdminRoutes from './routes/analytics-admin';
import analyticsRoutes from './routes/analytics';
import reportRoutes from './routes/reports';

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

  // JWT Authentication
  await registerJwt(server);

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
          description: `
# Distributed Computerized Maintenance Management System API

A modern CMMS API for managing assets, work orders, sites, and maintenance operations.

## Features

- **Asset Management**: Track and manage all your physical assets
- **Work Order Management**: Create, assign, and track maintenance work orders
- **Site Management**: Organize assets by location
- **Multi-tenancy**: Isolated data per organization
- **Role-based Access Control**: Fine-grained permissions
- **Real-time Updates**: WebSocket support for live updates (coming soon)

## Getting Started

1. **Authenticate**: Use POST /api/v1/auth/login to get a JWT token
2. **Use Token**: Include token in Authorization header: \`Bearer YOUR_TOKEN\`
3. **Explore**: Use the interactive API documentation below

## Rate Limits

- **Default**: 100 requests per minute per IP
- Check response headers for rate limit status
          `,
          version: '1.0.0',
          contact: {
            name: 'dCMMS Support',
            email: 'support@dcmms.com',
            url: 'https://dcmms.com/support',
          },
          license: {
            name: 'UNLICENSED',
          },
        },
        servers: [
          {
            url: `http://${process.env.SWAGGER_HOST || 'localhost:3000'}`,
            description: 'Development server',
          },
          {
            url: 'https://api.dcmms.com',
            description: 'Production server',
          },
          {
            url: 'https://staging-api.dcmms.com',
            description: 'Staging server',
          },
        ],
        tags: [
          {
            name: 'health',
            description: 'Health check and system status endpoints',
          },
          {
            name: 'auth',
            description: 'Authentication and authorization endpoints',
          },
          {
            name: 'work-orders',
            description: 'Work order management - Create, assign, and track maintenance work',
          },
          {
            name: 'assets',
            description: 'Asset management - Track physical assets and their hierarchy',
          },
          {
            name: 'sites',
            description: 'Site management - Organize assets by location',
          },
          {
            name: 'notifications',
            description: 'Notification management - Manage notification preferences and history',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token obtained from /api/v1/auth/login',
            },
          },
        },
        externalDocs: {
          description: 'API Usage Guide and Examples',
          url: 'https://docs.dcmms.com/api/usage-guide',
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
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
  await server.register(telemetryRoutes, { prefix: '/api/v1/telemetry' });
  await server.register(notificationRoutes, { prefix: '/api/v1' });
  await server.register(webhookRoutes, { prefix: '/api/v1' });
  await server.register(alertRoutes, { prefix: '/api/v1' });
  await server.register(integrationRoutes, { prefix: '/api/v1' });
  await server.register(analyticsAdminRoutes, { prefix: '/api/v1' });
  await server.register(analyticsRoutes, { prefix: '/api/v1' });
  await server.register(reportRoutes, { prefix: '/api/v1' });

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  // ==========================================
  // NOTIFICATION BATCHING SCHEDULER
  // ==========================================

  // Start notification batching service
  const { createNotificationBatchingService } = await import('./services/notification-batching.service');
  const batchingService = createNotificationBatchingService(server);
  batchingService.start();

  // ==========================================
  // ETL SCHEDULER (ClickHouse Sync)
  // ==========================================

  // Start ETL scheduler for ClickHouse analytics
  const { createETLSchedulerService } = await import('./services/etl-scheduler.service');
  const etlScheduler = createETLSchedulerService(server);
  await etlScheduler.start();

  // Cleanup on server close
  server.addHook('onClose', async () => {
    server.log.info('Shutting down notification batching service');
    batchingService.stop();

    server.log.info('Shutting down ETL scheduler');
    etlScheduler.stop();
  });

  return server;
}
