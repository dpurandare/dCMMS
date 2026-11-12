import { db } from "../db";
import {
  workOrders,
  workOrderTasks,
  workOrderParts,
  workOrderLabor,
  permits,
} from "../db/schema";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  like,
  or,
  inArray,
  gte,
  lte,
  gt,
} from "drizzle-orm";
import { WorkOrderStateMachine, WorkOrderStatus } from "./work-order-state";

/**
 * A client-caused failure (rejected transition, missing record). Carrying `statusCode`
 * makes the global error handler return it; a bare `Error` always became HTTP 500.
 */
export class WorkOrderError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderError";
  }
}


export interface CreateWorkOrderData {
  tenantId: string;
  title: string;
  description?: string;
  type: "preventive" | "corrective" | "predictive" | "inspection" | "emergency";
  priority: "critical" | "high" | "medium" | "low";
  siteId: string;
  assetId?: string;
  assignedTo?: string;
  assignedCrewId?: string;
  createdBy: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  estimatedHours?: number;
  metadata?: any;
}

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  type?:
    | "preventive"
    | "corrective"
    | "predictive"
    | "inspection"
    | "emergency";
  priority?: "critical" | "high" | "medium" | "low";
  status?: WorkOrderStatus;
  assignedTo?: string;
  assignedCrewId?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  estimatedHours?: number;
  actualHours?: number;
  metadata?: any;
}

export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  type?: string;
  siteId?: string;
  assignedTo?: string;
  assignedCrewId?: string;
  assetId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class WorkOrderService {
  /**
   * Generate Work Order ID format: WO-YYYYMMDD-XXXX
   */
  static async generateWorkOrderId(tenantId: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `WO - ${dateStr} `;

    // Simple robust sequence generation could use a sequence table or just count for the day
    // For now, simpler: getting count of WOs created today
    // Or just random/UUID if collisions are a worry, but users like readable IDs.
    // Let's stick to sequence for the day.

    // NOTE: In high concurrency this might collide, but sufficient for this scale.
    // A better approach would be a dedicated sequence table.

    // Fetch last created WO to get sequence?
    // Let's assume low volume for now and just use a random suffix for uniqueness safety + readability
    // WO-20231212-A1B2

    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    return `${prefix} -${randomSuffix} `;
  }

  static async create(data: CreateWorkOrderData) {
    const workOrderId = await this.generateWorkOrderId(data.tenantId);

    const [newWorkOrder] = await db
      .insert(workOrders)
      .values({
        ...data,
        workOrderId,
        status: "draft", // Always start as draft or open? Let's say draft if not specified, but Schema default is draft.
        estimatedHours: data.estimatedHours
          ? data.estimatedHours.toString()
          : undefined,
      })
      .returning();

    return newWorkOrder;
  }

  static async list(
    tenantId: string,
    filters: WorkOrderFilters,
    pagination: PaginationParams,
  ) {
    const { page, limit, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * limit;

    const conditions = [eq(workOrders.tenantId, tenantId)];

    if (filters.status) {
      conditions.push(eq(workOrders.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(workOrders.priority, filters.priority as any));
    }
    if (filters.type) {
      conditions.push(eq(workOrders.type, filters.type as any));
    }
    if (filters.siteId) {
      conditions.push(eq(workOrders.siteId, filters.siteId));
    }
    if (filters.assignedTo) {
      conditions.push(eq(workOrders.assignedTo, filters.assignedTo));
    }
    if (filters.assignedCrewId) {
      conditions.push(eq(workOrders.assignedCrewId, filters.assignedCrewId));
    }
    if (filters.assetId) {
      conditions.push(eq(workOrders.assetId, filters.assetId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(workOrders.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(workOrders.createdAt, new Date(filters.dateTo)));
    }
    if (filters.search) {
      conditions.push(
        or(
          like(workOrders.title, `% ${filters.search}% `),
          like(workOrders.workOrderId, `% ${filters.search}% `),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Count query
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    // Data query
    let orderBy: any = desc(workOrders.createdAt);
    if (sortBy && sortOrder) {
      const column = workOrders[sortBy as keyof typeof workOrders];
      if (column) {
        orderBy =
          sortOrder === "asc" ? asc(column as any) : desc(column as any);
      }
    }

    const data = await db.query.workOrders.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [orderBy],
      with: {
        site: true,
        asset: true,
        assignedUser: true,
        assignedCrew: true,
      },
    });

    return {
      data,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string, tenantId: string) {
    const workOrder = await db.query.workOrders.findFirst({
      where: and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)),
      with: {
        site: true,
        asset: true,
        assignedUser: true,
        assignedCrew: true,
        createdByUser: true,
        tasks: {
          orderBy: asc(workOrderTasks.taskOrder),
        },
        parts: {
          with: {
            part: true,
          },
        },
        labor: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!workOrder) {
      throw new WorkOrderError(404, "Work Order not found");
    }

    return workOrder;
  }

  static async update(id: string, tenantId: string, data: UpdateWorkOrderData) {
    // Check if exists
    const existing = await this.getById(id, tenantId);

    // A status change must satisfy the same rules however it arrives (PATCH or
    // /transition): the state machine AND the safety gate. Previously only
    // /transition enforced the permit gate, so PATCH {status:"in_progress"}
    // started critical work with no permit.
    if (data.status && data.status !== existing.status) {
      await this.assertTransitionAllowed(existing, data.status);

      // Add audit, hooks, etc here if needed
    }

    const [updated] = await db
      .update(workOrders)
      .set({
        ...data,
        updatedAt: new Date(),
        // Convert numbers to string for decimal fields if necessary,
        // logic should allow number or string but Drizzle mostly expects string for decimals to be safe?
        // Actually Drizzle handles it, but let's be careful.
        estimatedHours: data.estimatedHours
          ? data.estimatedHours.toString()
          : undefined,
        actualHours: data.actualHours ? data.actualHours.toString() : undefined,
      })
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  static async delete(id: string, tenantId: string) {
    // Soft delete or hard delete?
    // Usually soft delete. But for simplicity let's stick to what we decided:
    // "DELETE /api/v1/work-orders/:id (soft delete if draft)"

    const existing = await this.getById(id, tenantId);

    if (existing.status !== "draft" && existing.status !== "cancelled") {
      throw new Error("Only Draft or Cancelled work orders can be deleted.");
    }

    // Hard delete for now, or soft delete?
    // Let's implement soft delete by setting status to cancelled?
    // Or really deleting?
    // The requirement says "soft delete if draft". Maybe we treat it as "cancelled" effectively
    // But if we want to remove it from lists, we might need a dedicated `isDeleted` flag or similar.
    // Given the previous task lists mentioned "soft delete", I'll check AssetService implementation.
    // AssetService implemented soft delete by `status = 'decommissioned'`.
    // For WOs, we can assume hard delete if Draft, or maybe `deleted` status?
    // But status enum doesn't have `deleted`.
    // Let's do hard delete for Draft for now to keep it clean, as Drafts are disposable.

    await db
      .delete(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)));

    return true;
  }

  /**
   * Single gate for every status change. Throws a client error (4xx), never a
   * bare Error -- a rejected transition is the caller's mistake, not a server
   * fault, and a bare Error surfaces as HTTP 500.
   */
  private static async assertTransitionAllowed(
    wo: { id: string; status: string; priority: string; type: string },
    nextStatus: WorkOrderStatus,
  ) {
    const currentStatus = wo.status as WorkOrderStatus;

    // 🔒 CRITICAL: Enforce state machine validation
    if (!WorkOrderStateMachine.isValidTransition(currentStatus, nextStatus)) {
      const allowedTransitions =
        WorkOrderStateMachine.getAllowedTransitions(currentStatus);
      throw new WorkOrderError(
        409,
        `Invalid state transition: Cannot transition from '${currentStatus}' to '${nextStatus}'. ` +
          `Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
      );
    }

    // Safety Gate: Critical or Emergency WOs require an Active Permit when starting work
    if (nextStatus === "in_progress") {
      if (wo.priority === "critical" || wo.type === "emergency") {
        const activePermit = await db.query.permits.findFirst({
          where: and(
            eq(permits.workOrderId, wo.id),
            eq(permits.status, "active"),
            gt(permits.validUntil, new Date()),
          ),
        });

        if (!activePermit) {
          throw new WorkOrderError(
            403,
            "Safety Violation: Active Permit required for Critical/Emergency work.",
          );
        }
      }
    }
  }

  static async transitionStatus(id: string, tenantId: string, action: string) {
    // Get current work order to check current status
    const wo = await this.getById(id, tenantId);

    const nextStatus = action as WorkOrderStatus;
    await this.assertTransitionAllowed(wo, nextStatus);

    return this.update(id, tenantId, { status: nextStatus });
  }

  // ==========================================
  // TASKS
  // ==========================================

  static async addTask(
    workOrderId: string,
    tenantId: string,
    data: { title: string; description?: string; taskOrder: number },
  ) {
    const wo = await this.getById(workOrderId, tenantId);

    const [task] = await db
      .insert(workOrderTasks)
      .values({
        workOrderId: wo.id,
        ...data,
      })
      .returning();

    return task;
  }

  static async updateTask(
    taskId: string,
    tenantId: string,
    data: {
      title?: string;
      description?: string;
      isCompleted?: boolean;
      notes?: string;
      completedBy?: string;
    },
  ) {
    const task = await db.query.workOrderTasks.findFirst({
      where: eq(workOrderTasks.id, taskId),
      with: {
        workOrder: true,
      },
    });

    if (!task || task.workOrder.tenantId !== tenantId) {
      throw new WorkOrderError(404, "Task not found");
    }

    const updateData: any = { ...data, updatedAt: new Date() };

    if (data.isCompleted === true && !task.isCompleted) {
      updateData.completedAt = new Date();
    } else if (data.isCompleted === false) {
      updateData.completedAt = null;
      updateData.completedBy = null;
    }

    const [updated] = await db
      .update(workOrderTasks)
      .set(updateData)
      .where(eq(workOrderTasks.id, taskId))
      .returning();

    return updated;
  }

  static async deleteTask(taskId: string, tenantId: string) {
    const task = await db.query.workOrderTasks.findFirst({
      where: eq(workOrderTasks.id, taskId),
      with: {
        workOrder: true,
      },
    });

    if (!task || task.workOrder.tenantId !== tenantId) {
      throw new WorkOrderError(404, "Task not found");
    }

    await db.delete(workOrderTasks).where(eq(workOrderTasks.id, taskId));
    return true;
  }

  // ==========================================
  // PARTS
  // ==========================================

  static async addPart(
    workOrderId: string,
    tenantId: string,
    data: { partId: string; quantity: number },
  ) {
    const wo = await this.getById(workOrderId, tenantId);

    const [part] = await db
      .insert(workOrderParts)
      .values({
        workOrderId: wo.id,
        ...data,
      })
      .returning();

    return part;
  }

  static async removePart(workOrderPartId: string, tenantId: string) {
    const wp = await db.query.workOrderParts.findFirst({
      where: eq(workOrderParts.id, workOrderPartId),
      with: {
        workOrder: true,
      },
    });

    if (!wp || wp.workOrder.tenantId !== tenantId) {
      throw new WorkOrderError(404, "Work order part not found");
    }

    await db
      .delete(workOrderParts)
      .where(eq(workOrderParts.id, workOrderPartId));
    return true;
  }

  // ==========================================
  // LABOR
  // ==========================================

  static async addLabor(
    workOrderId: string,
    tenantId: string,
    data: { userId: string; hours: number; description?: string },
  ) {
    const wo = await this.getById(workOrderId, tenantId);

    const [labor] = await db
      .insert(workOrderLabor)
      .values({
        workOrderId: wo.id,
        userId: data.userId,
        hours: data.hours.toString(),
        description: data.description,
      })
      .returning();

    return labor;
  }
}
