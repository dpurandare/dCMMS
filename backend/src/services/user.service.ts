import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { and, eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string, tenantId: string) {
    const [user] = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        phone: users.phone,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    return user || null;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    tenantId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      phone?: string;
    },
  ) {
    // Allow-list. This used to be `...data` over an unvalidated request body, so
    // `{"role":"super_admin"}`, `{"tenantId":...}` or `{"passwordHash":...}` were
    // written straight into the row.
    const { firstName, lastName, email, username, phone } = data ?? {};
    const profile = Object.fromEntries(
      Object.entries({ firstName, lastName, email, username, phone }).filter(([, v]) => v !== undefined),
    );
    const [updatedUser] = await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        phone: users.phone,
      });

    return updatedUser;
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  }
  /**
   * Get all users for a tenant with pagination
   */
  static async findAll(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    },
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Build query
    let query = db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        phone: users.phone,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));

    // Apply filters
    // Note: Drizzle doesn't support runtime conditions easily,
    // so we'll do filtering in memory for now
    // In production, build dynamic where clauses

    const allUsers = await query.orderBy(users.createdAt);

    // Filter in memory (for simplicity)
    let filteredUsers = allUsers;

    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.firstName?.toLowerCase().includes(search) ||
          u.lastName?.toLowerCase().includes(search),
      );
    }

    if (options?.role) {
      filteredUsers = filteredUsers.filter((u) => u.role === options.role);
    }

    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new user
   */
  static async create(data: {
    tenantId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    role:
    | "super_admin"
    | "tenant_admin"
    | "site_manager"
    | "technician"
    | "operator"
    | "viewer";
    password: string;
    phone?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        passwordHash,
        phone: data.phone,
      })
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return newUser;
  }

  /**
   * Delete a user
   */
  static async delete(userId: string, tenantId: string) {
    const [deletedUser] = await db
      .delete(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning({ id: users.id });

    return deletedUser;
  }
}
