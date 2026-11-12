# Critical-Path Test Plan (REV-038)

**Status as of 2026-09-19: partial.** This is an honest inventory of what the
six critical paths REV-038 names actually have covering them today, not a
claim that all six are done — they aren't. The point of this document, per
the review's own rule, is that a status here must be backed by a command
whose output was actually read, the same discipline as every entry in
`TasksTracking/15_Review_Remediation.md`.

Run everything below with `npm --prefix backend test` (needs `dcmms_test` on
5434 — see `docs/review/... dev environment gotchas` — actually see the
project memory / `CLAUDE.md`/`tests/global-setup.ts`, which migrates it
automatically).

---

## 1. Login / refresh / logout

**Status: ✅ covered, new this session.** `backend/tests/critical-paths/auth-flow.spec.ts`
(11 tests). There was **no test for this path at all** before today — the
single most foundational one (nothing else works if auth is broken) had zero
direct coverage.

Writing it surfaced two real, previously-unknown bugs, both fixed the same
session:

1. **`POST /auth/logout` was broken for every real caller.** Its schema
   required `body: {type: "object"}` with no `body` marked optional, so a
   request with no body at all (not even `{}` — genuinely `undefined`) failed
   schema validation. The real frontend calls `apiClient.post('/auth/logout')`
   with no body. Fixed: `nullable: true` on the schema.
2. **Logout never actually revoked anything — a real security bug, not a
   nitpick.** `RefreshTokenService.revokeAllUserTokens()` (called by logout,
   and by the token-theft-detection path inside `validateRefreshToken`) had
   `eq(refreshTokens.revokedAt, null as any)` in its `WHERE` clause. In SQL,
   `column = NULL` never matches any row (three-valued logic; the correct
   form is `IS NULL`). The `UPDATE` always affected zero rows. Every logout,
   ever, left all of that user's refresh tokens fully valid until natural
   7-day expiry. The same bug existed in the unused `getUserActiveTokens()`.
   Fixed: `isNull()`, not `eq(..., null)`, in both places.

```
$ npx jest tests/critical-paths/auth-flow.spec.ts
Tests: 11 passed, 11 total
```

## 2. Work order: create → assign → complete → close

**Status: ✅ covered (2026-11-12).** `backend/tests/critical-paths/work-order-lifecycle.spec.ts`
(74 tests) covers the full lifecycle, the whole 8x8 transition matrix, the permit
safety gate, and the tenant boundary — and found three defects, see REV-038 in
the tracker. The older `backend/tests/e2e/work-orders.e2e.test.ts`
covers create, one status transition, and task/part management (4 tests,
**passing as of 2026-11-12** — they had been failing since before the review
because the specs never sent the `x-csrf-token` header; see
`backend/tests/helpers/auth.ts`).
**Not covered:** the full lifecycle through `close`, and — the more
important gap — **state-machine rejection of invalid transitions** (e.g.
`draft → closed` directly, skipping `in_progress`/`completed`) is named
explicitly in REV-038's own scope and has no test anywhere. `work-order-state.ts`
implements the state machine; nothing exercises its rejection paths.

```
$ npx jest tests/e2e/work-orders.e2e.test.ts
Tests: 4 passed, 4 total
```

## 3. Asset CRUD with hierarchy

**Status: ✅ covered (2026-11-12).** `backend/tests/e2e/assets.e2e.test.ts` (27 tests)
plus `hierarchy.e2e.test.ts` (recursive hierarchy, cycle prevention). The update block
checks field persistence, `updatedAt`, every database status value, coordinates of
exactly 0, tags, 404, hierarchy (set, self-parent, cycle, detach) and cross-tenant
references — and includes a **contract test using the exact payload the web edit form
sends**, which is what exposed that editing any top-level, degraded or decommissioned
asset returned 400.

It found, among others: a missing `description` column (every description silently
discarded), the status enum wrong in three places, three cross-tenant reference holes,
and tags returned as a JSON string by some endpoints and an array by others. 17 of the
tests fail on the original code. See REV-038.

```
$ npx jest tests/e2e/assets.e2e.test.ts tests/e2e/hierarchy.e2e.test.ts
Tests: 30 passed
```

## 4. Tenant isolation on every resource

**Status: ✅ covered systematically (2026-11-12).** Two layers:

- `backend/tests/security/tenant-sweep.spec.ts` (with `tests/helpers/tenant-world.ts`) —
  seeds all 37 tables for two tenants, then has tenant B's admin attack tenant A's
  real rows through **every one of the 149 routes** (7,042 requests): A's ids in
  every path position, A's natural keys, query strings, and request bodies
  generated from each route's own schema. Detects read leaks (response contains an
  A id or canary) and write leaks (an A row modified/deleted, a new row pointing at
  A, or one of B's rows re-pointed at A). Own throwaway database, ~25s; positive
  control and a body-generator coverage check keep it from passing vacuously.
- `tenant-isolation.spec.ts` — 19 targeted tests: the specific bugs found by
  reading code earlier, plus 9 for the shapes the sweep cannot show (a delete that
  foreign keys would otherwise mask; mass assignment that stays inside the
  attacker's own tenant).

It found **31 defects on the original code, 0 after the fixes** — an unscoped
`PUT /users/:id` that also mass-assigned `role`/`tenantId`/`passwordHash`,
`POST /alerts` taking the tenant from the request body, alerts-by-id with no tenant
filter, forged acknowledging users, device-token hijack, and cross-tenant
reference injection across crews, work orders, forecasts and weather. See REV-038
in the tracker for the full list and the three times the probe itself had to be
corrected.

**Not covered** (→ REV-065): multipart uploads, Slack/auth routes, a `super_admin`
attacker, more than one row per table, differently-named foreign-key body fields,
non-HTTP ingestion — and intra-tenant privacy (colleague-to-colleague), which is a
different question from tenant isolation.

```
$ npx jest tests/security
tenant-sweep: 5 passed   tenant-isolation: 19 passed
(against the original source: sweep 31 findings; 9 of the 19 fail)
```

## 5. Permission enforcement per role, all 6 roles

**Status: ✅ covered (2026-11-12). The 19 routes initially left for a product decision (REV-064) were decided and guarded the same day; no known gaps remain.**
`backend/tests/critical-paths/rbac-matrix.spec.ts` (60 tests) probes all 83
mutating routes as each of the 6 roles and asserts (a) core routes require the
permission they should (allowed roles derived from `ROLE_PERMISSIONS`, not
from the route's own options), (b) `viewer` is read-only, (c) a two-sided
ratchet on the known gaps, (d) `super_admin` reaches everything.

It found assets, work-order sub-resources, reports and compliance reports
writable by a read-only role (fixed), and 19 further routes (model-governance,
dashboards, forecasts, telemetry ingest, weather refresh, ML cache clear) that
needed a product decision (REV-064, decided and fixed). See REV-038 in the tracker for details and the
behaviour changes. Method note: the spec strips route schemas so authorization
is observable independent of body validation, and must never probe
`/auth/logout` (it deletes the caller's CSRF token and poisons later results).

```
$ npx jest tests/critical-paths/rbac-matrix.spec.ts
Tests: 60 passed, 60 total
(with the route guards removed: 20 failed, 40 passed)
```

## 6. Migration up from the oldest supported version

**Status: ✅ covered (2026-11-12).** `backend/tests/critical-paths/migrations.spec.ts`
(11 tests) migrates a brand-new throwaway database with the real `./drizzle`
migrations and compares the result to `schema.ts` — tables, columns,
nullability, enums, declared indexes — plus journal-vs-applied, idempotency,
and that a broken migration throws. It found no drift: schema and migrations
agree. Indexes and triggers live only in the hand-written `0002` migration, so
`schema.ts` cannot vouch for them; their counts (53 / 30) are pinned instead.
A first version missed a deleted index entirely — found by mutation testing,
not by inspection.

```
$ npx jest tests/critical-paths/migrations.spec.ts
Tests: 11 passed, 11 total
```

---

## Summary

| # | Path | Status | Tests |
| - | ---- | :----: | ----- |
| 1 | Login / refresh / logout | ✅ | 11 (new) |
| 2 | Work order lifecycle + invalid-transition rejection | ✅ | 74 (new) + 4 (repaired) |
| 3 | Asset CRUD + hierarchy | ✅ | 27 + 3 hierarchy |
| 4 | Tenant isolation | ✅ | sweep (149 routes, 7,042 requests) + 19 targeted |
| 5 | Permission enforcement, 6 roles | ✅ | 60 (new) |
| 6 | Migration up | ✅ | 11 (new) |

**Where this stands (2026-11-12):** all six paths are covered. REV-038 is complete
apart from its "runs in CI" half, which is descoped by the standing no-CI decision. Writing the tests is what found the bugs, in each case
bugs that were live and that no earlier review had surfaced: logout never
revoked a session (path 1); a safety-gate bypass and every invalid transition
returning HTTP 500 (path 2); a read-only role able to delete work orders and
assets (path 5). Path 6 found no drift, but a first version of it missed a
deleted index, found only by deliberately breaking the migrations. What remains
of REV-038: nothing. Path 4's sweep found the most serious defects of the whole
review so far (cross-tenant account modification with mass assignment of `role`),
and path 3 found that the web edit form could not save most assets. The product decisions the RBAC work surfaced (REV-064)
were made and implemented.
