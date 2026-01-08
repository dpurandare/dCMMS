import axios from "axios";
import { NotificationPreference, UpdatePreferencesDTO } from "../types/notification";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("accessToken");
    return { Authorization: `Bearer ${token}` };
};

export const notificationService = {
    async getPreferences(userId: string): Promise<{ userId: string, preferences: NotificationPreference[] }> {
        const response = await axios.get(`${API_URL}/users/${userId}/notification-preferences`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async updatePreferences(userId: string, preferences: NotificationPreference[]): Promise<void> {
        const data: UpdatePreferencesDTO = { preferences };
        await axios.put(`${API_URL}/users/${userId}/notification-preferences`, data, {
            headers: getAuthHeader(),
        });
    }
};
