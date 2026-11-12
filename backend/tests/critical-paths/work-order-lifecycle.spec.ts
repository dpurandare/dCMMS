/**
 * Work-order lifecycle and state machine (REV-038, critical path 2).
 *
 * The allowed-transition table below is written out here deliberately, from the
 * intended lifecycle, and NOT imported from `work-order-state.ts`. A test that
 * derives its expectations from the implementation can only ever agree with it.
 *
 *   draft ─► open ─► scheduled ─► in_progress ─► completed ─► closed
 *              └──────────────────►┘ (open may start directly)
 *   open | scheduled | in_progress ─► on_hold ─► open | scheduled | in_progress
 *   draft | open | scheduled | in_progress | on_hold ─► cancelled
 *   closed and cancelled are terminal.
 */
import { TestServer } from '../helpers/test-server';
import { db } from '../helpers/database';
import { UserFactory } from '../factories/user.factory';
import { loginHeaders } from '../helpers/auth';

type Status =
    | 'draft' | 'open' | 'scheduled' | 'in_progress'
    | 'on_hold' | 'completed' | 'closed' | 'cancelled';

const ALL: Status[] = [
    'draft', 'open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled',
];

const ALLOWED: Record<Status, Status[]> = {
    draft: ['open', 'cancelled'],
    open: ['scheduled', 'in_progress', 'on_hold', 'cancelled'],
    scheduled: ['in_progress', 'on_hold', 'cancelled'],
    in_progress: ['completed', 'on_hold', 'cancelled'],
    on_hold: ['open', 'scheduled', 'in_progress', 'cancelled'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
};

// Shortest valid route from `draft` to each status.
const PATH_TO: Record<Status, Status[]> = {
    draft: [],
    open: ['open'],
    scheduled: ['open', 'scheduled'],
    in_progress: ['open', 'in_progress'],
    on_hold: ['open', 'on_hold'],
    completed: ['open', 'in_progress', 'completed'],
    closed: ['open', 'in_progress', 'completed', 'closed'],
    cancelled: ['cancelled'],
};

describe('work order lifecycle', () => {
    let server: TestServer;
    let headers: Awaited<ReturnType<typeof loginHeaders>>;
    let otherHeaders: Awaited<ReturnType<typeof loginHeaders>>;
    let tenantId: string;
    let userId: string;
    let siteId: string;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
        await db.cleanAll();

        const tenant = await db.seedDefaultTenant();
        tenantId = tenant.id;
        const user = await UserFactory.build({
            email: 'wo-admin@dcmms.local', password: 'password123',
            role: 'super_admin', tenantId,
        });
        await db.insert('users', user);
        userId = user.id;
        headers = await loginHeaders(server, 'wo-admin@dcmms.local', 'password123');

        const siteRes = await server.inject({
            method: 'POST', url: '/api/v1/sites', headers,
            payload: { name: 'Lifecycle Site', siteId: 'LC-SITE' },
        });
        siteId = JSON.parse(siteRes.body).id;

        // A second tenant, to prove transitions can't cross the tenant boundary.
        const other = await db.insert('tenants', {
            tenant_id: 'other-tenant', name: 'Other Tenant', domain: 'other.local',
            is_active: true, config: '{}',
        });
        const otherUser = await UserFactory.build({
            email: 'other-admin@dcmms.local', password: 'password123',
            role: 'super_admin', tenantId: other.id,
        });
        await db.insert('users', otherUser);
        otherHeaders = await loginHeaders(server, 'other-admin@dcmms.local', 'password123');
    }, 60000);

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    async function createWo(overrides: Record<string, unknown> = {}): Promise<string> {
        const res = await server.inject({
            method: 'POST', url: '/api/v1/work-orders', headers,
            payload: { title: 'WO', type: 'corrective', priority: 'medium', siteId, ...overrides },
        });
        expect(res.statusCode).toBe(201);
        return JSON.parse(res.body).id;
    }

    function transition(id: string, status: Status, h = headers) {
        return server.inject({
            method: 'POST', url: `/api/v1/work-orders/${id}/transition`, headers: h,
            payload: { status },
        });
    }

    // `permits.valid_*` are `timestamp WITHOUT time zone`; the app (drizzle) writes and
    // compares them as UTC wall-clock. The test db helper hands a raw Date to `pg`,
    // which writes LOCAL wall-clock -- on a UTC+5:30 machine an "expired" permit then
    // reads as valid for 4.5 hours. Write UTC wall-clock explicitly.
    const utc = (offsetMs: number) =>
        new Date(Date.now() + offsetMs).toISOString().replace('T', ' ').replace('Z', '');

    async function statusOf(id: string): Promise<string> {
        const res = await server.inject({
            method: 'GET', url: `/api/v1/work-orders/${id}`, headers,
        });
        expect(res.statusCode).toBe(200);
        return JSON.parse(res.body).status;
    }

    async function woIn(status: Status): Promise<string> {
        const id = await createWo();
        for (const step of PATH_TO[status]) {
            const r = await transition(id, step);
            expect(r.statusCode).toBe(200);
        }
        expect(await statusOf(id)).toBe(status);
        return id;
    }

    it('runs the full lifecycle draft -> open -> scheduled -> in_progress -> completed -> closed', async () => {
        const id = await createWo();
        expect(await statusOf(id)).toBe('draft');

        for (const next of ['open', 'scheduled', 'in_progress', 'completed', 'closed'] as Status[]) {
            const res = await transition(id, next);
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).status).toBe(next);
            expect(await statusOf(id)).toBe(next);
        }
    });

    it('supports a hold and resume round trip', async () => {
        const id = await woIn('in_progress');
        expect((await transition(id, 'on_hold')).statusCode).toBe(200);
        expect(await statusOf(id)).toBe('on_hold');
        expect((await transition(id, 'in_progress')).statusCode).toBe(200);
        expect(await statusOf(id)).toBe('in_progress');
    });

    // The whole 8x8 matrix: every allowed pair succeeds, every other pair is
    // rejected as a CLIENT error and leaves the stored status untouched.
    describe.each(ALL)('from %s', (from) => {
        const allowed = ALLOWED[from];
        const forbidden = ALL.filter((to) => !allowed.includes(to));

        if (allowed.length) {
            it.each(allowed)('-> %s is allowed', async (to) => {
                const id = await woIn(from);
                const res = await transition(id, to);
                expect(res.statusCode).toBe(200);
                expect(await statusOf(id)).toBe(to);
            });
        }

        it.each(forbidden)('-> %s is rejected with a 4xx and changes nothing', async (to) => {
            const id = await woIn(from);
            const res = await transition(id, to);
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            // An invalid transition is the caller's mistake, not a server fault.
            expect(res.statusCode).toBeLessThan(500);
            expect(await statusOf(id)).toBe(from);
        });
    });

    describe('PATCH /work-orders/:id must not be a way around the state machine', () => {
        it('rejects draft -> closed via PATCH', async () => {
            const id = await createWo();
            const res = await server.inject({
                method: 'PATCH', url: `/api/v1/work-orders/${id}`, headers,
                payload: { status: 'closed' },
            });
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(await statusOf(id)).toBe('draft');
        });
    });

    describe('safety gate: critical / emergency work needs an active permit to start', () => {
        it('blocks open -> in_progress on a critical WO without a permit', async () => {
            const id = await createWo({ priority: 'critical' });
            await transition(id, 'open');
            const res = await transition(id, 'in_progress');
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(await statusOf(id)).toBe('open');
        });

        it('blocks the same start on an emergency WO without a permit', async () => {
            const id = await createWo({ type: 'emergency' });
            await transition(id, 'open');
            const res = await transition(id, 'in_progress');
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(await statusOf(id)).toBe('open');
        });

        it('allows the start once an active, unexpired permit is attached', async () => {
            const id = await createWo({ priority: 'critical' });
            await transition(id, 'open');
            await db.insert('permits', {
                tenantId, permitId: `P-${Date.now()}`, type: 'hot_work', status: 'active',
                workOrderId: id, validFrom: utc(-3600_000),
                validUntil: utc(3600_000), issuedBy: userId,
            });
            const res = await transition(id, 'in_progress');
            expect(res.statusCode).toBe(200);
            expect(await statusOf(id)).toBe('in_progress');
        });

        it('does not accept an expired permit', async () => {
            const id = await createWo({ priority: 'critical' });
            await transition(id, 'open');
            await db.insert('permits', {
                tenantId, permitId: `P-EXP-${Date.now()}`, type: 'hot_work', status: 'active',
                workOrderId: id, validFrom: utc(-7200_000),
                validUntil: utc(-3600_000), issuedBy: userId,
            });
            const res = await transition(id, 'in_progress');
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(await statusOf(id)).toBe('open');
        });

        // The gate lives in transitionStatus(); PATCH goes through update().
        it('cannot be bypassed by PATCHing status straight to in_progress', async () => {
            const id = await createWo({ priority: 'critical' });
            await transition(id, 'open');
            const res = await server.inject({
                method: 'PATCH', url: `/api/v1/work-orders/${id}`, headers,
                payload: { status: 'in_progress' },
            });
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(await statusOf(id)).toBe('open');
        });
    });

    describe('tenant boundary', () => {
        it("another tenant cannot transition this tenant's work order", async () => {
            const id = await createWo();
            const res = await transition(id, 'open', otherHeaders);
            expect(res.statusCode).not.toBe(200);
            expect(res.statusCode).toBeLessThan(500);
            expect(await statusOf(id)).toBe('draft');
        });
    });

    it('rejects a status outside the vocabulary at the schema layer', async () => {
        const id = await createWo();
        const res = await server.inject({
            method: 'POST', url: `/api/v1/work-orders/${id}/transition`, headers,
            payload: { status: 'banana' },
        });
        expect(res.statusCode).toBe(400);
    });
});
