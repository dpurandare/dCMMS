import { apiClient } from "@/lib/api-client";

export type ModelStage = "development" | "staging" | "review" | "production" | "retired";

export interface Model {
    id: string;
    modelName: string;
    version: string;
    description: string;
    owner: string;
    stage: ModelStage;
    registeredAt: string;
    lastUpdated: string;
    tags?: string[];
}

export interface ModelRegistration {
    modelName: string;
    version: string;
    description: string;
    owner: string;
}

export const modelGovernanceService = {
    async getModels(stage?: ModelStage): Promise<{ stage?: string; count: number; models: Model[] }> {
        const params: any = {};
        if (stage) params.stage = stage;

        const response = await apiClient.get('/model-governance/models', { params });
        return response.data;
    },

    async registerModel(data: ModelRegistration): Promise<{ message: string; registration: Model }> {
        const response = await apiClient.post('/model-governance/register', data);
        return response.data;
    },

    async updateStage(modelId: string, newStage: ModelStage, updatedBy: string): Promise<{ message: string; model: Model }> {
        const response = await apiClient.put(`/model-governance/${modelId}/stage`, { newStage, updatedBy });
        return response.data;
    },
};

