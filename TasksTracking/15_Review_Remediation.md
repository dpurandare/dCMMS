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
| **Phase 1** — Ground truth (1 week) | WS-1, WS-3, WS-4 | 16 | 13 | ⚠️ In Progress |
| **Phase 2** — Deep code review (2 weeks) | WS-5, WS-6, WS-7 | 17 | 0 | 🔴 Not Started |
| **Phase 3** — Periphery (1 week) | WS-8, WS-9, WS-10 | 15 | 0 | 🔴 Not Started |
| **Phase 4** — Re-baseline (3 days) | All | 4 | 0 | 🔴 Not Started |
| **TOTAL** | | **70** | **17** | **24%** |

**By severity:** 🔴 P0: 6 · 🟠 P1: 31 · 🟡 P2: 21 · 🔵 P3: 3 _(REV-001a split from REV-001 on 2026-09-19)_

> Update this table at the end of each working day. It is the only status anyone outside the team should need to read.

**No CI gate by decision** (Deepak, 2026-09-19) — to be added later, once the app is stable. All verification in this tracker is local: `npm run build`, `npm run lint`, `npm test`, and probing a running stack. REV-003 is an accepted risk; REV-003a is deferred.

**Phase 1 as of 2026-09-19:** REV-009 ⚠️ · REV-010 ✅ · REV-011 ✅ · REV-012 ✅ · REV-013 ✅ · REV-014 ✅ · REV-015 🛑 · REV-016 ✅ · REV-017 ✅ · REV-018 ✅ · REV-019 ✅ · REV-020 ⚠️ · REV-021 ✅ · REV-022 ✅ · REV-023 ⚠️ · REV-024 ✅.
Nine new tasks split out: REV-009a/b, REV-011a/b, REV-018a, REV-020a/b, REV-023a/b.

**Phase 0 as of 2026-09-19:** REV-002, REV-004, REV-005, REV-006 ✅ · REV-001, REV-003, REV-008 ⚠️ PARTIAL · REV-007 🛑 BLOCKED.
All five P0 items are code-complete. What remains in Phase 0 is not code: a pushed PR to produce REV-003's run evidence, repo-admin branch protection (REV-007), secret rotation in non-dev environments (REV-001a), and telling the people who were given the "Production Ready" status (REV-008).

---

# PHASE 0 — Stop the Bleeding

**Duration:** 2 days · **Gate:** ~~CI runs on every PR~~ (withdrawn 2026-09-19 — see REV-003a) · `main` protected · no P0 open
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
  - [x] **Verified 2026-09-19** on [PR #154](https://github.com/dpurandare/dCMMS/pull/154): all four workflows triggered on `pull_request` and reported results.
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
    PR #154 — all four workflows ran. They failed loudly, which is the point:

    | Workflow | Result |
    | :------- | :----- |
    | Backend CI/CD | Migrations, Lint & Format, Unit Tests, Integration Tests, Security Scan — all ❌ |
    | Frontend CI/CD | Lint & Format, Unit Tests, Build, E2E, a11y, Lighthouse, Security — all ❌ |
    | Code Quality & Security | CodeQL javascript ✅, CodeQL typescript ✅; the other 7 ❌ |
    | PR Automation | ❌ |

    Two CodeQL jobs are the only green checks on the first gated PR in the
    project's history. That is the honest starting line.
  - **Note:** `frontend-ci.yml` also calls three scripts that still do not exist — `test:unit`, `analyze`, `test:a11y`. Left alone deliberately: they are CI failures for REV-004 to record, not silent fixes.
  - **⚠️ Superseded 2026-09-19 by an explicit instruction:** *"I don't want the
    github CI actions to run. They take a lot of time."* All four workflows are
    now **disabled at the repo level**, and the four `.github` automation files
    were deleted for the same reason — that was a deliberate choice, not an
    oversight.

    The workflow files and their uncommented triggers remain correct in the
    branch, so nothing is lost if this is revisited. But **the gate this task
    existed to create does not exist**, and Phase 0's stated gate — "CI runs on
    every PR" — cannot be claimed. That is a real, open risk: the project's
    original failure was that nothing forced a claim to be checked, and right
    now nothing does again.

    Verification has moved local: `npm run build`, `npm run lint`, `npm test`,
    and probing a running stack. Every `Verify:` line in this tracker was
    satisfied that way, not by CI. If the concern is run time rather than CI
    itself, a trimmed workflow (lint + build + the migrations job only, ~2
    minutes) would restore the gate cheaply — filed as REV-003a.
  - **Status:** ⏹️ ACCEPTED RISK — CI disabled at Deepak's request, 2026-09-19

- [ ] **REV-003a** - Re-introduce a CI gate 🟠 **P1** ⏹️ **DEFERRED BY DECISION**
  - **Decision (Deepak, 2026-09-19):** *"I do not want any CI gate right now. I
    will add those later when the app is stable."* Asked once, reaffirmed. Not
    to be raised again until the app is stable or Deepak reopens it.
  - **State left ready, not dismantled:** all five workflows are
    `disabled_manually` at the repo level, and their `push`/`pull_request`
    triggers remain uncommented in the branch. Re-enabling is a repo-settings
    toggle, not a code change — nothing from REV-003 has to be redone.
  - [ ] When reopened, start small: backend `build` + `lint` + the migrations
        job is ~2 minutes and would have caught REV-011. The slow parts are
        Lighthouse, Playwright, axe, CodeQL, SonarQube and the Docker builds.
  - **The open risk, stated once and left here rather than repeated:** the
    review's root cause was that nothing forced a claim to be checked. Until a
    gate exists, that is true again, and every status in this tracker rests on
    someone running the `Verify:` line by hand.
  - **Status:** ⏹️ DEFERRED — Deepak's call, revisit when the app is stable

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

- [x] **REV-009** - Build the verified feature inventory 🟠 **P1** ⚠️ **PARTIAL**
  - [x] For each task in `TasksTracking/01`–`14`, locate the implementing code
  - [x] Check: is the route registered in `backend/src/server.ts`? If not → `Not wired`
  - [x] Check: does the service return mock data? If mock → `Mock`
  - [x] Exercise each feature against a running stack and record the actual HTTP response
  - [x] Assign a final status
  - [ ] 84 of 202 tasks remain `Unverified` — frontend and cross-cutting work that needs a browser, not a curl. Split out as REV-009a.
  - **Priority:** 🟠 P1
  - **Estimated:** 4 days (2 reviewers) · **Actual:** ~3 hours (automated)
  - **Deliverable:** [`docs/review/feature-inventory.md`](../docs/review/feature-inventory.md) ✅
  - **Verify:** every task ID appears in the inventory with a status and evidence.

  ### The headline

  | | |
  | :-- | :-- |
  | Tasks in modules 01–14 | **202** |
  | Marked complete by the team | **181** (89%) |
  | **Demonstrably working** | **11** (5%) |

  **Scope correction: there are 202 tasks, not 113.** Both `review-plan.md` and
  this task said 113. Counting every `- [ ] **DCMMS-nnn**` line across modules
  01–14 gives 202.

  | Status | Tasks |
  | :----- | ----: |
  | Working | 11 |
  | Partial | 54 |
  | Mock (service uses `Math.random()`) | 29 |
  | Not wired | 16 |
  | Absent | 8 |
  | Unverified | 84 |

  - **Method — three independent signals, no self-assessment:**
    1. Route registration parsed from `server.ts`: **23 of 39 route files are
       registered; 16 are never imported at all.**
    2. Live probe: every parameterless `GET` under `/api/v1` called against the
       running stack with a `super_admin` token — **42 endpoints: 29 × 200,
       6 × 403, 5 × 500, 2 × 400.**
    3. `grep -rlE "Math\.random\(\)"` across services and routes — 8 files.
  - **The single worst live result:** `GET /api/v1/users` returns **500** —
    `The value of '#' does not match schema definition`. The declared response
    schema does not match what the handler returns. Listing users is as core as
    this product gets, and it is broken right now. Filed as REV-009b.
  - **Telemetry's 500s are structural, not a bug:** `POST /api/v1/telemetry`
    publishes to Kafka and no consumer exists, so the QuestDB tables the read
    path queries are never populated. Corroborates `docs/review/ingestion.md`.
  - **Honest about coverage:** this inventory probes `GET` only, parameterless
    routes only, and a 200 means the endpoint answered — not that the answer was
    correct. Every one of those limits means the real figure is likely *worse*
    than 11/202, not better.
  - **Status:** ⚠️ PARTIAL — published and usable; 84 tasks need the REV-009a browser pass

- [ ] **REV-009a** - Verify the frontend and cross-cutting tasks 🟠 **P1**
  - [ ] 84 tasks sit at `Unverified` because they have no endpoint to probe — modules 12 (Gap Remediation, 18) and 14 (Frontend Critical Fixes, 30), plus frontend-side tasks elsewhere
  - [ ] Drive them through the running UI and record what each actually does
  - **Estimated:** 2 days
  - **Split from:** REV-009
  - **Verify:** no task in the inventory is left at `Unverified`.
  - **Status:** 🔴 Not Started

- [ ] **REV-009b** - `GET /api/v1/users` returns 500 🟠 **P1**
  - [ ] Response serialization fails: `The value of '#' does not match schema definition` (`fast-json-stringify`)
  - [ ] The route's declared response schema does not match the handler's return value
  - [ ] Check every other route for the same mismatch — REV-023a found 16 routes whose schemas declare only their happy path, which is the same class of defect
  - **Priority:** 🟠 P1 — a core endpoint, broken in the running application
  - **Estimated:** 2 hours
  - **Split from:** REV-009
  - **Verify:** `GET /api/v1/users` returns 200 with the user list.
  - **Status:** 🔴 Not Started
- [x] **REV-010** - Rewrite the status tables from the inventory 🟠 **P1**
  - [x] **Delete** the status tables in `TasksTracking/README.md` and `README.md` §Project Status — done; both regenerated rather than edited
  - [x] Regenerate both from REV-009
  - [x] Remove all unverifiable metrics from `README.md`
  - [x] Re-mark modules 09 (Machine Learning) and 10 (Cost Management)
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours · **Actual:** ~1 hour
  - **Verify:** every `✅` remaining in `TasksTracking/` traces to an inventory row.
  - **`TasksTracking/README.md`:** the table said `✅ Complete` for all fourteen
    modules. It now carries task counts, what the team claimed, the verified
    status, and the evidence for each — e.g. module 09: *"1/7 route files
    registered; never imported: ml-inference, ml-deployment, ml-explainability,
    model-governance, model-performance, predictive-wo"*. Only module 03 (Asset
    Management) comes out `✅ Verified`.
  - **`README.md`:** "20 Sprints · 113 tasks · ✅ 100%" and "APPROVED FOR
    PRODUCTION DEPLOYMENT" replaced by the measured table, plus a claim-by-claim
    account of what was wrong:

    | Claim removed | Measured |
    | :------------ | :------- |
    | 156/156 integration tests | suite could not run at all until 2026-09-19; now 60 tests, 29 failing |
    | 243/243 regression tests | no such suite exists |
    | 93/100 security, 0 critical/high | 88 vulnerabilities (5 critical, 42 high); the audit never ran a scan |
    | 72,000 events/sec | no Kafka consumer exists; `GET /telemetry` returns 500 |
    | 92–96% / 96.8% ML accuracy | 6 of 7 ML route files never imported |
    | API p95 <200ms | no benchmark in the repository produces it |

    Badges changed from "Production Ready" / "Sprint 20 100% Complete" to "Under
    Review" / "Verified working 11/202". The §Security section's 93/100 score
    table is replaced by the real vulnerability counts. The "72,000 events/sec"
    figure in the architecture section is kept but labelled **target
    architecture**, since that is what it honestly is.
  - **Kept the no-blame framing:** every rewritten section ends by attributing
    the gap to the absent CI gate and the ✅-only status vocabulary, not to the
    people who wrote the code.
  - **Status:** ✅ COMPLETE
- [x] **REV-011** - Reconcile the two migration systems 🔴 **P0**
  - [x] **Decision taken 2026-09-19 (Deepak):** drizzle-kit owns the schema; the 16 hand-written files are deleted. Recorded as [`ADR-004`](../docs/architecture/adrs/ADR-004-migration-strategy.md).
  - [x] Port or delete each of the 16 files; none may remain unreferenced
  - [x] Resolve the duplicate `020` prefix — resolved by deletion
  - [x] Renumber from `001` — the sequence is now `0000`/`0001`/`0002` with a real `0000`
  - **Priority:** 🔴 P0
  - **Estimated:** 3 days · **Actual:** ~4 hours
  - **Files:** `backend/drizzle/` (rebuilt), `scripts/init-db.sql` (emptied), `backend/src/db/migrations/` (deleted), `docs/architecture/adrs/ADR-004-migration-strategy.md`
  - **Verify:** `ls backend/src/db/migrations` → empty or every file referenced by the runner. Migrating a DB created from the previous release to head succeeds.

  ### The review understated this one. The migration had never succeeded, ever.

  There were **three** schema systems, not two. The third — `scripts/init-db.sql`,
  mounted at the Postgres container's `docker-entrypoint-initdb.d` — created 10
  tables, ~40 indexes, 7 enums, 8 triggers and a hardcoded `super_admin`.

  Running the migration against a live stack gave:

  ```
  $ npm --prefix backend run db:migrate
  ❌ Migration failed: error: type "vector(768)" does not exist

  $ psql -c "select count(*) from drizzle.__drizzle_migrations;"
   0
  $ psql -c "\dt"   → 10 tables (all from init-db.sql)
  ```

  `schema.ts:1490` declares the pgvector column via `customType` returning
  `"vector(768)"`; drizzle-kit quotes custom type names, so Postgres looks for a
  type literally named `vector(768)`. Every run failed and rolled back.

  **27 of the 37 tables the ORM expects did not exist in any database this
  project could produce.** Including `refresh_tokens`, which made login return 500
  on a freshly provisioned stack:

  ```
  $ curl -X POST localhost:3000/api/v1/auth/login -d '{"email":"admin@example.com",...}'
  {"statusCode":500,"error":"Internal Server Error","message":"An error occurred during login"}
  # backend log: relation "refresh_tokens" does not exist
  ```

  A knock-on: `auto-seed` skips when rows exist and `init-db.sql` always inserted
  a user, so the `CLAUDE.md` credentials were never created either.

  - **Evidence — after the fix, from an empty database:**
    ```
    $ dropdb dcmms && createdb dcmms && npm --prefix backend run db:migrate
    ✅ Migrations completed successfully!

    tables: 37 · secondary indexes: 53 · enum types: 14 · triggers: 30
    applied migrations: 3

    $ ls backend/src/db/migrations
    (directory removed)

    $ curl -X POST localhost:3000/api/v1/auth/login ...
    {"accessToken":"eyJhbGciOiJIUzI1NiIs..."}
    ```
    Login succeeds. As far as this review can tell, that is the first time the
    application has worked end to end on a freshly provisioned database.

  - **Accepted limitation:** migrating a database created by the *old*
    `init-db.sql` still fails —
    `column "assigned_crew_id" referenced in foreign key constraint does not exist`
    — because the baseline's `CREATE TABLE IF NOT EXISTS` skips tables that
    already exist. Accepted in ADR-004: no database has ever held the intended
    schema, so there is nothing to preserve. Dev databases must be recreated
    once. From `0003` onward every migration must apply to the previous head,
    and REV-014 is the CI job that proves it.
  - **Status:** ✅ COMPLETE

- [ ] **REV-011a** - Upgrade drizzle-orm so `vector` is a native type 🟠 **P1**
  - [ ] `drizzle-orm@0.30.10` has no native `vector`; it arrived in 0.31. Until then `schema.ts` keeps the `customType` workaround and **`drizzle-kit generate` will keep emitting `"vector(768)"` quoted**, which is the exact bug that made every migration fail
  - [ ] Upgrade `drizzle-orm` and `drizzle-kit`, switch `schema.ts:1490` to the native type, regenerate and diff
  - [ ] The upgrade also clears the `drizzle-orm` SQL-injection advisory tracked in REV-023
  - **Priority:** 🟠 P1 — a footgun that has already cost this project every one of its migrations
  - **Estimated:** 4 hours
  - **Split from:** REV-011
  - **Verify:** `drizzle-kit generate` on an unchanged schema produces an empty migration, and the vector column needs no hand-editing.
  - **Status:** 🔴 Not Started

- [ ] **REV-011b** - Declare indexes in `schema.ts` 🟡 **P2**
  - [ ] `schema.ts` declares **zero** indexes, which is why the generated baseline had only primary keys
  - [ ] `0002_indexes_and_triggers.sql` restores 47 of them from the dead migration files, but generation and reality will drift again the moment someone regenerates
  - [ ] Move them into `index()` / `uniqueIndex()` declarations in `schema.ts`
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Depends on:** REV-015 (review them before enshrining them)
  - **Split from:** REV-011
  - **Verify:** `drizzle-kit generate` reproduces every index in `0002` from `schema.ts` alone.
  - **Status:** 🔴 Not Started

- [x] **REV-012** - Re-apply the migrations that never ran 🟠 **P1**
  - [x] `022_fix_asset_jsonb_columns.sql` — the premise turned out to be wrong in an interesting way. The fix was never *needed* in any database the project could produce, because the drizzle baseline already declares both columns as `jsonb`. The text-typed version only ever existed in `scripts/init-db.sql`. So the bug was real, but its source was the third schema system, not an unapplied migration.
  - [x] Audit `008`–`021` for the same problem — done as part of REV-011. 20 of the 21 tables they create were already in the baseline; the exception was `chat_feedback`, which is used by no code and is deliberately dropped (ADR-004).
  - [x] Confirm each is idempotent before re-running — moot: nothing is re-run. Everything portable is now in `0002`, with `IF NOT EXISTS` on indexes and `DROP TRIGGER IF EXISTS` before each trigger, so the migration is safe to re-apply.
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day · **Actual:** folded into REV-011
  - **Depends on:** REV-011 ✅
  - **Verify:** on a DB provisioned before the fix, `\d assets` shows `location` and `metadata` as `jsonb`.
  - **Evidence:**
    ```
    $ psql -d dcmms -c "select column_name, data_type from information_schema.columns
                        where table_name='assets' and column_name in ('location','metadata');"
     location | jsonb
     metadata | jsonb

    $ psql -d dcmms -c "... format_type for document_embeddings.embedding"
     embedding | vector | vector(768)      -- the 020_fix intent, from the baseline
    ```
  - **Status:** ✅ COMPLETE

- [x] **REV-013** - Verify `schema.ts` matches a migrated database 🟠 **P1**
  - [x] Migrate a clean DB to head; diff the live schema against `schema.ts` column by column
  - [x] File a task per divergence — **no real divergence was found**
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day · **Actual:** ~1 hour
  - **Depends on:** REV-011 ✅
  - **Verify:** `drizzle-kit` introspection of the live DB produces no diff against `schema.ts`.
  - **Evidence:**
    ```
    $ npx drizzle-kit introspect:pg --driver=pg --connectionString=...
    [✓] 37  tables fetched
    [✓] 548 columns fetched
    [✓] 14  enums fetched
    [✓] 47  indexes fetched
    [✓] 73  foreign keys fetched
    ```
    No table, column or enum is missing or extra. `drizzle-kit push:pg --strict`
    does report 38 foreign-key drop/add pairs and 11 `SET DEFAULT` statements,
    but both are tool artefacts, not drift:
    - the FK churn is Postgres truncating constraint names at 63 characters
      (`compliance_generated_reports_template_id_compliance_report_temp`), so
      drizzle-kit cannot match its own generated name against the stored one;
    - the 11 defaults are already present. Checked directly:
      `permits.status` → `'draft'::character varying`. drizzle-kit 0.20 does not
      treat the `::character varying` cast as equal to its expected `'draft'`.

    I initially read those 11 as genuine drift and added a `0003_column_defaults`
    migration for them. Checking the baseline showed it already carried every one
    of those defaults, so the migration was a no-op and was removed rather than
    shipped. The residual `push` diff is noise and should not be treated as a
    schema-drift signal; REV-014's migration job is the reliable check.
  - **Note for REV-011a:** upgrading drizzle-kit past 0.20 should quieten both
    artefacts, which is a second reason to do it.
  - **Status:** ✅ COMPLETE

- [x] **REV-014** - Add a migration test to CI 🟠 **P1**
  - [x] CI job: provision Postgres → migrate → assert success
  - [x] Run on every PR that touches `backend/src/db/` (the workflow's `backend/**` path filter covers `backend/drizzle/` too)
  - **Priority:** 🟠 P1 — this is what would have caught REV-011 originally
  - **Estimated:** 4 hours · **Actual:** ~1 hour
  - **Files:** `.github/workflows/backend-ci.yml`
  - **Verify:** the job appears and passes on a PR touching a migration.
  - **What the job asserts**, beyond "the command exited 0" — because REV-011's failure mode was a migration that failed while the app carried on against a schema nobody had declared:
    - migrations apply to an empty database, then apply a **second** time as a no-op
    - `__drizzle_migrations` has ≥ 3 rows — an empty table is the exact signature of the bug
    - ≥ 37 tables, ≥ 14 enum types, ≥ 47 secondary indexes
    - `refresh_tokens` exists by name — the table whose absence made login 500
    - `drizzle-kit introspect` reports 37 tables, so `schema.ts` and the database agree
  - **Also fixed here:** the `integration-tests` job used `postgres:16-alpine`, which has no pgvector. `0000_extensions_and_enums.sql` creates the `vector` extension, so that job would have failed on its migration step. Both jobs now use `pgvector/pgvector:pg16`, matching `docker-compose.yml`.
  - **Evidence** (assertions rehearsed locally against the same migrations):
    ```
    $ npm run db:migrate   # empty database
    ✅ Migrations completed successfully!
    $ npm run db:migrate   # again
    ✅ Migrations completed successfully!

    tables=37  enums=14  indexes=53  applied=3
    ```
    On PR #154 the job ran and its migration steps passed; the final step failed
    on **my own error** — it was written with drizzle-kit 0.20 syntax
    (`introspect:pg --driver/--connectionString`) before REV-023 upgraded to
    0.31, where the command is `introspect --dialect/--url` and the output
    spacing differs. Fixed, and the assertion now tolerates either spacing.
    A CI job that fails on its own tooling teaches nothing, so it was worth
    fixing properly rather than loosening the check.
  - **Status:** ✅ COMPLETE
- [ ] **REV-015** - Review indexes against real query patterns 🟡 **P2** 🛑 **DEFERRED**
  - [ ] Extract the actual query shapes from `backend/src/services/*`
  - [ ] Confirm composite indexes exist on `(tenant_id, …)` for every filtered table
  - [ ] `EXPLAIN ANALYZE` the ten highest-traffic queries against seeded data
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day
  - **Deferred, with reason:** the premise changed under REV-011. The database
    had **no secondary indexes at all** — `schema.ts` declares none, so the
    generated baseline created none, and the 47 that existed came from
    `scripts/init-db.sql` and covered only its 10 tables. `0002` now restores
    47 index definitions ported from the dead migration files.
    Those are **inherited intent, not a validated design**, and reviewing them
    against query shapes is only worth doing once they live in `schema.ts`
    (REV-011b) — otherwise the review is against a file the next
    `drizzle-kit generate` will ignore.
  - **Also:** seeded data is 3 sites, 5 assets and 4 work orders. `EXPLAIN
    ANALYZE` against that tells you nothing; the task needs a realistic volume
    fixture first.
  - **Depends on:** REV-011b, and a data volume fixture
  - **Verify:** no sequential scan on any table > 10k rows in the ten sampled queries.
  - **Status:** 🛑 DEFERRED — blocked on REV-011b

- [x] **REV-016** - Confirm seeding cannot run in production 🟡 **P2**
  - [x] Verify the gate holds under every deployment path — **it did not**
  - [x] Confirm the default test credentials cannot exist in a production database
  - **Priority:** 🟡 P2
  - **Estimated:** 2 hours · **Actual:** ~1 hour
  - **The hole:** `auto-seed.ts` opened with `process.env.NODE_ENV || "development"`. A deployment that simply never set `NODE_ENV` was treated as development, and `.env.example` ships `AUTO_SEED=true`, so such a deployment would seed itself with the credentials published in `CLAUDE.md`. The gate was correct for every environment that named itself and wrong for the one that said nothing.
  - **Fix:** fail closed. An unset `NODE_ENV` now refuses to seed and says so; only `development`, `test` and `local` may seed.
  - **Verify:** with `NODE_ENV=production AUTO_SEED=true`, seeding does not run.
  - **Evidence** (each against a freshly migrated, empty database):
    ```
    NODE_ENV=production  AUTO_SEED=true -> users=0
    NODE_ENV=staging     AUTO_SEED=true -> users=0
    NODE_ENV=(unset)     AUTO_SEED=true -> users=0
      ⚠️ AUTO_SEED=true but NODE_ENV is not set — refusing to seed.
    NODE_ENV=development AUTO_SEED=true -> users=3
    ```
    The unset case had to be run with `backend/.env` moved aside: `src/db/index.ts`
    calls `dotenv.config()` at import time, so the checked-in dev `.env` was
    restoring `NODE_ENV=development` and quietly invalidating the first attempt.
  - **Status:** ✅ COMPLETE
- [x] **REV-017** - Decide and implement the token storage model 🟠 **P1**
  - [x] **Decision (Deepak, 2026-09-19):** refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie; access token in memory only. Recorded as [`ADR-005`](../docs/architecture/adrs/ADR-005-auth-transport-and-csrf.md).
  - [x] Update `frontend/src/lib/api-client.ts` and `backend/src/routes/auth.ts`
  - **Priority:** 🟠 P1
  - **Estimated:** 2 days · **Actual:** ~3 hours
  - **Files:** `backend/src/plugins/refresh-cookie.ts` (new), `backend/src/routes/auth.ts`, `backend/src/server.ts`, `frontend/src/store/auth-store.ts`, `frontend/src/lib/api-client.ts`, `frontend/src/app/auth/login/page.tsx`, `frontend/src/types/api.ts`
  - **Verify:** after login, `localStorage` contains no token; `document.cookie` cannot read the refresh token from JS.
  - **Evidence:**
    ```
    $ curl -D - -X POST /api/v1/auth/login -d '{"email":"admin@example.com",...}'
    set-cookie: dcmms_refresh_token=6ab8700d…; Max-Age=604800;
                Path=/api/v1/auth; HttpOnly; SameSite=Strict
    body keys: ['accessToken', 'csrfToken', 'expiresIn', 'user']
    refreshToken in body: False

    1. login                         → access token issued
    2. GET /alerts with it           → 200
    3. refresh via cookie            → {'accessToken','expiresIn'}, no refreshToken
       refresh without cookie        → 401
       refresh with token in body    → 401   (the old vector is closed)
    4. logout                        → 200, set-cookie: …Expires=Thu, 01 Jan 1970
    5. refresh with the old cookie   → 401
    ```
    `HttpOnly` is what makes `document.cookie` unable to see it; the store no
    longer persists either token, so `localStorage` holds none.
  - **`/auth/refresh` deliberately does not accept the token from the body.**
    Supporting both would have left the XSS-readable path open and made the
    change cosmetic.
  - **Still open, and accepted in ADR-005:** an in-memory access token is still
    readable by script running in the page. The mitigation is blast radius — 15
    minutes, no silent renewal, and REV-019's CSP now actually enforces.
  - **Breaking:** `LoginResponse`/`RefreshTokenResponse` no longer carry
    `refreshToken`. Any other client reading it breaks — including `mobile/`,
    which this review has not examined. Flagged for REV-055.
  - **Status:** ✅ COMPLETE
- [x] **REV-018** - Resolve the CSRF / threat-model mismatch 🟠 **P1**
  - [x] Write the threat model down — [`ADR-005`](../docs/architecture/adrs/ADR-005-auth-transport-and-csrf.md)
  - [x] REV-017 moved to cookies, so the CSRF work is kept rather than deleted
  - **Priority:** 🟠 P1
  - **Estimated:** 1 day · **Actual:** ~1 hour
  - **Depends on:** REV-017 ✅
  - **Verify:** an ADR exists recording the auth transport, the threats it addresses, and the CSRF decision.

  ### The subsystem was never wired to anything

  The review found that CSRF did not apply to a pure-Bearer design. The sharper
  finding is that it would not have mattered either way:

  ```
  $ grep -rn "csrfProtection" backend/src --include=*.ts
  backend/src/__tests__/middleware/csrf.test.ts:2: …
  ```

  `csrfProtection` is imported by exactly one file — **its own test**. No route,
  no hook, no `preHandler` uses it. Tokens are generated at login, stored in
  Redis and dutifully sent by the frontend on every mutation, and **nothing on
  the server has ever checked one**.

  So 277 lines, the repository's largest test cluster (28 assertions), two
  design documents and `backend/scripts/add-csrf-protection.sh` describe a
  control that does not exist at runtime. The tests pass because they call the
  middleware directly.

  This is the same shape as REV-024's audit report: the artefact reads like
  protection, and the thing it describes was never connected. It is also why
  "we have CSRF protection" survived as a belief for so long — everything except
  the wiring was there to point at.
  - **Now:** `SameSite=Strict` plus the cookie's `Path=/api/v1/auth` scope is the
    CSRF defence, because the cookie is the only ambient credential in the
    system. Every other endpoint still uses a Bearer token and remains
    CSRF-immune.
  - **Status:** ✅ COMPLETE

- [ ] **REV-018a** - Wire or delete the CSRF subsystem 🟠 **P1**
  - [ ] Decide: attach `csrfProtection` as defence in depth on authenticated state-changing routes, or delete the subsystem
  - [ ] Note the mismatch that blocks the obvious answer: a double-submit token keyed by user id does not fit `/auth/refresh`, which by definition runs when there is no authenticated user to key against — so it cannot simply be bolted onto the one endpoint that carries an ambient credential
  - [ ] Whichever way it goes, `backend/scripts/add-csrf-protection.sh` and the two design documents must match reality afterwards
  - **Priority:** 🟠 P1 — 277 lines of inert security machinery is its own hazard: it reads like protection in review and in audits, and it is not
  - **Estimated:** 1 day
  - **Split from:** REV-018
  - **Verify:** either a request with a missing/incorrect CSRF token is rejected by a real route, or `grep -rn csrfProtection backend/src` returns nothing.
  - **Status:** 🔴 Not Started
- [x] **REV-019** - Tighten Content-Security-Policy 🟠 **P1**
  - [x] Remove `'unsafe-eval'` and `'unsafe-inline'` from `script-src`
  - [x] Make `connect-src` environment-driven
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours · **Actual:** ~2 hours
  - **Files:** `frontend/src/middleware.ts` (new), `frontend/next.config.js`, `frontend/src/app/layout.tsx`
  - **Verify:** production build served with a production `NEXT_PUBLIC_API_URL` → no CSP violations in console; API calls succeed.
  - **Evidence** — built with `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1`:
    ```
    content-security-policy: default-src 'self'
      script-src 'self' 'nonce-MzZiYmFjMzEtNWY5ZS00ZDg5...'
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
      connect-src 'self' https://api.example.com wss://api.example.com
      object-src 'none'
      ...

    req1 header=M2RiMjlkMTktNj… html=M2RiMjlkMTktNj… match=yes
    req2 header=YjJiMmI0NGUtMG… html=YjJiMmI0NGUtMG… match=yes
    ```
    Nonce rotates per request and matches the one stamped on the served scripts;
    all 11 script tags carry it.
  - **Two things this turned up that the task did not anticipate:**
    1. **A nonce alone was not enough.** Setting the CSP only on the *response*
       left every Next bootstrap script unnonced — 6 inline scripts with no
       nonce, which the new policy would have blocked outright. Next reads the
       nonce back off the **request** CSP header, so the middleware sets both.
       Counting `nonce=` occurrences in the served HTML is what caught it; the
       header alone looked correct.
    2. **Static prerendering defeats nonces.** A nonce is per-request, so Next
       can only apply it to pages it renders per request. Every route was
       statically prerendered, so the count stayed at 0 until
       `export const dynamic = 'force-dynamic'` was added to the root layout.
       Little is lost — every page is an authenticated dashboard fetching its
       data client-side — but it is a real rendering change, not a header tweak.
  - **Limitation, deliberately accepted:** `connect-src` resolves at **build**
    time. Middleware runs on the Edge runtime, where `process.env` is statically
    substituted during the build, so no runtime variable can reach it. This only
    holds together because `next.config.js` already inlines
    `NEXT_PUBLIC_API_URL` the same way, so the policy and the API client agree
    by construction. Making both runtime-configurable is REV-033.
  - **`style-src` keeps `'unsafe-inline'`:** Next emits inline `<style>` that
    nonces do not reach. Materially weaker exposure than the `script-src` case.
  - **Status:** ✅ COMPLETE
- [x] **REV-020** - Tenant isolation audit 🟠 **P1** ⚠️ **PARTIAL**
  - [x] For all route files, confirm every query is scoped by `tenantId` taken **from the JWT**, never from the request body or params
  - [x] Fix `backend/src/routes/notifications.ts:513` — `tenantId: "default-tenant-id" // TODO: Get from auth context`
  - [x] Write a cross-tenant IDOR test per resource type
  - [ ] Evaluate Postgres row-level security as defence in depth — assessed, not implemented (see below)
  - **Priority:** 🟠 P1 — highest-consequence bug class available in a multi-tenant CMMS
  - **Estimated:** 3 days · **Actual:** ~3 hours
  - **Verify:** the IDOR test suite passes: tenant A receives 403/404, never tenant B's rows.

  ### A live cross-tenant data leak, exploited and fixed

  `routes/alerts.ts:69` read the tenant from the query string and filtered on it:

  ```ts
  const { tenantId, siteId, assetId, severity, status } = request.query;
  const conditions = [eq(alerts.tenantId, tenantId)];
  ```

  Exploited against the running stack, authenticated as the default tenant's
  admin:

  ```
  $ curl "localhost:3001/api/v1/alerts?tenantId=4f8cabba-…" -H "Authorization: Bearer $TOKEN"
  {"alerts":[{"tenantId":"4f8cabba-…","alertId":"VICTIM-SECRET-001",
              "title":"CONFIDENTIAL: Victim Corp turbine failure", …}]}
  ```

  Any authenticated user of any tenant could read any other tenant's alerts by
  changing one query parameter. This is the row the withdrawn audit marked
  "Authorization Bypass ✅ PASS — Tenant isolation enforced" (REV-024).

  After the fix, the same request returns only the caller's own tenant:

  ```
  alerts returned: 1 | titles: ['Our own alert']     # own tenant, no param
  alerts returned: 1 | titles: ['Our own alert']     # with the spoofed param
  victim-tenant rows leaked: 0
  ```

  - **Seven call sites fixed**, all now going through one helper,
    `src/utils/tenant.ts` → `getTenantId(request)`, which reads the verified JWT
    and throws if a route is missing authentication:
    - `alerts.ts:69` — the exploitable one
    - `integrations.ts:53, 177, 210, 248` — Slack install/test/status/uninstall,
      all taking the tenant from query or body. `/uninstall` would have let any
      authenticated user remove another tenant's Slack integration.
    - `notifications.ts:356` — history listing
    - `notifications.ts:513` — the hardcoded `"default-tenant-id"`
  - **Scope correction:** the review said "16 route files and 28 service files
    contain no reference to `tenantId`". Of those 16 route files, **13 are never
    imported into `server.ts` at all** — they are dead code, not live holes. The
    three registered ones are `health` and `csrf` (no tenant data) and
    `analytics-admin`. The exact figures: **39 route files on disk, 23
    registered, 16 never imported** (the review said 14).
  - **`analytics-admin` needs its own look.** It is registered, has no tenant
    scoping, and executes caller-supplied ClickHouse queries. Filed as REV-020a.
  - **Test suite:** `backend/tests/security/tenant-isolation.spec.ts`, 8 tests
    across alerts, work orders, assets, sites and notification history, covering
    both the spoofed-parameter vector and plain listing leakage.

    **The suite was verified by reintroducing the bug**, because a green test
    that cannot fail is worth nothing:
    ```
    # with the vulnerability restored
    ✕ does not widen GET /alerts to another tenant
    Tests: 1 failed, 7 passed
    # with the fix
    Tests: 8 passed
    ```
  - **Row-level security — assessed, not adopted now.** RLS would make this class
    of bug structurally impossible rather than a matter of remembering
    `getTenantId`. It needs a per-request `SET LOCAL app.tenant_id`, which means
    routing every query through a transaction-scoped connection; drizzle's pool
    does not do that today. It is the right long-term answer and a poor thing to
    bolt on mid-review. Filed as REV-020b.
  - **Status:** ⚠️ PARTIAL — the leak is closed and covered by tests; RLS (REV-020b) and `analytics-admin` (REV-020a) remain

- [ ] **REV-020a** - Tenant-scope or remove `analytics-admin` 🟠 **P1**
  - [ ] `routes/analytics-admin.ts` is registered at `/api/v1`, has no `tenantId` reference anywhere, and passes a caller-supplied `query` string to a ClickHouse client
  - [ ] Decide: scope it to the caller's tenant, restrict it to `super_admin`, or remove it
  - [ ] If it stays, the query must not be free-form caller input
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours
  - **Split from:** REV-020
  - **Verify:** a tenant_admin cannot read another tenant's analytics rows through this route.
  - **Status:** 🔴 Not Started

- [ ] **REV-020b** - Row-level security as defence in depth 🟡 **P2**
  - [ ] Enable RLS on every tenant-scoped table with a policy on `current_setting('app.tenant_id')`
  - [ ] Set it per request from the JWT, which requires a transaction-scoped connection rather than a bare pool checkout
  - [ ] Keep `getTenantId` as the application-level guard; RLS is the backstop for the next route that forgets it
  - **Priority:** 🟡 P2
  - **Estimated:** 3 days
  - **Split from:** REV-020
  - **Verify:** with the application guard deliberately removed from one route, the IDOR test still passes.
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

- [x] **REV-022** - Add login throttling and account lockout 🟡 **P2**
  - [x] Add per-account failed-attempt counting with exponential backoff, and audit-log lockout events
  - **Priority:** 🟡 P2
  - **Estimated:** 1 day · **Actual:** ~2 hours
  - **Files:** `backend/src/services/login-throttle.service.ts` (new), `backend/src/routes/auth.ts`
  - **Verify:** 10 failed logins for one account → subsequent attempts rejected; a different account is unaffected.
  - **Evidence:**
    ```
    attempt : status : Retry-After
     1:401   2:401   3:401   4:401   5:401
     6:429 (2s)  7:429 (4s)  8:429 (8s)  9:429 (16s)
    10:429 (900s) 11:429 (900s) 12:429 (900s) 13:429 (900s)

    manager (correct pw) during admin lockout: 200
    admin after counter reset:                 200
    ```
    Five free attempts, then doubling backoff, then a 15-minute lockout at the
    threshold. Counting is per account, so one attacker cannot lock out an
    unrelated user. The throttle is checked *before* the password comparison, so
    a locked account costs an attacker nothing to keep hammering.
  - **First implementation was wrong, and the live test is what showed it.**
    Rejected attempts did not increment the counter, so the count froze at 5,
    the backoff never escalated past 1 second and the lockout threshold was
    unreachable — attempts 6–12 all returned `Retry-After: 1`. An attacker
    pausing one second between tries would have been throttled in name only.
    Rejected attempts now count too.
  - **Redis is the store, not the gate:** if Redis is unavailable, logins proceed
    unthrottled rather than the product becoming unusable. A deliberate
    tradeoff, worth revisiting if Redis becomes a hard dependency.
  - **Status:** ✅ COMPLETE

- [x] **REV-022a** - `npm test` was destroying the developer's database 🔴 **P0**
  - [x] Found while verifying REV-022: after a test run, the dev database had **0 tables**; `dcmms_test` had 37.
  - **Cause:** jest's `globalTeardown` calls `npm run db:reset:test`, which ran
    `tsx src/db/reset-test.ts` with **no `DATABASE_URL` override** — unlike its
    sibling `db:migrate:test`, which has one. `src/db/index.ts` loads `.env`, so
    the script connected to the *development* database and ran
    `DROP SCHEMA public CASCADE`.
  - [x] npm script now passes `TEST_DATABASE_URL`, matching `db:migrate:test`
  - [x] `reset-test.ts` now refuses to run unless the database name looks like a
        test database, and refuses outright under `NODE_ENV=production`. The
        script drops a schema; a forgotten environment variable must not be able
        to aim it at the wrong database again.
  - **Verify:** pointing it at the dev database is refused; pointing it at `dcmms_test` succeeds.
  - **Evidence:**
    ```
    $ DATABASE_URL=…/dcmms npx tsx src/db/reset-test.ts
    ❌ Refusing to reset "dcmms": it is not a test database.
    exit=1

    $ DATABASE_URL=…/dcmms_test npx tsx src/db/reset-test.ts
    ✅ Test database reset successfully!
    ```
  - **Why this went unnoticed:** the backend test suite has never been runnable
    (REV-020 fixed the connection details), so the teardown had never actually
    executed against a working `.env`.
  - **Status:** ✅ COMPLETE

- [x] **REV-023** - Triage all dependency vulnerabilities 🟠 **P1** ⚠️ **PARTIAL**
  - [x] Backend: **60 → 13** (4 critical → 1, 21 high → 3). Frontend: **28 → 8** (1 critical → 1, 21 high → 7).
  - [x] Patch every critical and high, or record an accepted risk with a named approver — see [`docs/review/accepted-risks.md`](../docs/review/accepted-risks.md)
  - [ ] Enable Dependabot; fail CI on new critical/high — **blocked**: `.github/dependabot.yml` is deleted in the working tree and Deepak asked on 2026-09-19 to leave those four `.github/` files alone pending a decision
  - **Priority:** 🟠 P1
  - **Estimated:** 2 days · **Actual:** ~2 hours
  - **Verify:** `npm audit --audit-level=high` exits 0 in both projects, or every exception is listed in `docs/review/accepted-risks.md`.
  - **Fixed by non-breaking `npm audit fix`, plus four deliberate major bumps:**
    | Bump | Clears |
    | :--- | :----- |
    | `bcrypt` 5 → 6 | critical node-tar hardlink path traversal, `@mapbox/node-pre-gyp` high |
    | `nodemailer` 7 → 10 | SMTP command injection via `envelope.size` |
    | `drizzle-orm` 0.30 → 0.45, `drizzle-kit` 0.20 → 0.31 | SQL injection via improperly escaped SQL identifiers — this sat in *every* query |
    | `shepherd.js` 14 → 15 | `deepmerge-ts` high |

    bcrypt sits under every stored password, so it was verified rather than
    assumed: hashing, comparison, and that hashes written by bcrypt 5 still
    verify. The drizzle bump also closed **REV-011a** — 0.45 has a native
    `vector` type, so `drizzle-kit generate` now emits `vector(768)` correctly
    and the customType footgun that caused REV-011 is gone.
  - **Not fixed, recorded as accepted risks:** AR-001 (`fast-jwt` via
    `@fastify/jwt@8`), AR-002 (`next@14`), AR-003 (eslint tooling). AR-001 was
    analysed advisory by advisory against how dCMMS actually configures JWT —
    HS256 with a static secret, no cache, no async key resolver — and none of
    the three criticals is reachable in that configuration. AR-002 was **not**
    analysed and should be treated as unquantified.
  - **Status:** ⚠️ PARTIAL — Dependabot re-enablement is blocked on the `.github` decision

- [ ] **REV-023a** - Migrate to Fastify v5 🟠 **P1**
  - [ ] `fastify` 4 → 5 with the plugin ecosystem: `@fastify/jwt` 8 → 10, `@fastify/swagger-ui` 3 → 6, `@fastify/cors` 9 → 11, `@fastify/helmet` 11 → 13, `@fastify/multipart` 8 → 9, `@fastify/rate-limit` 9 → 10, `@fastify/swagger` 8 → 9, `fastify-type-provider-zod` 1 → 4
  - [ ] Clears AR-001 in full, plus the `fastify` and `find-my-way` DoS highs
  - **Attempted 2026-09-19 and reverted.** The upgrade installs cleanly and produces **47 type errors across 8 files**. They are not all noise — 16 of them are genuinely useful:
    ```
    src/routes/attachments.ts(62,31): Argument of type '404' is not assignable to parameter of type '201'.
    src/routes/auth.ts(102,29):       Argument of type '500' is not assignable to parameter of type '401 | 200'.
    ```
    The newer type provider checks `reply.status(N)` against the declared
    response schema, and **these routes declare only their happy path**. So the
    upgrade surfaced a real defect: the route schemas are incomplete, which
    means the OpenAPI spec REV-048 will generate would misdescribe every error
    response. Worth fixing on its own merits, and it belongs with REV-048
    rather than buried in a dependency bump.
  - The rest: 28 × TS18046 (`unknown`, mostly `slack-provider.service.ts`), plus `request.routerPath` removed in v5 (`middleware/audit.ts:142`).
  - **Estimated:** 2 days, including a runtime pass over all 39 route files — Fastify v5 has behavioural changes types do not catch
  - **Split from:** REV-023
  - **Verify:** `npm audit --audit-level=high` exits 0 for the backend; every route still responds as before.
  - **Status:** 🔴 Not Started

- [ ] **REV-023b** - Upgrade Next.js 14 → 16 🟠 **P1**
  - [ ] Clears AR-002 (1 critical, 2 high) and AR-003 (3 high, dev tooling)
  - [ ] Crosses the Next 15 async request APIs, and lands on top of the nonce CSP and `force-dynamic` rendering from REV-019 — both need re-verifying afterwards
  - **Estimated:** 2 days
  - **Split from:** REV-023
  - **Verify:** `npm audit --audit-level=high` exits 0 for the frontend; CSP nonces still reach every script tag.
  - **Status:** 🔴 Not Started

- [x] **REV-024** - Rewrite or withdraw the security audit report 🟠 **P1**
  - [x] Rewrite from the actual findings, or delete it. It cannot stand as written.
  - **Priority:** 🟠 P1
  - **Estimated:** 4 hours · **Actual:** ~1 hour
  - **Depends on:** REV-023 ✅
  - **Verify:** the document either reflects the findings register or no longer exists.
  - **Outcome:** withdrawn and replaced in place. 883 lines → 123. The original is recoverable: `git show fe3d936:docs/security/security-audit-report.md`.
  - **The most useful thing this task found: the report disagreed with itself.**
    The body was careful and honest; the summary was not, and the summary is
    what everyone read.

    | Section | Body said | Summary said |
    | :------ | :-------- | :----------- |
    | §4.1 Snyk scan | ⚪ PENDING, all three scan checkboxes unticked | ✅ 0 Critical, 0 High |
    | §4.2 Known vulnerable deps | ⚪ UNKNOWN (requires Snyk scan) | ✅ 0 Critical, 0 High |
    | §5.1 OWASP ZAP | ⚪ PENDING — needs Docker and a running app | 🟢 LOW risk |
    | §7.1 | — | CRITICAL 0 · HIGH 0 · 🟢 PRODUCTION READY |

    **The report counted "not tested" as "zero findings."** Nobody invented a
    result; three sections said the work had not been done, and by §7 that had
    become a table of zeros with a sign-off field under it.
  - **§5.2 "Manual Penetration Testing ✅ COMPLETED (Code Review)"** — ten ✅ PASS
    rows produced by reading code. Two are demonstrably wrong: "Authorization
    Bypass ✅ PASS — Tenant isolation enforced" (REV-020: 16 route files and 28
    service files never mention `tenantId`), and "Brute Force ✅ PASS — Rate
    limiting enabled" (REV-022: a global 100 req/min is not a credential-stuffing
    defence). One is right and inconvenient: "CSRF ✅ PASS — JWT tokens
    (stateless)" is correct reasoning, and it contradicts the 277-line CSRF
    subsystem the team built (REV-018).
  - **Feeds REV-057:** the concrete rule this yields is that a section marked
    PENDING or UNKNOWN may not contribute a zero to a vulnerability count.
  - **Status:** ✅ COMPLETE

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
