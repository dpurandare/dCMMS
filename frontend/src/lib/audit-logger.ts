/**
 * Audit Logger
 * Tracks sensitive operations for compliance and security monitoring
 */

interface AuditLog {
    action: string;
    resource: string;
    resourceId?: string;
    userId: string;
    username?: string;
    timestamp: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
}

export class AuditLogger {
    private static logs: AuditLog[] = [];
    private static maxLogs = 1000; // Keep last 1000 logs in memory

    /**
     * Log a security-sensitive action
     */
    static log(
        action: string,
        resource: string,
        resourceId?: string,
        metadata?: Record<string, any>
    ): void {
        const log: AuditLog = {
            action,
            resource,
            resourceId,
            userId: this.getCurrentUserId(),
            username: this.getCurrentUsername(),
            timestamp: new Date().toISOString(),
            metadata,
        };

        // Add to in-memory logs
        this.logs.push(log);

        // Maintain max size
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Send to backend (optional - can be implemented later)
        this.sendToBackend(log);

        // Console log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[AUDIT]', {
                ...log,
                timestamp: new Date(log.timestamp).toLocaleString(),
            });
        }
    }

    /**
     * Get current user ID from localStorage
     */
    private static getCurrentUserId(): string {
        if (typeof window === 'undefined') return 'server';

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || 'unknown';
            }
        } catch (error) {
            console.error('Failed to get user ID:', error);
        }
        return 'anonymous';
    }

    /**
     * Get current username from localStorage
     */
    private static getCurrentUsername(): string | undefined {
        if (typeof window === 'undefined') return undefined;

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.username || user.email;
            }
        } catch (error) {
            console.error('Failed to get username:', error);
        }
        return undefined;
    }

    /**
     * Send audit log to backend
     */
    private static async sendToBackend(log: AuditLog): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Dynamic import to avoid circular dependencies
            const { apiClient } = await import('@/lib/api-client');

            await apiClient.post('/audit-logs/frontend', {
                action: log.action,
                resource: log.resource,
                resourceId: log.resourceId,
                metadata: log.metadata,
            });
        } catch (error) {
            // Silently fail - don't break app if audit logging fails
            console.error('Failed to send audit log to backend:', error);
        }
    }

    /**
     * Get all logs (for debugging/testing)
     */
    static getLogs(): AuditLog[] {
        return [...this.logs];
    }

    /**
     * Clear all logs (for testing)
     */
    static clearLogs(): void {
        this.logs = [];
    }

    /**
     * Get logs filtered by criteria
     */
    static getFilteredLogs(filter: {
        userId?: string;
        resource?: string;
        action?: string;
        since?: Date;
    }): AuditLog[] {
        return this.logs.filter((log) => {
            if (filter.userId && log.userId !== filter.userId) return false;
            if (filter.resource && log.resource !== filter.resource) return false;
            if (filter.action && log.action !== filter.action) return false;
            if (filter.since && new Date(log.timestamp) < filter.since) return false;
            return true;
        });
    }
}

/**
 * Audit action types
 */
export const AuditActions = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    EXPORT: 'EXPORT',
    IMPORT: 'IMPORT',
    GRANT_PERMISSION: 'GRANT_PERMISSION',
    REVOKE_PERMISSION: 'REVOKE_PERMISSION',
} as const;

/**
 * Audit resource types
 */
export const AuditResources = {
    USER: 'user',
    WORK_ORDER: 'work_order',
    ASSET: 'asset',
    ALERT: 'alert',
    REPORT: 'report',
    COMPLIANCE_REPORT: 'compliance_report',
    SETTING: 'setting',
} as const;
