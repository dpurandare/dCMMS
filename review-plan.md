# dCMMS — Project Review Plan

**Prepared:** 2026-09-02
**Repo state reviewed:** `main` @ `79c3267`
**Author:** Engineering review (initiated by D. Purandare)
**Status:** Draft for sign-off
**Tracked in:** [`TasksTracking/15_Review_Remediation.md`](TasksTracking/15_Review_Remediation.md) — 60 tasks, mapped to the workstreams and phases below

---

## 1. Why this review exists

dCMMS is a large system built rapidly by a mostly-junior team: ~37.5k lines of backend TypeScript, ~19k lines of frontend, a Flutter mobile app, a Python ML stack, a telemetry pipeline, 15 infrastructure services and ~80 documents. The project documentation declares the work **"✅ 100% Complete / Production Ready / APPROVED FOR PRODUCTION DEPLOYMENT"** across 20 sprints and 113 tasks.

A short evidence pass over the repository (Section 2) shows that claim is not supported. The gap is not a handful of bugs — it is a **verification gap**: the mechanisms that would normally catch these problems (CI, tests, code review, a real definition of done) are either absent, disabled, or self-certified by the same people who wrote the code.

So this review has two jobs, in this order:

1. **Re-establish ground truth.** Replace self-reported status with verified status. Every "✅ Complete" must be re-earned against evidence.
2. **Install the guardrails that were skipped**, so the next 20 sprints do not produce the same result.

This document is the plan for doing that. Section 2 is the critical assessment of the work already done; Sections 3–9 are the plan itself.

---

## 2. Critical review of the work done so far

Every finding below was verified directly against the repository. File and line references are given so each one can be re-checked independently.

### 2.1 The headline problem: status reporting is disconnected from reality

The repo contains a suite of self-congratulatory sign-off documents:

| Document | Claim |
|---|---|
| `README.md:257` | 20 sprints, 113 tasks, **100% complete** |
| `README.md:266` | Testing: **156/156 integration tests passed, 243/243 regression tests passed** |
| `README.md:265` | Security: **93/100 score, 0 critical/high vulnerabilities** |
| `docs/testing/release-2-integration-test-report.md` | **"✅ PASS — Ready for Production"** |
| `docs/security/security-audit-report.md` | **"🟢 EXCELLENT (93/100), 0 Critical, 0 High"** |
| `docs/documentation-review-report.md` | **"95% coverage, 98% technical accuracy, APPROVED"** |
| `docs/qa/KNOWN_ISSUES.md` | **"Critical Issues (P0): None Found ✅"** |
| `TasksTracking/README.md` | All 14 modules **✅ Complete** |

Measured reality:

- **There are 212 test assertions in the entire repository** (all languages, including 3 Playwright spec files and Flutter widget tests). There is no artefact anywhere corresponding to "156 integration tests" or "243 regression tests". Those numbers appear to have been written, not run.
- **`npm audit` reports 59 vulnerabilities in the backend (4 critical, 21 high)** and 28 in the frontend (1 critical, 21 high) — against a report claiming zero. Among them: `fast-jwt` improper `iss` validation (critical, sits in the auth path), `drizzle-orm` SQL injection via improperly escaped identifiers (high, sits in every query), `handlebars` JS injection (critical, used for report/notification templating).
- **No CI has run on any of the last 301 commits** (Section 2.2).

**This is the most serious finding in the review.** Individually, unwired routes and mock services are ordinary junior-engineer output that review would catch. What makes this project high-risk is that the *reporting layer* asserts the opposite of the code, so nobody upstream had a signal that anything was wrong. Any decision made on the basis of these documents — a go-live date, a customer demo commitment, a hiring or staffing call — was made on bad data.

**Judgement:** this is a process failure, not a competence failure by the individuals. Junior engineers were asked to self-certify their own work with no gate, no reviewer with authority to say "not done", and a status template whose only available value was "✅". They filled it in. The fix is structural (Section 6), and the review must be run without blame attached to individuals.

### 2.2 Quality gates exist but are switched off

Every automated check the project has is bypassed:

| Gate | State | Evidence |
|---|---|---|
| Backend CI | **Disabled** — `push`/`pull_request` triggers commented out, only `workflow_dispatch` remains | `.github/workflows/backend-ci.yml:3-13` |
| Frontend CI | **Disabled** — same | `.github/workflows/frontend-ci.yml:3-13` |
| Mobile CI | **Disabled** — same | `.github/workflows/mobile-ci.yml:3-13` |
| CodeQL / SonarQube / dependency scan | **Disabled** — same | `.github/workflows/code-quality.yml:3-9` |
| Backend production build | **Cannot fail** — `tsc … \|\| true` | `backend/package.json` (`"build"`) |
| Backend type strictness | **Off in the build that ships** — `strict:false`, `strictNullChecks:false`, `noEmitOnError:false` | `backend/tsconfig.prod.json` |
| Frontend lint | **Skipped at build time** — `eslint.ignoreDuringBuilds: true` | `frontend/next.config.js` |

Note also that `frontend-ci.yml` invokes `npm run format:check` and `npm run type-check`, neither of which exists in `frontend/package.json` — so even if the workflow were re-enabled today it would fail immediately. The CI was written, never run, and then turned off.

`backend/tsconfig.prod.json` deserves specific comment: it means the artefact deployed to production is compiled under *weaker* type rules than the one developers work against. `npm run type-check` (strict) is not what `npm run build` produces. Type errors are being emitted past, not fixed. `430` uses of `any`/`as any` in the backend and `77` in the frontend are the downstream consequence.

### 2.3 Database migrations do not work

`backend/src/db/migrate.ts` runs the Drizzle migrator against `./drizzle`, which contains exactly **one** migration (`0000_abnormal_omega_flight.sql`, 37 tables) — confirmed by `backend/drizzle/meta/_journal.json` having a single entry.

Meanwhile `backend/src/db/migrations/` holds **16 hand-written SQL files numbered 008–022** that **nothing ever executes**. Neither `scripts/dev.sh:114` nor `backend/scripts/docker-entrypoint.sh` references them. They are dead files.

Consequences:

- The project **has no incremental migration path**. Any environment provisioned at an earlier schema version can never be upgraded — the only path is drop-and-recreate. That is a hard blocker for production, and it silently invalidates the "production deployment runbook".
- Recent bug fixes shipped as migrations **were never applied**. `022_fix_asset_jsonb_columns.sql` (commit `5e89c2f`, "resolve FE-BUG-04 asset jsonb schema drift") does not run. The bug it fixes is still live in any DB not recreated from `0000`.
- The numbering starts at 008 — 001–007 are missing — and there are **two files numbered 020** (`020_add_chat_feedback.sql`, `020_fix_genai_vector_dimensions.sql`), so ordering is ambiguous even if they were wired up.

This is the single highest-impact correctness defect found, and it is invisible to developers because `dev.sh` recreates a clean DB from `0000` every time.

### 2.4 Features marked "Complete" are not wired to the server

`backend/src/server.ts` registers 25 route modules. There are **39 route files**. These 14 are never registered and are therefore unreachable dead code:

```
alarms  budget-management  cost-analytics  cost-calculation
ml-deployment  ml-explainability  ml-inference  model-governance
model-performance  notification-history  predictive-wo  slack
weather  wo-approval
```

Cross-referenced against `TasksTracking/README.md`:

- **Module 10, "Cost Management — ✅ Complete"**: all three of its route files (`cost-analytics`, `cost-calculation`, `budget-management`) are unregistered.
- **Module 09, "Machine Learning — ✅ Complete"**: five of its route files are unregistered.

Worse, the frontend calls two of them. `frontend/src/services/model-governance.service.ts:29,34,39` issues `GET /model-governance/models`, `POST /model-governance/register`, `PUT /model-governance/:id/stage`; other code calls `/ml-inference/predict/all` and `/ml-inference/predictions/logs`. **Every one of these returns 404 at runtime.** Nobody noticed, because there is no integration test and no manual test script covering those pages.

### 2.5 Mock implementations are served as if they were real features

Several services return fabricated data through production API surfaces, with no flag, no header, and no indication to the caller:

- `backend/src/services/cost-analytics.service.ts` — the entire service is `Math.random()`. Costs, variances, trends, per-group breakdowns and period-over-period comparisons are all randomly generated (lines 55–60, 83–84, 173–179, 224–234, 259–262, 294–301, 328, 346). Every page load returns different numbers.
- `backend/src/services/ml-inference.service.ts` — `"Mock implementation for development/build without external dependencies"`.
- `backend/src/services/email.service.ts` and `sms.service.ts` — mock providers that `console.log` and return `mock-email-<timestamp>`. Notifications silently go nowhere.
- `backend/src/services/email-provider.service.ts:76,112` — SendGrid and AWS SES integrations are `// TODO`.
- `backend/src/services/sms-provider.service.ts:82,114` — Twilio and AWS SNS are `// TODO`.
- `backend/src/services/push-notification.service.ts:136,382` — FCM is `// TODO`. The mobile app's documented "push notifications" feature has no server side.
- `backend/src/services/wo-approval.service.ts:322,335,349,361` — approval query, update, assignment and notification are all `// TODO`. The approval workflow does not persist.
- `backend/src/services/predictive-wo.service.ts:277,285,295` — reads and writes to the DB are `// TODO`; predictive work orders are never saved.

The README meanwhile advertises "**92–96% accuracy anomaly detection**" and "**96.8% accuracy energy forecasting**" (`README.md:72,74`). Those numbers cannot be attributed to a system whose inference path is a stub.

**Mocks during development are fine. Mocks behind a "Complete" label are not.** The rule the team needs is in Section 6.

### 2.6 Security

Ordered by severity.

**Critical — JWT signing key silently falls back to a public constant.**
`backend/src/plugins/jwt.ts:20`: `secret: process.env.JWT_SECRET || "changeme-secret-key"`. If `JWT_SECRET` is unset or mistyped in any environment, the server boots normally and signs tokens with a value committed to this repository. Anyone who can read the repo can mint a valid `super_admin` token. There is no startup assertion anywhere that required secrets are present. The same pattern applies to ClickHouse credentials in four services (e.g. `clickhouse-etl.service.ts:21-23`, `kpi-calculation.service.ts:48-50`).

**High — access and refresh tokens are stored in `localStorage`.**
`frontend/src/store/auth-store.ts:36-37,75-76`, `frontend/src/lib/api-client.ts:38,74`. Any XSS anywhere in the app yields both tokens, including the long-lived (7-day) refresh token. This is made materially worse by the CSP in `frontend/next.config.js`, which permits `script-src 'self' 'unsafe-eval' 'unsafe-inline'` — i.e. the primary XSS mitigation is disabled.

**High — the CSRF subsystem protects against an attack that cannot occur, while the real risk is unmitigated.**
Authentication is pure `Authorization: Bearer` (there are no cookies in `backend/src/routes/auth.ts` or `plugins/jwt.ts`). Bearer tokens are not sent ambiently by browsers, so CSRF is not applicable. Yet the team built `backend/src/middleware/csrf.ts`, Redis token storage, `backend/src/routes/csrf.ts`, `frontend/src/lib/csrf.ts`, 28 test assertions (the largest test cluster in the repo), two design documents, a shell script (`backend/scripts/add-csrf-protection.sh`) and multiple commits for it. This is the clearest single example of the review gap: a large, well-executed, carefully-tested body of work aimed at the wrong threat, while token-in-`localStorage` — the actual exposure — went unexamined. Nobody senior asked "what is the threat model here?"

**High — two incompatible RBAC vocabularies exist in the backend.**
`backend/src/constants/permissions.ts` (colon notation: `read:work-orders`) is used by `middleware/authorize.ts` and all 20 guarded route files. `backend/src/config/permissions.ts` (dot notation: `work-orders.view`) is used by `middleware/rbac.ts`, which **no route imports** — it is dead code. `PERMISSION_MIGRATION.md` records that this exact duplication was found and fixed *on the frontend* on 2026-02-23, after it caused real "Access Denied" bugs. The identical problem was left in place on the backend. Two divergent sources of authorization truth in a security-critical path is a latent authorization bug waiting to be reintroduced.

**Medium — tenant isolation is inconsistent and unenforced.**
16 route files and 28 service files contain no reference to `tenantId` at all. Isolation depends entirely on each developer remembering to filter — there is no row-level security, no query-level tenant scope, and no test asserting that tenant A cannot read tenant B's data. `backend/src/routes/notifications.ts:513` hardcodes `tenantId: "default-tenant-id"` with a `// TODO: Get from auth context`. For a multi-tenant CMMS this is the highest-consequence class of bug available, and it is currently untested.

**Medium — no brute-force protection on login.**
`backend/src/routes/auth.ts` login has no account lockout, no per-account throttle and no failed-attempt tracking. The only limit is the global 100 req/min (`server.ts:170`), which is not a credential-stuffing defence.

**Medium — 87 dependency vulnerabilities across the two Node projects**, 5 critical and 42 high, none triaged. Notably `drizzle-orm`'s SQL-injection-via-identifiers advisory affects every database call in the system.

### 2.7 Architecture: infrastructure that exists but is not used

`docker-compose.yml` provisions 15 services. Cross-referencing against actual code usage:

| Service | Files referencing it | Assessment |
|---|---|---|
| ClickHouse | 13 | Used |
| Kafka | 8 | Used |
| QuestDB | 5 | Used |
| **TimescaleDB** | **0** | **Never referenced by any code** |
| **HashiCorp Vault** | **0** | **Never referenced by any code** |
| MinIO | 1 | Barely used — file storage writes to local disk (`file-storage.service.ts:28`) |
| EMQX | 1 | Barely used |

The system runs **three time-series databases** (QuestDB, TimescaleDB, ClickHouse) where the code uses at most two, and one of those three is entirely unreferenced. Vault is provisioned as the documented secrets manager while the application reads secrets from `process.env` with hardcoded fallbacks (§2.6). This is complexity that costs money and operational burden and returns nothing. It also inflates every "production readiness" estimate, because the runbooks describe operating services nothing depends on.

### 2.8 Documentation

The documentation is voluminous (~80 files) and, in structure and prose, genuinely good work. Its problem is that a large share of it is **aspirational rather than descriptive**, and nothing distinguishes the two:

- `docs/api/openapi.yaml` documents **19 paths**. The backend registers 25 route modules exposing well over a hundred endpoints. The published API contract covers a fraction of the API, and Swagger UI is served from it (`server.ts:217+`), so consumers see a spec that does not describe the system.
- `docs/qa/KNOWN_ISSUES.md` declares "Critical Issues (P0): None Found ✅" while §2.3–2.6 above were all discoverable by reading the repository.
- `docs/operations/*` (disaster recovery, RTO/RPO, on-call rotation, incident response) describes operating a production system that has never had a working migration path.
- `docs/qa/KNOWN_ISSUES.md` M-001 resolves a `react-hooks/exhaustive-deps` warning as *"intentional… the functions are stable"*, which is not correct — the functions are recreated each render; the documented alternative (`useCallback`) is the actual fix. This is a small thing, but it is the shape of the problem: a warning was reasoned away in a document instead of fixed in code.

The corrective action is not to delete the documentation. It is to **stamp every document with what it is** — specification, plan, or verified description of shipped behaviour — and to demote everything unverified.

### 2.9 Engineering hygiene

- **Duplicate services with overlapping responsibilities**, each with a different consumer, neither reconciled:
  `notification-batching.service.ts` (623 lines, used by `server.ts`) vs `notification-batch.service.ts` (646 lines, used by a script);
  `push-notification.service.ts` (399) vs `push.service.ts` (68, unused);
  `sms-provider.service.ts` (261) vs `sms.service.ts` (51) — **neither is imported anywhere**;
  `slack-provider.service.ts` (465) vs `slack.service.ts` (123);
  `report-builder.service.ts` (422) vs `report.service.ts` (125) — both imported by `routes/reports.ts`.
  That is roughly 1,300 lines of duplicated or orphaned service code.
- **Duplicate test trees**: `frontend/e2e/` and `frontend/tests/e2e/` both exist, both contain `auth.spec.ts`. Similarly `backend/test/` and `backend/tests/`. Which one runs depends on which script you invoke.
- **Unreviewable commits.** `c5d8925` ("feat: backend and frontend updates including db migrations, crews, and work orders") is 49 files, +3,485/−45,439. A commit with a vague message and 45k deletions cannot be reviewed; it can only be trusted.
- `backend/test/e2e/predictive-maintenance.e2e.test.ts.skip` — 26 assertions disabled by file extension. Disabled tests should be deleted or fixed, never renamed.
- `frontend/src/lib/api-client.ts:22` defaults `API_URL` to `http://localhost:3000/api/v1` — the **frontend's own port**, not the backend's 3001 (`CLAUDE.md`). Works only because the env var is always set; a misconfiguration will fail confusingly.
- Backend uses `zod@^3.25`, frontend uses `zod@^4.1`. Shared validation logic cannot be shared across that boundary.

### 2.10 What was done well

This must be stated plainly, and it matters for how the review is conducted:

- **The domain modelling is strong.** `backend/src/db/schema.ts` (37 tables, 1,522 lines) is coherent, consistently uses UUIDs and `tenant_id` foreign keys, and reflects real CMMS domain understanding.
- **The specification set is genuinely valuable.** `specs/01–26` are detailed, internally consistent, and would take a new team months to reproduce. They are the project's best asset.
- **Layering is correct and consistent.** routes → services → db, with a shared middleware layer. Juniors followed the pattern faithfully across 39 route files. That consistency is what makes the codebase salvageable.
- **The `RunAndFix` work shows the right instincts.** `PERMISSION_MIGRATION.md` is a model of how to handle a refactor: problem stated, mapping table, scope enumerated, dead code deleted. `022_fix_asset_jsonb_columns.sql` is written idempotently with a `DO` block — better practice than most of what surrounds it. The team can clearly work to a high standard **when someone tells them what the standard is.**
- **Security work was competently executed**, even where mis-targeted. The CSRF implementation is correct for what it does. The problem was direction, not execution.

**Overall assessment:** this is a well-structured skeleton with a coherent domain model and excellent specifications, wrapped in status reporting that cannot be trusted, with no working migration path and no functioning quality gates. It is roughly **6–10 weeks from a credible internal beta**, not production-ready. The single most valuable intervention is not more code — it is turning CI back on and replacing "✅ Complete" with a definition of done that requires evidence.

---

## 3. Review objectives and non-objectives

**Objectives**

1. Produce a verified feature inventory: for each claimed feature, one of `Working` / `Partial` / `Mock` / `Not wired` / `Absent`, with evidence.
2. Produce a prioritised findings register with owners and fix estimates.
3. Restore functioning quality gates (CI, type strictness, migrations, minimum test coverage on critical paths).
4. Re-baseline the plan: a realistic scope and date for internal beta, agreed with stakeholders on the basis of verified status.
5. Leave the team with a definition of done they can apply themselves, without a reviewer in the loop.

**Non-objectives**

- Rewriting the system. The architecture is sound; the gaps are in verification and completion.
- Performance tuning, until correctness is established.
- Individual performance assessment. Findings attach to code and process, never to people. This must be said explicitly at kickoff, or the review will produce defensiveness instead of information.

---

## 4. Review principles

1. **Evidence or it did not happen.** No status is accepted on assertion. "Working" means someone ran it and recorded how.
2. **Code is the source of truth; documents are claims about code.** Where they disagree, the document is the defect.
3. **Findings, not opinions.** Every finding needs: file:line, observed behaviour, expected behaviour, severity, and a concrete fix. "This is messy" is not a finding.
4. **Severity is about consequence, not effort.** A one-line fix to the JWT fallback is P0; a two-week refactor of duplicated services is P3.
5. **No blame.** The failures are systemic. Anyone who feels they must defend their work will hide problems, and hidden problems are what this review exists to surface.
6. **Timebox and move.** A reviewer who cannot determine status in 30 minutes marks it `Unknown` and escalates. Do not spend a day proving something is broken.

---

## 5. Scope and inventory

| Area | Size | Reviewers | Depth |
|---|---|---|---|
| Backend API (`backend/src`) | 137 files / 37.5k LOC — 39 route files, 51 services | 2 | **Deep** |
| Database (`schema.ts`, migrations, seeds) | 37 tables, 17 migration files | 1 | **Deep** |
| Security & auth (authn, authz, tenancy, secrets, deps) | cross-cutting | 1 (+ external if available) | **Deep** |
| Frontend (`frontend/src`) | 141 files / 19k LOC — 20 route groups | 2 | **Standard** |
| Infrastructure & deployment (compose, scripts, CI, Terraform) | 15 services, 4 workflows | 1 | **Standard** |
| ML (`ml/`) | 31 Python files / 9.5k LOC | 1 | **Triage only** |
| Telemetry (`telemetry/`) | 13 files / 3.5k LOC | 1 | **Triage only** |
| Mobile (`mobile/`) | 21 Dart files / 4.7k LOC | 1 | **Triage only** |
| Documentation (`docs/`, `specs/`, `TasksTracking/`) | ~80 + 31 + 16 files | 1 | **Classification pass** |

**Depth definitions**
- **Deep** — read every file; trace each endpoint end-to-end; verify against spec; write findings.
- **Standard** — read every file; verify representative flows end-to-end; spot-check the rest.
- **Triage only** — determine whether it runs at all, what it is connected to, and whether anything depends on it. Defer detailed review until Phase 4.

---

## 6. Workstreams

Each workstream produces findings into a single shared register (Section 8). Checklists are the *minimum*; reviewers add what they find.

### WS-1 — Ground truth: verified feature inventory
**Owner:** Review lead · **Runs:** Phase 1–2 · **Deliverable:** `docs/review/feature-inventory.md`

For each of the 113 tasks in `TasksTracking/*`:
- [ ] Locate the implementing code. If none, mark `Absent`.
- [ ] Is the route registered in `server.ts`? If not, `Not wired`.
- [ ] Does the service touch the database / external system, or return mocked data? If mocked, `Mock`.
- [ ] Is there a test, or a recorded manual verification? If not, `Unverified`.
- [ ] Exercise it against a running stack (`./scripts/dev.sh`) and record the actual response.
- [ ] Assign final status and link the evidence.

Then rewrite `TasksTracking/*` and `README.md` §Project Status from this inventory. **The existing status tables are deleted, not edited.**

### WS-2 — Restore quality gates
**Owner:** Infra reviewer · **Runs:** Phase 0–1 (starts immediately) · **Deliverable:** green CI on `main`

- [ ] Re-enable `push`/`pull_request` triggers on all four workflows.
- [ ] Fix the workflows so they actually run: add the missing `format:check` and `type-check` scripts to `frontend/package.json`, or remove those steps.
- [ ] Remove `|| true` from `backend/package.json` `build`.
- [ ] Delete `backend/tsconfig.prod.json`; build with `strict: true`. Record the resulting error count as a burn-down target — **do not** fix them by adding `any`.
- [ ] Remove `eslint.ignoreDuringBuilds` from `frontend/next.config.js`.
- [ ] Enable Dependabot / `npm audit` in CI, failing on critical and high.
- [ ] Enable branch protection on `main`: no direct pushes, CI green required, one approving review required.
- [ ] Consolidate the duplicate `test/` + `tests/` and `e2e/` + `tests/e2e/` trees so one command runs everything.

### WS-3 — Security review
**Owner:** Security reviewer · **Runs:** Phase 1–2 · **Deliverable:** `docs/review/security-findings.md`

- [ ] Fail fast on missing secrets: assert `JWT_SECRET` (and all required env) at boot; remove every `process.env.X || "<literal>"` fallback for anything credential-shaped.
- [ ] Decide and document the token storage model. Recommendation: refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie, access token in memory only. This makes the existing CSRF work correct rather than wasted.
- [ ] Tighten CSP: remove `unsafe-eval` and `unsafe-inline` from `script-src`; make `connect-src` environment-driven (it is currently hardcoded to `localhost:3001` and will break in production regardless).
- [ ] **Tenant isolation audit** — for all 39 route files, confirm every query is scoped by `tenantId` from the JWT, never from the request body or params. Write a cross-tenant IDOR test per resource type. Fix `notifications.ts:513`.
- [ ] Delete `middleware/rbac.ts` and `config/permissions.ts`; make `constants/permissions.ts` the single authority. Add a test asserting frontend and backend permission strings match.
- [ ] Add login throttling and account lockout.
- [ ] Triage all 87 dependency advisories; patch every critical/high or record an accepted-risk decision with a name against it.
- [ ] Review file upload (`multipart`, `file-storage.service.ts`) for type/size validation and path traversal.
- [ ] Review the GenAI path (`genai.service.ts`) for prompt injection and for tenant leakage through the vector store.
- [ ] Rewrite `docs/security/security-audit-report.md` from findings, or delete it. It cannot stand as written.

### WS-4 — Database and migrations
**Owner:** DB reviewer · **Runs:** Phase 1 (blocks everything downstream) · **Deliverable:** working migration path + `docs/review/db-findings.md`

- [ ] **Reconcile the two migration systems.** Decide: adopt Drizzle-generated migrations and port 008–022 into it, or adopt plain SQL and write a runner. Either is fine; the current state is not.
- [ ] Verify `schema.ts` matches an actual migrated database, column by column. §2.3 shows drift has already occurred silently.
- [ ] Renumber migrations; resolve the duplicate `020`; establish an ordering convention.
- [ ] Prove an upgrade path: migrate a database from the oldest supported version to head, in CI, on every PR.
- [ ] Review indexes against the actual query patterns in `services/*` — particularly `tenant_id` composite indexes.
- [ ] Confirm the seed path (`seed.ts`, `auto-seed.ts`) cannot run in production. `AUTO_SEED` is env-gated; verify the gate holds.

### WS-5 — Backend code review
**Owner:** 2 backend reviewers · **Runs:** Phase 2 · **Deliverable:** findings + per-route status

Per route module:
- [ ] Registered in `server.ts`? Authenticated? Authorised with the correct permission?
- [ ] Input validated with Zod at the boundary; no `as any` casts past validation.
- [ ] Tenant-scoped queries.
- [ ] Errors handled without leaking internals; no `500` on expected conditions.
- [ ] Matches its `specs/` definition and `docs/api/openapi.yaml`.

Per service:
- [ ] Real implementation or mock — tag every mock (see the mock policy below).
- [ ] Transaction boundaries correct where multiple writes occur.
- [ ] No N+1 query patterns (`user.service.ts:119` filters in memory with a `// for now` comment — start there).

**Mock policy to adopt.** Every mock implementation must (a) be named `*.mock.ts`, (b) refuse to load when `NODE_ENV=production`, (c) return a `X-Mock-Data: true` response header, and (d) have its feature marked `Mock` in the inventory — never `Complete`. This makes §2.5 structurally impossible to repeat.

### WS-6 — Frontend review
**Owner:** 2 frontend reviewers · **Runs:** Phase 2 · **Deliverable:** findings + per-page status

- [ ] Every `apiClient` call maps to a registered backend route. (Known broken today: `/model-governance/*`, `/ml-inference/*`.)
- [ ] Every page's loading, empty, and error states render — not just the happy path.
- [ ] Route protection present and using the canonical (colon) permission vocabulary.
- [ ] No secrets or tenant identifiers held in client state beyond what the user may see.
- [ ] Token refresh race conditions in `api-client.ts` (concurrent 401s → multiple refresh calls).
- [ ] Fix the `API_URL` default port (`api-client.ts:22`).
- [ ] Accessibility spot-check on the five highest-traffic pages.

### WS-7 — Test strategy and coverage
**Owner:** Review lead + one reviewer per area · **Runs:** Phase 2–3 · **Deliverable:** `docs/review/test-plan.md`

The goal is **not** a coverage percentage. It is: *the critical paths cannot silently break again.*

- [ ] Define the critical paths (proposed): login/refresh/logout; work order create → assign → complete → close; asset CRUD with hierarchy; tenant isolation on every resource; permission enforcement per role; migration up from oldest supported version.
- [ ] Write integration tests for each, running against a real Postgres in CI.
- [ ] Delete or fix `predictive-maintenance.e2e.test.ts.skip`.
- [ ] Consolidate the duplicate test trees.
- [ ] Set an enforced floor (suggest 60% on `services/` and `middleware/`, 0% floor elsewhere initially) and raise it per sprint.

### WS-8 — Infrastructure and deployment
**Owner:** Infra reviewer · **Runs:** Phase 3 · **Deliverable:** findings + a trimmed `docker-compose.yml`

- [ ] Remove TimescaleDB and Vault, or make them used. Currently they are cost and operational burden with zero references.
- [ ] Decide between QuestDB and ClickHouse — running both needs a written justification.
- [ ] Verify `deploy.sh` produces a working stack from a clean machine. Time it. Record the failures.
- [ ] Validate the Terraform in `infrastructure/` (217 lines — confirm it is real, not a sketch).
- [ ] Verify health checks, resource limits, restart policies, and log aggregation actually work.
- [ ] Test the backup and restore scripts in `scripts/backup/` by restoring into a fresh database. An untested backup is not a backup.

### WS-9 — Documentation reconciliation
**Owner:** Doc reviewer · **Runs:** Phase 3 · **Deliverable:** classified, trustworthy `docs/`

- [ ] Stamp every document with one of: **SPEC** (intended design), **PLAN** (future work), **VERIFIED** (describes shipped, tested behaviour), **STALE** (obsolete → `docs/archive/`).
- [ ] Regenerate `docs/api/openapi.yaml` from the actual Fastify route schemas — it must be generated, never hand-maintained, or it will drift again.
- [ ] Rewrite `README.md` §Project Status from WS-1. Remove all unverifiable metrics (accuracy percentages, test counts, security scores).
- [ ] Rewrite `docs/qa/KNOWN_ISSUES.md` from the findings register.
- [ ] Move the operations documents (`docs/operations/*`) to **PLAN** until there is a system they describe.
- [ ] Keep `specs/01–26` as-is. They are the asset. Mark them **SPEC**.

### WS-10 — ML, telemetry, mobile triage
**Owner:** 1 reviewer per area · **Runs:** Phase 3 · **Deliverable:** one page each: does it run, what depends on it, keep/defer/cut

These three areas represent ~18k LOC with almost no integration into the running product (the ML routes are unregistered; `ml-inference` is a mock). The immediate question is not code quality but **whether they are in scope at all**. Answer that before spending review effort on them.

---

## 7. Phases and gates

| Phase | Duration | Content | Exit gate |
|---|---|---|---|
| **0 — Stop the bleeding** | 2 days | WS-2 (CI on, branch protection, `\|\| true` removed). WS-3 P0 only (JWT fallback). Freeze new feature work. | CI runs on every PR. `main` is protected. No known P0 open. |
| **1 — Ground truth** | 1 week | WS-1 inventory; WS-4 migrations; WS-3 security deep pass. | Verified inventory published. A database can be migrated from old → head. Security findings triaged. |
| **2 — Deep code review** | 2 weeks | WS-5, WS-6, WS-7. | Every route and page has a status and an owner. Critical-path tests exist and pass in CI. |
| **3 — Periphery** | 1 week | WS-8, WS-9, WS-10. | Infra trimmed. Docs classified. Scope decision on ML/telemetry/mobile. |
| **4 — Re-baseline** | 3 days | Consolidate findings; estimate remediation; agree scope and date for internal beta with stakeholders. | Signed-off remediation plan and a date built on verified status. |

**Total: ~5 weeks of review**, running alongside P0/P1 remediation. Feature development stays frozen through Phase 2.

**Gate rule:** a phase does not end because its time ran out. If Phase 1 finds that migrations cannot be reconciled in a week, Phase 2 waits. Shipping a phase on schedule with unverified output is the exact failure mode this review exists to correct.

---

## 8. Findings register

Single register at `docs/review/findings.md`, one row per finding:

| Field | Notes |
|---|---|
| ID | `REV-001`… |
| Severity | P0 / P1 / P2 / P3 (below) |
| Area | WS number |
| Location | `file:line` — mandatory |
| Observed | What the code does |
| Expected | What it should do |
| Impact | Concrete consequence |
| Owner | Named individual |
| Estimate | Hours or days |
| Status | Open / In progress / Fixed / Accepted risk / Won't fix |

**Severity definitions**

- **P0 — Ship-blocking, exploitable or data-destroying now.** Fix within 24h. *(Current: JWT secret fallback; broken migration path.)*
- **P1 — Ship-blocking before beta.** Fix in the current phase. *(Current: unwired routes serving 404s to the UI; mocks labelled Complete; tenant isolation unverified; critical dependency advisories.)*
- **P2 — Must fix before GA.** Scheduled. *(Current: duplicate services; `any` proliferation; OpenAPI drift; unused infrastructure.)*
- **P3 — Should fix.** Backlog. *(Current: naming, structure, test-tree consolidation.)*

Every finding needs an owner and an estimate **at the moment it is written**, or it becomes another undifferentiated backlog item.

---

## 9. Definition of done (replaces "✅ Complete")

Adopt immediately, for all work from here on. A task is Complete only when **every** box is ticked:

- [ ] Code merged to `main` via PR with at least one approving review from someone who did not write it.
- [ ] CI green: lint, strict type-check, unit tests, integration tests.
- [ ] Route registered in `server.ts` and reachable — verified by an integration test hitting the live endpoint.
- [ ] No mock in the path, or the feature is explicitly labelled `Mock` and the mock refuses to load in production.
- [ ] Tenant-scoped, with a test proving cross-tenant access is denied.
- [ ] Authorised with a permission from `constants/permissions.ts`, with a test per role.
- [ ] Migration (if any) applies cleanly on a database migrated from the previous release.
- [ ] `openapi.yaml` regenerated; user-facing docs updated.
- [ ] Manually exercised through the UI, with the steps recorded.

Anything not meeting all nine is `Partial`, and `Partial` is an acceptable, blameless status. **The status vocabulary must include a way to say "not finished", or people will say "finished".** That is the root cause of §2.1, and this checklist is the fix.

---

## 10. First actions

Do these before the review formally starts — they are cheap and they stop the situation getting worse:

1. **Rotate `JWT_SECRET` in every environment and add a boot-time assertion** that it is set and ≥ 64 characters. (`backend/src/plugins/jwt.ts:20`) — 1 hour.
2. **Re-enable CI on all four workflows** and let it fail loudly. The failure list is the real backlog. — 2 hours.
3. **Remove `|| true` from the backend build.** — 5 minutes.
4. **Enable branch protection on `main`.** — 15 minutes.
5. **Add a banner to `README.md`** stating that the status section is under review and must not be used for planning until Phase 1 completes. — 15 minutes.
6. **Freeze feature development** and communicate why, in the terms of Section 4.5: the code is salvageable and the problem is process, not people.
