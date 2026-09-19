# ADR-004: Database migrations are owned by drizzle-kit

- **Status:** Accepted
- **Date:** 2026-09-19
- **Task:** REV-011 (with REV-012, REV-013)
- **Deciders:** Deepak Purandare

## Context

The project had three sources of schema truth, and none of them worked.

**1. `scripts/init-db.sql`** — mounted into the Postgres container at
`docker-entrypoint-initdb.d`, so it runs exactly once, when the container
creates its data directory, and only for databases that compose creates. It
created 10 tables, ~40 indexes, 7 enum types, a trigger function, 8 triggers,
and seeded a `super_admin` with a hardcoded password.

**2. `backend/drizzle/0000_abnormal_omega_flight.sql`** — a single squashed
migration of 37 tables, run by `npm run db:migrate` (and so by
`scripts/dev.sh`). It contained no indexes, no enum types, no extensions, no
functions and no triggers: it *referenced* 14 enum types it never created, and
relied on `init-db.sql` having created them.

**3. `backend/src/db/migrations/008`–`022`** — 16 hand-written SQL files
containing 21 tables, ~70 indexes, 2 trigger functions and 3 triggers. No
runner ever executed them. Not `scripts/dev.sh`, not
`backend/scripts/docker-entrypoint.sh`, not `db:migrate`.

### What was actually running

Measured on 2026-09-19 against a stack brought up with `./scripts/dev.sh`:

```
$ npm --prefix backend run db:migrate
❌ Migration failed: error: type "vector(768)" does not exist

$ psql -c "select count(*) from drizzle.__drizzle_migrations;"
 0

$ psql -c "\dt"
 alerts assets audit_logs parts sites tenants users
 work_order_parts work_orders work_order_tasks        (10 tables)
```

`schema.ts:1490` declares the pgvector column through `customType` with
`dataType()` returning `"vector(768)"`. drizzle-kit renders a custom type name
quoted, producing `"embedding" "vector(768)"`, which Postgres reads as a type
literally named `vector(768)`. The statement fails, the migration transaction
rolls back, and nothing is recorded as applied.

**The consequence is that the drizzle migration had never once succeeded.** The
only schema that ever existed was `init-db.sql`'s 10 tables. 27 of the 37
tables the ORM expects did not exist in any database the project could produce,
and the database had 47 indexes — all of them on those 10 tables.

This was not a latent risk. It was live:

```
$ curl -X POST localhost:3000/api/v1/auth/login -d '{"email":"...","password":"..."}'
{"statusCode":500,"error":"Internal Server Error","message":"An error occurred during login"}

# backend log:
relation "refresh_tokens" does not exist
```

Nobody could log in to a freshly provisioned dCMMS.

A second effect: `auto-seed` skips when the database already contains rows, and
`init-db.sql` always inserted a user. So the credentials documented in
`CLAUDE.md` were never created, which is why the seeded `admin@example.com`
never worked either.

## Decision

**drizzle-kit owns the schema. There is exactly one runner:
`npm --prefix backend run db:migrate`.**

1. `scripts/init-db.sql` no longer defines schema. It is reduced to a comment;
   the migrations create their own extensions.
2. The migration sequence is rebuilt and renumbered:
   - `0000_extensions_and_enums.sql` — the five extensions, and all 14 enum
     types generated from the `pgEnum` declarations in `schema.ts`. The
     baseline is now self-sufficient against any empty Postgres.
   - `0001_baseline_schema.sql` — the former squash, with the `vector(768)`
     type corrected.
   - `0002_indexes_and_triggers.sql` — 47 indexes, 2 trigger functions and the
     audit-log immutability triggers, ported from the 16 dead files, plus
     `updated_at` triggers derived from the schema rather than from a hardcoded
     table list.
3. The 16 files in `backend/src/db/migrations/` are deleted. Every statement in
   them is either represented above or deliberately dropped (see below).
4. Future schema changes ship as new numbered migrations. `drizzle-kit generate`
   produces them; **its output must be checked**, see Consequences.

### What was deliberately dropped

- **`chat_feedback`** (`020_add_chat_feedback.sql`) and its 3 indexes. The table
  is in neither `schema.ts` nor any backend code. The Sprint 26 "GenAI feedback
  loop" feature exists only as this migration file. REV-009 records it as
  `Absent`; resurrecting the table would ship storage nothing reads.
- **The `init-db.sql` seeded admin** (`admin@dcmms.local` / `admin123`). A
  hardcoded credential auto-applied to every fresh database, and the reason
  `db:seed` never ran. Removed for the same reason as REV-002.
- **The duplicate `020` prefix and the missing `001`–`007`** are resolved by
  deletion rather than renumbering.

## Consequences

### Fresh installs work. Verified:

```
$ dropdb dcmms && createdb dcmms
$ npm --prefix backend run db:migrate
✅ Migrations completed successfully!

tables: 37 · secondary indexes: 53 · enum types: 14 · triggers: 30
applied migrations: 3

$ curl -X POST localhost:3000/api/v1/auth/login ...
{"accessToken":"eyJhbGciOiJIUzI1NiIs..."}
```

### There is no upgrade path from the pre-ADR database shape. Accepted.

Migrating a database created by the old `init-db.sql` fails:

```
$ npm --prefix backend run db:migrate
❌ error: column "assigned_crew_id" referenced in foreign key constraint does not exist
```

The baseline uses `CREATE TABLE IF NOT EXISTS`, so on a database where
`work_orders` already exists it skips the table and then tries to add a foreign
key against a column only the new definition has.

We accept this. No database has ever held the intended schema, so there is no
deployment carrying data worth preserving — the only databases that exist are
development ones recreated on demand. **The upgrade path starts from this
baseline, not before it.** Existing development databases must be dropped and
recreated. This is the last time drop-and-recreate is an acceptable answer:
from `0003` onward every migration must apply to a database migrated to the
previous head, and REV-014 adds the CI job that proves it on every PR touching
`backend/src/db/`.

### drizzle-kit output must be checked, not trusted

`drizzle-orm@0.30.10` has no native `vector` type — it arrived in 0.31 — so the
`customType` workaround in `schema.ts` stays, and **`drizzle-kit generate` will
keep emitting `"vector(768)"` quoted**. Until drizzle-orm is upgraded, correct
that line by hand after generating. REV-014's migration job is what catches it
if someone forgets; filed as REV-011a.

### Indexes are restored, not reviewed

`schema.ts` declares no indexes, so drizzle-kit generates none — that is why
the baseline had only primary keys. `0002` restores the index definitions the
team wrote in the dead migration files, which is a statement of their intent,
not a validated design. REV-015 reviews them against real query shapes. They
should ultimately move into `schema.ts` index declarations so generation and
reality stay in step; filed as REV-011b.
