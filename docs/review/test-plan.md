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

**Status: ⚠️ partial, pre-existing.** `backend/tests/e2e/work-orders.e2e.test.ts`
covers create, one status transition, and task/part management (4 tests).
**Not covered:** the full lifecycle through `close`, and — the more
important gap — **state-machine rejection of invalid transitions** (e.g.
`draft → closed` directly, skipping `in_progress`/`completed`) is named
explicitly in REV-038's own scope and has no test anywhere. `work-order-state.ts`
implements the state machine; nothing exercises its rejection paths.

```
$ npx jest tests/e2e/work-orders.e2e.test.ts
(pre-existing failures unrelated to this review — see REV-037's evidence:
 these e2e specs return 403 where 201 is expected, a test-environment/seed
 issue, not something this session traced to a root cause)
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

**Status: 🔴 not covered.** No test iterates the role vocabulary
(`backend/src/constants/permissions.ts`) against endpoints systematically.
Individual routes are spot-checked for *a* permission requirement during
REV-029's per-route pass, but nothing asserts, for each of the 6 roles, which
of the ~39 route modules it can and cannot reach. This is real, unstarted
work — likely a parametrized test generated from the permission matrix in
`specs/09_ROLE_FEATURE_ACCESS_MATRIX.md`, not something to write ad hoc per
route.

## 6. Migration up from the oldest supported version

**Status: 🔴 not covered by a test**, though verified manually multiple
times this session (every `npm run build` + backend restart implicitly
re-runs migrations on a stack that needs them). REV-014 already added a CI
job asserting table/enum/index counts and a non-empty `__drizzle_migrations`
— but per the standing no-CI-gate decision, nothing runs that job. There is
no Jest test that spins up a schema-less database, runs `db:migrate`, and
asserts the expected shape. Given drizzle now owns the schema outright
(ADR-004) and there are only 3 migrations total, this is a small, contained
test to write — just not written yet.

---

## Summary

| # | Path | Status | Tests |
| - | ---- | :----: | ----- |
| 1 | Login / refresh / logout | ✅ | 11 (new) |
| 2 | Work order lifecycle + invalid-transition rejection | ⚠️ | 4 (pre-existing, partial) |
| 3 | Asset CRUD + hierarchy | ⚠️ | 6 (pre-existing, partial) |
| 4 | Tenant isolation | ⚠️ | 10 (expanded 3× this session) |
| 5 | Permission enforcement, 6 roles | 🔴 | 0 |
| 6 | Migration up | 🔴 | 0 (CI job exists, doesn't run) |

**What actually shipped this session:** path 1 went from zero coverage to
real coverage, and in the process caught a genuine, previously-unknown
security bug (logout never revoked sessions) that had been live since this
mechanism was written. Paths 2–4 have real but partial pre-existing
coverage. Paths 5–6 remain open — realistically 2–3 more days of work,
consistent with REV-038's original 1-week estimate for the full scope.
