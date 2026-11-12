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

**Status: ⚠️ partial, pre-existing.** `backend/tests/e2e/assets.e2e.test.ts`
(create, list, list-by-type, soft-delete) and `backend/tests/e2e/hierarchy.e2e.test.ts`
(recursive hierarchy fetch, circular-reference prevention — both direct
self-parenting and a 3-level cycle). This is decent coverage of the
hierarchy-specific logic; full CRUD (update) isn't separately tested.

## 4. Tenant isolation on every resource

**Status: ⚠️ partial, actively maintained — the best-covered of the six.**
`backend/tests/security/tenant-isolation.spec.ts`, expanded three times this
session as new cross-tenant bugs were found and fixed (alerts/notifications,
`ml-features` asset ownership, `genai` job status ownership — 10 tests
total). This is real, evidenced coverage, but "every resource" is not
literal — it covers the resources where a bug was actually found. A
systematic pass asserting every route's queries are tenant-scoped is
REV-029's job (per-route review), which flagged its own remaining gaps
(`routes/weather.ts`, inconsistent CSRF — unrelated to tenancy specifically)
rather than this test file's.

```
$ npx jest tests/security/tenant-isolation.spec.ts
Tests: 10 passed, 10 total
```

## 5. Permission enforcement per role, all 6 roles

**Status: ✅ covered (2026-11-12), with 19 known gaps tracked as REV-064.**
`backend/tests/critical-paths/rbac-matrix.spec.ts` (41 tests) probes all 83
mutating routes as each of the 6 roles and asserts (a) core routes require the
permission they should (allowed roles derived from `ROLE_PERMISSIONS`, not
from the route's own options), (b) `viewer` is read-only, (c) a two-sided
ratchet on the known gaps, (d) `super_admin` reaches everything.

It found assets, work-order sub-resources, reports and compliance reports
writable by a read-only role (fixed), and 19 further routes that need a
product decision (REV-064). See REV-038 in the tracker for details and the
behaviour changes. Method note: the spec strips route schemas so authorization
is observable independent of body validation, and must never probe
`/auth/logout` (it deletes the caller's CSRF token and poisons later results).

```
$ npx jest tests/critical-paths/rbac-matrix.spec.ts
Tests: 41 passed, 41 total
(against the original routes: 19 failed, 22 passed)
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
| 3 | Asset CRUD + hierarchy | ⚠️ | 6 (repaired 2026-11-12, passing) |
| 4 | Tenant isolation | ⚠️ | 10 (expanded 3× this session) |
| 5 | Permission enforcement, 6 roles | ✅ | 41 (new); 19 gaps -> REV-064 |
| 6 | Migration up | ✅ | 11 (new) |

**Where this stands (2026-11-12):** four of six paths are covered (1, 2, 5, 6) and
two are partial (3, 4). Writing the tests is what found the bugs, in each case
bugs that were live and that no earlier review had surfaced: logout never
revoked a session (path 1); a safety-gate bypass and every invalid transition
returning HTTP 500 (path 2); a read-only role able to delete work orders and
assets (path 5). Path 6 found no drift, but a first version of it missed a
deleted index, found only by deliberately breaking the migrations. What remains
of REV-038: asset *update* behaviour (path 3) and a systematic every-route
tenant sweep (path 4). The product decisions the RBAC work surfaced are tracked
as REV-064.
