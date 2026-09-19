import { FastifyRequest } from "fastify";

/**
 * The authenticated user's tenant, taken from the verified JWT.
 *
 * This exists so there is exactly one obvious way to answer "which tenant is
 * this request for". Several routes answered it from `request.query.tenantId`
 * or `request.body.tenantId` instead, which made them cross-tenant readable by
 * any authenticated user (REV-020). `GET /api/v1/alerts?tenantId=<other>`
 * returned another tenant's alerts in full.
 *
 * A tenant identifier that arrives in the request is attacker-controlled. Only
 * the signed token is not.
 */
export function getTenantId(request: FastifyRequest): string {
  const user = request.user as { tenantId?: string } | undefined;
  const tenantId = user?.tenantId;

  if (!tenantId) {
    // Reachable only if a route forgot `fastify.authenticate`, or a refresh
    // token reached a resource route. Failing loudly beats scoping a query to
    // undefined, which in drizzle silently widens it.
    throw new Error(
      "No tenant on the authenticated request — this route is missing authentication",
    );
  }
  return tenantId;
}
