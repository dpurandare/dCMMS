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

        // Generate tokens
        const tokens = await TokenService.generateTokens(server, user);

        return {
          ...tokens,
          user: {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            username: user.username,
            role: user.role,
          },
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
        // Verify refresh token
        const decoded = await TokenService.verifyRefreshToken(
          server,
          refreshToken,
        );

        // Get user details
        const user = await AuthService.getUserById(decoded.id);

        if (!user) {
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "User not found",
          });
        }

        // Generate new tokens
        const tokens = await TokenService.generateTokens(server, user);

        return tokens;
      } catch (error) {
        request.log.error({ err: error }, "Token refresh error");
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid refresh token",
        });
      }
    },
  );

  // POST /api/v1/auth/logout
  server.post(
    "/logout",
    {
      schema: {
        description: "User logout",
        tags: ["auth"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        security: [{ bearerAuth: [] }],
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      // In a real implementation, you might want to:
      // 1. Blacklist the token in Redis
      // 2. Clear any session data
      // 3. Log the logout event

      return {
        message: "Logged out successfully",
      };
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
