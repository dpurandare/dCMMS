export interface UserProfile {
    id: string;
    tenantId: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    role: string;
    phone?: string;
    lastLoginAt?: string;
    createdAt: string;
}

export interface UpdateProfileDTO {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    phone?: string;
}
