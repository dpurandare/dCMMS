import axios from 'axios';
import { ReportDefinition, CreateReportDTO, UpdateReportDTO, ReportExecutionResult } from '@/types/report';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ReportService {
    async list(): Promise<ReportDefinition[]> {
        const response = await axios.get(`${API_URL}/reports`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async getById(id: string): Promise<ReportDefinition> {
        const response = await axios.get(`${API_URL}/reports/${id}`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async create(data: CreateReportDTO): Promise<ReportDefinition> {
        const response = await axios.post(`${API_URL}/reports`, data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async update(id: string, data: UpdateReportDTO): Promise<ReportDefinition> {
        const response = await axios.put(`${API_URL}/reports/${id}`, data, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    async delete(id: string): Promise<void> {
        await axios.delete(`${API_URL}/reports/${id}`, {
            headers: this.getHeaders(),
        });
    }

    async execute(id: string, options: { format?: 'json' | 'csv'; limit?: number } = {}): Promise<ReportExecutionResult | Blob> {
        const response = await axios.post(`${API_URL}/reports/${id}/execute`, options, {
            headers: this.getHeaders(),
            responseType: options.format === 'csv' ? 'blob' : 'json',
        });
        return response.data;
    }

    async getAvailableFields(datasource: string): Promise<{ name: string; type: string }[]> {
        const response = await axios.get(`${API_URL}/reports/fields/${datasource}`, {
            headers: this.getHeaders(),
        });
        return response.data;
    }

    private getHeaders() {
        const token = localStorage.getItem('accessToken');
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
}

export const reportService = new ReportService();
