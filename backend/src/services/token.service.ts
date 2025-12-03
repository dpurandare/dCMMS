import { FastifyInstance } from 'fastify';
import { UserPayload } from './auth.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenService {
  /**
   * Generate access and refresh tokens
   */
  static async generateTokens(server: FastifyInstance, user: UserPayload): Promise<TokenPair> {
    const accessToken = server.jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
      }
    );

    const refreshToken = server.jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        type: 'refresh',
      },
      {
        expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
      }
    );

    // Parse expiry time (e.g., "15m" -> 900 seconds)
    const expiryString = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';
    const expiresIn = this.parseExpiryToSeconds(expiryString);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify and decode refresh token
   */
  static async verifyRefreshToken(server: FastifyInstance, refreshToken: string): Promise<any> {
    try {
      const decoded = server.jwt.verify(refreshToken);

      // Check if it's a refresh token
      if ((decoded as any).type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private static parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // Default 15 minutes
    }
  }
}
