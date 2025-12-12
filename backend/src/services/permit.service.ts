import { db } from "../db";
import { permits, workOrders } from "../db/schema";
import { eq, and, desc, asc, like, or, sql } from "drizzle-orm";

export interface CreatePermitData {
    tenantId: string;
    workOrderId: string;
    permitId: string;
    type: string;
    status: string;
    issuerId: string;
    validFrom: Date;
    validUntil: Date;
    metadata?: any;
}

export interface UpdatePermitData {
    status?: string;
    approverId?: string;
    approvedAt?: Date;
    validFrom?: Date;
    validUntil?: Date;
    metadata?: any;
}

export interface PermitFilters {
    workOrderId?: string;
    type?: string;
    status?: string;
    search?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export class PermitService {

    static async create(data: CreatePermitData) {
        if (data.validFrom >= data.validUntil) {
            throw new Error("validUntil must be after validFrom");
        }

        // Verify WO exists and belongs to tenant
        const wo = await db.query.workOrders.findFirst({
            where: and(eq(workOrders.id, data.workOrderId), eq(workOrders.tenantId, data.tenantId))
        });

        if (!wo) {
            throw new Error("Work Order not found");
        }

        const [inserted] = await db.insert(permits).values({
            ...data,
            metadata: JSON.stringify(data.metadata || {})
        }).returning({ id: permits.id });

        return this.getById(inserted.id, data.tenantId);
    }

    static async update(id: string, tenantId: string, data: UpdatePermitData) {
        if (data.validFrom && data.validUntil && data.validFrom >= data.validUntil) {
            throw new Error("validUntil must be after validFrom");
        }

        const permit = await db.query.permits.findFirst({
            where: and(eq(permits.id, id), eq(permits.tenantId, tenantId))
        });

        if (!permit) {
            throw new Error("Permit not found");
        }

        const updateData: any = { ...data, updatedAt: new Date() };

        if (data.metadata) {
            updateData.metadata = JSON.stringify(data.metadata);
        }

        const [updated] = await db.update(permits)
            .set(updateData)
            .where(eq(permits.id, id))
            .returning();

        return updated;
    }

    static async getById(id: string, tenantId: string) {
        const permit = await db.query.permits.findFirst({
            where: and(eq(permits.id, id), eq(permits.tenantId, tenantId)),
            with: {
                workOrder: true,
                issuer: true,
                approver: true
            }
        });

        if (!permit) throw new Error("Permit not found");
        return permit;
    }

    static async list(tenantId: string, filters: PermitFilters, pagination: PaginationParams) {
        const { page = 1, limit = 10, sortBy, sortOrder } = pagination;
        const offset = (page - 1) * limit;

        const conditions = [eq(permits.tenantId, tenantId)];

        if (filters.workOrderId) {
            conditions.push(eq(permits.workOrderId, filters.workOrderId));
        }
        if (filters.type) {
            conditions.push(eq(permits.type, filters.type));
        }
        if (filters.status) {
            conditions.push(eq(permits.status, filters.status));
        }
        if (filters.search) {
            conditions.push(
                like(permits.permitId, `%${filters.search}%`)
            );
        }

        const whereClause = and(...conditions);

        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(permits)
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        let orderBy: any = desc(permits.createdAt);
        if (sortBy && sortOrder) {
            const column = permits[sortBy as keyof typeof permits];
            if (column) {
                orderBy = sortOrder === "asc" ? asc(column as any) : desc(column as any);
            }
        }

        const data = await db.query.permits.findMany({
            where: whereClause,
            limit,
            offset,
            orderBy,
            with: {
                workOrder: true
            }
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async delete(id: string, tenantId: string) {
        const permit = await db.query.permits.findFirst({
            where: and(eq(permits.id, id), eq(permits.tenantId, tenantId))
        });

        if (!permit) {
            throw new Error("Permit not found");
        }

        // Could add logic to prevent deletion if WO is in progress

        await db.delete(permits).where(eq(permits.id, id));
        return true;
    }
}
