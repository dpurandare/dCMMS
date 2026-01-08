/**
 * RBAC Permission System
 * 
 * Defines all permissions and role-based access control mappings for the application.
 * Based on PRD specs/09_ROLE_FEATURE_ACCESS_MATRIX.md
 */

/**
 * All available permissions in the system
 */
export type Permission =
    // Dashboard
    | 'dashboard.view'

    // Work Orders
    | 'work-orders.view'
    | 'work-orders.create'
    | 'work-orders.edit'
    | 'work-orders.delete'
    | 'work-orders.assign'
    | 'work-orders.complete'

    // Assets
    | 'assets.view'
    | 'assets.create'
    | 'assets.edit'
    | 'assets.delete'

    // Alerts
    | 'alerts.view'
    | 'alerts.acknowledge'
    | 'alerts.resolve'
    | 'alerts.manage'

    // Analytics
    | 'analytics.view'
    | 'analytics.advanced'

    // Reports
    | 'reports.view'
    | 'reports.create'
    | 'reports.export'

    // Compliance
    | 'compliance.view'
    | 'compliance.create'
    | 'compliance.submit'
    | 'compliance.manage'

    // Machine Learning
    | 'ml.models.view'
    | 'ml.models.deploy'
    | 'ml.forecasts.view'
    | 'ml.anomalies.view'

    // GenAI
    | 'genai.use'
    | 'genai.admin'

    // Users & Security
    | 'users.view'
    | 'users.create'
    | 'users.edit'
    | 'users.delete'
    | 'users.manage-roles'

    // Settings
    | 'settings.view'
    | 'settings.edit'
    | 'settings.system'

    // Sites
    | 'sites.view'
    | 'sites.manage'

    // Audit Logs
    | 'audit-logs.view';

/**
 * Role-based permission mappings
 * 
 * Each role has a specific set of permissions.
 * Permissions are additive - users get all permissions from their assigned role.
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    /**
     * Admin - Full system access
     */
    admin: [
        // Dashboard
        'dashboard.view',

        // Work Orders - Full access
        'work-orders.view',
        'work-orders.create',
        'work-orders.edit',
        'work-orders.delete',
        'work-orders.assign',
        'work-orders.complete',

        // Assets - Full access
        'assets.view',
        'assets.create',
        'assets.edit',
        'assets.delete',

        // Alerts - Full access
        'alerts.view',
        'alerts.acknowledge',
        'alerts.resolve',
        'alerts.manage',

        // Analytics - Full access
        'analytics.view',
        'analytics.advanced',

        // Reports - Full access
        'reports.view',
        'reports.create',
        'reports.export',

        // Compliance - Full access
        'compliance.view',
        'compliance.create',
        'compliance.submit',
        'compliance.manage',

        // Machine Learning - Full access
        'ml.models.view',
        'ml.models.deploy',
        'ml.forecasts.view',
        'ml.anomalies.view',

        // GenAI - Full access
        'genai.use',
        'genai.admin',

        // Users - Full access
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.manage-roles',

        // Settings - Full access
        'settings.view',
        'settings.edit',
        'settings.system',

        // Sites - Full access
        'sites.view',
        'sites.manage',

        // Audit Logs
        'audit-logs.view',
    ],

    /**
     * Manager - Operational management and oversight
     */
    manager: [
        'dashboard.view',

        // Work Orders - Can manage but not delete
        'work-orders.view',
        'work-orders.create',
        'work-orders.edit',
        'work-orders.assign',
        'work-orders.complete',

        // Assets - View and edit only
        'assets.view',
        'assets.edit',

        // Alerts - Full management
        'alerts.view',
        'alerts.acknowledge',
        'alerts.resolve',
        'alerts.manage',

        // Analytics - Full access
        'analytics.view',
        'analytics.advanced',

        // Reports - Create and view
        'reports.view',
        'reports.create',
        'reports.export',

        // Compliance - View and create
        'compliance.view',
        'compliance.create',

        // ML - View only
        'ml.forecasts.view',
        'ml.anomalies.view',

        // GenAI - Use only
        'genai.use',

        // Settings - View only
        'settings.view',

        // Sites - View only
        'sites.view',
    ],

    /**
     * Supervisor - Day-to-day operational management
     */
    supervisor: [
        'dashboard.view',

        // Work Orders - Can manage assigned orders
        'work-orders.view',
        'work-orders.create',
        'work-orders.edit',
        'work-orders.assign',
        'work-orders.complete',

        // Assets - View and basic edit
        'assets.view',
        'assets.edit',

        // Alerts - Can acknowledge and view
        'alerts.view',
        'alerts.acknowledge',

        // Analytics - Basic view
        'analytics.view',

        // Reports - View only
        'reports.view',

        // Compliance - View only
        'compliance.view',

        // GenAI - Use
        'genai.use',

        // Settings - View only
        'settings.view',

        // Sites - View only
        'sites.view',
    ],

    /**
     * Technician - Field work and execution
     */
    technician: [
        'dashboard.view',

        // Work Orders - Execute assigned work
        'work-orders.view',
        'work-orders.edit', // Can update progress
        'work-orders.complete', // Can complete assigned work

        // Assets - View only
        'assets.view',

        // Alerts - View only
        'alerts.view',

        // GenAI - Use for assistance
        'genai.use',

        // Settings - View own settings
        'settings.view',
    ],

    /**
     * Viewer - Read-only access
     */
    viewer: [
        'dashboard.view',
        'work-orders.view',
        'assets.view',
        'alerts.view',
        'analytics.view',
        'reports.view',
        'compliance.view',
        'ml.forecasts.view',
        'sites.view',
    ],

    /**
     * Analyst - Data analysis and reporting focus
     */
    analyst: [
        'dashboard.view',

        // Work Orders - View for analysis
        'work-orders.view',

        // Assets - View for analysis
        'assets.view',

        // Alerts - View for analysis
        'alerts.view',

        // Analytics - Full access
        'analytics.view',
        'analytics.advanced',

        // Reports - Full access
        'reports.view',
        'reports.create',
        'reports.export',

        // ML - View access
        'ml.models.view',
        'ml.forecasts.view',
        'ml.anomalies.view',

        // GenAI - Use
        'genai.use',

        // Sites - View
        'sites.view',
    ],

    /**
     * Compliance Officer - Compliance and regulatory focus
     */
    'compliance-officer': [
        'dashboard.view',

        // Work Orders - View for compliance
        'work-orders.view',

        // Assets - View for compliance
        'assets.view',

        // Compliance - Full access
        'compliance.view',
        'compliance.create',
        'compliance.submit',
        'compliance.manage',

        // Reports - Create compliance reports
        'reports.view',
        'reports.create',
        'reports.export',

        // Audit Logs - View
        'audit-logs.view',

        // GenAI - Use
        'genai.use',

        // Sites - View
        'sites.view',
    ],
};

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: string): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
    const permissions = getPermissionsForRole(role);
    return permissions.includes(permission);
}

/**
 * Get all available roles
 */
export function getAllRoles(): string[] {
    return Object.keys(ROLE_PERMISSIONS);
}

/**
 * Feature route to permission mapping
 * Maps UI routes to required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
    '/dashboard': 'dashboard.view',
    '/work-orders': 'work-orders.view',
    '/work-orders/new': 'work-orders.create',
    '/assets': 'assets.view',
    '/assets/new': 'assets.create',
    '/alerts': 'alerts.view',
    '/analytics': 'analytics.view',
    '/analytics/dashboard': 'analytics.view',
    '/reports': 'reports.view',
    '/compliance-reports': 'compliance.view',
    '/ml/models': 'ml.models.view',
    '/ml/forecasts': 'ml.forecasts.view',
    '/ml/anomalies': 'ml.anomalies.view',
    '/genai': 'genai.use',
    '/users': 'users.view',
    '/settings': 'settings.view',
    '/sites': 'sites.view',
    '/audit-logs': 'audit-logs.view',
};
