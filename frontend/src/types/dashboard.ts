export interface DashboardWidget {
    id: string;
    type: "kpi" | "chart" | "table";
    title: string;
    config: any;
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    data?: any;
    error?: string;
}

export interface Dashboard {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    layout: string;
    refreshInterval: number;
    widgets: DashboardWidget[];
    isPublic: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDashboardDTO {
    name: string;
    description?: string;
    layout?: string;
    refreshInterval?: number;
    widgets?: DashboardWidget[];
    isPublic?: boolean;
    isDefault?: boolean;
}

export interface UpdateDashboardDTO extends Partial<CreateDashboardDTO> { }
