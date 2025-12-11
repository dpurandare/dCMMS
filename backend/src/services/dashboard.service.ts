import { FastifyInstance } from "fastify";
import { db } from "../db";
import { dashboards } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { KPICalculationService } from "./kpi-calculation.service";
import { ReportBuilderService } from "./report-builder.service";

export interface DashboardWidget {
  id: string;
  type: "kpi" | "chart" | "table";
  title: string;
  config: any; // Specific config based on type
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
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

export interface UpdateDashboardDTO extends Partial<CreateDashboardDTO> {}

export class DashboardService {
  private fastify: FastifyInstance;
  private kpiService: KPICalculationService;
  private reportService: ReportBuilderService;

  constructor(
    fastify: FastifyInstance,
    kpiService: KPICalculationService,
    reportService: ReportBuilderService,
  ) {
    this.fastify = fastify;
    this.kpiService = kpiService;
    this.reportService = reportService;
  }

  async create(tenantId: string, userId: string, data: CreateDashboardDTO) {
    const [dashboard] = await db
      .insert(dashboards)
      .values({
        tenantId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        layout: data.layout,
        refreshInterval: data.refreshInterval,
        widgets: JSON.stringify(data.widgets || []),
        isPublic: data.isPublic,
        isDefault: data.isDefault,
      })
      .returning();
    return dashboard;
  }

  async getById(id: string, tenantId: string) {
    const dashboard = await db.query.dashboards.findFirst({
      where: and(eq(dashboards.id, id), eq(dashboards.tenantId, tenantId)),
    });

    if (dashboard) {
      return {
        ...dashboard,
        widgets: JSON.parse(dashboard.widgets as string) as DashboardWidget[],
      };
    }
    return null;
  }

  async update(id: string, tenantId: string, data: UpdateDashboardDTO) {
    const updateData: any = { ...data };
    if (data.widgets) {
      updateData.widgets = JSON.stringify(data.widgets);
    }
    updateData.updatedAt = new Date();

    const [dashboard] = await db
      .update(dashboards)
      .set(updateData)
      .where(and(eq(dashboards.id, id), eq(dashboards.tenantId, tenantId)))
      .returning();

    if (dashboard) {
      return {
        ...dashboard,
        widgets: JSON.parse(dashboard.widgets as string) as DashboardWidget[],
      };
    }
    return null;
  }

  async delete(id: string, tenantId: string) {
    await db
      .delete(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.tenantId, tenantId)));
  }

  async list(tenantId: string) {
    const results = await db.query.dashboards.findMany({
      where: eq(dashboards.tenantId, tenantId),
      orderBy: (dashboards, { desc }) => [desc(dashboards.createdAt)],
    });

    return results.map((d) => ({
      ...d,
      widgets: JSON.parse(d.widgets as string) as DashboardWidget[],
    }));
  }

  async render(id: string, tenantId: string, filters: any) {
    const dashboard = await this.getById(id, tenantId);
    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    const widgets = dashboard.widgets;
    const renderedWidgets = await Promise.all(
      widgets.map(async (widget) => {
        try {
          let data;
          if (widget.type === "kpi") {
            // Assuming widget.config maps to KPI filters
            // This is a simplification; real implementation would map widget config to KPI service inputs
            data = await this.kpiService.calculateKPIs({
              tenantId,
              ...filters,
            });
            // Extract specific metric if configured
            if (
              widget.config.metric &&
              data[widget.config.metric as keyof typeof data]
            ) {
              data = {
                value: data[widget.config.metric as keyof typeof data],
                label: widget.title,
              };
            }
          } else if (widget.type === "chart" || widget.type === "table") {
            // Assuming widget.config contains report definition
            if (widget.config.reportDefinition) {
              data = await this.reportService.executeReport(
                widget.config.reportDefinition,
                tenantId,
                { limit: 100 },
              );
            }
          }

          return {
            ...widget,
            data,
          };
        } catch (error) {
          this.fastify.log.error(
            { error, widgetId: widget.id },
            "Failed to render widget",
          );
          return {
            ...widget,
            error: "Failed to load data",
          };
        }
      }),
    );

    return {
      ...dashboard,
      widgets: renderedWidgets,
    };
  }
}

export function createDashboardService(
  fastify: FastifyInstance,
  kpiService: KPICalculationService,
  reportService: ReportBuilderService,
): DashboardService {
  return new DashboardService(fastify, kpiService, reportService);
}
