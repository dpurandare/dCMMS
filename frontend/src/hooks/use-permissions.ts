"use client";

import { useAuthStore } from "@/store/auth-store";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  isAdmin,
} from "@/lib/permissions";
import type { Permission, UserRole } from "@/types/api";

/**
 * Hook to check user permissions
 * @returns Object with permission checking functions
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const can = (permission: Permission): boolean => {
    if (!user?.role) return false;
    return hasPermission(user.role as UserRole, permission);
  };

  const canAny = (permissions: Permission[]): boolean => {
    if (!user?.role) return false;
    return hasAnyPermission(user.role as UserRole, permissions);
  };

  const canAll = (permissions: Permission[]): boolean => {
    if (!user?.role) return false;
    return hasAllPermissions(user.role as UserRole, permissions);
  };

  const permissions = user?.role ? getRolePermissions(user.role as UserRole) : [];

  const userIsAdmin = user?.role ? isAdmin(user.role as UserRole) : false;

  return {
    can,
    canAny,
    canAll,
    permissions,
    isAdmin: userIsAdmin,
    role: user?.role,
  };
}

/**
 * Hook to check if user can perform a specific action
 * @param permission - Permission to check
 * @returns Boolean indicating if user has permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}

/**
 * Hook to check if user has ANY of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Boolean indicating if user has any permission
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = usePermissions();
  return canAny(permissions);
}

/**
 * Hook to check if user has ALL of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Boolean indicating if user has all permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { canAll } = usePermissions();
  return canAll(permissions);
}

/**
 * Hook to check if user is admin
 * @returns Boolean indicating if user is admin
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions();
  return isAdmin;
}
