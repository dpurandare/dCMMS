/**
 * Cross-tenant isolation (REV-020).
 *
 * The withdrawn security audit recorded "Authorization Bypass ✅ PASS — Tenant
 * isolation enforced". It was checked by reading code. Exercised against a
 * running server, `GET /api/v1/alerts?tenantId=<other tenant>` returned another
 * tenant's alerts in full, to any authenticated user.
 *
 * The rule these tests encode: a tenant identifier supplied by the caller must
 * never widen what that caller can see. Only the signed token decides.
 */
import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { buildServer } from "../../src/server";
import { db } from "../../src/db";
import { tenants, sites, users, assets, alerts, workOrders } from "../../src/db/schema";

interface Tenant {
  id: string;
  siteId: string;
  userId: string;
  email: string;
  token: string;
}

const PASSWORD = "TenantIsolationTest123!";

describe("cross-tenant isolation", () => {
  let app: FastifyInstance;
  let alice: Tenant;
  let mallory: Tenant;

  async function createTenant(slug: string): Promise<Omit<Tenant, "token">> {
    const [tenant] = await db
      .insert(tenants)
      .values({ tenantId: slug, name: `${slug} Inc`, domain: `${slug}.test` })
      .returning();

    const [site] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteId: `${slug}-site`,
        name: `${slug} Site`,
        type: "solar",
        location: JSON.stringify({ lat: 0, lon: 0 }),
      })
      .returning();

    const email = `admin@${slug}.test`;
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email,
        username: `${slug}-admin`,
        firstName: "Test",
        lastName: "Admin",
        role: "tenant_admin",
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      })
      .returning();

    const [asset] = await db
      .insert(assets)
      .values({
        tenantId: tenant.id,
        siteId: site.id,
        assetId: `${slug}-asset`,
        name: `${slug} inverter`,
        type: "inverter",
      })
      .returning();

    await db.insert(alerts).values({
      tenantId: tenant.id,
      siteId: site.id,
      assetId: asset.id,
      alertId: `${slug}-alert`,
      title: `${slug} confidential alert`,
      severity: "critical",
      status: "active",
    });

    await db.insert(workOrders).values({
      tenantId: tenant.id,
      siteId: site.id,
      assetId: asset.id,
      workOrderId: `${slug}-wo`,
      title: `${slug} confidential work order`,
      type: "corrective",
      createdBy: user.id,
    });

    return { id: tenant.id, siteId: site.id, userId: user.id, email };
  }

  async function login(email: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken;
  }

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    const a = await createTenant("alice-corp");
    const m = await createTenant("mallory-corp");
    alice = { ...a, token: await login(a.email) };
    mallory = { ...m, token: await login(m.email) };
  }, 60_000);

  afterAll(async () => {
    for (const slug of ["alice-corp", "mallory-corp"]) {
      const [t] = await db.select().from(tenants).where(eq(tenants.tenantId, slug));
      if (t) await db.delete(tenants).where(eq(tenants.id, t.id));
    }
    await app?.close();
  });

  /** Every string in a response body, so leaked values cannot hide in nesting. */
  function bodyOf(response: { body: string }): string {
    return response.body;
  }

  describe("a tenantId supplied by the caller is ignored", () => {
    // This is the exact request that leaked before the fix.
    it("does not widen GET /alerts to another tenant", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/alerts?tenantId=${mallory.id}`,
        headers: { authorization: `Bearer ${alice.token}` },
      });

      expect(response.statusCode).toBeLessThan(500);
      expect(bodyOf(response)).not.toContain("mallory-corp confidential alert");
      expect(bodyOf(response)).not.toContain(mallory.id);
    });

    it("does not widen GET /notifications/history to another tenant", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/notifications/history?tenantId=${mallory.id}`,
        headers: { authorization: `Bearer ${alice.token}` },
      });

      expect(response.statusCode).toBeLessThan(500);
      expect(bodyOf(response)).not.toContain(mallory.id);
    });
  });

  describe("listing endpoints return only the caller's own tenant", () => {
    const listings: Array<[string, string, string]> = [
      ["alerts", "/api/v1/alerts", "mallory-corp confidential alert"],
      ["work orders", "/api/v1/work-orders", "mallory-corp confidential work order"],
      ["assets", "/api/v1/assets", "mallory-corp inverter"],
      ["sites", "/api/v1/sites", "mallory-corp Site"],
    ];

    it.each(listings)("%s", async (_name, url, secret) => {
      const response = await app.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${alice.token}` },
      });

      expect(response.statusCode).toBeLessThan(500);
      expect(bodyOf(response)).not.toContain(secret);
      expect(bodyOf(response)).not.toContain(mallory.id);
    });
  });

  describe("fetching another tenant's row by id is refused", () => {
    it("does not return another tenant's site", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/sites/${mallory.siteId}`,
        headers: { authorization: `Bearer ${alice.token}` },
      });

      // 403 or 404 are both fine. 200 with the row is not.
      expect([401, 403, 404]).toContain(response.statusCode);
      expect(bodyOf(response)).not.toContain("mallory-corp Site");
    });
  });

  it("rejects an unauthenticated caller outright", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/alerts" });
    expect(response.statusCode).toBe(401);
  });
});
