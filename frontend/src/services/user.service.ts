import axios from "axios";
import { UserProfile, UpdateProfileDTO } from "../types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const getAuthHeader = () => {
    const token = localStorage.getItem("accessToken");
    return { Authorization: `Bearer ${token}` };
};

export const userService = {
    async getProfile(): Promise<UserProfile> {
        const response = await axios.get(`${API_URL}/users/me`, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async updateProfile(userId: string, data: UpdateProfileDTO): Promise<UserProfile> {
        const response = await axios.put(`${API_URL}/users/${userId}`, data, {
            headers: getAuthHeader(),
        });
        return response.data;
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        await axios.put(`${API_URL}/users/${userId}/password`, {
            currentPassword,
            newPassword
        }, {
            headers: getAuthHeader(),
        });
    }
};
