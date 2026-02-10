import { apiClient } from "@/lib/api-client";

export interface Forecast {
    id: string;
    siteId: string;
    forecastTimestamp: string;
    predictedGenerationMw: number;
    actualGenerationMw?: number | null;
    modelName: string;
    algorithm: string;
}

export interface ForecastGenerationResponse {
    message: string;
    forecastCount: number;
    forecasts: {
        id: string;
        forecastTimestamp: string;
        predictedGenerationMw: number;
        confidenceIntervalLowerMw?: number;
        confidenceIntervalUpperMw?: number;
    }[];
}

export const forecastService = {
    async getForecasts(siteId: string, filters?: { assetId?: string; startDate?: Date; endDate?: Date; activeOnly?: boolean }): Promise<Forecast[]> {
        const params: any = {};
        if (filters?.assetId) params.assetId = filters.assetId;
        if (filters?.startDate) params.startDate = filters.startDate.toISOString();
        if (filters?.endDate) params.endDate = filters.endDate.toISOString();
        if (filters?.activeOnly !== undefined) params.activeOnly = filters.activeOnly;

        const response = await apiClient.get(`/forecasts/generation/${siteId}`, { params });
        return response.data;
    },

    async generateForecast(data: { siteId: string; assetId?: string; forecastHorizonHours: number; modelType?: string; energyType?: string }): Promise<ForecastGenerationResponse> {
        const response = await apiClient.post('/forecasts/generation/generate', data);
        return response.data;
    },
};

