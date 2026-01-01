/**
 * Permission Constants and RBAC Matrix
 * Based on specs/03_AUTH_AUTHORIZATION.md and specs/09_ROLE_FEATURE_ACCESS_MATRIX.md
 */

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "site_manager"
  | "technician"
  | "operator"
  | "viewer";

export type Permission =
  // Work Orders
  | "create:work-orders"
  | "read:work-orders"
  | "update:work-orders"
  | "delete:work-orders"
  | "approve:work-orders"
  | "assign:work-orders"
  | "close:work-orders"
  // Assets
  | "create:assets"
  | "read:assets"
  | "update:assets"
  | "delete:assets"
  | "manage:assets"
  // Parts & Inventory
  | "create:parts"
  | "read:parts"
  | "update:parts"
  | "delete:parts"
  | "consume:parts"
  // Sites
  | "create:sites"
  | "read:sites"
  | "update:sites"
  | "delete:sites"
  // Users & Access
  | "create:users"
  | "read:users"
  | "update:users"
  | "delete:users"
  | "manage:roles"
  // Alerts & Notifications
  | "create:alerts"
  | "read:alerts"
  | "acknowledge:alerts"
  | "resolve:alerts"
  | "manage:notifications"
  // Reports & Analytics
  | "read:reports"
  | "create:reports"
  | "read:analytics"
  // Compliance
  | "read:compliance"
  | "create:compliance"
  | "approve:compliance"
  | "submit:compliance"
  // Permits & Safety
  | "create:permits"
  | "read:permits"
  | "approve:permits"
  | "close:permits"
  // System Admin
  | "manage:system"
  | "manage:tenants"
  | "read:audit-logs"
  | "manage:integrations";

/**
 * Role-based Permission Matrix
 * Defines which permissions each role has
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
    "update:work-orders", // Only for assigned WOs
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
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
