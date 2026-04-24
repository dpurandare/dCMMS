import { db } from "../db";
import { crews, crewMembers } from "../db/schema";
import { eq, and, desc, asc, like, sql } from "drizzle-orm";

export interface CreateCrewData {
  tenantId: string;
  name: string;
  description?: string;
  siteId?: string;
  isActive?: boolean;
  metadata?: any;
}

export interface UpdateCrewData {
  name?: string;
  description?: string;
  siteId?: string;
  isActive?: boolean;
  metadata?: any;
}

export interface CrewPaginationParams {
  page: number;
  limit: number;
  search?: string;
  siteId?: string;
}

export class CrewService {
  static async create(data: CreateCrewData) {
    const [crew] = await db
      .insert(crews)
      .values({
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
      })
      .returning();

    return crew;
  }

  static async list(tenantId: string, params: CrewPaginationParams) {
    const { page, limit, search, siteId } = params;
    const offset = (page - 1) * limit;

    const conditions = [eq(crews.tenantId, tenantId)];

    if (siteId) {
      conditions.push(eq(crews.siteId, siteId));
    }

    if (search) {
      conditions.push(like(crews.name, `%${search}%`)!);
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(crews)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    const data = await db.query.crews.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(crews.createdAt)],
      with: {
        members: {
          with: {
            user: true,
          },
        },
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
    const crew = await db.query.crews.findFirst({
      where: and(eq(crews.id, id), eq(crews.tenantId, tenantId)),
      with: {
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!crew) {
      throw new Error("Crew not found");
    }

    return crew;
  }

  static async update(id: string, tenantId: string, data: UpdateCrewData) {
    const existing = await this.getById(id, tenantId);

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.metadata) {
      updateData.metadata = JSON.stringify(data.metadata);
    }

    const [updated] = await db
      .update(crews)
      .set(updateData)
      .where(and(eq(crews.id, id), eq(crews.tenantId, tenantId)))
      .returning();

    return updated;
  }

  static async delete(id: string, tenantId: string) {
    const existing = await this.getById(id, tenantId);

    await db
      .delete(crews)
      .where(and(eq(crews.id, id), eq(crews.tenantId, tenantId)));

    return true;
  }

  // ==========================================
  // CREW MEMBERS
  // ==========================================

  static async addMember(id: string, tenantId: string, userId: string, isLeader: boolean = false) {
    const crew = await this.getById(id, tenantId);

    // Check if user is already a member
    const existingMember = await db.query.crewMembers.findFirst({
      where: and(eq(crewMembers.crewId, id), eq(crewMembers.userId, userId)),
    });

    if (existingMember) {
      throw new Error("User is already a member of this crew");
    }

    const [member] = await db
      .insert(crewMembers)
      .values({
        crewId: id,
        userId,
        isLeader,
      })
      .returning();

    return member;
  }

  static async removeMember(id: string, tenantId: string, userId: string) {
    const crew = await this.getById(id, tenantId);

    await db
      .delete(crewMembers)
      .where(and(eq(crewMembers.crewId, id), eq(crewMembers.userId, userId)));

    return true;
  }

  static async setMemberRole(id: string, tenantId: string, userId: string, isLeader: boolean) {
    const crew = await this.getById(id, tenantId);

    const [member] = await db
      .update(crewMembers)
      .set({ isLeader })
      .where(and(eq(crewMembers.crewId, id), eq(crewMembers.userId, userId)))
      .returning();

    return member;
  }
}
