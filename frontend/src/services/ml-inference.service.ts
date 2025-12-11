import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
};

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
        // Since the backend endpoint for 'predict/all' might not support date filters directly in the viewed code,
        // we'll assume it returns latest predictions or we might need to adjust based on actual API.
        // The plan said: /api/v1/ml-inference/predict/all

        const response = await axios.get(`${API_URL}/ml-inference/predict/all`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async getPredictionLogs(filters?: { assetId?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
        const params: any = {};
        if (filters?.assetId) params.assetId = filters.assetId;
        if (filters?.startDate) params.startDate = filters.startDate.toISOString();
        if (filters?.endDate) params.endDate = filters.endDate.toISOString();

        const response = await axios.get(`${API_URL}/ml-inference/predictions/logs`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    }
};
