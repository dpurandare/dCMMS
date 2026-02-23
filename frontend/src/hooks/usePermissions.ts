/**
 * usePermissions Hook
 * 
 * Provides permission checking functionality based on user role.
 * Core hook for implementing RBAC throughout the application.
 */

import { useAuthStore } from '@/store/auth-store';
import { Permission, getPermissionsForRole } from '@/config/permissions';

export interface PermissionCheck {
    /**
     * Check if the current user has a specific permission
     */
    hasPermission: (permission: Permission) => boolean;

    /**
     * Check if the current user has ANY of the specified permissions
     */
    hasAnyPermission: (permissions: Permission[]) => boolean;

    /**
     * Check if the current user has ALL of the specified permissions
     */
    hasAllPermissions: (permissions: Permission[]) => boolean;

    /**
     * Get all permissions for the current user
     */
    getUserPermissions: () => Permission[];

    /**
     * Check if user is an admin (has all permissions)
     */
    isAdmin: () => boolean;

    /**
     * Get the current user's role
     */
    getUserRole: () => string | null;
}

/**
 * Hook for checking user permissions
 * 
 * @example
 * const { hasPermission, hasAnyPermission } = usePermissions();
 * 
 * if (hasPermission('work-orders.create')) {
 *   // Show create button
 * }
 * 
 * if (hasAnyPermission(['assets.edit', 'assets.delete'])) {
 *   // Show asset management options
 * }
 */
export function usePermissions(): PermissionCheck {
    const { user } = useAuthStore();

    /**
     * Get all permissions for the current user based on their role
     */
    const getUserPermissions = (): Permission[] => {
        if (!user || !user.role) {
            return [];
        }
        return getPermissionsForRole(user.role);
    };

    /**
     * Check if user has a specific permission
     */
    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;

        const userPermissions = getUserPermissions();
        return userPermissions.includes(permission);
    };

    /**
     * Check if user has ANY of the specified permissions
     */
    const hasAnyPermission = (permissions: Permission[]): boolean => {
        if (!user || permissions.length === 0) return false;

        return permissions.some((permission) => hasPermission(permission));
    };

    /**
     * Check if user has ALL of the specified permissions
     */
    const hasAllPermissions = (permissions: Permission[]): boolean => {
        if (!user || permissions.length === 0) return false;

        return permissions.every((permission) => hasPermission(permission));
    };

    /**
     * Check if the user is an admin
     */
    const isAdmin = (): boolean => {
        return user?.role === 'admin' || user?.role === 'tenant_admin';
    };

    /**
     * Get the current user's role
     */
    const getUserRole = (): string | null => {
        return user?.role || null;
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        getUserPermissions,
        isAdmin,
        getUserRole,
    };
}

/**
 * Hook for checking if user can access a specific route
 * 
 * @param routePath - The route to check
 * @returns boolean indicating if user has access
 */
export function useRouteAccess(routePath: string): boolean {
    const { hasPermission, hasAnyPermission } = usePermissions();

    // Import route permissions
    const { ROUTE_PERMISSIONS } = require('@/config/permissions');

    const requiredPermission = ROUTE_PERMISSIONS[routePath];

    if (!requiredPermission) {
        // If no permission defined for route, allow access (default allow)
        // You can change this to default deny by returning false
        return true;
    }

    if (Array.isArray(requiredPermission)) {
        return hasAnyPermission(requiredPermission);
    }

    return hasPermission(requiredPermission);
}
