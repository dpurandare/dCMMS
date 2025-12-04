import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
    private getHeaders() {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    async getAlerts(params: GetAlertsParams): Promise<{ alerts: Alert[]; pagination: any }> {
        const response = await axios.get(`${API_URL}/alerts`, {
            params,
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getAlertStats(params: GetAlertStatsParams): Promise<{ stats: AlertStats }> {
        const response = await axios.get(`${API_URL}/alerts/stats`, {
            params,
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async acknowledgeAlert(alertId: string, userId: string, comment?: string): Promise<Alert> {
        const response = await axios.post(
            `${API_URL}/alerts/${alertId}/acknowledge`,
            { userId, comment },
            { headers: this.getHeaders() }
        );
        return response.data.alert;
    }

    async resolveAlert(alertId: string, userId: string, resolution?: string, comment?: string): Promise<Alert> {
        const response = await axios.post(
            `${API_URL}/alerts/${alertId}/resolve`,
            { userId, resolution, comment },
            { headers: this.getHeaders() }
        );
        return response.data.alert;
    }
}

export const alertsService = new AlertsService();
