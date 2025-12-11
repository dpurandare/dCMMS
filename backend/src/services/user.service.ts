import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
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
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      phone?: string;
    },
  ) {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
   * Get all users for a tenant
   */
  static async findAll(tenantId: string) {
    const usersList = await db
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
      .where(eq(users.tenantId, tenantId))
      .orderBy(users.createdAt);

    return usersList;
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
  static async delete(userId: string) {
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return deletedUser;
  }
}
