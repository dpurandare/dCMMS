import { FastifyPluginAsync } from "fastify";
import { AuthService, UserPayload } from "../services/auth.service";
import { TokenService } from "../services/token.service";

const authRoutes: FastifyPluginAsync = async (server) => {
  // POST /api/v1/auth/login
  server.post(
    "/login",
    {
      schema: {
        description: "User login with email and password",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              expiresIn: { type: "number" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  tenantId: { type: "string" },
                  email: { type: "string" },
                  username: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              statusCode: { type: "number" },
              error: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      try {
        // Authenticate user
        const user = await AuthService.authenticate({ email, password });

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password",
          });
        }

        // Generate tokens with request context for security tracking
        const tokens = await TokenService.generateTokens(server, user, {
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        // If admin and requirePasswordChange, add reminder to response
        let passwordChangeReminder = undefined;
        if (user.role === "tenant_admin" && user.requirePasswordChange) {
          passwordChangeReminder = "Please change your password immediately. This is your first login with the default password.";
        }

        return {
          ...tokens,
          user: {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            username: user.username,
            role: user.role,
            requirePasswordChange: user.requirePasswordChange,
          },
          ...(passwordChangeReminder ? { passwordChangeReminder } : {}),
        };
      } catch (error) {
        request.log.error({ err: error }, "Login error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "An error occurred during login",
        });
      }
    },
  );

  // POST /api/v1/auth/refresh
  server.post(
    "/refresh",
    {
      schema: {
        description: "Refresh access token",
        tags: ["auth"],
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              expiresIn: { type: "number" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      try {
        // Rotate refresh token (validates old token, creates new one)
        const tokens = await TokenService.rotateRefreshToken(
          server,
          refreshToken,
          {
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          },
        );

        return tokens;
      } catch (error) {
        request.log.error({ err: error }, "Token refresh error");
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: error instanceof Error ? error.message : "Invalid refresh token",
        });
      }
    },
  );

  // POST /api/v1/auth/logout
  server.post(
    "/logout",
    {
      schema: {
        description: "User logout - revokes all refresh tokens for the user",
        tags: ["auth"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            allDevices: {
              type: "boolean",
              description: "If true, revoke tokens from all devices. Otherwise, only current device."
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as { id: string };
      const { allDevices } = (request.body as { allDevices?: boolean }) || {};

      try {
        const { RefreshTokenService } = await import("../services/refresh-token.service");

        // Revoke all refresh tokens for this user for security
        await RefreshTokenService.revokeAllUserTokens(user.id);

        request.log.info(
          { userId: user.id, allDevices },
          "User logged out successfully"
        );

        return {
          message: allDevices
            ? "Logged out from all devices successfully"
            : "Logged out successfully",
        };
      } catch (error) {
        request.log.error({ err: error }, "Logout error");
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "An error occurred during logout",
        });
      }
    },
  );

  // GET /api/v1/auth/me
  server.get(
    "/me",
    {
      schema: {
        description: "Get current user profile",
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              email: { type: "string" },
              username: { type: "string" },
              role: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user as UserPayload;

      return {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        username: user.username,
        role: user.role,
      };
    },
  );
};

export default authRoutes;
