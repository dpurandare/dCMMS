/**
 * Permission Types
 * Maps to frontend permissions for consistency
 */
export type Permission =
    | "users.view"
    | "users.create"
    | "users.edit"
    | "users.delete"
    | "work-orders.view"
    | "work-orders.create"
    | "work-orders.edit"
    | "work-orders.delete"
    | "assets.view"
    | "assets.create"
    | "assets.edit"
    | "assets.delete"
    | "alerts.view"
    | "alerts.acknowledge"
    | "alerts.resolve"
    | "reports.view"
    | "reports.create"
    | "analytics.view"
    | "ml.models.view"
    | "ml.models.manage"
    | "settings.view"
    | "settings.manage";

/**
 * Role Permission Mapping
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    super_admin: [
        // Super admin has ALL permissions
        "users.view",
        "users.create",
        "users.edit",
        "users.delete",
        "work-orders.view",
        "work-orders.create",
        "work-orders.edit",
        "work-orders.delete",
        "assets.view",
        "assets.create",
        "assets.edit",
        "assets.delete",
        "alerts.view",
        "alerts.acknowledge",
        "alerts.resolve",
        "reports.view",
        "reports.create",
        "analytics.view",
        "ml.models.view",
        "ml.models.manage",
        "settings.view",
        "settings.manage",
    ],

    tenant_admin: [
        // Tenant admin (almost all permissions except super admin stuff)
        "users.view",
        "users.create",
        "users.edit",
        "users.delete",
        "work-orders.view",
        "work-orders.create",
        "work-orders.edit",
        "work-orders.delete",
        "assets.view",
        "assets.create",
        "assets.edit",
        "assets.delete",
        "alerts.view",
        "alerts.acknowledge",
        "alerts.resolve",
        "reports.view",
        "reports.create",
        "analytics.view",
        "ml.models.view",
        "ml.models.manage",
        "settings.view",
        "settings.manage",
    ],

    site_manager: [
        // Site manager (can manage work orders, assets, alerts)
        "users.view",
        "work-orders.view",
        "work-orders.create",
        "work-orders.edit",
        "work-orders.delete",
        "assets.view",
        "assets.create",
        "assets.edit",
        "assets.delete",
        "alerts.view",
        "alerts.acknowledge",
        "alerts.resolve",
        "reports.view",
        "reports.create",
        "analytics.view",
        "settings.view",
    ],

    technician: [
        // Technician (can view and edit work orders, view assets)
        "work-orders.view",
        "work-orders.edit",
        "assets.view",
        "alerts.view",
        "reports.view",
    ],

    operator: [
        // Operator (similar to technician)
        "work-orders.view",
        "work-orders.edit",
        "assets.view",
        "alerts.view",
        "reports.view",
    ],

    viewer: [
        // Viewer (read-only access)
        "work-orders.view",
        "assets.view",
        "alerts.view",
        "reports.view",
        "analytics.view",
    ],
};
