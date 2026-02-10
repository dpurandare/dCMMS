/**
 * PermissionGuard Component
 * 
 * Wraps components to show/hide based on user permissions.
 * Provides role-based access control at the component level.
 */

'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/config/permissions';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
    /**
     * Permission(s) required to view the content
     * Can be a single permission or an array of permissions
     */
    permission: Permission | Permission[];

    /**
     * If true, user needs ALL permissions (AND logic)
     * If false, user needs ANY permission (OR logic)
     * Only applies when permission is an array
     * @default false
     */
    requireAll?: boolean;

    /**
     * Content to render if permission check passes
     */
    children: ReactNode;

    /**
     * Optional fallback content to show if permission check fails
     * If not provided, nothing will be rendered
     */
    fallback?: ReactNode;

    /**
     * If true, shows an "Access Denied" message instead of nothing
     * @default false
     */
    showAccessDenied?: boolean;
}

/**
 * Permission Guard Component
 * 
 * @example
 * // Single permission
 * <PermissionGuard permission="work-orders.create">
 *   <CreateWorkOrderButton />
 * </PermissionGuard>
 * 
 * @example
 * // Multiple permissions (OR logic - user needs at least one)
 * <PermissionGuard permission={['assets.edit', 'assets.delete']}>
 *   <AssetActions />
 * </PermissionGuard>
 * 
 * @example
 * // Multiple permissions (AND logic - user needs all)
 * <PermissionGuard 
 *   permission={['reports.create', 'reports.export']} 
 *   requireAll
 * >
 *   <AdvancedReportBuilder />
 * </PermissionGuard>
 * 
 * @example
 * // With custom fallback
 * <PermissionGuard 
 *   permission="settings.edit"
 *   fallback={<p>You don't have permission to edit settings</p>}
 * >
 *   <SettingsForm />
 * </PermissionGuard>
 * 
 * @example
 * // With access denied message
 * <Permission Guard 
 *   permission="users.manage-roles"
 *   showAccessDenied
 * >
 *   <RoleManagement />
 * </PermissionGuard>
 */
export function PermissionGuard({
    permission,
    requireAll = false,
    children,
    fallback = null,
    showAccessDenied = false,
}: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

    // Determine if user has required permission(s)
    let hasAccess = false;

    if (Array.isArray(permission)) {
        hasAccess = requireAll
            ? hasAllPermissions(permission)
            : hasAnyPermission(permission);
    } else {
        hasAccess = hasPermission(permission);
    }

    // If user has access, render children
    if (hasAccess) {
        return <>{children}</>;
    }

    // If showAccessDenied is true, show access denied message
    if (showAccessDenied) {
        return <AccessDenied />;
    }

    // Otherwise, render fallback (or nothing if fallback is null)
    return <>{fallback}</>;
}

/**
 * Access Denied Component
 * Displayed when showAccessDenied is true
 */
function AccessDenied() {
    return (
        <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="rounded-full bg-red-100 p-3">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        Access Denied
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        You don't have permission to view this content.
                        <br />
                        Please contact your administrator if you believe this is an error.
                    </p>
                </div>
            </div>
        </Card>
    );
}

/**
 * Higher-order component version of PermissionGuard
 * 
 * @example
 * const ProtectedComponent = withPermission(MyComponent, 'work-orders.create');
 */
export function withPermission<P extends object>(
    Component: React.ComponentType<P>,
    permission: Permission | Permission[],
    options?: {
        requireAll?: boolean;
        fallback?: ReactNode;
        showAccessDenied?: boolean;
    }
) {
    return function PermissionWrappedComponent(props: P) {
        return (
            <PermissionGuard
                permission={permission}
                requireAll={options?.requireAll}
                fallback={options?.fallback}
                showAccessDenied={options?.showAccessDenied}
            >
                <Component {...props} />
            </PermissionGuard>
        );
    };
}
