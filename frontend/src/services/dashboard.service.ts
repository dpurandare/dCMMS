import { apiClient } from "@/lib/api-client";
import { Dashboard, CreateDashboardDTO, UpdateDashboardDTO } from "../types/dashboard";

export const dashboardService = {
    async list(): Promise<Dashboard[]> {
        const response = await apiClient.get('/dashboards');
        return response.data;
    },

    async getById(id: string): Promise<Dashboard> {
        const response = await apiClient.get(`/dashboards/${id}`);
        return response.data;
    },

    async create(data: CreateDashboardDTO): Promise<Dashboard> {
        const response = await apiClient.post('/dashboards', data);
        return response.data;
    },

    async update(id: string, data: UpdateDashboardDTO): Promise<Dashboard> {
        const response = await apiClient.put(`/dashboards/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/dashboards/${id}`);
    },

    async render(id: string, filters?: { siteId?: string; startDate?: Date; endDate?: Date }): Promise<Dashboard> {
        const params: any = {};
        if (filters?.siteId) params.siteId = filters.siteId;
        if (filters?.startDate) params.startDate = filters.startDate.toISOString();
        if (filters?.endDate) params.endDate = filters.endDate.toISOString();

        const response = await apiClient.get(`/dashboards/${id}/render`, { params });
        return response.data;
    },
};

