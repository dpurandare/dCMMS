import { FastifyRequest, FastifyReply } from "fastify";
import {
  Permission,
  UserRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "../constants/permissions";

/**
 * Extended user payload with authorization fields
 */
export interface AuthorizedUser {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  role: UserRole;
}

// Note: FastifyRequest.user is already typed by @fastify/jwt in src/types/index.d.ts
// The AuthorizedUser type is used for type assertions after authentication

/**
 * Authorization Options
 */
export interface AuthorizeOptions {
  /** Required permissions (user must have ALL) */
  permissions?: Permission[];
  /** Alternative permissions (user must have ANY) */
  anyPermissions?: Permission[];
  /** Allow users to access their own resources */
  allowOwn?: boolean;
  /** Require admin role (super_admin or tenant_admin) */
  adminOnly?: boolean;
  /** Custom authorization function */
  custom?: (request: FastifyRequest, user: AuthorizedUser) => boolean | Promise<boolean>;
}

/**
 * Authorize middleware factory
 * Creates a preHandler middleware that checks user permissions
 *
 * @example
 * // Require specific permission
 * preHandler: [authenticate, authorize({ permissions: ['create:work-orders'] })]
 *
 * @example
 * // Require ANY of multiple permissions
 * preHandler: [authenticate, authorize({ anyPermissions: ['read:work-orders', 'read:all'] })]
 *
 * @example
 * // Custom authorization logic
 * preHandler: [authenticate, authorize({
 *   custom: (req, user) => req.params.userId === user.id
 * })]
 */
export function authorize(options: AuthorizeOptions = {}) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthorizedUser;

    // User should already be authenticated via authenticate middleware
    if (!user || !user.role) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Check if admin access is required
    if (options.adminOnly) {
      if (user.role !== "super_admin" && user.role !== "tenant_admin") {
        request.log.warn(
          {
            userId: user.id,
            role: user.role,
          },
          "Admin access denied",
        );
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "Administrator access required",
        });
      }
    }

    // Check if user has required permissions (ALL)
    if (options.permissions && options.permissions.length > 0) {
      const hasAllPerms = hasAllPermissions(user.role, options.permissions);
      if (!hasAllPerms) {
        request.log.warn(
          {
            userId: user.id,
            role: user.role,
            requiredPermissions: options.permissions,
          },
          "Permission denied - missing required permissions",
        );
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "You do not have permission to perform this action",
          requiredPermissions: options.permissions,
        });
      }
    }

    // Check if user has ANY of the alternative permissions
    if (options.anyPermissions && options.anyPermissions.length > 0) {
      const hasAnyPerm = hasAnyPermission(user.role, options.anyPermissions);
      if (!hasAnyPerm) {
        request.log.warn(
          {
            userId: user.id,
            role: user.role,
            anyPermissions: options.anyPermissions,
          },
          "Permission denied - missing any of required permissions",
        );
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "You do not have permission to perform this action",
          anyPermissions: options.anyPermissions,
        });
      }
    }

    // Custom authorization logic
    if (options.custom) {
      try {
        const isAuthorized = await options.custom(request, user);
        if (!isAuthorized) {
          request.log.warn(
            {
              userId: user.id,
              role: user.role,
            },
            "Permission denied - custom authorization failed",
          );
          return reply.status(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "You do not have permission to perform this action",
          });
        }
      } catch (error) {
        request.log.error(
          {
            err: error,
            userId: user.id,
          },
          "Error in custom authorization",
        );
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Authorization check failed",
        });
      }
    }

    // If we got here, user is authorized
    // Continue to route handler
  };
}

/**
 * Shorthand function to require a single permission
 */
export function requirePermission(permission: Permission) {
  return authorize({ permissions: [permission] });
}

/**
 * Shorthand function to require user to be admin (super_admin or tenant_admin)
 */
export function requireAdmin() {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthorizedUser;

    if (!user || !user.role) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (user.role !== "super_admin" && user.role !== "tenant_admin") {
      request.log.warn(
        {
          userId: user.id,
          role: user.role,
        },
        "Admin access denied",
      );
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Administrator access required",
      });
    }
  };
}

/**
 * Shorthand function to require user to access only their own resources
 * @param getUserIdFromRequest - Function to extract the target user ID from request
 */
export function requireOwnership(
  getUserIdFromRequest: (request: FastifyRequest) => string,
) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as AuthorizedUser;

    if (!user || !user.id) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const targetUserId = getUserIdFromRequest(request);

    // Allow super_admin and tenant_admin to access any resource
    if (user.role === "super_admin" || user.role === "tenant_admin") {
      return;
    }

    // Check if user is trying to access their own resource
    if (user.id !== targetUserId) {
      request.log.warn(
        {
          userId: user.id,
          targetUserId,
        },
        "Ownership check failed",
      );
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "You can only access your own resources",
      });
    }
  };
}

/**
 * Check if user has permission (for use in route handlers)
 */
export function checkPermission(user: AuthorizedUser, permission: Permission): boolean {
  return hasPermission(user.role, permission);
}
