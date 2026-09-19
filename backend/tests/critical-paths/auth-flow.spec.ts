/**
 * Login / refresh / logout (REV-038, critical path 1 of 6).
 *
 * Found while scoping this task: there was no dedicated test for this flow
 * anywhere in the repo — the single most foundational path (nothing else
 * works if auth is broken) had zero direct coverage. This is a first pass,
 * not the full REV-038 scope; see docs/review/test-plan.md for what the
 * other five critical paths still need.
 */
import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { buildServer } from "../../src/server";
import { db } from "../../src/db";
import { tenants, sites, users } from "../../src/db/schema";
import { clearLoginFailures } from "../../src/services/login-throttle.service";

const PASSWORD = "AuthFlowTest123!";
const SLUG = "auth-flow-test-co";
const NONEXISTENT_EMAIL = "nobody@nowhere.test";

describe("auth flow: login / refresh / logout", () => {
  let app: FastifyInstance;
  let email: string;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    const [tenant] = await db
      .insert(tenants)
      .values({ tenantId: SLUG, name: `${SLUG} Inc`, domain: `${SLUG}.test` })
      .returning();

    const [site] = await db
      .insert(sites)
      .values({
        tenantId: tenant.id,
        siteId: `${SLUG}-site`,
        name: `${SLUG} Site`,
        type: "solar",
        location: JSON.stringify({ lat: 0, lon: 0 }),
      })
      .returning();
    void site;

    email = `admin@${SLUG}.test`;
    await db.insert(users).values({
      tenantId: tenant.id,
      email,
      username: `${SLUG}-admin`,
      firstName: "Test",
      lastName: "Admin",
      role: "tenant_admin",
      passwordHash: await bcrypt.hash(PASSWORD, 10),
    });

    // This file's own deliberate failed-login tests accumulate in the real
    // REV-022 per-email throttle (Redis, 15-minute window) across repeated
    // runs of this same file — that's the throttle working correctly, not
    // an app bug, but it makes the suite order/history-dependent unless
    // cleared first. Start from a known-clean slate every run.
    await clearLoginFailures(app, email);
    await clearLoginFailures(app, NONEXISTENT_EMAIL);
  }, 30_000);

  afterAll(async () => {
    const [t] = await db.select().from(tenants).where(eq(tenants.tenantId, SLUG));
    if (t) await db.delete(tenants).where(eq(tenants.id, t.id));
    await clearLoginFailures(app, email);
    await clearLoginFailures(app, NONEXISTENT_EMAIL);
    await app?.close();
  });

  function refreshCookieFrom(response: { cookies: Array<{ name: string; value: string }> }) {
    return response.cookies.find((c) => c.name === "dcmms_refresh_token");
  }

  describe("POST /auth/login", () => {
    it("succeeds with correct credentials: returns an access token and sets the refresh cookie", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.user.email).toBe(email);

      const cookie = refreshCookieFrom(response);
      expect(cookie).toBeDefined();
      // HttpOnly + SameSite=Strict is the actual security property ADR-005
      // relies on — assert the attributes, not just that a cookie exists.
      expect(response.headers["set-cookie"]).toEqual(
        expect.stringContaining("HttpOnly"),
      );
      expect(response.headers["set-cookie"]).toEqual(
        expect.stringMatching(/SameSite=Strict/i),
      );
    });

    it("rejects an incorrect password without revealing whether the email exists", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: "wrong-password-entirely" },
      });

      expect(response.statusCode).toBe(401);
      expect(refreshCookieFrom(response)).toBeUndefined();
    });

    it("rejects a login for an email that doesn't exist, with the same shape as a wrong password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: NONEXISTENT_EMAIL, password: "whatever123" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns the current user for a valid access token", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: PASSWORD },
      });
      const { accessToken } = login.json();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().email).toBe(email);
    });

    it("rejects a request with no token", async () => {
      const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
      expect(response.statusCode).toBe(401);
    });

    it("rejects a garbage token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: "Bearer not-a-real-token" },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("rejects a refresh with no cookie at all", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/auth/refresh" });
      expect(response.statusCode).toBe(401);
    });

    it("issues a new access token and rotates the refresh cookie", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: PASSWORD },
      });
      const originalCookie = refreshCookieFrom(login)!;

      const refresh = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { [originalCookie.name]: originalCookie.value },
      });

      expect(refresh.statusCode).toBe(200);
      expect(refresh.json().accessToken).toEqual(expect.any(String));

      const rotatedCookie = refreshCookieFrom(refresh);
      expect(rotatedCookie).toBeDefined();
      // Rotation must issue a genuinely different token, not resend the same one.
      expect(rotatedCookie!.value).not.toBe(originalCookie.value);
    });

    it("rejects reusing a refresh token after it has already been rotated away — the exact property ADR-005 depends on", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: PASSWORD },
      });
      const originalCookie = refreshCookieFrom(login)!;

      // First use rotates it and succeeds.
      const firstRefresh = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { [originalCookie.name]: originalCookie.value },
      });
      expect(firstRefresh.statusCode).toBe(200);

      // Reusing the now-stale original token must fail, not silently succeed.
      const replay = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { [originalCookie.name]: originalCookie.value },
      });
      expect(replay.statusCode).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("revokes the session: a refresh with the pre-logout cookie fails afterward", async () => {
      const login = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email, password: PASSWORD },
      });
      const { accessToken } = login.json();
      const cookie = refreshCookieFrom(login)!;

      const logout = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(logout.statusCode).toBe(200);

      const refreshAfterLogout = await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        cookies: { [cookie.name]: cookie.value },
      });
      expect(refreshAfterLogout.statusCode).toBe(401);
    });

    it("rejects logout without authentication", async () => {
      const response = await app.inject({ method: "POST", url: "/api/v1/auth/logout" });
      expect(response.statusCode).toBe(401);
    });
  });
});
