import { FastifyInstance } from "fastify";
import { createClient } from "@clickhouse/client";

export type ReportDataSource =
  | "work_orders"
  | "assets"
  | "telemetry"
  | "alarms";
export type AggregationType = "count" | "sum" | "avg" | "min" | "max";
export type GroupByType =
  | "day"
  | "week"
  | "month"
  | "site"
  | "asset_type"
  | "status"
  | "type"
  | "severity"
  | "priority";

export interface ReportFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "like";
  value: string | number | boolean | string[] | number[];
}

export interface ReportAggregation {
  field: string;
  type: AggregationType;
  alias?: string;
}

export interface ReportDefinition {
  id?: string;
  name: string;
  description?: string;
  datasource: ReportDataSource;
  columns: string[];
  filters: ReportFilter[];
  groupBy?: GroupByType[];
  aggregations?: ReportAggregation[];
  orderBy?: Array<{ field: string; direction: "asc" | "desc" }>;
  limit?: number;
}

export interface ReportExecutionOptions {
  format?: "json" | "csv" | "pdf";
  limit?: number;
}

/**
 * Report Builder Service
 * Builds and executes custom reports from ClickHouse
 */
export class ReportBuilderService {
  private fastify: FastifyInstance;
  private clickhouse: ReturnType<typeof createClient>;

  // Field mappings for each datasource
  private readonly DATASOURCE_TABLES: Record<ReportDataSource, string> = {
    work_orders: "wo_metrics",
    assets: "asset_metrics",
    telemetry: "telemetry_aggregates",
    alarms: "alarm_metrics",
  };

  private readonly DATASOURCE_FIELDS: Record<ReportDataSource, string[]> = {
    work_orders: [
      "wo_id",
      "tenant_id",
      "site_id",
      "asset_id",
      "type",
      "priority",
      "status",
      "created_at",
      "scheduled_start",
      "completed_at",
      "duration_hours",
      "mttr_hours",
      "cost",
    ],
    assets: [
      "asset_id",
      "tenant_id",
      "site_id",
      "asset_name",
      "asset_type",
      "status",
      "health_score",
      "uptime_hours",
      "downtime_hours",
      "availability_percent",
      "mtbf_hours",
      "recorded_at",
    ],
    telemetry: [
      "asset_id",
      "tenant_id",
      "site_id",
      "metric_name",
      "time_bucket",
      "avg_value",
      "min_value",
      "max_value",
      "count",
      "anomaly_count",
    ],
    alarms: [
      "alarm_id",
      "tenant_id",
      "site_id",
      "asset_id",
      "severity",
      "status",
      "alarm_type",
      "created_at",
      "acknowledged_at",
      "resolved_at",
      "time_to_acknowledge_seconds",
      "time_to_resolve_seconds",
    ],
  };

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // Initialize ClickHouse client
    this.clickhouse = createClient({
      host: process.env.CLICKHOUSE_HOST || "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER || "clickhouse_user",
      password: process.env.CLICKHOUSE_PASSWORD || "clickhouse_password_dev",
      database: process.env.CLICKHOUSE_DATABASE || "dcmms_analytics",
    });
  }

  /**
   * Execute a report definition
   */
  async executeReport(
    definition: ReportDefinition,
    tenantId: string,
    _options: ReportExecutionOptions = {},
  ): Promise<Record<string, unknown>[]> {
    this.fastify.log.info({ definition, tenantId }, "Executing report");

    try {
      // Validate datasource and columns
      this.validateReportDefinition(definition);

      // Build SQL query
      const query = this.buildQuery(definition, tenantId);

      this.fastify.log.debug({ query }, "Generated ClickHouse query");

      // Execute query
      const result = await this.clickhouse.query({
        query,
        format: "JSONEachRow",
      });

      const data = (await result.json()) as Record<string, unknown>[];

      this.fastify.log.info(
        { rows: data.length, datasource: definition.datasource },
        "Report executed successfully",
      );

      return data;
    } catch (error) {
      this.fastify.log.error({ error, definition }, "Failed to execute report");
      throw error;
    }
  }

  /**
   * Build SQL query from report definition
   */
  private buildQuery(definition: ReportDefinition, tenantId: string): string {
    const {
      datasource,
      columns,
      filters,
      groupBy,
      aggregations,
      orderBy,
      limit,
    } = definition;

    const table = this.DATASOURCE_TABLES[datasource];

    // Build SELECT clause
    let selectClause: string;

    if (aggregations && aggregations.length > 0) {
      // Aggregation query
      const aggFields = aggregations.map((agg) => {
        const alias = agg.alias || `${agg.type}_${agg.field}`;
        return `${agg.type}(${agg.field}) AS ${alias}`;
      });

      const groupFields =
        groupBy?.map((gb) => this.mapGroupByField(gb, datasource)) || [];

      selectClause = [...groupFields, ...aggFields].join(", ");
    } else {
      // Simple select query
      selectClause = columns.join(", ");
    }

    // Build WHERE clause
    const whereClauses = [`tenant_id = '${tenantId}'`];

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        whereClauses.push(this.buildFilterClause(filter));
      }
    }

    const whereClause = whereClauses.join(" AND ");

    // Build GROUP BY clause
    let groupByClause = "";
    if (groupBy && groupBy.length > 0) {
      const groupFields = groupBy.map((gb) =>
        this.mapGroupByField(gb, datasource),
      );
      groupByClause = `GROUP BY ${groupFields.join(", ")}`;
    }

    // Build ORDER BY clause
    let orderByClause = "";
    if (orderBy && orderBy.length > 0) {
      const orderFields = orderBy.map(
        (ob) => `${ob.field} ${ob.direction.toUpperCase()}`,
      );
      orderByClause = `ORDER BY ${orderFields.join(", ")}`;
    }

    // Build LIMIT clause
    const limitClause = limit
      ? `LIMIT ${Math.min(limit, 10000)}`
      : "LIMIT 1000";

    // Combine all clauses
    const query = `
      SELECT ${selectClause}
      FROM ${table}
      WHERE ${whereClause}
      ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `.trim();

    return query;
  }

  /**
   * Build filter clause from filter definition
   */
  private buildFilterClause(filter: ReportFilter): string {
    const { field, operator, value } = filter;

    switch (operator) {
      case "eq":
        return `${field} = '${value}'`;
      case "ne":
        return `${field} != '${value}'`;
      case "gt":
        return `${field} > ${value}`;
      case "gte":
        return `${field} >= ${value}`;
      case "lt":
        return `${field} < ${value}`;
      case "lte":
        return `${field} <= ${value}`;
      case "in":
        const values = Array.isArray(value) ? value : [value];
        const quotedValues = values.map((v) => `'${v}'`).join(", ");
        return `${field} IN (${quotedValues})`;
      case "like":
        return `${field} LIKE '%${value}%'`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Map groupBy type to SQL expression
   */
  private mapGroupByField(
    groupBy: GroupByType,
    datasource: ReportDataSource,
  ): string {
    switch (groupBy) {
      case "day":
        const dateField = this.getDateField(datasource);
        return `toDate(${dateField}) AS day`;
      case "week":
        const weekDateField = this.getDateField(datasource);
        return `toStartOfWeek(${weekDateField}) AS week`;
      case "month":
        const monthDateField = this.getDateField(datasource);
        return `toStartOfMonth(${monthDateField}) AS month`;
      case "site":
        return "site_id";
      case "asset_type":
        return datasource === "assets" ? "asset_type" : "site_id";
      case "status":
        return "status";
      case "type":
        return "type";
      case "severity":
        return datasource === "alarms" ? "severity" : "status";
      case "priority":
        return datasource === "work_orders" ? "priority" : "status";
      default:
        throw new Error(`Unsupported groupBy: ${groupBy}`);
    }
  }

  /**
   * Get primary date field for datasource
   */
  private getDateField(datasource: ReportDataSource): string {
    const dateFields: Record<ReportDataSource, string> = {
      work_orders: "created_at",
      assets: "recorded_at",
      telemetry: "time_bucket",
      alarms: "created_at",
    };

    return dateFields[datasource];
  }

  /**
   * Validate report definition
   */
  private validateReportDefinition(definition: ReportDefinition): void {
    const { datasource, columns } = definition;

    // Check if datasource is valid
    if (!this.DATASOURCE_TABLES[datasource]) {
      throw new Error(`Invalid datasource: ${datasource}`);
    }

    // Check if all columns are valid for the datasource
    const validFields = this.DATASOURCE_FIELDS[datasource];

    for (const column of columns) {
      if (!validFields.includes(column)) {
        throw new Error(
          `Invalid column '${column}' for datasource '${datasource}'`,
        );
      }
    }
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(data: Record<string, unknown>[]): Promise<string> {
    if (data.length === 0) {
      return "";
    }

    // Get column names from first row
    const columns = Object.keys(data[0]);

    // Build CSV header
    const header = columns.join(",");

    // Build CSV rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          const value = row[col];

          // Escape values that contain commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(",");
    });

    return [header, ...rows].join("\n");
  }

  /**
   * Export report to JSON
   */
  async exportToJSON(data: Record<string, unknown>[]): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get available fields for datasource
   */
  getAvailableFields(datasource: ReportDataSource): string[] {
    return this.DATASOURCE_FIELDS[datasource] || [];
  }

  /**
   * Close ClickHouse connection
   */
  async close(): Promise<void> {
    await this.clickhouse.close();
    this.fastify.log.info("Report builder ClickHouse connection closed");
  }
}

export function createReportBuilderService(
  fastify: FastifyInstance,
): ReportBuilderService {
  return new ReportBuilderService(fastify);
}
