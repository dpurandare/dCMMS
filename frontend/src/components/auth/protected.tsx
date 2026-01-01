"use client";

import React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/types/api";
import { Button, ButtonProps } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Loader2 } from "lucide-react";

// ==========================================
// PROTECTED SECTION
// ==========================================

interface ProtectedSectionProps {
  /** Required permission(s) to show this section */
  permissions?: Permission[];
  /** Require ANY of the permissions (default: require ALL) */
  requireAny?: boolean;
  /** Admin only */
  adminOnly?: boolean;
  /** Children to render if user has permission */
  children: React.ReactNode;
  /** Fallback to render if user doesn't have permission */
  fallback?: React.ReactNode;
}

/**
 * Protected Section Component
 * Shows children only if user has required permissions
 *
 * @example
 * <ProtectedSection permissions={["create:work-orders"]}>
 *   <Button>Create Work Order</Button>
 * </ProtectedSection>
 */
export function ProtectedSection({
  permissions,
  requireAny = false,
  adminOnly = false,
  children,
  fallback = null,
}: ProtectedSectionProps) {
  const { can, canAny, canAll, isAdmin } = usePermissions();

  // Check admin only
  if (adminOnly && !isAdmin) {
    return <>{fallback}</>;
  }

  // No permissions required
  if (!permissions || permissions.length === 0) {
    return <>{children}</>;
  }

  // Check permissions
  const hasAccess = requireAny
    ? canAny(permissions)
    : canAll(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ==========================================
// PROTECTED BUTTON
// ==========================================

interface ProtectedButtonProps extends ButtonProps {
  /** Required permission(s) to enable this button */
  permissions?: Permission[];
  /** Require ANY of the permissions (default: require ALL) */
  requireAny?: boolean;
  /** Admin only */
  adminOnly?: boolean;
  /** Tooltip message when disabled due to permissions */
  disabledTooltip?: string;
  /** Whether to hide button instead of disabling it */
  hideWhenUnauthorized?: boolean;
  /** Loading state - shows spinner and disables button */
  loading?: boolean;
}

/**
 * Protected Button Component
 * Disables button if user doesn't have required permissions
 *
 * @example
 * <ProtectedButton
 *   permissions={["delete:work-orders"]}
 *   disabledTooltip="You don't have permission to delete work orders"
 *   loading={isDeleting}
 * >
 *   Delete
 * </ProtectedButton>
 */
export function ProtectedButton({
  permissions,
  requireAny = false,
  adminOnly = false,
  disabledTooltip = "You don't have permission to perform this action",
  hideWhenUnauthorized = false,
  loading = false,
  disabled,
  children,
  ...buttonProps
}: ProtectedButtonProps) {
  const { canAny, canAll, isAdmin } = usePermissions();

  // Combine loading state with disabled state
  const isDisabled = disabled || loading;

  // Render button content with loading spinner
  const buttonContent = loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {children}
    </>
  ) : (
    children
  );

  // Check admin only
  if (adminOnly && !isAdmin) {
    if (hideWhenUnauthorized) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled {...buttonProps}>
                {buttonContent}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // No permissions required
  if (!permissions || permissions.length === 0) {
    return (
      <Button disabled={isDisabled} {...buttonProps}>
        {buttonContent}
      </Button>
    );
  }

  // Check permissions
  const hasAccess = requireAny
    ? canAny(permissions)
    : canAll(permissions);

  if (!hasAccess) {
    if (hideWhenUnauthorized) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled {...buttonProps}>
                {buttonContent}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button disabled={isDisabled} {...buttonProps}>
      {buttonContent}
    </Button>
  );
}

// ==========================================
// PROTECTED LINK
// ==========================================

interface ProtectedLinkProps {
  /** Required permission(s) to show this link */
  permissions?: Permission[];
  /** Require ANY of the permissions (default: require ALL) */
  requireAny?: boolean;
  /** Admin only */
  adminOnly?: boolean;
  /** Children to render if user has permission */
  children: React.ReactNode;
  /** Class name */
  className?: string;
  /** href */
  href: string;
}

/**
 * Protected Link Component
 * Shows link only if user has required permissions
 *
 * @example
 * <ProtectedLink
 *   permissions={["read:audit-logs"]}
 *   href="/audit-logs"
 * >
 *   Audit Logs
 * </ProtectedLink>
 */
export function ProtectedLink({
  permissions,
  requireAny = false,
  adminOnly = false,
  children,
  className,
  href,
}: ProtectedLinkProps) {
  const { canAny, canAll, isAdmin } = usePermissions();

  // Check admin only
  if (adminOnly && !isAdmin) {
    return null;
  }

  // No permissions required
  if (!permissions || permissions.length === 0) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  // Check permissions
  const hasAccess = requireAny
    ? canAny(permissions)
    : canAll(permissions);

  if (!hasAccess) {
    return null;
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
