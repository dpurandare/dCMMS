export interface NotificationPreference {
    userId: string;
    eventType: string;
    channel: string;
    isEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}

export interface UpdatePreferencesDTO {
    preferences: NotificationPreference[];
}
