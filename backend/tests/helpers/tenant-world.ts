/**
 * Generic "world" seeder for cross-tenant testing.
 *
 * Populates (nearly) every table for one tenant by reading the drizzle schema,
 * so tenant-isolation coverage does not depend on someone hand-writing a
 * fixture for each of the 37 tables -- the failure mode being that the tables
 * nobody wrote a fixture for are exactly the ones nobody tested.
 *
 * Every string it writes carries a canary (`CANARY-<label>`), and every row it
 * creates has a known id, so a response that contains either can be attributed
 * to a specific tenant's data.
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { is, getTableName, getTableColumns } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { randomUUID } from 'crypto';

import * as schema from '../../src/db/schema';

export interface World {
    label: string;
    tenantId: string;
    /** table name -> ids of the rows seeded for this tenant */
    ids: Record<string, string[]>;
    /** natural-key values a request body must quote, by body field name (e.g. a template's code) */
    keys?: Record<string, string>;
    /** tables that could not be seeded, with the reason */
    skipped: Record<string, string>;
    canary: string;
}

const allTables = (Object.values(schema) as unknown[]).filter((x) => is(x, PgTable)) as PgTable[];

/** Insert order: parents before children. Self-references and cycles are ignored. */
function ordered(): PgTable[] {
    const byName = new Map(allTables.map((t) => [getTableConfig(t).name, t]));
    const deps = new Map<string, Set<string>>();
    for (const t of allTables) {
        const cfg = getTableConfig(t);
        const d = new Set<string>();
        for (const fk of cfg.foreignKeys) {
            const target = getTableConfig(fk.reference().foreignTable).name;
            if (target !== cfg.name) d.add(target);
        }
        deps.set(cfg.name, d);
    }
    const out: PgTable[] = [];
    const done = new Set<string>();
    const visiting = new Set<string>();
    const visit = (name: string) => {
        if (done.has(name) || visiting.has(name)) return;
        visiting.add(name);
        for (const dep of deps.get(name) ?? []) visit(dep);
        visiting.delete(name);
        done.add(name);
        out.push(byName.get(name)!);
    };
    for (const name of byName.keys()) visit(name);
    return out;
}

/** The sequence tables are seeded in, with `tenants` first. Exposed for the sweep's coverage report. */
export const SEED_ORDER = ordered();
export const tableName = (t: PgTable) => getTableConfig(t).name;

function valueFor(
    col: any,
    tName: string,
    label: string,
    tenantId: string,
    fkTarget: Record<string, string>,
    ids: Record<string, string[]>,
): unknown {
    const name: string = col.name;
    const canary = `CANARY-${label}`;

    if (name === 'tenant_id') return tenantId;

    // foreign keys point at a row this same world already created
    const target = fkTarget[name];
    if (target) {
        const parent = ids[target]?.[0];
        if (!parent) throw new Error(`no seeded parent row in ${target} for ${tName}.${name}`);
        return parent;
    }

    if (col.enumValues && col.enumValues.length) return col.enumValues[0];

    switch (col.columnType) {
        case 'PgUUID': return randomUUID();
        case 'PgVarchar':
        case 'PgText': {
            const base = /email/i.test(name) ? `${canary}-${tName}-${randomUUID().slice(0, 8)}@canary.test` : `${canary}:${tName}.${name}:${randomUUID().slice(0, 6)}`;
            return col.length ? base.slice(0, col.length) : base;
        }
        case 'PgTimestamp':
        case 'PgDate': return new Date();
        case 'PgBoolean': return false;
        case 'PgInteger':
        case 'PgSmallInt':
        case 'PgBigInt53':
        case 'PgSerial': return 1;
        case 'PgNumeric':
        case 'PgDoublePrecision':
        case 'PgReal': return col.dataType === 'string' ? '1' : 1;
        case 'PgJsonb':
        case 'PgJson': return { canary };
        default:
            if (col.dataType === 'string') return `${canary}`.slice(0, col.length ?? 64);
            if (col.dataType === 'number') return 1;
            if (col.dataType === 'boolean') return false;
            if (col.dataType === 'date') return new Date();
            if (col.dataType === 'json') return { canary };
            throw new Error(`unsupported column type ${col.columnType}/${col.dataType} (${tName}.${name})`);
    }
}

/** Seed one tenant. `pool` must point at a freshly migrated database. */
export async function seedWorld(pool: Pool, label: string, rowsPerTable = 1): Promise<World> {
    const orm = drizzle(pool);
    const ids: Record<string, string[]> = {};
    const skipped: Record<string, string> = {};
    const canary = `CANARY-${label}`;

    // The tenant itself
    const [tenant] = await orm.insert(schema.tenants).values({
        tenantId: `${label.toLowerCase()}-${randomUUID().slice(0, 6)}`,
        name: `${canary} Inc`,
        domain: `${label.toLowerCase()}.canary.test`,
    } as any).returning();
    ids['tenants'] = [tenant.id];

    for (let round = 0; round < rowsPerTable; round++) {
      for (const t of SEED_ORDER) {
        const tName = getTableConfig(t).name;
        if (tName === 'tenants') continue;
        if (round > 0 && !ids[tName]) continue; // the first row failed to seed; don't retry

        const cfg = getTableConfig(t);
        const fkTarget: Record<string, string> = {};
        for (const fk of cfg.foreignKeys) {
          const r = fk.reference();
          const target = getTableConfig(r.foreignTable).name;
          if (target === tName) continue; // self-reference: leave null
          r.columns.forEach((c: any) => { fkTarget[c.name] = target; });
        }

        try {
          const values: Record<string, unknown> = {};
          for (const [key, col] of Object.entries(getTableColumns(t)) as [string, any][]) {
            const mustSet = col.notNull && !col.hasDefault && col.name !== 'id';
            const isTenantCol = col.name === 'tenant_id';
            // Also fill nullable FK columns so child rows are genuinely linked to the parent.
            const nullableFk = !col.notNull && fkTarget[col.name] && ids[fkTarget[col.name]]?.length;
            if (mustSet || isTenantCol || nullableFk) {
              values[key] = valueFor(col, tName, label, tenant.id, fkTarget, ids);
            }
          }
          const [row] = await (orm.insert(t as any).values(values as any) as any).returning();
          (ids[tName] ??= []).push(row.id);
        } catch (e: any) {
          if (round === 0) skipped[tName] = String(e?.message ?? e).split('\n')[0].slice(0, 160);
        }
      }
    }

    return { label, tenantId: tenant.id, ids, skipped, canary };
}

export { getTableName };
