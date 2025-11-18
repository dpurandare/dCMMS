import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { complianceReportTemplates, workOrders, assets, alerts } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createClient } from '@clickhouse/client';

export interface ComplianceField {
  name: string;
  label: string;
  type: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

export interface ComplianceTemplate {
  id: string;
  templateId: string;
  name: string;
  description?: string;
  reportType: string;
  complianceStandard: string;
  version: string;
  requiredFields: ComplianceField[];
  optionalFields: ComplianceField[];
  autoPopulateMappings?: Record<string, any>;
  validationRules?: Record<string, any>;
  format: string;
  frequency?: string;
}

export interface AutoPopulateData {
  [key: string]: any;
}

/**
 * Compliance Template Service
 * Manages compliance report templates and data auto-population
 */
export class ComplianceTemplateService {
  private fastify: FastifyInstance;
  private clickhouse: ReturnType<typeof createClient>;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // Initialize ClickHouse client
    this.clickhouse = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'clickhouse_user',
      password: process.env.CLICKHOUSE_PASSWORD || 'clickhouse_password_dev',
      database: process.env.CLICKHOUSE_DATABASE || 'dcmms_analytics',
    });
  }

  /**
   * Get all templates (optionally filtered by type)
   */
  async getTemplates(reportType?: string): Promise<ComplianceTemplate[]> {
    try {
      const templates = await db.query.complianceReportTemplates.findMany({
        where: reportType
          ? and(
              eq(complianceReportTemplates.reportType, reportType),
              eq(complianceReportTemplates.isActive, true)
            )
          : eq(complianceReportTemplates.isActive, true),
        orderBy: (complianceReportTemplates, { asc }) => [asc(complianceReportTemplates.name)],
      });

      return templates.map((t) => this.mapTemplate(t));
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to get compliance templates');
      throw error;
    }
  }

  /**
   * Get single template by ID
   */
  async getTemplate(templateId: string): Promise<ComplianceTemplate | null> {
    try {
      const template = await db.query.complianceReportTemplates.findFirst({
        where: eq(complianceReportTemplates.templateId, templateId),
      });

      if (!template) {
        return null;
      }

      return this.mapTemplate(template);
    } catch (error) {
      this.fastify.log.error({ error, templateId }, 'Failed to get compliance template');
      throw error;
    }
  }

  /**
   * Auto-populate template data from dCMMS sources
   */
  async autoPopulateData(
    templateId: string,
    tenantId: string,
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AutoPopulateData> {
    this.fastify.log.info({ templateId, tenantId, siteId }, 'Auto-populating template data');

    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      if (!template.autoPopulateMappings) {
        return {};
      }

      const mappings = template.autoPopulateMappings;
      const populatedData: AutoPopulateData = {};

      // Iterate through each field mapping
      for (const [fieldName, mapping] of Object.entries(mappings)) {
        try {
          const data = await this.fetchFieldData(
            mapping,
            tenantId,
            siteId,
            startDate,
            endDate
          );
          populatedData[fieldName] = data;
        } catch (error) {
          this.fastify.log.warn(
            { error, fieldName, mapping },
            'Failed to auto-populate field'
          );
          // Continue with other fields even if one fails
          populatedData[fieldName] = [];
        }
      }

      this.fastify.log.info(
        { templateId, fieldsPopulated: Object.keys(populatedData).length },
        'Template data auto-populated'
      );

      return populatedData;
    } catch (error) {
      this.fastify.log.error({ error, templateId }, 'Failed to auto-populate template data');
      throw error;
    }
  }

  /**
   * Fetch field data from various sources
   */
  private async fetchFieldData(
    mapping: any,
    tenantId: string,
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const { source, filters, fields, aggregation, group_by } = mapping;

    switch (source) {
      case 'assets':
        return this.fetchAssetData(tenantId, siteId, filters, fields);

      case 'work_orders':
        return this.fetchWorkOrderData(tenantId, siteId, filters, fields, startDate, endDate);

      case 'alerts':
        return this.fetchAlertData(tenantId, siteId, filters, fields, startDate, endDate);

      case 'audit_logs':
        return this.fetchAuditLogData(tenantId, filters, fields, startDate, endDate);

      case 'telemetry_aggregates':
        return this.fetchTelemetryData(
          tenantId,
          siteId,
          filters,
          fields,
          aggregation,
          group_by,
          startDate,
          endDate
        );

      default:
        this.fastify.log.warn({ source }, 'Unknown data source');
        return [];
    }
  }

  /**
   * Fetch asset data
   */
  private async fetchAssetData(
    tenantId: string,
    siteId?: string,
    filters?: any,
    fields?: string[]
  ): Promise<any[]> {
    const whereConditions = [eq(assets.tenantId, tenantId)];

    if (siteId) {
      whereConditions.push(eq(assets.siteId, siteId));
    }

    if (filters?.status) {
      // Filter by status if provided
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      // Note: For simplicity, we'll fetch all and filter in memory
    }

    const assetData = await db.query.assets.findMany({
      where: and(...whereConditions),
    });

    // Project only requested fields
    if (fields && fields.length > 0) {
      return assetData.map((asset: any) => {
        const projected: any = {};
        fields.forEach((field) => {
          projected[field] = asset[field];
        });
        return projected;
      });
    }

    return assetData;
  }

  /**
   * Fetch work order data
   */
  private async fetchWorkOrderData(
    tenantId: string,
    siteId?: string,
    filters?: any,
    fields?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const whereConditions = [eq(workOrders.tenantId, tenantId)];

    if (siteId) {
      whereConditions.push(eq(workOrders.siteId, siteId));
    }

    if (startDate) {
      whereConditions.push(gte(workOrders.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(workOrders.createdAt, endDate));
    }

    const woData = await db.query.workOrders.findMany({
      where: and(...whereConditions),
    });

    // Filter by type and status if provided
    let filteredData = woData;

    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      filteredData = filteredData.filter((wo: any) => types.includes(wo.type));
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filteredData = filteredData.filter((wo: any) => statuses.includes(wo.status));
    }

    // Project only requested fields
    if (fields && fields.length > 0) {
      return filteredData.map((wo: any) => {
        const projected: any = {};
        fields.forEach((field) => {
          projected[field] = wo[field];
        });
        return projected;
      });
    }

    return filteredData;
  }

  /**
   * Fetch alert data
   */
  private async fetchAlertData(
    tenantId: string,
    siteId?: string,
    filters?: any,
    fields?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const whereConditions = [eq(alerts.tenantId, tenantId)];

    if (siteId) {
      whereConditions.push(eq(alerts.siteId, siteId));
    }

    if (startDate) {
      whereConditions.push(gte(alerts.createdAt, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(alerts.createdAt, endDate));
    }

    const alertData = await db.query.alerts.findMany({
      where: and(...whereConditions),
    });

    // Filter by severity and status if provided
    let filteredData = alertData;

    if (filters?.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      filteredData = filteredData.filter((alert: any) => severities.includes(alert.severity));
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      filteredData = filteredData.filter((alert: any) => statuses.includes(alert.status));
    }

    // Project only requested fields
    if (fields && fields.length > 0) {
      return filteredData.map((alert: any) => {
        const projected: any = {};
        fields.forEach((field) => {
          projected[field] = alert[field];
        });
        return projected;
      });
    }

    return filteredData;
  }

  /**
   * Fetch audit log data
   */
  private async fetchAuditLogData(
    tenantId: string,
    filters?: any,
    fields?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    // TODO: Implement audit log querying
    // For now, return empty array
    this.fastify.log.warn('Audit log fetching not yet implemented');
    return [];
  }

  /**
   * Fetch telemetry data from ClickHouse
   */
  private async fetchTelemetryData(
    tenantId: string,
    siteId?: string,
    filters?: any,
    fields?: string[],
    aggregation?: string,
    groupBy?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      const whereClauses = [`tenant_id = '${tenantId}'`];

      if (siteId) {
        whereClauses.push(`site_id = '${siteId}'`);
      }

      if (filters?.metric_name) {
        whereClauses.push(`metric_name = '${filters.metric_name}'`);
      }

      if (startDate) {
        whereClauses.push(`time_bucket >= '${startDate.toISOString()}'`);
      }

      if (endDate) {
        whereClauses.push(`time_bucket <= '${endDate.toISOString()}'`);
      }

      const whereClause = whereClauses.join(' AND ');

      // Build query based on aggregation and groupBy
      let query: string;

      if (groupBy === 'month' && aggregation === 'sum') {
        query = `
          SELECT
            toStartOfMonth(time_bucket) AS month,
            sum(sum_value) AS total_generation_mwh
          FROM telemetry_aggregates
          WHERE ${whereClause}
          GROUP BY month
          ORDER BY month
        `;
      } else {
        // Default query
        query = `
          SELECT *
          FROM telemetry_aggregates
          WHERE ${whereClause}
          LIMIT 1000
        `;
      }

      const result = await this.clickhouse.query({
        query,
        format: 'JSONEachRow',
      });

      const data = await result.json();

      return data;
    } catch (error) {
      this.fastify.log.error({ error }, 'Failed to fetch telemetry data');
      return [];
    }
  }

  /**
   * Validate report data against template rules
   */
  validateReportData(template: ComplianceTemplate, reportData: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.validationRules) {
      return { valid: true, errors: [] };
    }

    const rules = template.validationRules;

    // Validate each required field
    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = reportData[fieldName];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${fieldName}' is required`);
        continue;
      }

      // Type-specific validation
      if (value !== undefined && value !== null) {
        if (rule.min_length && typeof value === 'string' && value.length < rule.min_length) {
          errors.push(`Field '${fieldName}' must be at least ${rule.min_length} characters`);
        }

        if (rule.min && typeof value === 'number' && value < rule.min) {
          errors.push(`Field '${fieldName}' must be at least ${rule.min}`);
        }

        if (rule.max && typeof value === 'number' && value > rule.max) {
          errors.push(`Field '${fieldName}' must be at most ${rule.max}`);
        }

        if (rule.min_rows && Array.isArray(value) && value.length < rule.min_rows) {
          errors.push(`Field '${fieldName}' must have at least ${rule.min_rows} rows`);
        }

        if (rule.max_rows && Array.isArray(value) && value.length > rule.max_rows) {
          errors.push(`Field '${fieldName}' must have at most ${rule.max_rows} rows`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Map database template to service template
   */
  private mapTemplate(dbTemplate: any): ComplianceTemplate {
    return {
      id: dbTemplate.id,
      templateId: dbTemplate.templateId,
      name: dbTemplate.name,
      description: dbTemplate.description,
      reportType: dbTemplate.reportType,
      complianceStandard: dbTemplate.complianceStandard,
      version: dbTemplate.version,
      requiredFields: JSON.parse(dbTemplate.requiredFields || '[]'),
      optionalFields: JSON.parse(dbTemplate.optionalFields || '[]'),
      autoPopulateMappings: dbTemplate.autoPopulateMappings
        ? JSON.parse(dbTemplate.autoPopulateMappings)
        : undefined,
      validationRules: dbTemplate.validationRules
        ? JSON.parse(dbTemplate.validationRules)
        : undefined,
      format: dbTemplate.format,
      frequency: dbTemplate.frequency,
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.clickhouse.close();
  }
}

export function createComplianceTemplateService(
  fastify: FastifyInstance
): ComplianceTemplateService {
  return new ComplianceTemplateService(fastify);
}
