import { apiClient } from "@/lib/api-client";
import { NotificationPreference, UpdatePreferencesDTO } from "../types/notification";

export const notificationService = {
    async getPreferences(userId: string): Promise<{ userId: string, preferences: NotificationPreference[] }> {
        const response = await apiClient.get(`/users/${userId}/notification-preferences`);
        return response.data;
    },

    async updatePreferences(userId: string, preferences: NotificationPreference[]): Promise<void> {
        const data: UpdatePreferencesDTO = { preferences };
        await apiClient.put(`/users/${userId}/notification-preferences`, data);
    }
};

