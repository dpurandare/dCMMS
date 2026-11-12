/**
 * Permission enforcement per role (REV-038, critical path 5).
 *
 * HOW THIS PROBES. Fastify validates the request body BEFORE `preHandler`
 * runs, so an authorization check hides behind a 400 whenever the body is
 * invalid -- a probe sending `{}` cannot tell "denied" from "rejected for a bad
 * body". To observe authorization on its own, this spec wraps Fastify so that
 * every route's `schema` is dropped (this file only; jest mocks are
 * file-scoped). Every request then reaches the real preHandler/onRequest chain
 * and the status says only: 401/403 = denied, anything else = the role got as
 * far as the handler.
 *
 * What is asserted:
 *   1. INTENT  -- for the core resources, each route must require the
 *      permission written below. Allowed roles are DERIVED from
 *      ROLE_PERMISSIONS, not read off the route's own authorize() options, so
 *      this checks the wiring, not the route against itself.
 *   2. VIEWER IS READ-ONLY -- `viewer` is documented as read-only
 *      (constants/permissions.ts). It must be denied on every mutating route
 *      except SELF_SERVICE.
 *   3. KNOWN GAPS RATCHET -- routes where the viewer can still write and that
 *      need a product decision are listed in KNOWN_VIEWER_GAPS. A NEW gap fails
 *      the test; a gap that gets fixed also fails it until its entry is removed,
 *      so the list can only shrink.
 *   4. super_admin can reach everything any other role can.
 *
 * Do NOT put /auth/logout in the probe: logout deletes the caller's CSRF token,
 * so every later request 403s for the wrong reason (an earlier version of this
 * probe did exactly that and produced a plausible-looking, wrong matrix).
 */
import { TestServer } from '../helpers/test-server';
import { db } from '../helpers/database';
import { UserFactory } from '../factories/user.factory';
import { loginHeaders } from '../helpers/auth';
import { hasAnyPermission, Permission, UserRole } from '../../src/constants/permissions';

const mockRoutes: Array<{ method: string | string[]; url: string }> = [];
jest.mock('fastify', () => {
    const real = jest.requireActual('fastify');
    const wrapped: any = (...args: any[]) => {
        const app = real(...args);
        app.addHook('onRoute', (r: any) => {
            mockRoutes.push({ method: r.method, url: r.url });
            delete r.schema; // see header: expose authorization, not validation
        });
        return app;
    };
    return Object.assign(wrapped, real, { default: wrapped, __esModule: true });
});

const ROLES: UserRole[] = [
    'viewer', 'operator', 'technician', 'site_manager', 'tenant_admin', 'super_admin',
];
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];
const UUID = '00000000-0000-4000-8000-000000000001';

type Key = string; // "METHOD /api/v1/..." exactly as registered
const key = (m: string, url: string): Key => `${m} ${url.replace(/\/$/, '')}`;

/** Any authenticated user may do these to their own account/telemetry. */
const SELF_SERVICE: Key[] = [
    'POST /api/v1/audit-logs/frontend',
    'POST /api/v1/users/device-token',
    'DELETE /api/v1/users/device-token',
];

/**
 * Compute-only POSTs: they take a body but do not change stored state a viewer
 * should be unable to change (preview/validate/execute a saved report).
 */
const READ_ONLY_POSTS: Key[] = [
    'POST /api/v1/compliance/templates/:templateId/auto-populate',
    'POST /api/v1/compliance/templates/:templateId/preview',
    'POST /api/v1/compliance/templates/:templateId/validate',
    'POST /api/v1/reports/:id/execute',
];

/**
 * Viewer can still write here. Each needs a product decision on WHICH
 * permission should guard it (the vocabulary has no obvious one) -- not a
 * mechanical fix. Tracked under REV-038 in TasksTracking/15_Review_Remediation.md.
 */
const KNOWN_VIEWER_GAPS: Record<Key, string> = {
    'POST /api/v1/dashboards': 'no authorize(); create:dashboards exists but may be meant to be per-user',
    'PUT /api/v1/dashboards/:id': 'no authorize()',
    'DELETE /api/v1/dashboards/:id': 'no authorize()',
    'POST /api/v1/forecasts/generation/generate': 'guarded by read:forecasts; no write permission exists',
    'PUT /api/v1/forecasts/generation/:forecastId/actual': 'guarded by read:forecasts; no write permission exists',
    'POST /api/v1/forecasts/accuracy/calculate': 'guarded by read:forecasts; no write permission exists',
    'POST /api/v1/telemetry': 'guarded by read:telemetry; ingestion may be machine-to-machine',
    'POST /api/v1/weather/refresh/:siteId': 'no authorize(); triggers an external fetch',
    'POST /api/v1/ml-inference/predictions/cache/clear': 'no authorize()',
    'POST /api/v1/model-governance/register': 'no authorize(); no model-governance permissions exist',
    'PUT /api/v1/model-governance/:modelId/stage': 'no authorize()',
    'POST /api/v1/model-governance/:modelId/approval/request': 'no authorize()',
    'POST /api/v1/model-governance/:modelId/approval/approve': 'no authorize() -- any user can approve a model',
    'POST /api/v1/model-governance/:modelId/approval/reject': 'no authorize()',
    'PUT /api/v1/model-governance/:modelId/checklist/:itemId': 'no authorize()',
    'POST /api/v1/model-governance/:modelId/documentation': 'no authorize()',
    'POST /api/v1/model-governance/:modelId/retire': 'no authorize()',
    'POST /api/v1/model-governance/:modelId/incidents': 'no authorize()',
    'PUT /api/v1/model-governance/incidents/:incidentId': 'no authorize()',
};

/** The permission(s) each core route must require. A list means ANY of them. */
const INTENT: Record<Key, Permission[]> = {
    // assets
    'POST /api/v1/assets': ['create:assets'],
    'PATCH /api/v1/assets/:id': ['update:assets'],
    'DELETE /api/v1/assets/:id': ['delete:assets'],
    'POST /api/v1/assets/:id/tags': ['update:assets'],
    'DELETE /api/v1/assets/:id/tags/:tag': ['update:assets'],
    // work orders and everything hanging off them
    'POST /api/v1/work-orders': ['create:work-orders'],
    'PATCH /api/v1/work-orders/:id': ['update:work-orders'],
    'DELETE /api/v1/work-orders/:id': ['delete:work-orders'],
    'POST /api/v1/work-orders/:id/transition': ['update:work-orders', 'close:work-orders'],
    'POST /api/v1/work-orders/:id/tasks': ['update:work-orders'],
    'PATCH /api/v1/work-orders/:id/tasks/:taskId': ['update:work-orders'],
    'DELETE /api/v1/work-orders/:id/tasks/:taskId': ['update:work-orders'],
    'POST /api/v1/work-orders/:id/parts': ['update:work-orders'],
    'DELETE /api/v1/work-orders/:id/parts/:partId': ['update:work-orders'],
    'POST /api/v1/work-orders/:id/labor': ['update:work-orders'],
    'POST /api/v1/work-orders/:workOrderId/attachments': ['update:work-orders'],
    'DELETE /api/v1/work-orders/:workOrderId/attachments/:attachmentId': ['update:work-orders'],
    // sites, users, webhooks, permits
    'POST /api/v1/sites': ['create:sites'],
    'PATCH /api/v1/sites/:id': ['update:sites'],
    'DELETE /api/v1/sites/:id': ['delete:sites'],
    'POST /api/v1/users': ['create:users'],
    'PUT /api/v1/users/:id': ['update:users'],
    'DELETE /api/v1/users/:id': ['delete:users'],
    'POST /api/v1/webhooks': ['manage:webhooks'],
    'PUT /api/v1/webhooks/:id': ['manage:webhooks'],
    'DELETE /api/v1/webhooks/:id': ['manage:webhooks'],
    'POST /api/v1/webhooks/:id/test': ['manage:webhooks'],
    'POST /api/v1/permits': ['create:permits'],
    'PATCH /api/v1/permits/:id': ['update:permits'],
    'DELETE /api/v1/permits/:id': ['delete:permits'],
    // reports and compliance: these were guarded only by the READ permission
    'POST /api/v1/reports': ['create:reports'],
    'PUT /api/v1/reports/:id': ['create:reports'],
    'DELETE /api/v1/reports/:id': ['create:reports'],
    'POST /api/v1/reports/:id/execute': ['read:reports'],
    'POST /api/v1/compliance/reports': ['create:compliance'],
    'PATCH /api/v1/compliance/reports/:reportId/status': ['submit:compliance', 'approve:compliance'],
};

describe('permission enforcement per role', () => {
    let server: TestServer;
    // route key -> role -> HTTP status
    const status = new Map<Key, Record<string, number | string>>();

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
        await db.cleanAll();
        const tenant = await db.seedDefaultTenant();

        const headers: Record<string, Awaited<ReturnType<typeof loginHeaders>>> = {};
        for (const role of ROLES) {
            const user = await UserFactory.build({
                email: `${role}@rbac.local`, password: 'password123', role, tenantId: tenant.id,
            });
            await db.insert('users', user);
            headers[role] = await loginHeaders(server, `${role}@rbac.local`, 'password123');
        }

        const probe = mockRoutes.filter((r) => {
            const url = String(r.url);
            // /auth/* (logout deletes the CSRF token) and Slack (HMAC, not role-based) are out of scope
            return url.startsWith('/api/') && !url.includes('/auth/') && !url.includes('/slack/');
        });

        for (const r of probe) {
            const methods = ([] as string[]).concat(r.method).filter((m) => MUTATING.includes(m));
            for (const method of methods) {
                const row: Record<string, number | string> = {};
                const url = String(r.url).replace(/:[A-Za-z]+/g, UUID);
                for (const role of ROLES) {
                    const res = await Promise.race([
                        server.inject({ method: method as any, url, headers: headers[role], payload: {} }),
                        new Promise<{ statusCode: string }>((resolve) =>
                            setTimeout(() => resolve({ statusCode: 'timeout' }), 8000)),
                    ]);
                    row[role] = res.statusCode;
                }
                status.set(key(method, String(r.url)), row);
            }
        }
    }, 300000);

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    const reached = (k: Key, role: UserRole) => {
        const s = status.get(k)![role];
        return s !== 401 && s !== 403;
    };

    it('discovered a plausible number of mutating routes (guards against a silently empty probe)', () => {
        expect(status.size).toBeGreaterThan(60);
        // every INTENT entry must name a route that really exists
        for (const k of Object.keys(INTENT)) expect(status.has(k)).toBe(true);
    });

    describe('INTENT: each core route requires the permission it should', () => {
        it.each(Object.keys(INTENT))('%s', (k) => {
            const need = INTENT[k];
            for (const role of ROLES) {
                const shouldReach = hasAnyPermission(role, need);
                expect({ route: k, role, reached: reached(k, role) })
                    .toEqual({ route: k, role, reached: shouldReach });
            }
        });
    });

    describe('viewer is read-only', () => {
        it('is denied on every mutating route except the documented exceptions', () => {
            const allowed = new Set<Key>([
                ...SELF_SERVICE, ...READ_ONLY_POSTS, ...Object.keys(KNOWN_VIEWER_GAPS),
            ]);
            const offenders = [...status.keys()].filter((k) => reached(k, 'viewer') && !allowed.has(k));
            expect(offenders).toEqual([]);
        });

        it('KNOWN_VIEWER_GAPS has no stale entries (fixed gaps must be removed from the list)', () => {
            const stale = Object.keys(KNOWN_VIEWER_GAPS).filter((k) => !status.has(k) || !reached(k, 'viewer'));
            expect(stale).toEqual([]);
        });
    });

    it('super_admin can reach every route that any other role can', () => {
        const blocked = [...status.keys()].filter(
            (k) => ROLES.some((r) => reached(k, r)) && !reached(k, 'super_admin'),
        );
        expect(blocked).toEqual([]);
    });

    it('no role below tenant_admin reaches a route tenant_admin cannot', () => {
        const inverted = [...status.keys()].filter(
            (k) => !reached(k, 'tenant_admin') && ROLES.some((r) => r !== 'super_admin' && reached(k, r)),
        );
        expect(inverted).toEqual([]);
    });
});
