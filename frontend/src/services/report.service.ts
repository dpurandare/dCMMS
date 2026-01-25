import { apiClient } from '@/lib/api-client';
import { ReportDefinition, CreateReportDTO, UpdateReportDTO, ReportExecutionResult } from '@/types/report';

class ReportService {
    async list(): Promise<ReportDefinition[]> {
        const response = await apiClient.get('/reports');
        return response.data;
    }

    async getById(id: string): Promise<ReportDefinition> {
        const response = await apiClient.get(`/reports/${id}`);
        return response.data;
    }

    async create(data: CreateReportDTO): Promise<ReportDefinition> {
        const response = await apiClient.post('/reports', data);
        return response.data;
    }

    async update(id: string, data: UpdateReportDTO): Promise<ReportDefinition> {
        const response = await apiClient.put(`/reports/${id}`, data);
        return response.data;
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/reports/${id}`);
    }

    async execute(id: string, options: { format?: 'json' | 'csv'; limit?: number } = {}): Promise<ReportExecutionResult | Blob> {
        const response = await apiClient.post(`/reports/${id}/execute`, options, {
            responseType: options.format === 'csv' ? 'blob' : 'json',
        });
        return response.data;
    }

    async getAvailableFields(datasource: string): Promise<{ name: string; type: string }[]> {
        const response = await apiClient.get(`/reports/fields/${datasource}`);
        return response.data;
    }
}

export const reportService = new ReportService();

