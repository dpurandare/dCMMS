import { apiClient } from "@/lib/api-client";

export interface Prediction {
    assetId: string;
    timestamp: string;
    prediction: number;
    confidence: number;
    features: Record<string, number>;
    anomalies: {
        isAnomaly: boolean;
        severity: "low" | "medium" | "high" | "critical";
        score: number;
        description: string;
    }[];
}

export const mlInferenceService = {
    async getPredictions(filters?: { assetId?: string; startDate?: Date; endDate?: Date }): Promise<Prediction[]> {
        const response = await apiClient.get('/ml-inference/predict/all');
        return response.data;
    },

    async getPredictionLogs(filters?: { assetId?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
        const params: any = {};
        if (filters?.assetId) params.assetId = filters.assetId;
        if (filters?.startDate) params.startDate = filters.startDate.toISOString();
        if (filters?.endDate) params.endDate = filters.endDate.toISOString();

        const response = await apiClient.get('/ml-inference/predictions/logs', { params });
        return response.data;
    }
};

