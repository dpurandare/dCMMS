import { db } from '../db';
import { sites, assets } from '../db/schema';
import { eq, and, desc, asc, sql, like, or } from 'drizzle-orm';

export interface SiteFilters {
  status?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSiteData {
  tenantId: string;
  siteCode: string;
  name: string;
  description?: string;
  type?: string;
  energyType?: 'solar' | 'wind' | 'hydro' | 'biomass' | 'geothermal' | 'hybrid';
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface UpdateSiteData {
  name?: string;
  description?: string;
  type?: string;
  energyType?: 'solar' | 'wind' | 'hydro' | 'biomass' | 'geothermal' | 'hybrid';
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export class SiteService {
  /**
   * Generate site code from name
   */
  static generateSiteCode(name: string, tenantId: string): string {
    // Take first 3 chars of each word, max 8 chars total
    const words = name.trim().toUpperCase().split(/\s+/);
    let code = '';

    for (const word of words) {
      if (code.length >= 8) break;
      code += word.slice(0, 3);
    }

    return code.slice(0, 8);
  }

  /**
   * List sites with filters and pagination
   */
  static async list(
    tenantId: string,
    filters: SiteFilters,
    pagination: PaginationParams
  ) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(sites.tenantId, tenantId)];

    if (filters.status !== undefined) {
      const isActive = filters.status === 'active';
      conditions.push(eq(sites.isActive, isActive));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(sites.name, `%${filters.search}%`),
          like(sites.siteCode, `%${filters.search}%`),
          like(sites.city, `%${filters.search}%`),
          like(sites.description, `%${filters.search}%`)
        )!
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sites)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get paginated results
    const orderByColumn = sites[sortBy as keyof typeof sites] || sites.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(sites)
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
   * Get site by ID
   */
  static async getById(id: string, tenantId: string) {
    const [site] = await db
      .select()
      .from(sites)
      .where(and(eq(sites.id, id), eq(sites.tenantId, tenantId)))
      .limit(1);

    if (!site) {
      return null;
    }

    // Get asset count for this site
    const [assetCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(eq(assets.siteId, id), eq(assets.tenantId, tenantId)));

    return {
      ...site,
      assetCount: Number(assetCount?.count || 0),
    };
  }

  /**
   * Create a new site
   */
  static async create(data: CreateSiteData) {
    const [newSite] = await db
      .insert(sites)
      .values({
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
      })
      .returning();

    return newSite;
  }

  /**
   * Update site
   */
  static async update(id: string, tenantId: string, data: UpdateSiteData) {
    const [updated] = await db
      .update(sites)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(sites.id, id), eq(sites.tenantId, tenantId)))
      .returning();

    return updated || null;
  }

  /**
   * Delete site (soft delete by setting isActive = false)
   */
  static async delete(id: string, tenantId: string) {
    // Check if site has assets
    const [assetCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(eq(assets.siteId, id), eq(assets.tenantId, tenantId)));

    if (Number(assetCount?.count || 0) > 0) {
      throw new Error('Cannot delete site with associated assets');
    }

    const [deleted] = await db
      .update(sites)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(sites.id, id), eq(sites.tenantId, tenantId)))
      .returning();

    return deleted || null;
  }

  /**
   * Get site statistics
   */
  static async getStatistics(id: string, tenantId: string) {
    const site = await this.getById(id, tenantId);

    if (!site) {
      return null;
    }

    // Get asset count by status
    const assetStats = await db
      .select({
        status: assets.status,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(and(eq(assets.siteId, id), eq(assets.tenantId, tenantId)))
      .groupBy(assets.status);

    // Get asset count by criticality
    const criticalityStats = await db
      .select({
        criticality: assets.criticality,
        count: sql<number>`count(*)`,
      })
      .from(assets)
      .where(and(eq(assets.siteId, id), eq(assets.tenantId, tenantId)))
      .groupBy(assets.criticality);

    return {
      site,
      statistics: {
        assetsByStatus: assetStats.map((s) => ({
          status: s.status,
          count: Number(s.count),
        })),
        assetsByCriticality: criticalityStats.map((s) => ({
          criticality: s.criticality,
          count: Number(s.count),
        })),
      },
    };
  }
}
