import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
};

export interface KPIResult {
    mttr: number;
    mtbf: number;
    completionRate: number;
    availability: number;
    pmCompliance: number;
    firstTimeFixRate: number;
    totalWorkOrders: number;
    completedWorkOrders: number;
    overdueWorkOrders: number;
    criticalAlarms: number;
    totalDowntimeHours: number;
    totalMaintenanceCost: number;
    calculatedAt: string;
    period: {
        startDate: string;
        endDate: string;
    };
    summaryTrends?: {
        mttr: { value: number; direction: string };
        mtbf: { value: number; direction: string };
        completionRate: { value: number; direction: string };
        availability: { value: number; direction: string };
    };
}

export interface KPITrend {
    metric: string;
    trends: {
        date: string;
        value: number;
    }[];
}

export const analyticsService = {
    async getKPIs(filters?: { siteId?: string; startDate?: Date; endDate?: Date }): Promise<KPIResult> {
        const params: any = {};
        if (filters?.siteId) params.site_id = filters.siteId;
        if (filters?.startDate) params.start_date = filters.startDate.toISOString();
        if (filters?.endDate) params.end_date = filters.endDate.toISOString();

        const response = await axios.get(`${API_URL}/analytics/kpis`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    },

    async getTrends(metric: string, days: number = 7, siteId?: string): Promise<KPITrend> {
        const params: any = { metric, days };
        if (siteId) params.site_id = siteId;

        const response = await axios.get(`${API_URL}/analytics/kpis/trends`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    },
};
