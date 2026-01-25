import { apiClient } from '@/lib/api-client';

export interface Alert {
    id: string;
    tenantId: string;
    siteId: string;
    assetId?: string;
    alertId: string;
    title: string;
    description?: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
    ruleId?: string;
    triggeredAt: string;
    metadata?: string;
    site?: { name: string; siteId: string };
    asset?: { name: string; assetId: string };
    acknowledgedByUser?: { firstName: string; lastName: string; email: string };
    resolvedByUser?: { firstName: string; lastName: string; email: string };
    acknowledgedAt?: string;
    resolvedAt?: string;
}

export interface AlertStats {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    suppressed: number;
    bySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
    averageResponseTime: number;
    averageResolutionTime: number;
}

export interface GetAlertsParams {
    tenantId: string;
    siteId?: string;
    assetId?: string;
    severity?: string;
    status?: string;
    limit?: number;
    offset?: number;
}

export interface GetAlertStatsParams {
    tenantId: string;
    siteId?: string;
    startDate?: string;
    endDate?: string;
}

class AlertsService {
    async getAlerts(params: GetAlertsParams): Promise<{ alerts: Alert[]; pagination: any }> {
        const response = await apiClient.get('/alerts', { params });
        return response.data;
    }

    async getAlertStats(params: GetAlertStatsParams): Promise<{ stats: AlertStats }> {
        const response = await apiClient.get('/alerts/stats', { params });
        return response.data;
    }

    async acknowledgeAlert(alertId: string, userId: string, comment?: string): Promise<Alert> {
        const response = await apiClient.post(
            `/alerts/${alertId}/acknowledge`,
            { userId, comment }
        );
        return response.data.alert;
    }

    async resolveAlert(alertId: string, userId: string, resolution?: string, comment?: string): Promise<Alert> {
        const response = await apiClient.post(
            `/alerts/${alertId}/resolve`,
            { userId, resolution, comment }
        );
        return response.data.alert;
    }
}

export const alertsService = new AlertsService();

