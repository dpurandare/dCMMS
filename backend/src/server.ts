import fs from "node:fs";
import path from "node:path";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

// Plugins
import { registerJwt } from "./plugins/jwt";
import { registerRedis } from "./plugins/redis";

// Middleware
import { auditHook } from "./middleware/audit";

// Routes
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import csrfRoutes from "./routes/csrf";
import workOrderRoutes from "./routes/work-orders";
import attachmentsRoutes from "./routes/attachments";
import { dashboardRoutes } from "./routes/dashboards";
import assetRoutes from "./routes/assets";
import siteRoutes from "./routes/sites";
import telemetryRoutes from "./routes/telemetry";
import notificationRoutes from "./routes/notifications";
import webhookRoutes from "./routes/webhooks";
import permitRoutes from "./routes/permits";
import alertRoutes from "./routes/alerts";
import integrationRoutes from "./routes/integrations";
import analyticsAdminRoutes from "./routes/analytics-admin";
import analyticsRoutes from "./routes/analytics";
import reportRoutes from "./routes/reports";
import complianceTemplateRoutes from "./routes/compliance-templates";
import complianceReportRoutes from "./routes/compliance-reports";
import auditLogRoutes from "./routes/audit-logs";
import mlFeatureRoutes from "./routes/ml-features";
import forecastRoutes from "./routes/forecasts";
import usersRoutes from "./routes/users";
import { genaiRoutes } from "./routes/genai.routes";

export async function buildServer(): Promise<FastifyInstance> {
  const isProduction = process.env.NODE_ENV === "production";
  const findNullSchemaPath = (
    value: unknown,
    path: string[] = [],
  ): string[] | null => {
    if (value === null) {
      return path;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        const found = findNullSchemaPath(value[i], [...path, `[${i}]`]);
        if (found) {
          return found;
        }
      }
      return null;
    }
    if (typeof value === "object" && value) {
      for (const [key, entry] of Object.entries(value)) {
        const found = findNullSchemaPath(entry, [...path, key]);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };
  const sanitizeSchema = (value: unknown): unknown => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => sanitizeSchema(item))
        .filter((item) => item !== undefined);
    }
    if (typeof value === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        const sanitized = sanitizeSchema(entry);
        if (sanitized !== undefined) {
          cleaned[key] = sanitized;
        }
      }
      return cleaned;
    }
    return value;
  };
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      ...(process.env.NODE_ENV === "development" && {
        transport: {
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }),
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
    disableRequestLogging: false,
    trustProxy: true,
  });

  server.addHook("onRoute", (route) => {
    if (route.schema) {
      route.schema = sanitizeSchema(route.schema) as typeof route.schema;
      const path = findNullSchemaPath(route.schema, ["schema"]);
      if (path) {
        server.log.warn(
          { url: route.url, method: route.method, path: path.join(".") },
          "Route schema contains null",
        );
      }
    }
  });

  // Register Zod validation provider
  // server.setValidatorCompiler(validatorCompiler);
  // server.setSerializerCompiler(serializerCompiler);

  // ==========================================
  // PLUGINS
  // ==========================================

  // Redis connection
  await registerRedis(server);

  // JWT Authentication
  await registerJwt(server);

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for Swagger UI
    hsts: isProduction ? undefined : false,
  });

  // CORS
  await server.register(cors, {
    origin: [
      "http://localhost:3011",
      "http://localhost:3001",
      "http://localhost:4200",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_TIMEWINDOW || "60000", 10),
  });

  // Multipart file upload support
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 1, // Max 1 file per request
    },
  });

  // Swagger documentation
  if (process.env.SWAGGER_ENABLED !== "false") {
    // Serve OpenAPI spec from a path outside /docs to avoid swaggerUi encapsulation
    const swaggerSpecUrl = "/api/openapi.yaml";

    // Determine OpenAPI spec path based on environment
    // Docker: /app/docs/api/openapi.yaml (cwd is /app)
    // Local dev: ../docs/api/openapi.yaml (cwd is backend/)
    const getSwaggerSpecPath = (): string => {
      if (process.env.SWAGGER_SPEC_PATH) {
        return process.env.SWAGGER_SPEC_PATH;
      }
      // Try Docker path first (./docs/api/openapi.yaml)
      const dockerPath = path.resolve(process.cwd(), "docs/api/openapi.yaml");
      if (fs.existsSync(dockerPath)) {
        return dockerPath;
      }
      // Fall back to local dev path (../docs/api/openapi.yaml)
      return path.resolve(process.cwd(), "../docs/api/openapi.yaml");
    };
    const swaggerSpecPath = getSwaggerSpecPath();

    server.get(swaggerSpecUrl, async (_request, reply) => {
      try {
        const spec = await fs.promises.readFile(swaggerSpecPath, "utf8");
        reply.type("text/yaml").send(spec);
      } catch (err) {
        server.log.error({ err, path: swaggerSpecPath }, "Failed to read OpenAPI spec");
        reply.status(404).send({ error: "OpenAPI spec not found" });
      }
    });

    if (!isProduction) {
      // Register minimal swagger config (required by swagger-ui)
      await server.register(swagger, {
        openapi: {
          info: {
            title: "dCMMS API",
            version: "1.0.0",
          },
        },
      });

      await server.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
          docExpansion: "list",
          deepLinking: true,
          filter: true,
          tryItOutEnabled: true,
          persistAuthorization: true,
          url: swaggerSpecUrl,
        },
        staticCSP: false,
      });
    } else {
      await server.register(swagger, {
        transform: (input) => {
          const transformed = jsonSchemaTransform(input);
          return {
            ...transformed,
            schema: sanitizeSchema(transformed.schema),
          };
        },
        openapi: {
        info: {
          title: "dCMMS API",
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
          version: "1.0.0",
          contact: {
            name: "dCMMS Support",
            email: "support@dcmms.com",
            url: "https://dcmms.com/support",
          },
          license: {
            name: "UNLICENSED",
          },
        },
        servers: [
          {
            url: `http://${process.env.SWAGGER_HOST || "localhost:3000"}`,
            description: "Development server",
          },
          {
            url: "https://api.dcmms.com",
            description: "Production server",
          },
          {
            url: "https://staging-api.dcmms.com",
            description: "Staging server",
          },
        ],
        tags: [
          {
            name: "health",
            description: "Health check and system status endpoints",
          },
          {
            name: "auth",
            description: "Authentication and authorization endpoints",
          },
          {
            name: "csrf",
            description: "CSRF token management - Get CSRF tokens for protected operations",
          },
          {
            name: "work-orders",
            description:
              "Work order management - Create, assign, and track maintenance work",
          },
          {
            name: "attachments",
            description:
              "File attachments - Upload, download, and manage work order file attachments",
          },
          {
            name: "assets",
            description:
              "Asset management - Track physical assets and their hierarchy",
          },
          {
            name: "sites",
            description: "Site management - Organize assets by location",
          },
          {
            name: "notifications",
            description:
              "Notification management - Manage notification preferences and history",
          },
          {
            name: "Compliance",
            description:
              "Compliance reporting - Manage compliance templates and generate reports",
          },
          {
            name: "Reports",
            description:
              "Custom report builder - Create and execute custom reports",
          },
          {
            name: "Analytics",
            description:
              "Analytics and KPIs - Access system analytics and key performance indicators",
          },
          {
            name: "Audit",
            description:
              "Audit logs - Tamper-proof compliance audit trail (admin-only)",
          },
          {
            name: "ML",
            description:
              "Machine Learning - Feast feature store and ML model serving",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "JWT token obtained from /api/v1/auth/login",
            },
          },
        },
        externalDocs: {
          description: "API Usage Guide and Examples",
          url: "https://docs.dcmms.com/api/usage-guide",
        },
      },
    });

    await server.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
      },
      staticCSP: isProduction,
    });
    }
  }

  // ==========================================
  // GLOBAL HOOKS
  // ==========================================

  // Request logging
  server.addHook("onRequest", async (request, reply) => {
    request.log.info(
      { url: request.url, method: request.method },
      "incoming request",
    );
  });

  // Response time tracking
  server.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
      "request completed",
    );
  });

  // Audit logging (compliance)
  server.addHook("onRequest", auditHook);

  // ==========================================
  // ERROR HANDLER
  // ==========================================

  server.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Validation failed",
        details: error.validation,
      });
    }

    // JWT errors
    if (error.message?.includes("Authorization")) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: error.message,
      });
    }

    // Database errors
    if (error.message?.includes("duplicate key") || error.code === "23505") {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "Resource already exists",
      });
    }

    // Foreign key errors
    if (error.code === "23503") {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Referenced resource does not exist",
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name || "Internal Server Error",
      message: error.message || "An unexpected error occurred",
    });
  });

  // ==========================================
  // ROUTES
  // ==========================================

  await server.register(healthRoutes, { prefix: "/health" });
  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(csrfRoutes, { prefix: "/api/v1/csrf" });
  await server.register(workOrderRoutes, { prefix: "/api/v1/work-orders" });
  await server.register(attachmentsRoutes, { prefix: "/api/v1/work-orders" });
  await server.register(permitRoutes, { prefix: "/api/v1/permits" });
  await server.register(assetRoutes, { prefix: "/api/v1/assets" });
  await server.register(siteRoutes, { prefix: "/api/v1/sites" });
  await server.register(telemetryRoutes, { prefix: "/api/v1/telemetry" });
  await server.register(notificationRoutes, { prefix: "/api/v1" });
  await server.register(webhookRoutes, { prefix: "/api/v1" });
  await server.register(alertRoutes, { prefix: "/api/v1" });
  await server.register(integrationRoutes, { prefix: "/api/v1" });
  await server.register(analyticsAdminRoutes, { prefix: "/api/v1" });
  await server.register(analyticsRoutes, { prefix: "/api/v1" });
  await server.register(reportRoutes, { prefix: "/api/v1/reports" });
  await server.register(complianceTemplateRoutes, { prefix: "/api/v1" });
  await server.register(complianceReportRoutes, { prefix: "/api/v1" });
  await server.register(auditLogRoutes, { prefix: "/api/v1" });
  await server.register(mlFeatureRoutes, { prefix: "/api/v1" });
  await server.register(forecastRoutes, { prefix: "/api/v1/forecasts" });
  await server.register(dashboardRoutes, { prefix: "/api/v1/dashboards" });
  await server.register(usersRoutes, { prefix: "/api/v1/users" });
  await server.register(genaiRoutes, { prefix: "/api/v1/genai" });

  // 404 handler
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  // ==========================================
  // NOTIFICATION BATCHING SCHEDULER
  // ==========================================

  // Start notification batching service
  const { createNotificationBatchingService } =
    await import("./services/notification-batching.service");
  const batchingService = createNotificationBatchingService(server);
  batchingService.start();

  // ==========================================
  // ETL SCHEDULER (ClickHouse Sync)
  // ==========================================

  // Start ETL scheduler for ClickHouse analytics
  const { createETLSchedulerService } =
    await import("./services/etl-scheduler.service");
  const etlScheduler = createETLSchedulerService(server);
  await etlScheduler.start();

  // Cleanup on server close
  server.addHook("onClose", async () => {
    server.log.info("Shutting down notification batching service");
    batchingService.stop();

    server.log.info("Shutting down ETL scheduler");
    etlScheduler.stop();
  });

  return server;
}
