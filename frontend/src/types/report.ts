export interface ReportDefinition {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    datasource: 'work_orders' | 'assets' | 'telemetry' | 'alarms';
    config: any;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReportDTO {
    name: string;
    description?: string;
    datasource: string;
    config: any;
    isPublic?: boolean;
}

export interface UpdateReportDTO {
    name?: string;
    description?: string;
    config?: any;
    isPublic?: boolean;
}

export interface ReportExecutionResult {
    reportId: string;
    name: string;
    rows: number;
    data: any[];
    executedAt: string;
}
