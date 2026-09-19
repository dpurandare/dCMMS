import { FastifyPluginAsync } from "fastify";
import { AuthService, UserPayload } from "../services/auth.service";
import { TokenService } from "../services/token.service";
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from "../plugins/refresh-cookie";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "../services/login-throttle.service";

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
              expiresIn: { type: "number" },
              csrfToken: { type: "string" },
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
        // Per-account throttle, checked before the password is verified so a
        // locked account costs an attacker nothing to discover and nothing to
        // keep attacking (REV-022).
        const throttle = await checkLoginAllowed(server, email);
        if (!throttle.allowed) {
          request.log.warn(
            { email, failureCount: throttle.failureCount },
            "Login attempt rejected by throttle",
          );
          return reply
            .status(429)
            .header("Retry-After", String(throttle.retryAfterSeconds))
            .send({
              statusCode: 429,
              error: "Too Many Requests",
              message: `Too many failed login attempts. Try again in ${throttle.retryAfterSeconds} seconds.`,
            });
        }

        const user = await AuthService.authenticate({ email, password });

        if (!user) {
          await recordLoginFailure(server, email);
          return reply.status(401).send({
            statusCode: 401,
            error: "Unauthorized",
            message: "Invalid email or password",
          });
        }

        await clearLoginFailures(server, email);

        // Generate tokens with request context for security tracking
        const tokens = await TokenService.generateTokens(server, user, {
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });

        // Generate and store CSRF token
        const { generateCsrfToken, storeCsrfToken } = await import('../middleware/csrf');
        const csrfToken = generateCsrfToken();
        await storeCsrfToken((server as any).redis, user.id, csrfToken);

        // If admin and requirePasswordChange, add reminder to response
        let passwordChangeReminder = undefined;
        if (user.role === "tenant_admin" && user.requirePasswordChange) {
          passwordChangeReminder = "Please change your password immediately. This is your first login with the default password.";
        }

        // Refresh token goes to an HttpOnly cookie, not the response body,
        // so no XSS can read it (REV-017).
        setRefreshCookie(reply, tokens.refreshToken);
        const { refreshToken: _withheld, ...safeTokens } = tokens;

        return {
          ...safeTokens,
          csrfToken, // Include CSRF token in response
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
        description:
          "Refresh access token. The refresh token is read from the HttpOnly " +
          "dcmms_refresh_token cookie set at login; there is no request body.",
        tags: ["auth"],
        response: {
          200: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              expiresIn: { type: "number" },
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
      // The refresh token is only ever accepted from the HttpOnly cookie. It is
      // deliberately NOT read from the body any more: accepting both would
      // leave the XSS-readable path open and make the hardening cosmetic.
      const refreshToken = readRefreshCookie(request);

      if (!refreshToken) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "No refresh token cookie present",
        });
      }

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

        setRefreshCookie(reply, tokens.refreshToken);
        const { refreshToken: _rotated, ...safeTokens } = tokens;
        return safeTokens;
      } catch (error) {
        clearRefreshCookie(reply);
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
        // REV-038: this used to require `type: "object"` with no `body`
        // marked optional, so a request with no body at all (undefined,
        // not `{}`) failed schema validation — which runs before
        // `preHandler`/authenticate, so even an unauthenticated caller got
        // 400 instead of 401. The real frontend calls this with no body
        // (`apiClient.post('/auth/logout')`), so logout was broken for
        // every real caller: found by writing a first test for this path,
        // which had none. `nullable: true` lets an absent body through.
        body: {
          type: "object",
          nullable: true,
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

        clearRefreshCookie(reply);

        // Delete CSRF token
        const { deleteCsrfToken } = await import('../middleware/csrf');
        await deleteCsrfToken((request.server as any).redis, user.id);

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
