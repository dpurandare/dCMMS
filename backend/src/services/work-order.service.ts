import { db } from '../db';
import { workOrders, workOrderTasks } from '../db/schema';
import { eq, and, desc, asc, sql, like, or } from 'drizzle-orm';

export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  siteId?: string;
  assetId?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateWorkOrderData {
  tenantId: string;
  workOrderId: string;
  title: string;
  description?: string;
  type: 'corrective' | 'preventive' | 'predictive' | 'inspection' | 'emergency';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status?: 'draft' | 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  siteId: string;
  assetId?: string;
  assignedTo?: string;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  estimatedHours?: number;
}

export interface UpdateWorkOrderData {
  title?: string;
  description?: string;
  type?: 'corrective' | 'preventive' | 'predictive' | 'inspection' | 'emergency';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'draft' | 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  assignedTo?: string;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
}

export class WorkOrderService {
  /**
   * Generate work order ID in format WO-YYYYMMDD-XXXX
   */
  static async generateWorkOrderId(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of work orders created today for this tenant
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.tenantId, tenantId),
          sql`DATE(${workOrders.createdAt}) = CURRENT_DATE`
        )
      );

    const count = Number(result?.count || 0) + 1;
    const sequence = count.toString().padStart(4, '0');

    return `WO-${dateStr}-${sequence}`;
  }

  /**
   * List work orders with filters and pagination
   */
  static async list(
    tenantId: string,
    filters: WorkOrderFilters,
    pagination: PaginationParams
  ) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build where conditions
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

    if (filters.assignedTo) {
      conditions.push(eq(workOrders.assignedTo, filters.assignedTo));
    }

    if (filters.siteId) {
      conditions.push(eq(workOrders.siteId, filters.siteId));
    }

    if (filters.assetId) {
      conditions.push(eq(workOrders.assetId, filters.assetId));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(workOrders.title, `%${filters.search}%`),
          like(workOrders.workOrderId, `%${filters.search}%`),
          like(workOrders.description, `%${filters.search}%`)
        )!
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get paginated results
    const orderByColumn = workOrders[sortBy as keyof typeof workOrders] || workOrders.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(workOrders)
      .where(and(...conditions))
      .orderBy(orderFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get work order by ID
   */
  static async getById(id: string, tenantId: string) {
    const [workOrder] = await db
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .limit(1);

    if (!workOrder) {
      return null;
    }

    // Get associated tasks
    const tasks = await db
      .select()
      .from(workOrderTasks)
      .where(eq(workOrderTasks.workOrderId, id))
      .orderBy(asc(workOrderTasks.sequence));

    return {
      ...workOrder,
      tasks,
    };
  }

  /**
   * Create a new work order
   */
  static async create(data: CreateWorkOrderData) {
    const [newWorkOrder] = await db
      .insert(workOrders)
      .values({
        ...data,
        status: data.status || 'draft',
      })
      .returning();

    return newWorkOrder;
  }

  /**
   * Update work order
   */
  static async update(id: string, tenantId: string, data: UpdateWorkOrderData) {
    const [updated] = await db
      .update(workOrders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    return updated || null;
  }

  /**
   * Delete work order (soft delete by setting status to cancelled)
   */
  static async delete(id: string, tenantId: string) {
    const [deleted] = await db
      .update(workOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();

    return deleted || null;
  }

  /**
   * Update work order status
   */
  static async updateStatus(
    id: string,
    tenantId: string,
    status: 'draft' | 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  ) {
    const updates: Partial<UpdateWorkOrderData> = { status };

    // Auto-set dates based on status
    if (status === 'in_progress' && !updates.actualStartDate) {
      updates.actualStartDate = new Date();
    }

    if (status === 'completed' && !updates.actualEndDate) {
      updates.actualEndDate = new Date();
    }

    return this.update(id, tenantId, updates);
  }
}
