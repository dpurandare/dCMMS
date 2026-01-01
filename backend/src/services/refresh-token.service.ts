import { db } from "../db";
import { refreshTokens } from "../db/schema";
import { eq, and, lt } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

/**
 * Refresh Token Service
 * Handles secure refresh token generation, validation, and rotation
 */

export interface RefreshTokenPayload {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  deviceInfo: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RefreshTokenService {
  // Refresh token lifetime: 7 days
  private static readonly REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

  /**
   * Generate a secure random refresh token
   */
  static generateToken(): string {
    return randomBytes(64).toString("hex");
  }

  /**
   * Hash a refresh token for secure storage
   */
  static hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Create a new refresh token in the database
   */
  static async createRefreshToken(
    payload: RefreshTokenPayload
  ): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_LIFETIME_MS);

    const [record] = await db
      .insert(refreshTokens)
      .values({
        userId: payload.userId,
        tokenHash,
        expiresAt,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
        deviceInfo: payload.deviceInfo || null,
      })
      .returning();

    return {
      token,
      tokenId: record.id,
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Validate a refresh token and return the associated user ID
   * Throws an error if the token is invalid, expired, or revoked
   */
  static async validateRefreshToken(token: string): Promise<{
    userId: string;
    tokenId: string;
  }> {
    const tokenHash = this.hashToken(token);

    const [record] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!record) {
      throw new Error("Invalid refresh token");
    }

    // Check if token is revoked
    if (record.revokedAt) {
      // Token theft detection: Revoke all tokens for this user
      await this.revokeAllUserTokens(record.userId);
      throw new Error(
        "Refresh token has been revoked. Potential token theft detected."
      );
    }

    // Check if token is expired
    if (record.expiresAt < new Date()) {
      throw new Error("Refresh token has expired");
    }

    return {
      userId: record.userId,
      tokenId: record.id,
    };
  }

  /**
   * Rotate a refresh token (revoke old, create new)
   * Implements token rotation for enhanced security
   */
  static async rotateRefreshToken(
    oldToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
    // Validate the old token
    const { userId, tokenId: oldTokenId } =
      await this.validateRefreshToken(oldToken);

    // Create a new refresh token
    const newToken = await this.createRefreshToken({
      userId,
      ipAddress,
      userAgent,
    });

    // Mark the old token as replaced
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedByTokenId: newToken.tokenId,
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, oldTokenId));

    return newToken;
  }

  /**
   * Revoke a specific refresh token
   */
  static async revokeRefreshToken(tokenId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, tokenId));
  }

  /**
   * Revoke all refresh tokens for a user (used for logout or security incidents)
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revokedAt, null as any)
        )
      );
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning();

    return result.length;
  }

  /**
   * Get all active tokens for a user (for security dashboard)
   */
  static async getUserActiveTokens(
    userId: string
  ): Promise<RefreshTokenRecord[]> {
    return db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revokedAt, null as any)
        )
      );
  }
}
