import { db } from "../db";
import { assets } from "../db/schema";
import { eq, and, desc, asc, sql, like, or, isNull } from "drizzle-orm";

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
  sortOrder?: "asc" | "desc";
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
  status?: "operational" | "down" | "maintenance" | "retired";
  criticality?: "critical" | "high" | "medium" | "low";
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  specifications?: any;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  image?: string;
  metadata?: any;
}

export interface UpdateAssetData {
  name?: string;
  description?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  status?: "operational" | "down" | "maintenance" | "retired";
  criticality?: "critical" | "high" | "medium" | "low";
  installationDate?: Date;
  warrantyExpiryDate?: Date;
  specifications?: any;
  lastMaintenanceDate?: Date;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  image?: string;
  metadata?: any;
  parentAssetId?: string;
}

export class AssetService {
  /**
   * Generate asset tag in format SITE-TYPE-XXXX
   */
  static async generateAssetTag(
    tenantId: string,
    siteId: string,
    type: string,
  ): Promise<string> {
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
          eq(assets.type, type as any),
        ),
      );

    const count = Number(result?.count || 0) + 1;
    const sequence = count.toString().padStart(4, "0");

    return `${siteCode}-${typeCode}-${sequence}`;
  }

  /**
   * List assets with filters and pagination
   */
  static async list(
    tenantId: string,
    filters: AssetFilters,
    pagination: PaginationParams,
  ) {
    const {
      page,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
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
          like(assets.serialNumber, `%${filters.search}%`),
          like(assets.tags, `%${filters.search}%`), // Simple text search in JSON string
        )!,
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get paginated results
    const orderByColumn =
      assets[sortBy as keyof typeof assets] || assets.createdAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

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
        type: data.type as any,
        status: (data.status || "operational") as any,
        latitude: data.latitude ? data.latitude.toString() : undefined,
        longitude: data.longitude ? data.longitude.toString() : undefined,
        tags: data.tags ? JSON.stringify(data.tags) : "[]",
        image: data.image,
        metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
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
    // Check for circular reference if parentAssetId is being updated
    if (data.parentAssetId !== undefined) {
      if (data.parentAssetId === id) {
        throw new Error("Circular reference: Asset cannot be its own parent");
      }
      if (data.parentAssetId) {
        await this.checkCircularReference(id, data.parentAssetId, tenantId);
      }
    }

    const [updated] = (await db
      .update(assets)
      .set({
        ...data,
        updatedAt: new Date(),
        ...(data.latitude && { latitude: data.latitude.toString() }),
        ...(data.longitude && { longitude: data.longitude.toString() }),
        ...(data.tags && { tags: JSON.stringify(data.tags) }),
        ...(data.image && { image: data.image }),
        ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
      } as any)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning()) as any[];

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
      throw new Error("Cannot delete asset with child assets");
    }

    const [deleted] = (await db
      .update(assets)
      .set({ status: "decommissioned", updatedAt: new Date() } as any)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning()) as any[];

    return deleted || null;
  }

  /**
   * Get asset hierarchy (parent + children)
   */
  static async getHierarchy(id: string, tenantId: string): Promise<any> {
    const asset = (await this.getById(id, tenantId)) as any;

    if (!asset) {
      return null;
    }

    // Get children
    const children = (await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.parentAssetId, id), eq(assets.tenantId, tenantId)),
      )) as any[];

    // Recursively get hierarchy for children
    const childrenWithHierarchy = await Promise.all(
      children.map((child) => this.getHierarchy(child.id, tenantId)),
    );

    return {
      ...asset,
      children: childrenWithHierarchy,
    };
  }

  /**
   * Check for circular reference
   * Throws error if circular reference is detected
   */
  static async checkCircularReference(
    assetId: string,
    targetParentId: string,
    tenantId: string,
  ) {
    let currentId: string | null = targetParentId;
    let depth = 0;
    const MAX_DEPTH = 10;

    while (currentId && depth < MAX_DEPTH) {
      if (currentId === assetId) {
        throw new Error("Circular reference detected");
      }

      const [parent] = await db
        .select({ parentAssetId: assets.parentAssetId })
        .from(assets)
        .where(and(eq(assets.id, currentId), eq(assets.tenantId, tenantId)));

      if (!parent) break;
      currentId = parent.parentAssetId;
      depth++;
    }
  }

  /**
   * Add tag to asset
   */
  static async addTag(id: string, tenantId: string, tag: string) {
    const asset = (await this.getById(id, tenantId)) as any;
    if (!asset) throw new Error("Asset not found");

    const tags = JSON.parse(asset.tags || "[]");
    if (!tags.includes(tag)) {
      tags.push(tag);
      await this.update(id, tenantId, { tags });
    }
    return tags;
  }

  /**
   * Remove tag from asset
   */
  static async removeTag(id: string, tenantId: string, tag: string) {
    const asset = (await this.getById(id, tenantId)) as any;
    if (!asset) throw new Error("Asset not found");

    const tags = JSON.parse(asset.tags || "[]");
    const newTags = tags.filter((t: string) => t !== tag);

    if (newTags.length !== tags.length) {
      await this.update(id, tenantId, { tags: newTags });
    }
    return newTags;
  }
}
