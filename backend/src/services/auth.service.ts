import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { UserRole } from "../constants/permissions";

const SALT_ROUNDS = 10;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserPayload {
  id: string;
  tenantId: string;
  email: string;
  username: string;
  role: UserRole;
  requirePasswordChange?: boolean;
}

export interface RefreshTokenPayload {
  id: string;
  tenantId: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(
    credentials: LoginCredentials,
  ): Promise<UserPayload | null> {
    const { email, password } = credentials;

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      return null;
    }

    // Verify password
    if (!user.passwordHash) {
      // User doesn't have a password (using IdP)
      return null;
    }

    const isPasswordValid = await this.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Return user payload (without sensitive data)
    let requirePasswordChange = false;
    if (user.role === "tenant_admin" && user.metadata) {
      try {
        const metadata = JSON.parse(user.metadata);
        requirePasswordChange = !!metadata.requirePasswordChange;
      } catch (e) {
        requirePasswordChange = false;
      }
    }
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      username: user.username,
      role: user.role,
      requirePasswordChange,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UserPayload | null> {
    const [user] = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    return user || null;
  }

  /**
   * Create a new user
   */
  static async createUser(data: {
    tenantId: string;
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  }) {
    const passwordHash = await this.hashPassword(data.password);

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: (data.role as any) || "viewer",
        isActive: true,
      })
      .returning({
        id: users.id,
        tenantId: users.tenantId,
        email: users.email,
        username: users.username,
        role: users.role,
      });

    return newUser;
  }
}
