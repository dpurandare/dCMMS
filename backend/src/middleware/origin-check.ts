import { FastifyReply, FastifyRequest } from "fastify";

/**
 * Origins allowed to call the API from a browser. Shared by CORS (server.ts) and the Origin check
 * below so the two can never disagree. Extra origins: CORS_ORIGINS (comma-separated).
 */
export const ALLOWED_ORIGINS: string[] = [
  "http://localhost:3011",
  "http://localhost:3001",
  "http://localhost:4200",
  "http://localhost:3000",
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

/**
 * CSRF defence for the two endpoints that act on the ambient refresh cookie
 * (POST /auth/refresh, POST /auth/logout) -- ADR-005, REV-018a.
 *
 * Every other endpoint authenticates with an `Authorization: Bearer` header, which a cross-site
 * request cannot set, so it is already immune. The cookie is SameSite=Strict; this is the second
 * layer: a browser always sends `Origin` on a cross-site POST, so a present-but-foreign Origin is
 * refused.
 *
 * Rejects ONLY when an Origin header is present and not allowed. Non-browser clients (the mobile
 * app, curl, server-to-server) send no Origin and must not be blocked. It is stateless: no token,
 * no Redis lookup.
 */
export async function requireAllowedOrigin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    request.log.warn({ origin, url: request.url }, "Refused cookie endpoint request from a disallowed Origin");
    return reply.status(403).send({
      statusCode: 403,
      error: "Forbidden",
      message: "Origin not allowed",
    });
  }
}
