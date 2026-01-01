import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { AuthorizedUser } from "./authorize";

/**
 * Audit Logging Middleware
 * Automatically logs all CREATE, UPDATE, DELETE operations to audit_logs table
 */

interface AuditOptions {
  /** Entity type being audited (e.g., "work_order", "asset", "user") */
  entityType: string;
  /** Function to extract entity ID from request */
  getEntityId?: (request: FastifyRequest) => string | null;
  /** Whether to capture request body as changes */
  captureBody?: boolean;
  /** Whether to capture response as changes */
  captureResponse?: boolean;
}

/**
 * Create audit log middleware
 *
 * @example
 * // For a route that modifies a work order
 * preHandler: [authenticate, audit({
 *   entityType: 'work_order',
 *   getEntityId: (req) => req.params.id
 * })]
 */
export function audit(options: AuditOptions) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthorizedUser;

    if (!user || !user.id || !user.tenantId) {
      // Skip audit if user not authenticated (shouldn't happen if authenticate middleware is first)
      return;
    }

    // Only audit state-changing operations
    const method = request.method;
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return;
    }

    // Map HTTP method to action
    const actionMap: Record<string, string> = {
      POST: "CREATE",
      PATCH: "UPDATE",
      PUT: "UPDATE",
      DELETE: "DELETE",
    };
    const action = actionMap[method] || method;

    // Get entity ID
    const entityId = options.getEntityId
      ? options.getEntityId(request)
      : (request.params as any)?.id || null;

    if (!entityId) {
      // If no entity ID, log as general action
      request.log.warn(
        { entityType: options.entityType, method },
        "Audit log skipped - no entity ID available"
      );
      return;
    }

    // Capture request body as changes for audit trail
    const changes: any = {};

    if (options.captureBody !== false && request.body) {
      changes.requestBody = request.body;
    }

    // Get IP address
    const ipAddress =
      request.headers["x-forwarded-for"] ||
      request.headers["x-real-ip"] ||
      request.socket.remoteAddress ||
      null;

    // Get user agent
    const userAgent = request.headers["user-agent"] || null;

    // Create audit log entry
    try {
      await db.insert(auditLogs).values({
        tenantId: user.tenantId,
        userId: user.id,
        action,
        entityType: options.entityType,
        entityId: entityId.toString(),
        changes: changes ? JSON.stringify(changes) : null,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : (ipAddress as string) || null,
        userAgent: userAgent as string | null,
      });

      request.log.debug(
        {
          userId: user.id,
          action,
          entityType: options.entityType,
          entityId,
        },
        "Audit log created"
      );
    } catch (error) {
      // Don't fail the request if audit logging fails, but log the error
      request.log.error(
        {
          err: error,
          userId: user.id,
          action,
          entityType: options.entityType,
        },
        "Failed to create audit log"
      );
    }
  };
}

/**
 * Global audit hook that can be added to Fastify to automatically audit all routes
 * This is an alternative to using the audit middleware on individual routes
 */
export async function auditHook(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as AuthorizedUser;

  if (!user || !user.id || !user.tenantId) {
    return;
  }

  // Only audit state-changing operations
  const method = request.method;
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return;
  }

  // Extract entity type and ID from route path
  const routePath = request.routerPath || request.url;
  const pathParts = routePath.split("/").filter((p) => p.length > 0);

  // Try to determine entity type from route (e.g., /api/v1/work-orders/:id -> work-orders)
  let entityType = "unknown";
  let entityId: string | null = null;

  if (pathParts.length >= 3) {
    // Format: /api/v1/work-orders/:id
    entityType = pathParts[2]; // work-orders
    if ((request.params as any)?.id) {
      entityId = (request.params as any).id;
    }
  }

  if (!entityId) {
    return;
  }

  // Map HTTP method to action
  const actionMap: Record<string, string> = {
    POST: "CREATE",
    PATCH: "UPDATE",
    PUT: "UPDATE",
    DELETE: "DELETE",
  };
  const action = actionMap[method] || method;

  // Capture request body
  const changes: any = {};
  if (request.body) {
    changes.requestBody = request.body;
  }

  // Get IP address
  const ipAddress =
    request.headers["x-forwarded-for"] ||
    request.headers["x-real-ip"] ||
    request.socket.remoteAddress ||
    null;

  // Get user agent
  const userAgent = request.headers["user-agent"] || null;

  // Create audit log entry
  try {
    await db.insert(auditLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action,
      entityType: entityType.replace(/-/g, "_"), // Convert kebab-case to snake_case
      entityId: entityId.toString(),
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : (ipAddress as string) || null,
      userAgent: userAgent as string | null,
    });

    request.log.debug(
      {
        userId: user.id,
        action,
        entityType,
        entityId,
      },
      "Audit log created via global hook"
    );
  } catch (error) {
    request.log.error(
      {
        err: error,
        userId: user.id,
        action,
        entityType,
      },
      "Failed to create audit log via global hook"
    );
  }
}

/**
 * Helper to create audit-specific routes
 */
export function requireAuditAccess() {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthorizedUser;

    if (!user || !user.role) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Only super_admin and tenant_admin can read audit logs
    if (user.role !== "super_admin" && user.role !== "tenant_admin") {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Administrator access required to view audit logs",
      });
    }
  };
}
