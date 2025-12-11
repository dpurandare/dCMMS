import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
};

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

        const response = await axios.get(`${API_URL}/forecasts/generation/${siteId}`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    },

    async generateForecast(data: { siteId: string; assetId?: string; forecastHorizonHours: number; modelType?: string; energyType?: string }): Promise<ForecastGenerationResponse> {
        const response = await axios.post(`${API_URL}/forecasts/generation/generate`, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },
};
