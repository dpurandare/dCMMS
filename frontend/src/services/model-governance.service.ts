import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
};

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

        const response = await axios.get(`${API_URL}/model-governance/models`, {
            headers: getAuthHeader(),
            params,
        });
        return response.data;
    },

    async registerModel(data: ModelRegistration): Promise<{ message: string; registration: Model }> {
        const response = await axios.post(`${API_URL}/model-governance/register`, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async updateStage(modelId: string, newStage: ModelStage, updatedBy: string): Promise<{ message: string; model: Model }> {
        const response = await axios.put(`${API_URL}/model-governance/${modelId}/stage`, { newStage, updatedBy }, {
            headers: getAuthHeader(),
        });
        return response.data;
    },
};
