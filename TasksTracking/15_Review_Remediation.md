# 15. Review Remediation

**Focus:** Remediation of findings from the project-wide review (see [`review-plan.md`](../review-plan.md))
**Priority:** 🔴 CRITICAL
**Status:** ⚠️ In Progress — Phase 0 started 2026-09-19
**Review Date:** September 2, 2026
**Repo State Reviewed:** `main` @ `79c3267`
**Target Completion:** Internal beta gate — 6–10 weeks from start

---

## How to use this file

This module differs from modules 01–14 in one important way: **every task has a `Verify:` line.**

The review found that the project's status reporting had drifted completely away from the code — features were marked `✅ Complete` while their routes were never registered, their services returned `Math.random()`, and their migrations never ran. The cause was not carelessness; it was that the status vocabulary had no way to express "not finished", and nothing forced a claim to be checked.

So the rule for this module is:

> **A task may only be ticked when its `Verify:` command has been run and its stated output observed.**
> Paste the result into the task's `Evidence:` line. No evidence, no tick.

If a task turns out to be bigger than expected, mark it `⚠️ PARTIAL` and split it. `⚠️ PARTIAL` is a perfectly acceptable status and carries no blame. `✅ COMPLETE` without evidence is the only unacceptable outcome.

---

## Status Legend

- 🔴 **Not Started**
- ⚠️ **In Progress**
- ⚠️ **PARTIAL** — some subtasks done, remainder split out into a new task
- ✅ **COMPLETE** — all subtasks done **and** `Verify:` evidence recorded
- 🛑 **BLOCKED** — waiting on a decision or another task
- ⏹️ **ACCEPTED RISK** — deliberately not fixed; requires a named approver and a date

## Severity Legend

- 🔴 **P0** — exploitable or data-destroying now. Fix within 24h.
- 🟠 **P1** — blocks internal beta. Fix in the current phase.
- 🟡 **P2** — blocks GA. Scheduled.
- 🔵 **P3** — should fix. Backlog.

---

## Progress Dashboard

| Phase | Workstreams | Tasks | Done | Status |
| :---- | :---------- | :---- | :--- | :----- |
| **Phase 0** — Stop the bleeding (2 days) | WS-2, WS-3 (P0 only) | 9 | 4 | ⚠️ In Progress |
| **Phase 1** — Ground truth (1 week) | WS-1, WS-3, WS-4 | 16 | 0 | 🔴 Not Started |
| **Phase 2** — Deep code review (2 weeks) | WS-5, WS-6, WS-7 | 17 | 0 | 🔴 Not Started |
| **Phase 3** — Periphery (1 week) | WS-8, WS-9, WS-10 | 15 | 0 | 🔴 Not Started |
| **Phase 4** — Re-baseline (3 days) | All | 4 | 0 | 🔴 Not Started |
| **TOTAL** | | **61** | **4** | **7%** |

**By severity:** 🔴 P0: 6 · 🟠 P1: 31 · 🟡 P2: 21 · 🔵 P3: 3 _(REV-001a split from REV-001 on 2026-09-19)_

> Update this table at the end of each working day. It is the only status anyone outside the team should need to read.

**Phase 0 as of 2026-09-19:** REV-002, REV-004, REV-005, REV-006 ✅ · REV-001, REV-003, REV-008 ⚠️ PARTIAL · REV-007 🛑 BLOCKED.
All five P0 items are code-complete. What remains in Phase 0 is not code: a pushed PR to produce REV-003's run evidence, repo-admin branch protection (REV-007), secret rotation in non-dev environments (REV-001a), and telling the people who were given the "Production Ready" status (REV-008).

---

# PHASE 0 — Stop the Bleeding

**Duration:** 2 days · **Gate:** CI runs on every PR · `main` protected · no P0 open
**Rule:** feature development is frozen from the start of this phase until the Phase 2 gate.

## 0.1 Critical Security (WS-3)

- [x] **REV-001** - Remove hardcoded JWT secret fallback 🔴 **P0**
  - [x] Delete the `|| "changeme-secret-key"` fallback in `backend/src/plugins/jwt.ts:20`
  - [x] Add a boot-time assertion: fail startup if `JWT_SECRET` is unset or < 64 chars
  - [x] Extend the assertion to all required secrets (DB, Redis, ClickHouse)
  - [x] Rotate `JWT_SECRET` in dev — `scripts/dev.sh` now generates a unique per-machine secret into the gitignored `backend/.env`
  - [ ] Rotate `JWT_SECRET` in staging / any demo instance — **split out as REV-001a**, needs whoever holds those environments
  - [ ] Invalidate all outstanding refresh tokens after rotation — **split out as REV-001a** (moot for dev: rotation invalidates them)
  - **Priority:** 🔴 P0 — anyone with repo read access could previously mint a `super_admin` token
  - **Estimated:** 2 hours · **Actual:** ~2 hours
  - **Files:** `backend/src/config/env.ts` (new), `backend/src/config/boot.ts` (new), `backend/src/plugins/jwt.ts`, `backend/src/index.ts`, `backend/.env.example`, `scripts/dev.sh`, `backend/tests/setup.ts`
  - **Verify:** `unset JWT_SECRET && npm --prefix backend run dev` → process exits non-zero with a clear message. `grep -rn 'process.env.JWT_SECRET ||' backend/src` → no matches.
  - **Evidence:**
    ```
    $ grep -rn 'process.env.JWT_SECRET ||' backend/src
    (no matches)

    $ cd backend && env -u JWT_SECRET -u DATABASE_URL -u CLICKHOUSE_PASSWORD -u QUESTDB_PASSWORD node dist/index.js

    Refusing to start: 4 required environment variable(s) are missing or invalid.
      • JWT_SECRET is not set — required for signing access and refresh tokens.
      • DATABASE_URL is not set — required for the primary PostgreSQL connection.
      • CLICKHOUSE_PASSWORD is not set — required for the analytics database (KPIs, ETL, reports, health scoring).
      • QUESTDB_PASSWORD is not set — required for the telemetry time-series store.

    Copy backend/.env.example to backend/.env and fill in real values.
    Generate a suitable JWT_SECRET with:  openssl rand -base64 64

    EXIT=1

    $ env JWT_SECRET=tooshort ... node dist/index.js
      • JWT_SECRET is 8 characters — at least 64 are required for signing access and refresh tokens.
    EXIT=1

    $ env JWT_SECRET='changeme-use-a-long-random-string-at-least-64-characters-long!' ... node dist/index.js
      • JWT_SECRET is still set to a placeholder from .env.example — replace it with a real secret.
    EXIT=1

    $ env NODE_ENV=production DATABASE_URL='postgresql://dcmms_user:dcmms_password_dev@...' CLICKHOUSE_PASSWORD=clickhouse_password_dev REDIS_PASSWORD=redis_password_dev ... node dist/index.js
      • DATABASE_URL contains the local development credential "dcmms_password_dev", which must never be used with NODE_ENV=production.
      • CLICKHOUSE_PASSWORD contains the local development credential "clickhouse_password_dev", ...
      • REDIS_PASSWORD contains the local development credential "redis_password_dev", ...
    EXIT=1
    ```
  - **Note:** validation moved into `config/boot.ts`, imported first in `index.ts`. The original placement (after the `import` block) let modules with import-time side effects — the Kafka client — run *before* `.env` was read and before any secret was checked.
  - **Status:** ⚠️ PARTIAL — code complete and verified; non-dev environment rotation is REV-001a

- [ ] **REV-001a** - Rotate secrets in non-dev environments 🔴 **P0** 🛑 **BLOCKED**
  - [ ] Generate a fresh `JWT_SECRET` (≥64 chars) for staging and any demo instance
  - [ ] Rotate `CLICKHOUSE_PASSWORD`, `REDIS_PASSWORD`, `QUESTDB_PASSWORD` and the database password anywhere they were set to the `*_dev` values from `docker-compose.yml`
  - [ ] Invalidate all outstanding refresh tokens after rotation
  - [ ] Confirm each environment boots — the new validation will reject the old placeholder and `*_dev` values under `NODE_ENV=production`
  - **Priority:** 🔴 P0 — the old `"changeme-secret-key"` is in this repository's history; every token signed with it stays valid until rotation
  - **Estimated:** 1 hour, once someone with access is available
  - **Split from:** REV-001, which is code-complete
  - **Blocked on:** access to the staging / demo environments. Nothing in the working tree can do this.
  - **Verify:** each environment starts successfully and previously issued tokens are rejected.
  - **Status:** 🛑 BLOCKED — needs whoever holds the environment secrets

- [x] **REV-002** - Remove remaining credential fallbacks 🔴 **P0**
  - [x] `backend/src/services/clickhouse-etl.service.ts:21-23`
  - [x] `backend/src/services/kpi-calculation.service.ts:48-50`
  - [x] `backend/src/services/asset-health-scoring.service.ts:54-56`
  - [x] `backend/src/services/compliance-template.service.ts:55-57`
  - [x] **Nine more sites the task list did not have**, found by running the verify grep: `report-builder.service.ts:132` and `routes/analytics-admin.ts:217` (two more copies of the same ClickHouse block), `routes/telemetry.ts:19` (QuestDB), `scripts/process-notification-digests.ts:23` (`DATABASE_PASSWORD || "postgres"`), `db/seed.ts:60`, `routes/slack.ts:11`, `services/weather-api.service.ts:102`, `services/queue.service.ts:17`, `services/genai.service.ts:9`
  - [x] `db/seed.ts` was the worst of them: it seeded the **production** admin with a hardcoded `"ChangeMeNow!2024"` and then printed that password to stdout. Now requires `ADMIN_DEFAULT_PASSWORD` (min 12 chars) and logs only the variable name.
  - **Priority:** 🔴 P0
  - **Estimated:** 1 hour · **Actual:** ~1.5 hours
  - **Verify:** `grep -rnE "process\.env\.[A-Z_]*(PASSWORD|SECRET|KEY|TOKEN)[^;]*\|\|" backend/src` → no matches.
  - **Evidence:**
    ```
    $ grep -rnE "process\.env\.[A-Z_]*(PASSWORD|SECRET|KEY|TOKEN)[^;]*\|\|" backend/src
    (no matches)
    ```
    Before the fix the same grep returned 23 lines.
  - **Note:** the six identical ClickHouse `createClient({...})` blocks are now one `createClickhouseClient()` factory in `backend/src/config/clickhouse.ts`. Three accessors replace the inline `||` idiom and make the intent explicit at each call site: `requireSecret()` (throws), `optionalSecret()` (returns `""`, integration disabled), `envOrDefault()` (non-credential setting).
  - **Status:** ✅ COMPLETE

## 0.2 Restore Quality Gates (WS-2)

- [x] **REV-003** - Re-enable CI on all four workflows 🔴 **P0**
  - [x] Uncomment `push` / `pull_request` triggers in `backend-ci.yml`
  - [x] Same in `frontend-ci.yml`, `mobile-ci.yml`, `code-quality.yml` (code-quality's weekly `schedule` restored too)
  - [x] Add the missing `format:check` and `type-check` scripts to `frontend/package.json` — also added `prettier@3.2.5` as a devDependency, which the frontend did not have at all
  - [x] Let the pipeline fail loudly — no CI failure was fixed under this task
  - [ ] **Verify still outstanding:** needs a pushed PR. Blocked on the push/PR decision, not on code.
  - **Priority:** 🔴 P0 — no CI has gated any of the last 301 commits
  - **Estimated:** 3 hours · **Actual:** ~1 hour
  - **Files:** `.github/workflows/*.yml`, `frontend/package.json`, `frontend/package-lock.json`
  - **Verify:** open a trivial PR → all four workflows appear as checks and report a result.
  - **Evidence:** triggers parse correctly —
    ```
    $ python3 -c "import yaml,glob; [print(f,'->',sorted((yaml.safe_load(open(f)).get('on') or yaml.safe_load(open(f))[True]).keys())) for f in sorted(glob.glob('.github/workflows/*.yml'))]"
    .github/workflows/backend-ci.yml   -> ['pull_request', 'push', 'workflow_dispatch']
    .github/workflows/code-quality.yml -> ['pull_request', 'push', 'schedule', 'workflow_dispatch']
    .github/workflows/frontend-ci.yml  -> ['pull_request', 'push', 'workflow_dispatch']
    .github/workflows/mobile-ci.yml    -> ['pull_request', 'push', 'workflow_dispatch']
    ```
    PR run link: _(pending push)_
  - **Note:** `frontend-ci.yml` also calls three scripts that still do not exist — `test:unit`, `analyze`, `test:a11y`. Left alone deliberately: they are CI failures for REV-004 to record, not silent fixes.
  - **Status:** ⚠️ PARTIAL — code complete; PR-run evidence pending

- [x] **REV-004** - Record the CI failure baseline 🟠 **P1**
  - [x] Capture the full lint / type-check / test failure list from REV-003
  - [x] File one sub-task per failure cluster; add to Phase 1 or 2
  - [x] Record the counts here as a burn-down target
  - **Priority:** 🟠 P1 — this list is the real backlog
  - **Estimated:** 2 hours · **Actual:** ~1 hour
  - **Verify:** failure counts recorded below and referenced by task IDs.
  - **Baseline** (measured locally 2026-09-19, `node 20`, after REV-001/002/005 but before any lint fix):

    | Check | Result | Cluster | Task |
    | :---- | :----- | :------ | :--- |
    | backend `build` (strict `tsc`) | **1 error** | `@fastify/swagger` transform typing, `server.ts:240` | fixed under REV-005 |
    | backend `type-check` | **1 error** | same error | fixed under REV-005 |
    | backend `lint` | **1,604 problems** (1,045 errors, 559 warnings) | 1,042 `prettier/prettier` (auto-fixable), 470 `no-explicit-any`, 89 `no-unused-vars`, 3 other | REV-004a (formatting), REV-032 (`any`) |
    | backend `format:check` | **55 files** unformatted | same prettier cluster | REV-004a |
    | backend `test` | **could not run** — `globalSetup` needs the test database | infra, not code | REV-038 |
    | frontend `type-check` | **6 errors** | 3× `TS2554` in `src/__tests__/auth/auth-flow.test.tsx`, 3× `TS2339` in `tests/e2e/asset-hierarchy.spec.ts` | REV-004b |
    | frontend `lint` | **6 errors, 11 warnings** | 6 `react/no-unescaped-entities`, 11 `react-hooks/exhaustive-deps` | fixed under REV-006 |
    | frontend `format:check` | **141 files** unformatted | prettier was never a frontend dependency | REV-004a |
    | frontend `test` | **9 of 12 suites failed**, 4 of 49 tests failed | suite-level import/mock failures | REV-038 |

  - **Two findings worth separating from the raw counts:**
    1. **The strict-build burn-down is 1 error, not hundreds.** `tsconfig.prod.json` was hiding exactly one type error. The review predicted a large backlog here; it was wrong, and this is the cheapest good news in the whole report.
    2. **1,042 of the backend's 1,045 lint errors are prettier formatting**, every one auto-fixable. The genuine backend lint debt is 3 errors plus 470 `any` warnings. `npm run lint:fix` would clear the 1,042 in one commit — deliberately **not** done here, because it would bury the REV-001/002 diff. Filed as REV-004a.
  - **Also noted:** `backend/tsconfig.json` excludes `tests`, `**/*.test.ts` and `src/__tests__`, so no backend test file is type-checked by `build` or `type-check`. Filed as REV-004b.
  - **Status:** ✅ COMPLETE

- [ ] **REV-004a** - Apply formatting and enforce it 🟡 **P2**
  - [ ] `npm --prefix backend run format` (55 files) and `npm --prefix frontend run format` (141 files)
  - [ ] Land as a **formatting-only commit** with no logic change, so it stays reviewable and `git blame` damage is confined to one revision
  - [ ] Confirm `format:check` then passes in both projects, making the existing CI step meaningful
  - **Priority:** 🟡 P2 — cosmetic, but it is 1,042 of the backend's 1,045 lint errors and it masks the real ones
  - **Estimated:** 1 hour
  - **Split from:** REV-004
  - **Verify:** `npm --prefix backend run format:check && npm --prefix frontend run format:check` → both exit 0.
  - **Status:** 🔴 Not Started

- [ ] **REV-004b** - Type-check the test files 🟡 **P2**
  - [ ] `backend/tsconfig.json` excludes `tests`, `**/*.test.ts` and `src/__tests__` — no backend test file is type-checked by `build` or `type-check`
  - [ ] Add a `tsconfig.test.json` that includes them, and wire it into the `type-check` script
  - [ ] Fix the 6 frontend type errors the current `type-check` already surfaces: 3× `TS2554` in `src/__tests__/auth/auth-flow.test.tsx`, 3× `TS2339` in `tests/e2e/asset-hierarchy.spec.ts`
  - **Priority:** 🟡 P2
  - **Estimated:** 3 hours
  - **Split from:** REV-004
  - **Verify:** `type-check` covers test files in both projects and exits 0.
  - **Status:** 🔴 Not Started

- [x] **REV-005** - Make the backend build capable of failing 🔴 **P0**
  - [x] Remove `|| true` from the `build` script in `backend/package.json`
  - [x] Delete `backend/tsconfig.prod.json`
  - [x] Point `build` at the strict `tsconfig.json` (the now-redundant `build:strict` script was removed; nothing referenced it)
  - [x] Record the resulting error count as the REV-021 burn-down target — **the count was 1**
  - **Priority:** 🔴 P0 — the deployed artefact was compiled under weaker rules than developers see
  - **Estimated:** 1 hour (+ REV-021 for the fixes) · **Actual:** ~40 minutes
  - **Files:** `backend/package.json`, `backend/tsconfig.prod.json` (deleted), `backend/src/server.ts`
  - **Verify:** introduce a deliberate type error → `npm --prefix backend run build` exits non-zero. Revert.
  - **Evidence:**
    ```
    $ echo 'const deliberateTypeError: number = "REV-005 verification";' >> backend/src/index.ts
    $ npm --prefix backend run build
    src/index.ts(42,7): error TS2322: Type 'string' is not assignable to type 'number'.
    exit with deliberate error = 2

    $ git checkout backend/src/index.ts   # reverted
    $ npm --prefix backend run build
    clean build exit = 0
    ```
  - **Deviation from the task as written:** the task says record the error count and do not fix. The count turned out to be **one** — a `sanitizeSchema` return typed `unknown` where `@fastify/swagger` wants `FastifySchema` (`server.ts:240`). Leaving it would have left `main` unbuildable under the new strict build, which defeats the Phase 0 gate, so it was fixed with the same one-line narrowing cast already used at `server.ts:130`. No `any` was introduced. If the reviewer prefers this tracked separately, it is one commit to revert.
  - **Status:** ✅ COMPLETE

- [x] **REV-006** - Stop skipping frontend lint at build time 🟠 **P1**
  - [x] Remove `eslint: { ignoreDuringBuilds: true }` from `frontend/next.config.js`
  - [x] Triage the resulting warnings — all fixed; no `eslint-disable` was needed anywhere
  - [x] Fix `docs/qa/KNOWN_ISSUES.md` M-001 — `useCallback` applied to all 11 `exhaustive-deps` sites across 11 files. The document's own reasoning ("functions are stable") was wrong: each was recreated on every render.
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours · **Actual:** ~1.5 hours
  - **Files:** `frontend/next.config.js`, plus `assets/[id]/edit`, `assets`, `compliance-reports/[id]`, `compliance-reports`, `crews/[id]`, `settings`, `sites/[id]`, `sites`, `work-orders/[id]/edit`, `work-orders/[id]`, `work-orders` pages, `genai/page.tsx`, `components/error-boundary.tsx`
  - **Verify:** `npm --prefix frontend run build` completes with zero eslint errors.
  - **Evidence:**
    ```
    $ npm --prefix frontend run lint
    ✔ No ESLint warnings or errors

    $ npm --prefix frontend run build
    ✓ Compiled successfully
      Linting and checking validity of types ...
    exit=0
    ```
    No behavioural regression: frontend tests are identical before and after the refactor —
    `Test Suites: 9 failed, 3 passed, 12 total` / `Tests: 4 failed, 45 passed, 49 total` in both runs.
    Each `useCallback` dependency array was checked by re-running `next lint` until the rule itself reported nothing missing, rather than by eye.
  - **Follow-up:** `docs/qa/KNOWN_ISSUES.md` M-001 still contains the incorrect "functions are stable" reasoning. Correcting that text belongs with the documentation rewrite in REV-010.
  - **Status:** ✅ COMPLETE

- [ ] **REV-007** - Enable branch protection on `main` 🟠 **P1** 🛑 **BLOCKED**
  - [ ] No direct pushes
  - [ ] CI green required to merge
  - [ ] One approving review from someone other than the author
  - [ ] Require linear history or squash merges (commit `c5d8925` was 49 files, +3,485/−45,439 under the message "backend and frontend updates" — unreviewable)
  - **Priority:** 🟠 P1
  - **Estimated:** 30 minutes
  - **Verify:** attempt `git push origin main` directly → rejected by the server.
  - **Blocked on:** a repository-admin action on `github.com/dpurandare/dCMMS`, and on REV-003's first PR run (there are no check names to require until the workflows have reported once). Not startable from the working tree.
  - **Status:** 🛑 BLOCKED — needs the repo owner

- [x] **REV-008** - Flag the README status section as under review 🟠 **P1**
  - [x] Add a banner to `README.md` stating the status section is unverified and must not be used for planning until REV-009 completes
  - [ ] Notify anyone who has been given the "Production Ready / 100% Complete / APPROVED FOR PRODUCTION DEPLOYMENT" status — ****human action****, cannot be done from the repo
  - **Priority:** 🟠 P1 — planning decisions are currently being made on bad data
  - **Estimated:** 30 minutes · **Actual:** ~20 minutes
  - **Files:** `README.md`
  - **Verify:** banner visible at the top of `README.md` on `main`.
  - **Evidence:** banner is lines 3–21 of `README.md`, immediately under the `#` title and above the badge block. It names the specific unsupported claims, points at `review-plan.md` §2 and REV-009, and keeps the no-blame framing.
  - **Also corrected:** the README's "User Seeding" section claimed production seeds an admin "with a known, strong default password". That is no longer true after REV-002 — it now documents the required `ADMIN_DEFAULT_PASSWORD`. Left every other status claim untouched for REV-010 to rewrite from the inventory.
  - **Status:** ⚠️ PARTIAL — banner live; stakeholder notification is yours to send

---

# PHASE 1 — Ground Truth

**Duration:** 1 week · **Gate:** verified inventory published · database migrates old → head · security findings triaged

## 1.1 Verified Feature Inventory (WS-1)

- [ ] **REV-009** - Build the verified feature inventory 🟠 **P1**
  - [ ] For each of the 113 tasks in `TasksTracking/01`–`14`, locate the implementing code
  - [ ] Check: is the route registered in `backend/src/server.ts`? If not → `Not wired`
  - [ ] Check: does the service reach the DB / an external system, or return mock data? If mock → `Mock`
  - [ ] Check: is there a test or a recorded manual verification? If not → `Unverified`
  - [ ] Exercise each feature against a running stack (`./scripts/dev.sh`) and record the actual HTTP response
  - [ ] Assign a final status: `Working` / `Partial` / `Mock` / `Not wired` / `Absent`
  - **Priority:** 🟠 P1 — every downstream estimate depends on this
  - **Estimated:** 4 days (2 reviewers)
  - **Deliverable:** `docs/review/feature-inventory.md`
  - **Verify:** every one of the 113 task IDs appears in the inventory with a status and an evidence link.
  - **Status:** 🔴 Not Started

- [ ] **REV-010** - Rewrite the status tables from the inventory 🟠 **P1**
  - [ ] **Delete** the status tables in `TasksTracking/README.md` and `README.md` §Project Status — do not edit them; they cannot be incrementally corrected
  - [ ] Regenerate both from REV-009
  - [ ] Remove all unverifiable metrics from `README.md`: "156/156 integration tests", "243/243 regression tests", "93/100 security score", "92–96% accuracy", "96.8% accuracy", "20 Sprints ✅ 100%"
  - [ ] Re-mark modules 09 (Machine Learning) and 10 (Cost Management) — both are `✅ Complete` while their routes are unregistered
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours
  - **Files:** `README.md`, `TasksTracking/README.md`, `TasksTracking/09_*.md`, `TasksTracking/10_*.md`
  - **Verify:** every `✅` remaining in `TasksTracking/` traces to an inventory row.
  - **Status:** 🔴 Not Started

## 1.2 Database & Migrations (WS-4) — blocks Phase 2

- [ ] **REV-011** - Reconcile the two migration systems 🔴 **P0**
  - [ ] **Decision required:** adopt Drizzle-generated migrations and port `008`–`022` into it, **or** adopt plain SQL and write a runner. Record the decision as an ADR.
  - [ ] `backend/src/db/migrate.ts` runs the Drizzle migrator against `./drizzle`, which holds exactly one squashed migration (`0000_abnormal_omega_flight.sql`, 37 tables — confirmed by `drizzle/meta/_journal.json`)
  - [ ] The 16 hand-written files in `backend/src/db/migrations/` (numbered 008–022) are executed by **nothing** — not `scripts/dev.sh:114`, not `backend/scripts/docker-entrypoint.sh`
  - [ ] Port or delete each of the 16 files; none may remain unreferenced
  - [ ] Resolve the duplicate `020` prefix (`020_add_chat_feedback.sql`, `020_fix_genai_vector_dimensions.sql`)
  - [ ] Renumber from `001`; the sequence currently starts at `008` with no 001–007
  - **Priority:** 🔴 P0 — the project has **no incremental upgrade path**; the only deployment strategy is drop-and-recreate
  - **Estimated:** 3 days
  - **Files:** `backend/src/db/migrate.ts`, `backend/drizzle/`, `backend/src/db/migrations/`
  - **Verify:** `ls backend/src/db/migrations` → empty or every file referenced by the runner. Migrating a DB created from the previous release to head succeeds.
  - **Status:** 🔴 Not Started

- [ ] **REV-012** - Re-apply the migrations that never ran 🟠 **P1**
  - [ ] `022_fix_asset_jsonb_columns.sql` — shipped as the fix for FE-BUG-04 in commit `5e89c2f`, never executed. The bug is still live in any database not recreated from `0000`.
  - [ ] Audit `008`–`021` for the same problem — each may contain an unapplied fix
  - [ ] Confirm each is idempotent before re-running (`022` already uses a `DO` block — good practice, follow it)
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Depends on:** REV-011
  - **Verify:** on a DB provisioned before the fix, `\d assets` shows `location` and `metadata` as `jsonb`.
  - **Status:** 🔴 Not Started

- [ ] **REV-013** - Verify `schema.ts` matches a migrated database 🟠 **P1**
  - [ ] Migrate a clean DB to head; diff the live schema against `backend/src/db/schema.ts` column by column
  - [ ] Silent drift has already occurred once (the `assets` jsonb columns) — assume more exists
  - [ ] File a task per divergence
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Depends on:** REV-011
  - **Verify:** `drizzle-kit` introspection of the live DB produces no diff against `schema.ts`.
  - **Status:** 🔴 Not Started

- [ ] **REV-014** - Add a migration test to CI 🟠 **P1**
  - [ ] CI job: provision Postgres → migrate from the oldest supported version → head → assert success
  - [ ] Run on every PR that touches `backend/src/db/`
  - **Priority:** 🟠 P1 — this is what would have caught REV-011 originally
  - **Estimated:** 4 hours
  - **Depends on:** REV-011
  - **Verify:** the job appears and passes on a PR touching a migration.
  - **Status:** 🔴 Not Started

- [ ] **REV-015** - Review indexes against real query patterns 🟡 **P2**
  - [ ] Extract the actual query shapes from `backend/src/services/*`
  - [ ] Confirm composite indexes exist on `(tenant_id, …)` for every filtered table
  - [ ] `EXPLAIN ANALYZE` the ten highest-traffic queries against seeded data
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** no sequential scan on any table > 10k rows in the ten sampled queries.
  - **Status:** 🔴 Not Started

- [ ] **REV-016** - Confirm seeding cannot run in production 🟡 **P2**
  - [ ] `backend/src/db/auto-seed.ts` gates on `AUTO_SEED=true` and `NODE_ENV ∈ {development,test,local}` — verify the gate holds under every deployment path
  - [ ] Confirm the default test credentials in `CLAUDE.md` cannot exist in a production database
  - **Priority:** 🟡 P2
  - **Estimated:** 2 hours
  - **Verify:** with `NODE_ENV=production AUTO_SEED=true`, seeding does not run.
  - **Status:** 🔴 Not Started

## 1.3 Security Deep Pass (WS-3)

- [ ] **REV-017** - Decide and implement the token storage model 🟠 **P1**
  - [ ] Access and refresh tokens are currently in `localStorage` (`frontend/src/store/auth-store.ts:36-37,75-76`) — any XSS yields both, including the 7-day refresh token
  - [ ] **Recommendation:** refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie; access token in memory only
  - [ ] Note: this also makes the existing CSRF subsystem *correct* rather than redundant (see REV-018)
  - [ ] Update `frontend/src/lib/api-client.ts` and `backend/src/routes/auth.ts` accordingly
  - **Priority:** 🟠 P1
  - **Estimated:** 2 days
  - **Verify:** after login, `localStorage` contains no token; `document.cookie` cannot read the refresh token from JS.
  - **Status:** 🔴 Not Started

- [ ] **REV-018** - Resolve the CSRF / threat-model mismatch 🟠 **P1**
  - [ ] Authentication is pure `Authorization: Bearer` — there are no cookies in `backend/src/routes/auth.ts` or `plugins/jwt.ts`. Bearer tokens are not sent ambiently by browsers, so CSRF is not applicable to the current design.
  - [ ] The team nonetheless built `middleware/csrf.ts`, Redis token storage, `routes/csrf.ts`, `frontend/src/lib/csrf.ts`, 28 test assertions (the repo's largest test cluster), two design docs and `backend/scripts/add-csrf-protection.sh` for it.
  - [ ] **If REV-017 moves to cookies:** keep the CSRF work — it becomes correct and necessary. Re-verify it against the new flow.
  - [ ] **If REV-017 keeps Bearer:** remove the subsystem and document why in an ADR.
  - [ ] Either way, write the threat model down. Its absence is what allowed a large, well-executed body of work to be aimed at the wrong risk.
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day (decision + follow-through)
  - **Depends on:** REV-017
  - **Verify:** an ADR exists recording the auth transport, the threats it addresses, and the CSRF decision.
  - **Status:** 🔴 Not Started

- [ ] **REV-019** - Tighten Content-Security-Policy 🟠 **P1**
  - [ ] Remove `'unsafe-eval'` and `'unsafe-inline'` from `script-src` in `frontend/next.config.js` — the primary XSS mitigation is currently disabled
  - [ ] Make `connect-src` environment-driven; it is hardcoded to `http://localhost:3001` / `ws://localhost:3001` and **will break every API call in production**
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours
  - **Files:** `frontend/next.config.js`
  - **Verify:** production build served with a production `NEXT_PUBLIC_API_URL` → no CSP violations in console; API calls succeed.
  - **Status:** 🔴 Not Started

- [ ] **REV-020** - Tenant isolation audit 🟠 **P1**
  - [ ] 16 route files and 28 service files contain no reference to `tenantId` at all
  - [ ] For all 39 route files, confirm every query is scoped by `tenantId` taken **from the JWT**, never from the request body or params
  - [ ] Fix `backend/src/routes/notifications.ts:513` — `tenantId: "default-tenant-id" // TODO: Get from auth context`
  - [ ] Write a cross-tenant IDOR test per resource type (work orders, assets, sites, reports, notifications, crews, permits)
  - [ ] Evaluate Postgres row-level security as a defence in depth
  - **Priority:** 🟠 P1 — highest-consequence bug class available in a multi-tenant CMMS, currently untested
  - **Estimated:** 3 days
  - **Verify:** the IDOR test suite passes: tenant A receives 403/404, never tenant B's rows.
  - **Status:** 🔴 Not Started

- [ ] **REV-021** - Unify the two backend RBAC vocabularies 🟠 **P1**
  - [ ] `backend/src/constants/permissions.ts` (colon: `read:work-orders`) is used by `middleware/authorize.ts` and all 20 guarded routes — this is the canonical one
  - [ ] `backend/src/config/permissions.ts` (dot: `work-orders.view`) is used only by `middleware/rbac.ts`, which **no route imports** — both are dead code
  - [ ] Delete `backend/src/middleware/rbac.ts` and `backend/src/config/permissions.ts`
  - [ ] Add a test asserting frontend and backend permission strings are identical
  - [ ] Note: `PERMISSION_MIGRATION.md` records this exact duplication being found and fixed **on the frontend** on 2026-02-23 after it caused real "Access Denied" bugs. The backend half was left in place.
  - **Priority:** 🟠 P1 — two sources of authorization truth in a security-critical path
  - **Estimated:** 4 hours
  - **Verify:** `grep -rn "middleware/rbac\|config/permissions" backend/src` → no matches. Permission-parity test passes.
  - **Status:** 🔴 Not Started

- [ ] **REV-022** - Add login throttling and account lockout 🟡 **P2**
  - [ ] `backend/src/routes/auth.ts` login has no lockout, no per-account throttle, no failed-attempt tracking
  - [ ] The only limit is the global 100 req/min (`server.ts:170`) — not a credential-stuffing defence
  - [ ] Add per-account failed-attempt counting with exponential backoff, and audit-log lockout events
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** 10 failed logins for one account → subsequent attempts rejected; a different account is unaffected.
  - **Status:** 🔴 Not Started

- [ ] **REV-023** - Triage all dependency vulnerabilities 🟠 **P1**
  - [ ] Backend: **59 vulnerabilities — 4 critical, 21 high**. Frontend: **28 — 1 critical, 21 high**.
  - [ ] Priority advisories: `fast-jwt` improper `iss` validation (critical, sits in the auth path); `drizzle-orm` SQL injection via improperly escaped identifiers (high, sits in every query); `handlebars` JS injection (critical, used for report/notification templating); `@fastify/static` authorization bypass via non-canonical paths (high)
  - [ ] Patch every critical and high, or record an accepted risk with a named approver
  - [ ] Enable Dependabot; fail CI on new critical/high
  - **Priority:** 🟠 P1 — `docs/security/security-audit-report.md` claims "0 Critical, 0 High"
  - **Estimated:** 2 days
  - **Verify:** `npm audit --audit-level=high` exits 0 in both projects, or every exception is listed in `docs/review/accepted-risks.md`.
  - **Status:** 🔴 Not Started

- [ ] **REV-024** - Rewrite or withdraw the security audit report 🟠 **P1**
  - [ ] `docs/security/security-audit-report.md` claims "🟢 EXCELLENT (93/100), 0 Critical, 0 High, APPROVED for deployment" — contradicted by REV-001 and REV-023
  - [ ] Rewrite from the actual findings, or delete it. It cannot stand as written.
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours
  - **Depends on:** REV-023
  - **Verify:** the document either reflects the findings register or no longer exists.
  - **Status:** 🔴 Not Started

---

# PHASE 2 — Deep Code Review

**Duration:** 2 weeks · **Gate:** every route and page has a status and an owner · critical-path tests pass in CI

## 2.1 Backend (WS-5)

- [ ] **REV-025** - Resolve the 14 unregistered route files 🟠 **P1**
  - [ ] `server.ts` registers 25 route modules; there are 39 route files. These 14 are unreachable dead code:
        `alarms`, `budget-management`, `cost-analytics`, `cost-calculation`, `ml-deployment`, `ml-explainability`, `ml-inference`, `model-governance`, `model-performance`, `notification-history`, `predictive-wo`, `slack`, `weather`, `wo-approval`
  - [ ] Per file, decide: **register** (and complete it), or **delete**
  - [ ] Note the status conflict: `TasksTracking/10_Cost_Management.md` is `✅ Complete` with all three of its routes unregistered; `09_Machine_Learning.md` is `✅ Complete` with five unregistered
  - [ ] Add a CI check asserting every file in `routes/` is registered in `server.ts`
  - **Priority:** 🟠 P1
  - **Estimated:** 2 days (triage) + per-feature completion
  - **Verify:** `for f in backend/src/routes/*.ts; do grep -q "$(basename $f .ts)\"" backend/src/server.ts || echo "UNREGISTERED: $f"; done` → no output.
  - **Status:** 🔴 Not Started

- [ ] **REV-026** - Fix the frontend calls that 404 today 🟠 **P1**
  - [ ] `frontend/src/services/model-governance.service.ts:29,34,39` calls `/model-governance/models`, `/model-governance/register`, `/model-governance/:id/stage` — backend route unregistered
  - [ ] Other code calls `/ml-inference/predict/all` and `/ml-inference/predictions/logs` — backend route unregistered
  - [ ] Every one of these returns 404 at runtime; no test or manual script covers those pages
  - [ ] Either register the backend routes (REV-025) or remove the frontend features
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Depends on:** REV-025
  - **Verify:** an integration test asserts every `apiClient` path in `frontend/src` resolves to a registered backend route.
  - **Status:** 🔴 Not Started

- [ ] **REV-027** - Adopt and enforce the mock policy 🟠 **P1**
  - [ ] Every mock implementation must: (a) be named `*.mock.ts`, (b) refuse to load when `NODE_ENV=production`, (c) return an `X-Mock-Data: true` response header, (d) be marked `Mock` in the inventory — **never** `Complete`
  - [ ] Apply to: `cost-analytics.service.ts` (the entire service is `Math.random()` — costs, variances, trends and period comparisons are randomly generated at lines 55–60, 83–84, 173–179, 224–234, 259–262, 294–301, 328, 346), `ml-inference.service.ts`, `email.service.ts`, `sms.service.ts`, `push.service.ts`
  - [ ] Add a CI check that no `*.mock.ts` is imported from a production code path
  - **Priority:** 🟠 P1 — makes this class of failure structurally impossible to repeat
  - **Estimated:** 2 days
  - **Verify:** with `NODE_ENV=production`, importing any mock service throws at startup.
  - **Status:** 🔴 Not Started

- [ ] **REV-028** - Complete or descope the stubbed integrations 🟠 **P1**
  - [ ] `email-provider.service.ts:76,112` — SendGrid and AWS SES are `// TODO`
  - [ ] `sms-provider.service.ts:82,114` — Twilio and AWS SNS are `// TODO`
  - [ ] `push-notification.service.ts:136,382` — FCM is `// TODO`; the mobile app's documented push feature has no server side
  - [ ] `wo-approval.service.ts:322,335,349,361` — approval query, update, assignment and notification are `// TODO`; approvals do not persist
  - [ ] `predictive-wo.service.ts:277,285,295` — DB reads and writes are `// TODO`; predictive work orders are never saved
  - [ ] For each: implement, or descope to `TasksTracking/99_Descoped_Tasks.md` with a reason
  - **Priority:** 🟠 P1
  - **Estimated:** 1–3 weeks depending on scope decisions
  - **Verify:** `grep -rn "TODO" backend/src/services` → every remaining TODO has a task ID beside it.
  - **Status:** 🔴 Not Started

- [ ] **REV-029** - Per-route review pass 🟠 **P1**
  - [ ] For each of the 39 route modules confirm: registered · authenticated · authorised with the correct permission · Zod-validated at the boundary · tenant-scoped · errors handled without leaking internals · matches its `specs/` definition
  - [ ] `routes/health.ts` and `routes/slack.ts` have no auth guard — confirm intentional for health, fix for slack
  - **Priority:** 🟠 P1
  - **Estimated:** 5 days (2 reviewers)
  - **Verify:** a per-route table in `docs/review/backend-findings.md`, every row filled.
  - **Status:** 🔴 Not Started

- [ ] **REV-030** - Per-service review pass 🟡 **P2**
  - [ ] For each of the 51 services confirm: real or mock · transaction boundaries correct where multiple writes occur · no N+1 patterns
  - [ ] Start with `user.service.ts:119` — filters in memory with `// so we'll do filtering in memory for now / In production, build dynamic where clauses`
  - [ ] `webhook.service.ts:454` — retries scheduled in-memory with `// In production, this would be handled by a background worker`; these are lost on restart
  - **Priority:** 🟡 P2
  - **Estimated:** 4 days (2 reviewers)
  - **Verify:** a per-service table in `docs/review/backend-findings.md`.
  - **Status:** 🔴 Not Started

- [ ] **REV-031** - Consolidate duplicated services 🟡 **P2**
  - [ ] `notification-batching.service.ts` (623 lines, used by `server.ts`) vs `notification-batch.service.ts` (646 lines, used by a script)
  - [ ] `push-notification.service.ts` (399) vs `push.service.ts` (68, unused)
  - [ ] `sms-provider.service.ts` (261) vs `sms.service.ts` (51) — **neither is imported anywhere**
  - [ ] `slack-provider.service.ts` (465) vs `slack.service.ts` (123)
  - [ ] `report-builder.service.ts` (422) vs `report.service.ts` (125) — both imported by `routes/reports.ts`
  - [ ] ~1,300 lines of duplicated or orphaned service code total
  - **Priority:** 🟡 P2
  - **Estimated:** 3 days
  - **Verify:** each pair reduced to one service; `ts-prune` (or equivalent) reports no unreferenced service exports.
  - **Status:** 🔴 Not Started

- [ ] **REV-032** - Burn down `any` usage 🟡 **P2**
  - [ ] 430 uses of `any` / `as any` in the backend, 77 in the frontend — the downstream consequence of REV-005
  - [ ] Fix, do not suppress. Adding `any` to silence a strict-mode error is not a fix.
  - [ ] Set a per-sprint reduction target; enforce a ratchet in CI (count may not increase)
  - **Priority:** 🟡 P2
  - **Estimated:** ongoing
  - **Depends on:** REV-005
  - **Verify:** CI ratchet job fails when the count rises.
  - **Baseline:** backend 430 · frontend 77 · **current:** `___` / `___`
  - **Status:** 🔴 Not Started

## 2.2 Frontend (WS-6)

- [ ] **REV-033** - Fix the default API URL 🟡 **P2**
  - [ ] `frontend/src/lib/api-client.ts:22` defaults to `http://localhost:3000/api/v1` — the **frontend's own port**; the backend is on 3001 (`CLAUDE.md`)
  - [ ] Same default in `frontend/next.config.js` `env.NEXT_PUBLIC_API_URL`
  - [ ] Works only because the env var is always set; a misconfiguration fails confusingly
  - **Priority:** 🟡 P2
  - **Estimated:** 1 hour
  - **Verify:** unset `NEXT_PUBLIC_API_URL` → the app targets 3001 or fails with a clear message.
  - **Status:** 🔴 Not Started

- [ ] **REV-034** - Per-page review pass 🟠 **P1**
  - [ ] For each of the 20 route groups in `frontend/src/app` confirm: every `apiClient` call maps to a registered backend route · loading, empty **and** error states render · route protection present and using colon-notation permissions · no tenant data in client state the user may not see
  - **Priority:** 🟠 P1
  - **Estimated:** 5 days (2 reviewers)
  - **Verify:** a per-page table in `docs/review/frontend-findings.md`.
  - **Status:** 🔴 Not Started

- [ ] **REV-035** - Fix token-refresh race conditions 🟡 **P2**
  - [ ] `frontend/src/lib/api-client.ts` — concurrent 401s each trigger their own refresh call; with refresh-token rotation this can revoke a valid session or trip theft detection
  - [ ] Serialise refresh behind a single in-flight promise; queue and replay pending requests
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** fire five concurrent requests with an expired access token → exactly one refresh call; all five succeed.
  - **Status:** 🔴 Not Started

- [ ] **REV-036** - Accessibility spot-check 🔵 **P3**
  - [ ] Run axe against the five highest-traffic pages (dashboard, work orders list, work order detail, assets, login)
  - [ ] Fix keyboard traps, missing labels, and contrast failures
  - **Priority:** 🔵 P3
  - **Estimated:** 2 days
  - **Verify:** zero axe critical/serious violations on the five pages.
  - **Status:** 🔴 Not Started

## 2.3 Tests (WS-7)

- [ ] **REV-037** - Consolidate the duplicate test trees 🟡 **P2**
  - [ ] `frontend/e2e/` and `frontend/tests/e2e/` both exist and both contain `auth.spec.ts`
  - [ ] `backend/test/` and `backend/tests/` likewise
  - [ ] Which suite runs currently depends on which script is invoked
  - [ ] Delete `backend/test/e2e/predictive-maintenance.e2e.test.ts.skip` (26 assertions disabled by file extension) — fix it or remove it; never rename to disable
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** one command per project runs every test; no duplicate spec filenames remain.
  - **Status:** 🔴 Not Started

- [ ] **REV-038** - Define and test the critical paths 🟠 **P1**
  - [ ] The repository currently has **212 test assertions in total**, against a README claiming "156/156 integration tests, 243/243 regression tests"
  - [ ] Goal is not a coverage percentage — it is that these paths cannot silently break again:
  - [ ] Login / refresh / logout
  - [ ] Work order: create → assign → complete → close (incl. state-machine rejection of invalid transitions)
  - [ ] Asset CRUD with hierarchy
  - [ ] Tenant isolation on every resource (REV-020)
  - [ ] Permission enforcement per role, all 6 roles
  - [ ] Migration up from the oldest supported version (REV-014)
  - [ ] Run against a real Postgres in CI, not mocks
  - **Priority:** 🟠 P1
  - **Estimated:** 1 week
  - **Deliverable:** `docs/review/test-plan.md`
  - **Verify:** all six suites pass in CI on a PR.
  - **Status:** 🔴 Not Started

- [ ] **REV-039** - Set an enforced coverage floor 🟡 **P2**
  - [ ] Start at 60% on `backend/src/services/` and `backend/src/middleware/`; 0% floor elsewhere initially
  - [ ] Fail CI below the floor; raise it one step per sprint
  - **Priority:** 🟡 P2
  - **Estimated:** 4 hours
  - **Depends on:** REV-038
  - **Verify:** CI fails when coverage on those directories drops below the floor.
  - **Status:** 🔴 Not Started

- [ ] **REV-040** - Review file upload security 🟡 **P2**
  - [ ] `@fastify/multipart` config and `file-storage.service.ts` — MIME type validation, size limits, path traversal, filename sanitisation
  - [ ] `file-storage.service.ts:28` writes to local disk (`./uploads`) while MinIO is provisioned and unused (REV-046)
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** uploads of `../../etc/passwd`, a 1GB file, and a disguised executable are all rejected.
  - **Status:** 🔴 Not Started

- [ ] **REV-041** - Review the GenAI path 🟡 **P2**
  - [ ] `genai.service.ts` — prompt injection via uploaded documents; tenant leakage through the shared vector store
  - [ ] Confirm embeddings are tenant-partitioned and retrieval cannot cross tenants
  - **Priority:** 🟡 P2
  - **Estimated:** 2 days
  - **Verify:** a document uploaded by tenant A is never retrievable in a tenant B chat session.
  - **Status:** 🔴 Not Started

---

# PHASE 3 — Periphery

**Duration:** 1 week · **Gate:** infra trimmed · docs classified · scope decision on ML/telemetry/mobile

## 3.1 Infrastructure (WS-8)

- [ ] **REV-042** - Remove unused infrastructure 🟡 **P2**
  - [ ] `docker-compose.yml` provisions 15 services. **TimescaleDB: 0 code references. HashiCorp Vault: 0 code references.**
  - [ ] Vault is provisioned as the documented secrets manager while the app reads secrets from `process.env` with hardcoded fallbacks (REV-001, REV-002)
  - [ ] Remove both, or make them used. They currently cost money and operational burden and return nothing.
  - [ ] They also inflate every readiness estimate, because the runbooks describe operating services nothing depends on.
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** `./scripts/deploy.sh` succeeds with the services removed.
  - **Status:** 🔴 Not Started

- [ ] **REV-043** - Decide between QuestDB and ClickHouse 🟡 **P2**
  - [ ] The system runs three time-series stores; the code uses at most two (ClickHouse: 13 files, QuestDB: 5)
  - [ ] Pick one, or write an ADR justifying both
  - **Priority:** 🟡 P2
  - **Estimated:** 2 days (decision + migration plan)
  - **Verify:** an ADR exists; `docker-compose.yml` matches it.
  - **Status:** 🔴 Not Started

- [ ] **REV-044** - Verify `deploy.sh` from a clean machine 🟠 **P1**
  - [ ] Run on a machine with no prior state; time it; record every failure
  - [ ] Confirm health checks, resource limits, restart policies and log aggregation actually work
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Verify:** a clean-machine run reaches a working stack, with the elapsed time recorded here.
  - **Status:** 🔴 Not Started

- [ ] **REV-045** - Test backup and restore 🟠 **P1**
  - [ ] Run `scripts/backup/` and restore into a fresh database
  - [ ] An untested backup is not a backup — `docs/operations/disaster-recovery-plan.md` asserts RTO < 4h / RPO < 24h with no evidence this has ever been exercised
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Verify:** a restored database passes the REV-038 critical-path suite.
  - **Status:** 🔴 Not Started

- [ ] **REV-046** - Validate the Terraform 🟡 **P2**
  - [ ] `infrastructure/terraform` is 217 lines across 1 file — confirm it is real infrastructure, not a sketch
  - [ ] `terraform validate` and `plan` against a real provider
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Verify:** `terraform validate` passes; `plan` produces a coherent resource graph.
  - **Status:** 🔴 Not Started

## 3.2 Documentation (WS-9)

- [ ] **REV-047** - Classify every document 🟠 **P1**
  - [ ] Stamp each of the ~80 files in `docs/` with one of: **SPEC** (intended design) · **PLAN** (future work) · **VERIFIED** (describes shipped, tested behaviour) · **STALE** (→ `docs/archive/`)
  - [ ] Nothing may be **VERIFIED** without a REV-009 inventory row behind it
  - **Priority:** 🟠 P1 — the documentation is voluminous and well-written; its problem is that aspirational and descriptive content are indistinguishable
  - **Estimated:** 2 days
  - **Verify:** every file in `docs/` carries a classification header.
  - **Status:** 🔴 Not Started

- [ ] **REV-048** - Generate `openapi.yaml` from the code 🟠 **P1**
  - [ ] `docs/api/openapi.yaml` documents **19 paths**; the backend registers 25 route modules exposing well over a hundred endpoints
  - [ ] Swagger UI is served from this spec (`server.ts:217+`), so API consumers see a document that does not describe the system
  - [ ] Generate it from the Fastify route schemas — it must never be hand-maintained again, or it will drift again
  - [ ] Add a CI check that the committed spec matches the generated one
  - **Priority:** 🟠 P1
  - **Estimated:** 2 days
  - **Verify:** the CI drift check passes; the path count matches the registered route count.
  - **Status:** 🔴 Not Started

- [ ] **REV-049** - Rewrite `KNOWN_ISSUES.md` from the findings register 🟡 **P2**
  - [ ] Currently declares "Critical Issues (P0): None Found ✅" while REV-001 through REV-011 were all discoverable by reading the repository
  - **Priority:** 🟡 P2
  - **Estimated:** 4 hours
  - **Verify:** every open P0/P1 in this file appears in `docs/qa/KNOWN_ISSUES.md`.
  - **Status:** 🔴 Not Started

- [ ] **REV-050** - Demote the operations documents to PLAN 🟡 **P2**
  - [ ] `docs/operations/*` (disaster recovery, RTO/RPO, on-call rotation, incident response, production readiness checklist) describes operating a production system that has never had a working migration path
  - [ ] Promote back to VERIFIED individually as REV-011, REV-044 and REV-045 complete
  - **Priority:** 🟡 P2
  - **Estimated:** 2 hours
  - **Verify:** each file carries PLAN until its prerequisite task is ✅.
  - **Status:** 🔴 Not Started

- [ ] **REV-051** - Rewrite the integration and documentation review reports 🟡 **P2**
  - [ ] `docs/testing/release-2-integration-test-report.md` — "156/156 passed, 243/243 passed, ✅ PASS Ready for Production", with no corresponding artefact anywhere in the repo
  - [ ] `docs/documentation-review-report.md` — "95% coverage, 98% technical accuracy, APPROVED"
  - [ ] Rewrite from real runs, or archive both as STALE
  - **Priority:** 🟡 P2
  - **Estimated:** 4 hours
  - **Verify:** any surviving figure traces to a CI run link.
  - **Status:** 🔴 Not Started

- [ ] **REV-052** - Preserve the specs as-is 🔵 **P3**
  - [ ] `specs/01`–`26` are detailed, internally consistent and the project's strongest asset — a new team would need months to reproduce them
  - [ ] Mark **SPEC**; do not edit as part of this remediation
  - [ ] Where code diverges from a spec, the finding goes against the code
  - **Priority:** 🔵 P3
  - **Estimated:** 1 hour
  - **Verify:** all 26 numbered specs carry a SPEC header and are unmodified.
  - **Status:** 🔴 Not Started

## 3.3 ML / Telemetry / Mobile Triage (WS-10)

- [ ] **REV-053** - Triage `ml/` 🟡 **P2**
  - [ ] 31 Python files / 9.5k LOC, 3 test files. All five ML route files are unregistered; `ml-inference.service.ts` is a mock.
  - [ ] Answer three questions only: does it run · what depends on it · keep / defer / cut
  - [ ] The README advertises "92–96% accuracy anomaly detection" and "96.8% accuracy energy forecasting" — establish whether any measurement backs these, or remove the claims
  - **Priority:** 🟡 P2
  - **Estimated:** 2 days
  - **Deliverable:** one page in `docs/review/ml-triage.md`
  - **Verify:** a recommendation with a named decision-maker.
  - **Status:** 🔴 Not Started

- [ ] **REV-054** - Triage `telemetry/` 🟡 **P2**
  - [ ] 13 files / 3.5k LOC. Confirm the Kafka → processing → storage path runs end-to-end.
  - [ ] The README claims "72K events/sec" — establish whether a load test artefact exists
  - **Priority:** 🟡 P2
  - **Estimated:** 2 days
  - **Deliverable:** one page in `docs/review/telemetry-triage.md`
  - **Status:** 🔴 Not Started

- [ ] **REV-055** - Triage `mobile/` 🟡 **P2**
  - [ ] 21 Dart files / 4.7k LOC, 3 test files. Documented features include push notifications, whose server side is a `// TODO` (REV-028).
  - [ ] Confirm the app builds and can authenticate against the backend
  - [ ] Verify offline sync and conflict resolution against `specs/04_MOBILE_OFFLINE_SYNC.md`
  - **Priority:** 🟡 P2
  - **Estimated:** 2 days
  - **Deliverable:** one page in `docs/review/mobile-triage.md`
  - **Status:** 🔴 Not Started

- [ ] **REV-056** - Scope decision on the three peripheral areas 🟠 **P1**
  - [ ] These represent ~18k LOC with almost no integration into the running product
  - [ ] Decide in / out of scope for internal beta **before** spending further review effort
  - **Priority:** 🟠 P1
  - **Estimated:** half a day (decision meeting)
  - **Depends on:** REV-053, REV-054, REV-055
  - **Verify:** decision recorded in `TasksTracking/README.md` and, where cut, in `99_Descoped_Tasks.md`.
  - **Status:** 🔴 Not Started

---

# PHASE 4 — Re-baseline

**Duration:** 3 days · **Gate:** signed-off remediation plan and a date built on verified status

- [ ] **REV-057** - Adopt the Definition of Done 🟠 **P1**
  - [ ] Publish the nine-point DoD from `review-plan.md` §9 as the team standard
  - [ ] Add it as a PR checklist template in `.github/`
  - [ ] Key clause: the status vocabulary must include a way to say "not finished". `⚠️ PARTIAL` is blameless and acceptable; `✅ COMPLETE` without evidence is not. This is the root-cause fix.
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours
  - **Verify:** the PR template is in place and used on the next five PRs.
  - **Status:** 🔴 Not Started

- [ ] **REV-058** - Consolidate the findings register 🟠 **P1**
  - [ ] Merge all workstream findings into `docs/review/findings.md`
  - [ ] Every row: ID · severity · area · `file:line` · observed · expected · impact · **owner** · **estimate** · status
  - [ ] Owner and estimate are assigned when the finding is written, not later — otherwise it becomes another undifferentiated backlog item
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Verify:** no row has an empty owner or estimate.
  - **Status:** 🔴 Not Started

- [ ] **REV-059** - Estimate remediation and agree beta scope 🟠 **P1**
  - [ ] Size the remaining work from the verified inventory and findings register
  - [ ] Agree scope and a date for internal beta with stakeholders, on verified status only
  - [ ] Current review estimate: **6–10 weeks to a credible internal beta**, not production-ready
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day
  - **Depends on:** REV-009, REV-058
  - **Verify:** a signed-off scope document with a date.
  - **Status:** 🔴 Not Started

- [ ] **REV-060** - Retrospective on the process failure 🔵 **P3**
  - [ ] Run it on the process, not the people. The review's conclusion was explicit: this was a systemic failure, not a competence failure.
  - [ ] Juniors were asked to self-certify with no gate, no reviewer empowered to say "not done", and a status template whose only value was `✅`. They filled it in.
  - [ ] Confirm the guardrails now in place (REV-003, REV-007, REV-057) would have caught each Phase 0/1 finding
  - [ ] Unfreeze feature development
  - **Priority:** 🔵 P3
  - **Estimated:** half a day
  - **Verify:** each Phase 0/1 finding mapped to the guardrail that now prevents it.
  - **Status:** 🔴 Not Started

---

## What was working well

Recorded here deliberately, because remediation plans that only list defects produce defensiveness, and defensiveness hides problems:

- **The domain model is strong.** `backend/src/db/schema.ts` — 37 tables, 1,522 lines — is coherent, consistently uses UUIDs and `tenant_id` foreign keys, and reflects real CMMS domain understanding.
- **`specs/01`–`26` are the project's best asset.** Detailed, internally consistent, months of work to reproduce. Preserved unchanged by REV-052.
- **Layering is correct and consistent** — routes → services → db with a shared middleware layer, followed faithfully across all 39 route files. That consistency is precisely what makes the codebase salvageable rather than a rewrite.
- **The `RunAndFix` work shows the right instincts.** `PERMISSION_MIGRATION.md` is a model refactor write-up: problem stated, mapping table, scope enumerated, dead code deleted. `022_fix_asset_jsonb_columns.sql` is idempotent by design.
- **Security work was competently executed even where mis-targeted.** The CSRF implementation is correct for what it does; the failure was direction, not execution — and direction is a senior responsibility.

The team works to a high standard when told what the standard is. REV-057 is the task that supplies it.

---

## Traceability

| Task range | Workstream | `review-plan.md` § |
| :--------- | :--------- | :----------------- |
| REV-001, 002, 017–024 | WS-3 Security | §2.6, §6 WS-3 |
| REV-003–008 | WS-2 Quality gates | §2.2, §6 WS-2 |
| REV-009, 010 | WS-1 Ground truth | §2.1, §6 WS-1 |
| REV-011–016 | WS-4 Database | §2.3, §6 WS-4 |
| REV-025–032 | WS-5 Backend | §2.4, §2.5, §2.9, §6 WS-5 |
| REV-033–036 | WS-6 Frontend | §2.4, §2.9, §6 WS-6 |
| REV-037–041 | WS-7 Tests | §2.1, §6 WS-7 |
| REV-042–046 | WS-8 Infrastructure | §2.7, §6 WS-8 |
| REV-047–052 | WS-9 Documentation | §2.8, §6 WS-9 |
| REV-053–056 | WS-10 Triage | §2.4, §6 WS-10 |
| REV-057–060 | Re-baseline | §7, §9 |

**Source:** [`review-plan.md`](../review-plan.md) — full findings with evidence.
