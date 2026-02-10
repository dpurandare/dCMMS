/**
 * RBAC Permission System for Frontend
 * Matches backend/src/constants/permissions.ts
 */

import type { UserRole, Permission } from "@/types/api";

/**
 * Role-based Permission Matrix
 * Defines which permissions each role has (matches backend)
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Super admin has ALL permissions
    "create:work-orders",
    "read:work-orders",
    "update:work-orders",
    "delete:work-orders",
    "approve:work-orders",
    "assign:work-orders",
    "close:work-orders",
    "create:assets",
    "read:assets",
    "update:assets",
    "delete:assets",
    "manage:assets",
    "create:parts",
    "read:parts",
    "update:parts",
    "delete:parts",
    "consume:parts",
    "create:sites",
    "read:sites",
    "update:sites",
    "delete:sites",
    "create:users",
    "read:users",
    "update:users",
    "delete:users",
    "manage:roles",
    "create:alerts",
    "read:alerts",
    "acknowledge:alerts",
    "resolve:alerts",
    "manage:notifications",
    "read:reports",
    "create:reports",
    "read:analytics",
    "read:compliance",
    "create:compliance",
    "approve:compliance",
    "submit:compliance",
    "create:permits",
    "read:permits",
    "approve:permits",
    "close:permits",
    "manage:system",
    "manage:tenants",
    "read:audit-logs",
    "manage:integrations",
  ],

  tenant_admin: [
    // Tenant admin has most permissions except system-level
    "create:work-orders",
    "read:work-orders",
    "update:work-orders",
    "delete:work-orders",
    "approve:work-orders",
    "assign:work-orders",
    "close:work-orders",
    "create:assets",
    "read:assets",
    "update:assets",
    "delete:assets",
    "manage:assets",
    "create:parts",
    "read:parts",
    "update:parts",
    "delete:parts",
    "consume:parts",
    "create:sites",
    "read:sites",
    "update:sites",
    "delete:sites",
    "create:users",
    "read:users",
    "update:users",
    "delete:users",
    "manage:roles",
    "create:alerts",
    "read:alerts",
    "acknowledge:alerts",
    "resolve:alerts",
    "manage:notifications",
    "read:reports",
    "create:reports",
    "read:analytics",
    "read:compliance",
    "create:compliance",
    "approve:compliance",
    "submit:compliance",
    "create:permits",
    "read:permits",
    "approve:permits",
    "close:permits",
    "read:audit-logs",
  ],

  site_manager: [
    // Site manager focuses on operations
    "create:work-orders",
    "read:work-orders",
    "update:work-orders",
    "approve:work-orders",
    "assign:work-orders",
    "close:work-orders",
    "read:assets",
    "update:assets",
    "read:parts",
    "update:parts",
    "consume:parts",
    "read:sites",
    "update:sites",
    "read:users",
    "create:alerts",
    "read:alerts",
    "acknowledge:alerts",
    "resolve:alerts",
    "read:reports",
    "create:reports",
    "read:analytics",
    "read:compliance",
    "create:compliance",
    "create:permits",
    "read:permits",
    "approve:permits",
    "close:permits",
  ],

  technician: [
    // Technicians execute work orders
    "read:work-orders",
    "update:work-orders",
    "read:assets",
    "read:parts",
    "consume:parts",
    "read:sites",
    "read:alerts",
    "acknowledge:alerts",
    "read:permits",
  ],

  operator: [
    // Operators monitor and respond to alerts
    "read:work-orders",
    "read:assets",
    "read:parts",
    "read:sites",
    "create:alerts",
    "read:alerts",
    "acknowledge:alerts",
    "read:reports",
    "read:analytics",
  ],

  viewer: [
    // Viewers have read-only access
    "read:work-orders",
    "read:assets",
    "read:parts",
    "read:sites",
    "read:alerts",
    "read:reports",
    "read:analytics",
    "read:compliance",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user is admin (super_admin or tenant_admin)
 */
export function isAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "tenant_admin";
}

/**
 * Check if user can perform action on their own resources
 */
export function canAccessOwnResource(role: UserRole, userId: string, resourceUserId: string): boolean {
  // Admins can access any resource
  if (isAdmin(role)) {
    return true;
  }
  // Others can only access their own resources
  return userId === resourceUserId;
}
