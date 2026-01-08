import { FastifyRequest, FastifyReply } from "fastify";
import { ROLE_PERMISSIONS, Permission } from "../config/permissions";

/**
 * RBAC Permission Middleware
 * Verifies that the authenticated user has the required permission
 */
export const requirePermission = (permission: Permission) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as any;

        if (!user) {
            return reply.code(401).send({
                statusCode: 401,
                error: "Unauthorized",
                message: "Authentication required",
            });
        }

        // Check if user has the required permission
        const hasPermission = checkUserPermission(user.role, permission);

        if (!hasPermission) {
            return reply.code(403).send({
                statusCode: 403,
                error: "Forbidden",
                message: `Insufficient permissions. Required: ${permission}`,
            });
        }
    };
};

/**
 * Check if a user role has a specific permission
 */
export function checkUserPermission(
    role: string,
    permission: Permission
): boolean {
    // Super admin has all permissions
    if (role === "super_admin") {
        return true;
    }

    // Get permissions for the role
    const rolePermissions = ROLE_PERMISSIONS[role];
    if (!rolePermissions) {
        return false;
    }

    return rolePermissions.includes(permission);
}

/**
 * Require any of multiple permissions (OR logic)
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as any;

        if (!user) {
            return reply.code(401).send({
                statusCode: 401,
                error: "Unauthorized",
                message: "Authentication required",
            });
        }

        // Check if user has ANY of the required permissions
        const hasAny = permissions.some((permission) =>
            checkUserPermission(user.role, permission)
        );

        if (!hasAny) {
            return reply.code(403).send({
                statusCode: 403,
                error: "Forbidden",
                message: `Insufficient permissions. Required one of: ${permissions.join(", ")}`,
            });
        }
    };
};

/**
 * Require all of multiple permissions (AND logic)
 */
export const requireAllPermissions = (...permissions: Permission[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user as any;

        if (!user) {
            return reply.code(401).send({
                statusCode: 401,
                error: "Unauthorized",
                message: "Authentication required",
            });
        }

        // Check if user has ALL of the required permissions
        const hasAll = permissions.every((permission) =>
            checkUserPermission(user.role, permission)
        );

        if (!hasAll) {
            return reply.code(403).send({
                statusCode: 403,
                error: "Forbidden",
                message: `Insufficient permissions. Required all of: ${permissions.join(", ")}`,
            });
        }
    };
};

/**
 * Require admin role (tenant_admin or super_admin)
 */
export const requireAdmin = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const user = request.user as any;

    if (!user) {
        return reply.code(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Authentication required",
        });
    }

    const isAdmin =
        user.role === "super_admin" || user.role === "tenant_admin";

    if (!isAdmin) {
        return reply.code(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: "Administrator access required",
        });
    }
};
