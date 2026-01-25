import { apiClient } from "@/lib/api-client";

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
    id?: string;
    jobId?: string;
    message?: string;
    filename?: string;
    chunksTotal?: number;
    chunksIngested?: number;
    status?: "success" | "partial_success" | "failed" | "queued";
}


export interface GenAIDocument {
    filename: string;
    uploadedAt: string;
    chunkCount: number;
}

export interface JobStatus {
    id: string;
    state: string;
    progress?: number;
    result?: any;
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

        const response = await apiClient.post('/genai/upload', formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    /**
     * Get job status by ID
     */
    async getJobStatus(jobId: string): Promise<JobStatus> {
        const response = await apiClient.get(`/genai/jobs/${jobId}`);
        return response.data;
    },

    /**
     * Send a query to the chat endpoint
     */
    async chat(query: string): Promise<ChatResponse> {
        const response = await apiClient.post('/genai/chat', { query });
        return response.data;
    },

    /**
     * Get list of uploaded documents
     */
    async getDocuments(): Promise<GenAIDocument[]> {
        const response = await apiClient.get('/genai/documents');
        return response.data;
    },

    /**
     * Delete a document
     */
    async deleteDocument(filename: string): Promise<{ message: string }> {
        const response = await apiClient.delete(`/genai/documents/${filename}`);
        return response.data;
    },

    /**
     * Submit feedback for a chat response
     */
    async submitFeedback(
        query: string,
        answer: string,
        rating: "positive" | "negative",
        contextIds: string[],
        comment?: string
    ): Promise<{ id: string; message: string }> {
        const response = await apiClient.post('/genai/feedback', {
            query,
            answer,
            rating,
            contextIds,
            comment,
        });
        return response.data;
    },
};

