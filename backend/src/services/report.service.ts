import { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { reports } from "../db/schema";
import { ReportBuilderService } from "./report-builder.service";

export interface CreateReportDTO {
  name: string;
  description?: string;
  datasource: string;
  config: any; // ReportDefinition
  isPublic?: boolean;
}

export interface UpdateReportDTO {
  name?: string;
  description?: string;
  config?: any;
  isPublic?: boolean;
}

export class ReportService {
  private fastify: FastifyInstance;
  private reportBuilder: ReportBuilderService;

  constructor(fastify: FastifyInstance, reportBuilder: ReportBuilderService) {
    this.fastify = fastify;
    this.reportBuilder = reportBuilder;
  }

  /**
   * List reports for a tenant
   */
  async list(tenantId: string) {
    return db.query.reports.findMany({
      where: eq(reports.tenantId, tenantId),
      orderBy: [desc(reports.updatedAt)],
    });
  }

  /**
   * Get report by ID
   */
  async getById(id: string, tenantId: string) {
    return db.query.reports.findFirst({
      where: and(eq(reports.id, id), eq(reports.tenantId, tenantId)),
    });
  }

  /**
   * Create a new report
   */
  async create(tenantId: string, userId: string, data: CreateReportDTO) {
    const [report] = await db
      .insert(reports)
      .values({
        tenantId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        datasource: data.datasource,
        config: JSON.stringify(data.config),
        isPublic: data.isPublic || false,
      })
      .returning();

    return report;
  }

  /**
   * Update a report
   */
  async update(id: string, tenantId: string, data: UpdateReportDTO) {
    const existing = await this.getById(id, tenantId);
    if (!existing) return null;

    const [updated] = await db
      .update(reports)
      .set({
        ...data,
        config: data.config ? JSON.stringify(data.config) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(reports.id, id), eq(reports.tenantId, tenantId)))
      .returning();

    return updated;
  }

  /**
   * Delete a report
   */
  async delete(id: string, tenantId: string) {
    await db
      .delete(reports)
      .where(and(eq(reports.id, id), eq(reports.tenantId, tenantId)));
  }

  /**
   * Execute a report
   */
  async execute(id: string, tenantId: string, options: any = {}) {
    const report = await this.getById(id, tenantId);
    if (!report) {
      throw new Error("Report not found");
    }

    const definition =
      typeof report.config === "string"
        ? JSON.parse(report.config)
        : report.config;

    // Override definition with runtime options if needed
    // e.g., date ranges passed at execution time

    return this.reportBuilder.executeReport(definition, tenantId, options);
  }
}

export function createReportService(
  fastify: FastifyInstance,
  reportBuilder: ReportBuilderService,
): ReportService {
  return new ReportService(fastify, reportBuilder);
}
