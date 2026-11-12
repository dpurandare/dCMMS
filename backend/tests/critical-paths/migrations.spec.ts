/**
 * Migration up from nothing (REV-038, critical path 6).
 *
 * History this guards against: every migration failed silently for the life of
 * the project, so 27 of 37 tables never existed and login returned 500 on a
 * fresh stack (REV-004/005). A green `db:migrate` exit code was never evidence
 * the schema was there.
 *
 * So this does not count things. It builds a brand-new, throwaway database,
 * runs the REAL migrations in `./drizzle` against it, and compares what Postgres
 * actually contains with what `src/db/schema.ts` declares -- tables, columns,
 * nullability, enums, indexes. Adding a table to schema.ts without a migration
 * (or the reverse) fails here, with no hard-coded "37" to keep in sync.
 *
 * It does not touch the shared test database (`dcmms_test`) -- that one is
 * migrated by tests/global-setup.ts and used by every other spec.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { is } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import * as fs from 'fs';
import * as path from 'path';

import * as schema from '../../src/db/schema';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

function urlFor(database: string): string {
    const u = new URL(process.env.DATABASE_URL!);
    u.pathname = `/${database}`;
    return u.toString();
}

const declaredTables = (Object.values(schema) as unknown[]).filter((x) => is(x, PgTable)) as PgTable[];
// pgEnum() returns a function carrying `enumName` / `enumValues`.
const declaredEnums = (Object.values(schema) as any[]).filter(
    (x) => typeof x === 'function' && typeof x.enumName === 'string',
) as Array<{ enumName: string; enumValues: string[] }>;

describe('migrations: empty database -> declared schema', () => {
    const dbName = `dcmms_migrate_${process.pid}_${Date.now()}`;
    let admin: Pool;
    let pool: Pool;

    const rows = async <T = any>(sql: string, params: unknown[] = []): Promise<T[]> =>
        (await pool.query(sql, params)).rows as T[];

    beforeAll(async () => {
        admin = new Pool({ connectionString: urlFor('postgres') });
        await admin.query(`CREATE DATABASE "${dbName}"`);
        pool = new Pool({ connectionString: urlFor(dbName) });
        await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    }, 120000);

    afterAll(async () => {
        await pool?.end();
        await admin?.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
        await admin?.end();
    });

    it('starts from a genuinely empty database (so the result is not left over from earlier runs)', async () => {
        // Sanity-check the harness itself: a fresh DB that already had tables would make
        // every assertion below vacuous.
        const fresh = new Pool({ connectionString: urlFor('postgres') });
        try {
            const tmp = `${dbName}_probe`;
            await fresh.query(`CREATE DATABASE "${tmp}"`);
            const p = new Pool({ connectionString: urlFor(tmp) });
            const r = await p.query(
                `select count(*)::int as n from information_schema.tables where table_schema='public'`);
            await p.end();
            await fresh.query(`DROP DATABASE "${tmp}" WITH (FORCE)`);
            expect(r.rows[0].n).toBe(0);
        } finally {
            await fresh.end();
        }
    });

    it('records every migration in the journal as applied', async () => {
        const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8'));
        const [{ n }] = await rows<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations');
        expect(journal.entries.length).toBeGreaterThan(0);
        expect(n).toBe(journal.entries.length);
    });

    it('creates exactly the tables schema.ts declares', async () => {
        const actual = (await rows<{ table_name: string }>(
            `select table_name from information_schema.tables
             where table_schema='public' and table_type='BASE TABLE'`)).map((r) => r.table_name).sort();
        const declared = declaredTables.map((t) => getTableConfig(t).name).sort();
        expect(declared.length).toBeGreaterThan(30); // the import actually found the schema
        expect({ missingFromDb: declared.filter((t) => !actual.includes(t)) }).toEqual({ missingFromDb: [] });
        expect({ undeclared: actual.filter((t) => !declared.includes(t)) }).toEqual({ undeclared: [] });
    });

    it('creates the columns schema.ts declares, with matching nullability', async () => {
        const cols = await rows<{ table_name: string; column_name: string; is_nullable: string }>(
            `select table_name, column_name, is_nullable from information_schema.columns
             where table_schema='public'`);
        const byTable = new Map<string, Map<string, boolean>>();
        for (const c of cols) {
            if (!byTable.has(c.table_name)) byTable.set(c.table_name, new Map());
            byTable.get(c.table_name)!.set(c.column_name, c.is_nullable === 'YES');
        }

        const problems: string[] = [];
        for (const t of declaredTables) {
            const cfg = getTableConfig(t);
            const actual = byTable.get(cfg.name);
            if (!actual) continue; // reported by the tables test
            const declaredNames = new Set(cfg.columns.map((c) => c.name));
            for (const c of cfg.columns) {
                if (!actual.has(c.name)) { problems.push(`${cfg.name}.${c.name}: declared, missing from DB`); continue; }
                const dbNullable = actual.get(c.name)!;
                if (c.notNull === dbNullable) {
                    problems.push(`${cfg.name}.${c.name}: schema.ts notNull=${c.notNull} but DB nullable=${dbNullable}`);
                }
            }
            for (const name of actual.keys()) {
                if (!declaredNames.has(name)) problems.push(`${cfg.name}.${name}: in DB, not declared in schema.ts`);
            }
        }
        expect(problems).toEqual([]);
    });

    it('creates exactly the enum types schema.ts declares, with the same values', async () => {
        const actual = await rows<{ name: string; labels: string[] }>(
            `select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
             from pg_type t
             join pg_namespace n on n.oid = t.typnamespace
             join pg_enum e on e.enumtypid = t.oid
             where n.nspname='public' group by t.typname`);
        const actualMap = new Map(actual.map((r) => [r.name, r.labels]));
        expect(declaredEnums.length).toBeGreaterThan(0);

        const problems: string[] = [];
        for (const e of declaredEnums) {
            const labels = actualMap.get(e.enumName);
            if (!labels) { problems.push(`${e.enumName}: declared, missing from DB`); continue; }
            if (JSON.stringify([...labels].sort()) !== JSON.stringify([...e.enumValues].sort())) {
                problems.push(`${e.enumName}: DB has [${labels}] but schema.ts has [${e.enumValues}]`);
            }
        }
        const declaredNames = new Set(declaredEnums.map((e) => e.enumName));
        for (const name of actualMap.keys()) {
            if (!declaredNames.has(name)) problems.push(`${name}: in DB, not declared in schema.ts`);
        }
        expect(problems).toEqual([]);
    });

    it('creates every index and unique constraint schema.ts declares', async () => {
        const existing = new Set([
            ...(await rows<{ n: string }>(`select indexname as n from pg_indexes where schemaname='public'`)).map((r) => r.n),
            ...(await rows<{ n: string }>(
                `select conname as n from pg_constraint c join pg_namespace s on s.oid=c.connamespace
                 where s.nspname='public'`)).map((r) => r.n),
        ]);
        const missing: string[] = [];
        for (const t of declaredTables) {
            const cfg = getTableConfig(t);
            for (const i of cfg.indexes) {
                const name = (i.config as any).name as string | undefined;
                if (name && !existing.has(name)) missing.push(`${cfg.name}: index ${name}`);
            }
            for (const u of cfg.uniqueConstraints) {
                const name = (u as any).name as string | undefined;
                if (name && !existing.has(name)) missing.push(`${cfg.name}: unique ${name}`);
            }
        }
        expect(missing).toEqual([]);
    });

    // Indexes and triggers live in the hand-written 0002 migration and are NOT declared in
    // schema.ts, so the comparisons above cannot see them: delete a CREATE INDEX from the
    // migration and schema.ts still "matches". They need an independent record. These are the
    // counts measured on a correctly migrated database. If you change a migration ON PURPOSE,
    // update the number in the same commit -- that friction is the point.
    const EXPECTED = { secondaryIndexes: 53, triggers: 30 };

    it('creates exactly the secondary indexes and triggers the migrations are meant to', async () => {
        const [{ n: indexes }] = await rows<{ n: number }>(
            `select count(*)::int as n from pg_indexes where schemaname='public' and indexname not like '%\\_pkey'`);
        const [{ n: triggers }] = await rows<{ n: number }>(
            `select count(*)::int as n from pg_trigger tg
             join pg_class c on c.oid = tg.tgrelid join pg_namespace s on s.oid = c.relnamespace
             where s.nspname='public' and not tg.tgisinternal`);
        expect({ secondaryIndexes: indexes, triggers }).toEqual(EXPECTED);
    });

    it('creates every index the migration SQL names', async () => {
        const existing = new Set(
            (await rows<{ n: string }>(`select indexname as n from pg_indexes where schemaname='public'`)).map((r) => r.n));
        const named: string[] = [];
        for (const file of fs.readdirSync(MIGRATIONS_FOLDER).filter((f) => f.endsWith('.sql'))) {
            const sql = fs.readFileSync(path.join(MIGRATIONS_FOLDER, file), 'utf8');
            for (const m of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z0-9_]+)"?/gi)) {
                named.push(m[1]);
            }
        }
        expect(named.length).toBeGreaterThan(30);
        expect(named.filter((n) => !existing.has(n))).toEqual([]);
    });

    it('has refresh_tokens -- the table whose absence made login return 500', async () => {
        const r = await rows(`select 1 from information_schema.tables where table_schema='public' and table_name='refresh_tokens'`);
        expect(r).toHaveLength(1);
    });

    it('is idempotent: running the migrations again changes nothing and does not throw', async () => {
        const count = async () =>
            (await rows<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations'))[0].n;
        const tables = async () =>
            (await rows<{ n: number }>(`select count(*)::int as n from information_schema.tables where table_schema='public'`))[0].n;
        const before = { applied: await count(), tables: await tables() };
        await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
        expect({ applied: await count(), tables: await tables() }).toEqual(before);
    });

    it('fails loudly on a broken migration instead of reporting success', async () => {
        // The original failure mode was silence. Point the migrator at a folder whose only
        // migration is invalid SQL and require it to throw, leaving the schema untouched.
        const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bad-migration-'));
        fs.mkdirSync(path.join(tmp, 'meta'));
        fs.writeFileSync(path.join(tmp, '0000_bad.sql'), 'CREATE TABLE definitely_not_valid (;');
        fs.writeFileSync(path.join(tmp, 'meta/_journal.json'), JSON.stringify({
            version: '5', dialect: 'pg',
            entries: [{ idx: 0, version: '5', when: Date.now() + 10_000, tag: '0000_bad', breakpoints: true }],
        }));
        try {
            await expect(migrate(drizzle(pool), { migrationsFolder: tmp })).rejects.toThrow();
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    });
});
