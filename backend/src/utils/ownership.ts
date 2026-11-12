import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  sites,
  assets,
  users,
  parts,
  crews,
  alerts,
} from "../db/schema";

/**
 * Cross-tenant reference checks.
 *
 * `getTenantId(request)` (utils/tenant.ts) answers "which tenant is this
 * request for". This answers the other half: "does the OTHER resource the
 * request names belong to that tenant". A route that scopes its own lookup
 * correctly but then stores a caller-supplied `siteId` / `userId` / `partId`
 * without checking it lets tenant B attach tenant A's resources to B's rows --
 * and every later join (`with: { site: true }`) hands A's data back to B.
 *
 * A reference to another tenant's row is reported exactly like a reference to
 * a row that does not exist (404), so the response cannot be used to probe
 * which ids exist elsewhere.
 */
export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

const TENANT_SCOPED = { site: sites, asset: assets, user: users, part: parts, crew: crews, alert: alerts };
export type OwnedKind = keyof typeof TENANT_SCOPED;

/**
 * Throws NotFoundError unless `id` is a `kind` row owned by `tenantId`.
 * `null` / `undefined` pass: optional references are checked only when present.
 */
export async function assertInTenant(
  kind: OwnedKind,
  id: string | null | undefined,
  tenantId: string,
): Promise<void> {
  if (!id) return;
  const table = TENANT_SCOPED[kind] as any;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new NotFoundError(kind);
}

/**
 * Boolean form for handlers that wrap their body in try/catch and turn every
 * thrown error into a 500: there a thrown NotFoundError would come out as a
 * server fault, so the handler checks and replies 404 itself.
 */
export async function isInTenant(
  kind: OwnedKind,
  id: string | null | undefined,
  tenantId: string,
): Promise<boolean> {
  try {
    await assertInTenant(kind, id, tenantId);
    return true;
  } catch (e) {
    if (e instanceof NotFoundError) return false;
    throw e;
  }
}
