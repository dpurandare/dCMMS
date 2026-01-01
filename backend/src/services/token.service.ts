import { FastifyInstance } from "fastify";
import { UserPayload, RefreshTokenPayload } from "./auth.service";
import { RefreshTokenService } from "./refresh-token.service";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresAt?: Date;
}

export interface TokenGenerationContext {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
}

export class TokenService {
  /**
   * Generate access and refresh tokens
   * Now uses database-backed refresh tokens with rotation
   */
  static async generateTokens(
    server: FastifyInstance,
    user: UserPayload,
    context?: TokenGenerationContext,
  ): Promise<TokenPair> {
    const accessToken = server.jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m",
      },
    );

    // Generate database-backed refresh token
    const { token: refreshToken, expiresAt } =
      await RefreshTokenService.createRefreshToken({
        userId: user.id,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        deviceInfo: context?.deviceInfo,
      });

    // Parse expiry time (e.g., "15m" -> 900 seconds)
    const expiryString = process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m";
    const expiresIn = this.parseExpiryToSeconds(expiryString);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  /**
   * Verify refresh token against database
   * Returns the user ID if valid
   */
  static async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string; tokenId: string }> {
    try {
      return await RefreshTokenService.validateRefreshToken(refreshToken);
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  /**
   * Rotate refresh token (generate new access + refresh token pair)
   */
  static async rotateRefreshToken(
    server: FastifyInstance,
    oldRefreshToken: string,
    context?: TokenGenerationContext,
  ): Promise<TokenPair> {
    // Validate and rotate the refresh token
    const { token: newRefreshToken, expiresAt } =
      await RefreshTokenService.rotateRefreshToken(
        oldRefreshToken,
        context?.ipAddress,
        context?.userAgent,
      );

    // Get user info from the token
    const { userId } = await RefreshTokenService.validateRefreshToken(
      newRefreshToken,
    );

    // Fetch user details to generate new access token
    const { db } = await import("../db");
    const { users } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Generate new access token
    const accessToken = server.jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m",
      },
    );

    const expiryString = process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m";
    const expiresIn = this.parseExpiryToSeconds(expiryString);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  /**
   * Parse expiry string to seconds
   */
  private static parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        return 900; // Default 15 minutes
    }
  }
}
