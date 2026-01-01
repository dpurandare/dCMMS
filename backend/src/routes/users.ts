import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { UserService } from "../services/user.service";
import { AuthService, UserPayload } from "../services/auth.service";
import { authorize } from "../middleware/authorize";

const usersRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/users
  server.get(
    "/",
    {
      schema: {
        description: "Get all users",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                username: { type: "string" },
                firstName: { type: "string", nullable: true },
                lastName: { type: "string", nullable: true },
                role: { type: "string" },
                isActive: { type: "boolean" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
      preHandler: [server.authenticate, authorize({ permissions: ["read:users"] })],
    },
    async (request, reply) => {
      const user = request.user;
      const users = await UserService.findAll(user.tenantId);
      return users;
    },
  );

  // POST /api/v1/users
  server.post(
    "/",
    {
      schema: {
        description: "Create a new user",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: [
            "email",
            "username",
            "firstName",
            "lastName",
            "role",
            "password",
          ],
          properties: {
            email: { type: "string", format: "email" },
            username: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: {
              type: "string",
              enum: [
                "super_admin",
                "tenant_admin",
                "site_manager",
                "technician",
                "operator",
                "viewer",
              ],
            },
            password: { type: "string", minLength: 8 },
            phone: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, authorize({ permissions: ["create:users"] })],
    },
    async (request, reply) => {
      const user = request.user;

      const newUser = await UserService.create({
        ...(request.body as any),
        tenantId: user.tenantId,
      });

      return reply.code(201).send(newUser);
    },
  );

  // GET /api/v1/users/:id
  server.get(
    "/:id",
    {
      schema: {
        description: "Get user by ID",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              email: { type: "string" },
              username: { type: "string" },
              firstName: { type: "string", nullable: true },
              lastName: { type: "string", nullable: true },
              role: { type: "string" },
              phone: { type: "string", nullable: true },
              lastLoginAt: { type: "string", nullable: true },
              createdAt: { type: "string" },
            },
          },
        },
      },
      preHandler: [server.authenticate, authorize({ permissions: ["read:users"] })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await UserService.getUserProfile(id);

      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "User not found",
        });
      }

      return user;
    },
  );

  // DELETE /api/v1/users/:id
  server.delete(
    "/:id",
    {
      schema: {
        description: "Delete a user",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
      },
      preHandler: [server.authenticate, authorize({ permissions: ["delete:users"] })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await UserService.delete(id);
      return reply.code(204).send();
    },
  );

  // GET /api/v1/users/me
  server.get(
    "/me",
    {
      schema: {
        description: "Get current user full profile",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              tenantId: { type: "string" },
              email: { type: "string" },
              username: { type: "string" },
              firstName: { type: "string", nullable: true },
              lastName: { type: "string", nullable: true },
              role: { type: "string" },
              phone: { type: "string", nullable: true },
              lastLoginAt: { type: "string", nullable: true },
              createdAt: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const user = request.user;
      const profile = await UserService.getUserProfile(user.id);

      if (!profile) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "User not found",
        });
      }

      return profile;
    },
  );

  // PUT /api/v1/users/:id
  server.put(
    "/:id",
    {
      schema: {
        description: "Update user profile",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            phone: { type: "string" },
          },
        },
      },
      preHandler: [server.authenticate, authorize({ permissions: ["update:users"] })],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const updatedUser = await UserService.updateProfile(
        id,
        request.body as any,
      );
      return updatedUser;
    },
  );

  // PUT /api/v1/users/:id/password
  server.put(
    "/:id/password",
    {
      schema: {
        description: "Change user password",
        tags: ["users"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
        },
        body: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", minLength: 8 },
            newPassword: { type: "string", minLength: 8 },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { currentPassword, newPassword } = request.body as any;
      const user = request.user;

      if (id !== user.id) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "You can only change your own password",
        });
      }

      // Verify current password first
      // We need to fetch the user with password hash to verify
      // AuthService.authenticate expects email, but we have ID.
      // We'll need to manually check here or add a method to AuthService.
      // Let's do it manually here for now using AuthService.verifyPassword helper
      const { db } = await import("../db");
      const { users } = await import("../db/schema");
      const { eq } = await import("drizzle-orm");

      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!dbUser || !dbUser.passwordHash) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "User not found",
        });
      }

      const isValid = await AuthService.verifyPassword(
        currentPassword,
        dbUser.passwordHash,
      );
      if (!isValid) {
        return reply.status(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Invalid current password",
        });
      }

      await UserService.changePassword(id, newPassword);

      return {
        message: "Password changed successfully",
      };
    },
  );
};

export default usersRoutes;
