import { db } from '../db';
import { assets } from '../db/schema';
import { eq, and, desc, asc, sql, like, or, isNull } from 'drizzle-orm';

export interface AssetFilters {
  siteId?: string;
  status?: string;
  criticality?: string;
  parentAssetId?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAssetData {
  tenantId: string;
  siteId: string;
  assetTag: string;
  name: string;
  description?: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  parentAssetId?: string;
  status?: 'operational' | 'down' | 'maintenance' | 'retired';
  criticality?: 'critical' | 'high' | 'medium' | 'low';
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  specifications?: any;
}

export interface UpdateAssetData {
  name?: string;
  description?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  status?: 'operational' | 'down' | 'maintenance' | 'retired';
  criticality?: 'critical' | 'high' | 'medium' | 'low';
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  specifications?: any;
  lastMaintenanceDate?: Date;
}

export class AssetService {
  /**
   * Generate asset tag in format SITE-TYPE-XXXX
   */
  static async generateAssetTag(tenantId: string, siteId: string, type: string): Promise<string> {
    // Get site code (first 4 chars of site ID)
    const siteCode = siteId.slice(0, 4).toUpperCase();

    // Get type code (first 3 chars)
    const typeCode = type.slice(0, 3).toUpperCase();

    // Get count of assets for this site and type
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(
        and(
          eq(assets.tenantId, tenantId),
          eq(assets.siteId, siteId),
          like(assets.type, `${type}%`)
        )
      );

    const count = Number(result?.count || 0) + 1;
    const sequence = count.toString().padStart(4, '0');

    return `${siteCode}-${typeCode}-${sequence}`;
  }

  /**
   * List assets with filters and pagination
   */
  static async list(
    tenantId: string,
    filters: AssetFilters,
    pagination: PaginationParams
  ) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(assets.tenantId, tenantId)];

    if (filters.siteId) {
      conditions.push(eq(assets.siteId, filters.siteId));
    }

    if (filters.status) {
      conditions.push(eq(assets.status, filters.status as any));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(assets.name, `%${filters.search}%`),
          like(assets.serialNumber, `%${filters.search}%`)
        )!
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get paginated results
    const orderByColumn = assets[sortBy as keyof typeof assets] || assets.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(orderFn(orderByColumn as any))
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
   * Get asset by ID
   */
  static async getById(id: string, tenantId: string) {
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .limit(1);

    if (!asset) {
      return null;
    }

    // Get child assets
    const children = await db
      .select()
      .from(assets)
      .where(and(eq(assets.parentAssetId, id), eq(assets.tenantId, tenantId)));

    return {
      ...asset,
      children,
    };
  }

  /**
   * Create a new asset
   */
  static async create(data: CreateAssetData) {
    const { assetTag, ...assetData } = data;
    const [asset] = (await db
      .insert(assets)
      .values({
        ...assetData,
        assetId: assetTag,
        status: (data.status || 'operational') as any,
        // criticality: data.criticality || 'medium',
      })
      .returning()) as any[];

    return asset;
  }

  /**
   * Create wind turbine metadata
   */
  static async createWindMetadata(assetId: string, metadata: any) {
    // This would use a wind_turbine_metadata table model if we had one defined in Drizzle
    // For now, we'll assume it's handled via raw SQL or a separate service call
    // In a real implementation, we would import the windTurbineMetadata schema

    // Placeholder for actual implementation:
    // await db.insert(windTurbineMetadata).values({ assetId, ...metadata });

    return metadata;
  }

  /**
   * Update asset
   */
  static async update(id: string, tenantId: string, data: UpdateAssetData) {
    const [updated] = await db
      .update(assets)
      .set({
        ...data,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning() as any[];

    return updated || null;
  }

  /**
   * Update wind turbine metadata
   */
  static async updateWindMetadata(assetId: string, metadata: any) {
    // Placeholder for actual implementation
    // await db.update(windTurbineMetadata).set(metadata).where(eq(windTurbineMetadata.assetId, assetId));
    return metadata;
  }

  /**
   * Delete asset
   */
  static async delete(id: string, tenantId: string) {
    // Check if asset has children
    const [childCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(eq(assets.parentAssetId, id), eq(assets.tenantId, tenantId)));

    if (Number(childCount?.count || 0) > 0) {
      throw new Error('Cannot delete asset with child assets');
    }

    const [deleted] = await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning() as any[];

    return deleted || null;
  }

  /**
   * Get asset hierarchy (parent + children)
   */
  static async getHierarchy(id: string, tenantId: string) {
    const asset = await this.getById(id, tenantId) as any;

    if (!asset) {
      return null;
    }

    // Get parent if exists
    let parent = null;
    if (asset.parentAssetId) {
      [parent] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.id, asset.parentAssetId), eq(assets.tenantId, tenantId)))
        .limit(1);
    }

    return {
      ...asset,
      parent,
    };
  }
}
