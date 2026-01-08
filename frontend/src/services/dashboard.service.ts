import axios from "axios";
import { Dashboard, CreateDashboardDTO, UpdateDashboardDTO } from "../types/dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("accessToken");
    return { Authorization: `Bearer ${token}` };
};

export const dashboardService = {
    async list(): Promise<Dashboard[]> {
        const response = await axios.get(`${API_URL}/dashboards`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async getById(id: string): Promise<Dashboard> {
        const response = await axios.get(`${API_URL}/dashboards/${id}`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async create(data: CreateDashboardDTO): Promise<Dashboard> {
        const response = await axios.post(`${API_URL}/dashboards`, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async update(id: string, data: UpdateDashboardDTO): Promise<Dashboard> {
        const response = await axios.put(`${API_URL}/dashboards/${id}`, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await axios.delete(`${API_URL}/dashboards/${id}`, {
            headers: getAuthHeader(),
        });
    },

    async render(id: string, filters?: { siteId?: string; startDate?: Date; endDate?: Date }): Promise<Dashboard> {
        const params: any = {};
        if (filters?.siteId) params.siteId = filters.siteId;
        if (filters?.startDate) params.startDate = filters.startDate.toISOString();
        if (filters?.endDate) params.endDate = filters.endDate.toISOString();

        const response = await axios.get(`${API_URL}/dashboards/${id}/render`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    },
};
