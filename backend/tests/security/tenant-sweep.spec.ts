/**
 * Cross-tenant sweep (REV-038 critical path 4 / REV-020 follow-through).
 *
 * `tenant-isolation.spec.ts` pins the specific bugs that were found by reading
 * code. This is the systematic version: it does not know which routes are
 * buggy, it asks every one of them.
 *
 *   - Two tenants, A and B, each with a row in EVERY table (generic seeder:
 *     tests/helpers/tenant-world.ts), every string tagged `CANARY-<tenant>`.
 *   - Tenant B's admin then attacks tenant A's real rows through every
 *     registered route: A's ids in path params (all of them, in all
 *     positions), in the query string, and in request bodies together with
 *     `tenantId` mass-assignment attempts.
 *   - READ leak:  a response containing any of A's ids (other than the one the
 *     attacker itself put in the URL) or the CANARY-A marker.
 *   - WRITE leak: any of A's rows modified or deleted afterwards, or any new
 *     row that points at A (tenant_id = A, or a column holding one of A's ids).
 *
 * Positive control: the same probes run with B's OWN ids must return B's data
 * on a healthy number of routes -- otherwise "nothing leaked" could just mean
 * "everything errored".
 *
 * Runs against its own throwaway database (it deletes and mutates data, and
 * Jest runs spec files in parallel against the shared test DB). Production
 * validation stays ON for every route: write bodies are GENERATED from each
 * route's own schema (zod or JSON-schema) with tenant A's ids placed in every
 * field that can hold one. So a finding means a valid request really did it,
 * and `tenantId` mass-assignment only counts where the schema allows the field.
 * (An earlier version stripped schemas and over-reported exactly this.)
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import bcrypt from 'bcrypt';
import * as path from 'path';
import { randomUUID } from 'crypto';

import * as schema from '../../src/db/schema';
import { seedWorld, World } from '../helpers/tenant-world';

const mockRoutes: Array<{ method: string | string[]; url: string; schema?: any }> = [];
jest.mock('fastify', () => {
    const real = jest.requireActual('fastify');
    const wrapped: any = (...args: any[]) => {
        const app = real(...args);
        // Record only; production validation stays ON so a finding means a VALID request did it.
        app.addHook('onRoute', (r: any) => { mockRoutes.push({ method: r.method, url: r.url, schema: r.schema }); });
        return app;
    };
    return Object.assign(wrapped, real, { default: wrapped, __esModule: true });
});

/** Body fields that hold another resource's id, and which table's A-row to put there. */
const FK_FIELDS: Record<string, string> = {
    siteId: 'sites', assetId: 'assets', workOrderId: 'work_orders', userId: 'users', assignedTo: 'users',
    assignedCrewId: 'crews', crewId: 'crews', partId: 'parts', alertId: 'alerts', reportId: 'reports',
    dashboardId: 'dashboards', permitId: 'permits', parentId: 'assets', parentAssetId: 'assets',
    webhookId: 'webhooks', tenantId: 'tenants', tenant_id: 'tenants',
};

/** Can this zod type hold a 36-char uuid? (sites.siteId is a 2-20 char code, not a foreign key.) */
function canHoldUuid(z: any): boolean {
    let cur = z;
    while (cur?._def && (cur._def.innerType || cur._def.schema)) cur = cur._def.innerType ?? cur._def.schema;
    const max = (cur?._def?.checks ?? []).find((c: any) => c.kind === 'max')?.value;
    return max === undefined || max >= 36;
}

function fromZod(z: any, key: string, A: World): unknown {
    const fk = FK_FIELDS[key];
    if (fk && A.ids[fk]?.[0] && canHoldUuid(z)) return A.ids[fk][0];
    const t = z?._def?.typeName;
    const checks: any[] = z?._def?.checks ?? [];
    const check = (kind: string) => checks.find((c) => c.kind === kind);
    switch (t) {
        case 'ZodObject': {
            const shape = typeof z.shape === 'function' ? z.shape() : z.shape;
            return Object.fromEntries(Object.entries(shape).map(([k, v]) => [k, fromZod(v, k, A)]));
        }
        case 'ZodOptional': case 'ZodNullable': case 'ZodDefault': case 'ZodReadonly': case 'ZodBranded':
            return fromZod(z._def.innerType ?? z._def.type, key, A);
        case 'ZodEffects': return fromZod(z._def.schema, key, A);
        case 'ZodString': {
            if (check('uuid')) return randomUUID();
            if (check('email')) return 'attacker@b.test';
            if (check('datetime')) return new Date().toISOString();
            if (check('url')) return 'https://example.com';
            // A regex we can't invert: try plausible values against the route's own pattern.
            const rx = check('regex')?.regex as RegExp | undefined;
            if (rx) {
                const hit = ['10:00', '22:30', '2026-01-01', '+15551234567', 'abc', '123', 'a@b.co', 'https://example.com']
                    .find((c) => { rx.lastIndex = 0; return rx.test(c); });
                if (hit) return hit;
            }
            let v = 'x'.repeat(Math.max(check('min')?.value ?? 1, 1));
            const max = check('max')?.value;
            if (max) v = v.slice(0, max);
            return v;
        }
        case 'ZodNumber': {
            const min = check('min'); const max = check('max');
            let v = min ? (min.inclusive ? min.value : min.value + 1) : 1;
            if (max && v > max.value) v = max.value;
            return v;
        }
        case 'ZodBoolean': return false;
        case 'ZodEnum': return z._def.values[0];
        case 'ZodNativeEnum': return Object.values(z._def.values)[0];
        case 'ZodLiteral': return z._def.value;
        case 'ZodArray': return [fromZod(z._def.type, key, A)];
        case 'ZodUnion': case 'ZodDiscriminatedUnion': {
            const opts = z._def.options;
            return fromZod(Array.isArray(opts) ? opts[0] : [...opts.values()][0], key, A);
        }
        case 'ZodRecord': case 'ZodAny': case 'ZodUnknown': return {};
        case 'ZodDate': return new Date().toISOString();
        case 'ZodLazy': return fromZod(z._def.getter(), key, A);
        default: return undefined;
    }
}

function fromJson(s: any, key: string, A: World): unknown {
    const fk = FK_FIELDS[key];
    if (fk && A.ids[fk]?.[0]) return A.ids[fk][0];
    if (!s) return undefined;
    if (s.enum) return s.enum[0];
    switch (s.type) {
        case 'object': return Object.fromEntries(Object.entries(s.properties ?? {}).map(([k, v]) => [k, fromJson(v, k, A)]));
        case 'array': return [fromJson(s.items, key, A)];
        case 'string':
            if (s.format === 'uuid') return randomUUID();
            if (s.format === 'email') return 'attacker@b.test';
            if (s.format === 'date-time') return new Date().toISOString();
            if (s.format === 'uri' || s.format === 'url') return 'https://example.com/hook';
            return 'x'.repeat(Math.max(s.minLength ?? 1, 1));
        case 'integer': case 'number': return Math.max(s.minimum ?? 1, 1);
        case 'boolean': return false;
        default: return undefined;
    }
}

/**
 * A body that satisfies the route's own schema. Routes with NO body schema take
 * the raw body as-is, so they get a hostile generic one (mass-assignment bait).
 */
function bodyFor(schema: any, A: World): Record<string, unknown> {
    const body = schema?.body;
    if (body) {
        const v = typeof body.safeParse === 'function' ? fromZod(body, '', A) : fromJson(body, '', A);
        return (v ?? {}) as Record<string, unknown>;
    }
    const first = (t: string) => A.ids[t]?.[0];
    return {
        tenantId: A.tenantId, tenant_id: A.tenantId, role: 'super_admin', passwordHash: 'x', isActive: false,
        name: 'HACKED-BY-B', title: 'HACKED-BY-B', description: 'HACKED-BY-B', status: 'cancelled',
        siteId: first('sites'), assetId: first('assets'), workOrderId: first('work_orders'),
        userId: first('users'), assignedTo: first('users'), partId: first('parts'), crewId: first('crews'),
        newPassword: 'HackedPassword123!', currentPassword: 'HackedPassword123!',
    };
}

const stringsIn = (v: unknown, out: string[] = []): string[] => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => stringsIn(x, out));
    return out;
};

const PASSWORD = 'TenantSweep123!';
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SKIP_URL = (u: string) => u.includes('/auth/') || u.includes('/slack/');

const urlFor = (database: string) => {
    const u = new URL(process.env.DATABASE_URL!);
    u.pathname = `/${database}`;
    return u.toString();
};

/**
 * Routes known to leak. EMPTY is the goal. An entry is a documented, accepted
 * (or not-yet-fixed) finding: `'METHOD /route': 'why'`. A NEW leak fails the
 * test; a fixed one also fails it until its entry is removed (two-sided ratchet).
 */
const KNOWN_LEAKS: Record<string, string> = {};

describe('cross-tenant sweep: tenant B attacks tenant A through every route', () => {
    const dbName = `dcmms_sweep_${process.pid}_${Date.now()}`;
    let admin: Pool;
    let pool: Pool;
    let A: World;
    let B: World;
    let server: any;
    let headers: Record<string, string>;
    let aIds: string[] = [];          // every id A owns, flat
    let aPool: string[] = [];         // aIds + A's natural keys (template codes, permit numbers, ...)
    let snapshot = new Map<string, string>(); // "table:id" -> jsonb text, A's rows
    let bSnapshot = new Map<string, string>(); // same, B's rows (to catch B's rows being re-pointed at A)
    let known: Record<string, Set<string>> = {};
    const violations = new Set<string>();
    const unprobed: string[] = []; // write routes where EVERY request died in validation: the generator failed
    const stats = { routes: 0, requests: 0, controlHits: 0, resets: 0 };

    const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);

    async function truncateAll() {
        const { rows } = await q(
            `select tablename from pg_tables where schemaname='public'`);
        await q(`truncate ${rows.map((r: any) => `"${r.tablename}"`).join(', ')} restart identity cascade`);
    }

    async function buildWorld() {
        A = await seedWorld(pool, 'A');
        B = await seedWorld(pool, 'B');
        // The attacker: a real tenant_admin of B who can actually log in.
        const orm = drizzle(pool);
        const email = `attacker-${randomUUID().slice(0, 8)}@b.test`;
        const [attacker] = await orm.insert(schema.users).values({
            tenantId: B.tenantId, email, username: `attacker-${randomUUID().slice(0, 8)}`,
            firstName: 'Mallory', lastName: 'B', role: 'tenant_admin',
            passwordHash: await bcrypt.hash(PASSWORD, 4),
        } as any).returning();
        B.ids['users'] = [...B.ids['users'], attacker.id];

        const res = await server.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: PASSWORD } });
        if (res.statusCode !== 200) throw new Error(`attacker login failed: ${res.statusCode} ${res.body}`);
        const { accessToken, csrfToken } = JSON.parse(res.body);
        headers = { Authorization: `Bearer ${accessToken}`, 'x-csrf-token': csrfToken };

        aIds = Object.values(A.ids).flat();
        aPool = [...aIds, ...(await naturalKeys(A))];
        known = {};
        for (const w of [A, B]) {
            for (const [t, ids] of Object.entries(w.ids)) { const set = (known[t] ??= new Set()); ids.forEach((id) => set.add(id)); }
        }
        snapshot = await takeSnapshot(A);
        bSnapshot = await takeSnapshot(B);
    }

    /**
     * Not every route is keyed by a uuid: compliance templates by code, permits by number, and so
     * on. A uuid-only pool never probes those at all, so also try A's code-like string values.
     */
    async function naturalKeys(world: World): Promise<string[]> {
        const out = new Set<string>();
        for (const [table, ids] of Object.entries(world.ids)) {
            if (!ids.length) continue;
            const { rows } = await q(`select to_jsonb(t) as j from "${table}" t where id = any($1::uuid[])`, [ids]);
            for (const r of rows) {
                for (const [col, v] of Object.entries(r.j as Record<string, unknown>)) {
                    if (typeof v === 'string' && /(_id|code|key|slug|tag|number)$/i.test(col)
                        && v.length <= 100 && !/^[0-9a-f-]{36}$/i.test(v)) out.add(v);
                }
            }
        }
        return [...out];
    }

    async function takeSnapshot(world: World = A) {
        const snap = new Map<string, string>();
        for (const [table, ids] of Object.entries(world.ids)) {
            if (!ids.length) continue;
            const { rows } = await q(`select id::text as id, to_jsonb(t)::text as j from "${table}" t where id = any($1::uuid[])`, [ids]);
            for (const r of rows) snap.set(`${table}:${r.id}`, r.j);
        }
        return snap;
    }

    /** Compare A's rows with the snapshot and look for new rows that point at A. Returns findings. */
    async function writeFindings(): Promise<string[]> {
        const out: string[] = [];
        const now = await takeSnapshot(A);
        const bNow = await takeSnapshot(B);
        for (const [k, before] of snapshot) {
            const after = now.get(k);
            if (after === undefined) out.push(`DELETED ${k.split(':')[0]}`);
            else if (after !== before) out.push(`MODIFIED ${k.split(':')[0]}`);
        }
        // B's own rows must not have been re-pointed at A (e.g. PATCH crew {siteId: <A's site>}).
        for (const [k, before] of bSnapshot) {
            const after = bNow.get(k);
            if (after !== undefined && after !== before && (after.includes(A.canary) || aIds.some((id) => after.includes(id)))) {
                out.push(`LINKED-TO-A ${k.split(':')[0]}`);
            }
        }
        for (const table of Object.keys(A.ids)) {
            const { rows } = await q(
                `select id::text as id, to_jsonb(t)::text as j from "${table}" t where id <> all($1::uuid[])`,
                [[...(known[table] ?? [])]]);
            for (const r of rows) {
                (known[table] ??= new Set()).add(r.id);
                const j: string = r.j;
                const pointsAtA = j.includes(A.canary) || aIds.some((id) => j.includes(id));
                if (pointsAtA) out.push(`CREATED-AGAINST-A ${table}`);
            }
        }
        return out;
    }

    const readLeak = (body: string, requested: string[]) => {
        let text = body;
        // the attacker's own ids echoed back (e.g. "id <uuid> not found") are not a leak
        for (const r of requested) text = text.split(r).join('');
        if (text.includes(A.canary)) return 'canary';
        const hit = aIds.find((id) => text.includes(id) && !requested.includes(id));
        return hit ? `id ${hit}` : null;
    };

    const paramNames = (url: string) => [...url.matchAll(/:([A-Za-z]+)/g)].map((m) => m[1]);
    const fill = (url: string, vals: string[]) => { let i = 0; return url.replace(/:[A-Za-z]+/g, () => vals[i++]); };

    function queryString() {
        const first = (t: string) => A.ids[t]?.[0];
        const kv: Record<string, string | undefined> = {
            tenantId: A.tenantId, tenant_id: A.tenantId, siteId: first('sites'), assetId: first('assets'),
            workOrderId: first('work_orders'), userId: first('users'), alertId: first('alerts'),
            crewId: first('crews'), webhookId: first('webhooks'), reportId: first('reports'),
            templateId: first('compliance_report_templates'), dashboardId: first('dashboards'),
            partId: first('parts'), permitId: first('permits'),
        };
        return '?' + Object.entries(kv).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
    }

    const timed = (p: Promise<any>) =>
        Promise.race([p, new Promise<any>((r) => setTimeout(() => r({ statusCode: 'timeout', body: '' }), 6000))]);

    async function inFlight<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
        let i = 0;
        await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
            while (i < items.length) { const item = items[i++]; await fn(item); }
        }));
    }

    beforeAll(async () => {
        admin = new Pool({ connectionString: urlFor('postgres') });
        await admin.query(`CREATE DATABASE "${dbName}"`);
        pool = new Pool({ connectionString: urlFor(dbName) });
        await migrate(drizzle(pool), { migrationsFolder: path.resolve(__dirname, '../../drizzle') });

        // Point the app at the throwaway database BEFORE it is first imported.
        process.env.DATABASE_URL = urlFor(dbName);
        process.env.TEST_DATABASE_URL = urlFor(dbName);
        const { TestServer } = await import('../helpers/test-server');
        const ts = new TestServer();
        await ts.start();
        server = ts;
        await buildWorld();
    }, 180000);

    afterAll(async () => {
        await server?.stop();
        // The app has its own pool (src/db) on the throwaway database. Close it BEFORE the drop:
        // DROP DATABASE ... WITH (FORCE) kills open connections, and a pool that is still open
        // then emits an unhandled 'terminating connection' error that fails the whole suite.
        const { pool: appPool } = await import('../../src/db');
        await appPool.end().catch(() => undefined);
        await pool?.end();
        await admin?.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
        await admin?.end();
    });

    it('has a probe worth trusting: every table seeded for both tenants, a sizeable route table', () => {
        expect(Object.keys(A.skipped)).toEqual([]);
        expect(Object.keys(B.skipped)).toEqual([]);
        expect(Object.keys(A.ids).length).toBeGreaterThanOrEqual(37);
        const real = mockRoutes.filter((r) => ([] as string[]).concat(r.method).some((m) => m !== 'HEAD' && m !== 'OPTIONS'));
        expect(real.length).toBeGreaterThan(100);
    });

    it('sweeps every route with tenant A\'s real ids and finds no cross-tenant read or write', async () => {
        const routes: Array<{ method: string; url: string; schema?: any }> = [];
        for (const r of mockRoutes) {
            const url = String(r.url);
            if (!url.startsWith('/api/') || SKIP_URL(url)) continue;
            for (const m of ([] as string[]).concat(r.method)) {
                if (m === 'HEAD' || m === 'OPTIONS') continue;
                if (!routes.some((x) => x.method === m && x.url === url)) routes.push({ method: m, url, schema: r.schema });
            }
        }
        stats.routes = routes.length;
        const qs = queryString();

        for (const route of routes) {
            const isWrite = MUTATING.includes(route.method);
            const names = paramNames(route.url);
            const requests: Array<{ url: string; requested: string[] }> = [];

            if (names.length === 0) {
                requests.push({ url: route.url + (isWrite ? '' : qs), requested: [] });
            } else {
                for (const v of aPool) {
                    requests.push({ url: fill(route.url, names.map(() => v)) + (isWrite ? '' : qs), requested: [v] });
                    if (names.length > 1) {
                        for (let i = 0; i < names.length; i++) {
                            const vals = names.map((_, j) => (j === i ? v : randomUUID()));
                            requests.push({ url: fill(route.url, vals) + (isWrite ? '' : qs), requested: [v] });
                        }
                    }
                }
            }

            // B's own resource in the path + A's ids in the body: "attach A's user to MY crew".
            // Without this, a route that checks the path id but not the body ids looks clean.
            // (Not for DELETE: B deleting its own rows tests nothing and destroys the fixtures later routes need.)
            if (isWrite && route.method !== 'DELETE' && names.length > 0) {
                for (const v of Object.values(B.ids).flat()) {
                    requests.push({ url: fill(route.url, names.map(() => v)), requested: [v] });
                }
            }

            const reads: string[] = [];
            const body = isWrite ? bodyFor(route.schema, A) : undefined;
            const bodyStrings = body ? stringsIn(body) : [];
            let reachedHandler = !isWrite;
            let firstValidationError = '';
            await inFlight(requests, 16, async (req) => {
                const res: any = await timed(server.inject({
                    method: route.method as any, url: req.url, headers,
                    ...(isWrite ? { payload: body } : {}),
                }));
                stats.requests++;
                if (res.statusCode !== 400 && res.statusCode !== 'timeout') reachedHandler = true;
                else if (isWrite && !firstValidationError && res.statusCode === 400) firstValidationError = String(res.body).replace(/\s+/g, ' ').slice(0, 220);
                const leak = typeof res.body === 'string' ? readLeak(res.body, [...req.requested, ...bodyStrings]) : null;
                if (leak) reads.push(`READ-LEAK (${leak})`);
            });

            const label = `${route.method} ${route.url}`;
            if (isWrite && !reachedHandler) unprobed.push(`${label} :: ${firstValidationError}`);
            const found = new Set<string>();
            if (reads.length) found.add(reads[0] + (reads.length > 1 ? ` x${reads.length}` : ''));
            if (isWrite) for (const f of await writeFindings()) found.add(f);

            if (found.size) {
                for (const f of found) violations.add(`${label} :: ${f}`);
                // A's data is damaged or tainted: rebuild both worlds so later routes still probe real data.
                if ([...found].some((f) => !f.startsWith('READ-LEAK'))) {
                    await truncateAll();
                    stats.resets++;
                    await buildWorld();
                }
            }
        }

        const unexpected = [...violations].filter((v) => !KNOWN_LEAKS[v.split(' :: ')[0]]);
        expect(unexpected).toEqual([]);
        const stale = Object.keys(KNOWN_LEAKS).filter((k) => ![...violations].some((v) => v.startsWith(k + ' :: ')));
        expect(stale).toEqual([]);
    }, 900000);

    it('coverage: a valid generated body reached the handler for nearly every write route', () => {
        // A route listed here answered 400 to EVERY request, i.e. the body generator could not
        // satisfy its schema, so the sweep proved nothing about it. Keep this list short and
        // explained; a growing list means the sweep is going blind.
        expect(unprobed).toEqual([]);
    });

    it('positive control: B reading its OWN rows through the same routes does return data', async () => {
        const bIds = Object.values(B.ids).flat();
        const getRoutes = mockRoutes
            .filter((r) => ([] as string[]).concat(r.method).includes('GET') && String(r.url).startsWith('/api/') && !SKIP_URL(String(r.url)))
            .map((r) => String(r.url))
            .filter((u) => paramNames(u).length === 1);
        let hits = 0;
        for (const url of [...new Set(getRoutes)]) {
            for (const id of bIds) {
                const res: any = await timed(server.inject({ method: 'GET', url: fill(url, [id]), headers }));
                if (res.statusCode === 200 && typeof res.body === 'string' && res.body.includes(B.canary)) { hits++; break; }
            }
        }
        stats.controlHits = hits;
        // If this is ~0 the sweep above proved nothing: every probe may simply have errored.
        expect(hits).toBeGreaterThanOrEqual(10);
    }, 300000);

    it('swept a meaningful amount', () => {
        expect(stats.routes).toBeGreaterThan(100);
        expect(stats.requests).toBeGreaterThan(2000);
    });
});
