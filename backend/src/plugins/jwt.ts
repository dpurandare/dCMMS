import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { authorize, AuthorizeOptions } from "../middleware/authorize";
import { Permission } from "../constants/permissions";

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    authorize: (
      permissions: Permission[] | AuthorizeOptions
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerJwt(server: FastifyInstance) {
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || "changeme-secret-key",
    sign: {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || "15m",
    },
  });

  // Decorator to verify JWT token
  server.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid or missing authentication token",
      });
    }
  });

  // Decorator to authorize users based on permissions
  server.decorate("authorize", function (permissions: Permission[] | AuthorizeOptions) {
    // If array of permissions is passed, convert to options object
    const options: AuthorizeOptions = Array.isArray(permissions)
      ? { permissions }
      : permissions;

    return authorize(options);
  });
}
