import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

// Types
export interface ChatContext {
    id: string;
    content: string;
    metadata: Record<string, any>;
    distance: number;
}

export interface ChatResponse {
    answer: string;
    context: ChatContext[];
}

export interface UploadResponse {
    id: string;
    filename: string;
    chunksTotal: number;
    chunksIngested: number;
    status: "success" | "partial_success" | "failed";
}

export interface GenAIDocument {
    filename: string;
    uploadedAt: string;
    chunkCount: number;
}

export const GenAIService = {
    /**
     * Upload a document for ingestion
     */
    async uploadDocument(
        file: File,
        metadata: { assetId?: string; category?: string; type?: string } = {}
    ): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append("file", file);

        if (metadata.assetId) formData.append("assetId", metadata.assetId);
        if (metadata.category) formData.append("category", metadata.category);
        if (metadata.type) formData.append("type", metadata.type);

        const response = await axios.post(`${API_URL}/genai/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            // Check if we have a token in localStorage (naive auth for now, or rely on axios interceptor if exists)
            // headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
        });
        return response.data;
    },

    /**
     * Send a query to the chat endpoint
     */
    async chat(query: string): Promise<ChatResponse> {
        const response = await axios.post(`${API_URL}/genai/chat`, { query });
        return response.data;
    },

    /**
     * Get list of uploaded documents
     */
    async getDocuments(): Promise<GenAIDocument[]> {
        const response = await axios.get(`${API_URL}/genai/documents`);
        return response.data;
    },

    /**
     * Delete a document
     */
    async deleteDocument(filename: string): Promise<{ message: string }> {
        const response = await axios.delete(`${API_URL}/genai/documents/${filename}`);
        return response.data;
    },
};
