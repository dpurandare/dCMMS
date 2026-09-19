# Verified feature inventory

**Task:** REV-009 · **Date:** 2026-09-19 · **Commit:** `f085fa9`
**Stack:** `./scripts/dev.sh`, backend on :3001, database migrated to head and seeded

This replaces the `✅ Complete` markers in `TasksTracking/01`–`14` as the
source of truth for what works. Those markers were self-certified with no
gate; the statuses here each carry a stated method.

---

## Headline

| | |
| :-- | :-- |
| Tasks in `TasksTracking/01`–`14` | **202** |
| Marked `[x]` complete by the team | **181** (89%) |
| Classified **Working** here | **11** (5%) |

**First correction: there are 202 tasks, not 113.** `review-plan.md` and
REV-009 both say 113. Counting every `- [ ] **DCMMS-nnn**` line across modules
01–14 gives 202, of which 181 are ticked.

| Status | Tasks | Meaning |
| :----- | ----: | :------ |
| **Working** | 11 | backing routes registered, live probe returned 2xx, no mock markers |
| **Partial** | 54 | registered and reachable, but something in its area returns 5xx or is unwired |
| **Mock** | 29 | backing service contains `Math.random()` — it returns invented numbers |
| **Not wired** | 16 | route file exists and is never imported into `server.ts` |
| **Absent** | 8 | no implementing route file found |
| **Unverified** | 84 | no single backing route to probe — frontend and gap-remediation work |

> **Read the Unverified row honestly.** 84 tasks sit there because they are
> frontend fixes or cross-cutting remediation with no single endpoint to call.
> It means *not assessed*, not *broken* — and it is the largest single bucket,
> so this inventory covers roughly 58% of the task list with direct evidence.

---

## How each status was reached

1. **Registration.** `server.ts` was parsed for `import … from "./routes/x"`
   and a matching `server.register(x…)`. A file that is imported but never
   registered, or never imported, serves nothing.
   → **23 of 39 route files are registered. 16 are never imported at all.**
2. **Live probe.** Every parameterless `GET` under `/api/v1` was called against
   the running stack with a valid `super_admin` token, and the actual HTTP
   status recorded. 42 endpoints, real responses, no simulation.
3. **Mock detection.** `grep -rlE "Math\\.random\\(\\)"` across services and
   routes. A service that invents its numbers is not implemented, whatever
   its route does.

### Live probe results

| HTTP | Endpoints |
| :--- | --------: |
| 200 | 29 |
| 400 | 2 |
| 403 | 6 |
| 500 | 5 |

The five 500s and two 400s, verbatim:

```
  403  /api/v1/audit-logs                         Only administrators can access audit logs
  403  /api/v1/audit-logs/export                  Only administrators can access audit logs
  403  /api/v1/audit-logs/statistics              Only administrators can access audit logs
  500  /api/v1/analytics/kpis                     
  400  /api/v1/analytics/kpis/trends              {"statusCode":400,"error":"ZodError","message":"[\n  {\n    
  500  /api/v1/telemetry                          Failed to query telemetry data
  500  /api/v1/telemetry/                         Failed to query telemetry data
  400  /api/v1/telemetry/stats                    {"statusCode":400,"error":"Bad Request","message":"Validatio
  500  /api/v1/users                              The value of '#' does not match schema definition.
  500  /api/v1/users/                             The value of '#' does not match schema definition.
  403  /api/v1/integrations/slack/install         You do not have permission to perform this action
  403  /api/v1/integrations/slack/callback        You do not have permission to perform this action
  403  /api/v1/integrations/slack/status          You do not have permission to perform this action
```

`GET /api/v1/users` is the one to look at first: it returns **500** from
response serialization — `The value of '#' does not match schema definition`.
The declared response schema does not match what the handler returns. Listing
users is as core as this product gets, and it is broken right now.

The telemetry 500s are downstream of a known gap: `POST /api/v1/telemetry`
publishes to Kafka and **no consumer exists**, so the QuestDB tables the read
path queries are never populated. See `docs/review/ingestion.md`.

---

## Route files that serve nothing

16 of 39 route files are never imported into `server.ts`. Their code is
complete enough to read as finished, and no request can reach it:

- `backend/src/routes/alarms.ts`
- `backend/src/routes/budget-management.ts`
- `backend/src/routes/cost-analytics.ts`
- `backend/src/routes/cost-calculation.ts`
- `backend/src/routes/dashboards.ts`
- `backend/src/routes/genai.routes.ts`
- `backend/src/routes/ml-deployment.ts`
- `backend/src/routes/ml-explainability.ts`
- `backend/src/routes/ml-inference.ts`
- `backend/src/routes/model-governance.ts`
- `backend/src/routes/model-performance.ts`
- `backend/src/routes/notification-history.ts`
- `backend/src/routes/predictive-wo.ts`
- `backend/src/routes/slack.ts`
- `backend/src/routes/weather.ts`
- `backend/src/routes/wo-approval.ts`

This is why modules 09 (Machine Learning) and 10 (Cost Management) are marked
`✅ Complete` in `TasksTracking/` while none of their endpoints exist at
runtime.

## Services that return invented numbers

- `backend/src/routes/alerts.ts`
- `backend/src/routes/permits.ts`
- `backend/src/routes/telemetry.ts`
- `backend/src/services/budget-management.service.ts`
- `backend/src/services/cost-analytics.service.ts`
- `backend/src/services/cost-calculation.service.ts`
- `backend/src/services/forecast.service.ts`
- `backend/src/services/work-order.service.ts`

---

## Per-task inventory

Status per task, grouped by module. `[x]` is the team's own marker, kept so
the two can be compared directly.

### 01 Foundation Architecture

22 tasks · Partial 22

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-001A` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001B` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001C` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001D` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-NEW` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001E` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001F` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-002` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-003` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012B` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012E` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-004` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-005` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-007` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-008` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-008C` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-010` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012A` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012C` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-012D` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |

### 02 Identity Access

9 tasks · Partial 9

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-NEW` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-006` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-009` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-018` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-XXX` |   | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-AUTH-001` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-AUTH-002` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-AUTH-003` |   | **Partial** | live 500: /api/v1/users, /api/v1/users/ |
| `DCMMS-001C` | x | **Partial** | live 500: /api/v1/users, /api/v1/users/ |

### 03 Asset Management

11 tasks · Working 11

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-013` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-014` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-015` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-016` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-017` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-029` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-030` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-031` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-032` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-019` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |
| `DCMMS-047A` | x | **Working** | live probe: /api/v1/assets→200, /api/v1/assets/→200, /api/v1/sites→200 |

### 04 Work Order Management

13 tasks · Mock 13

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-020` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-021` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-022` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-023` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-024` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-034` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-035` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-036` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-028` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-042` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-WO-001` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-WO-002` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |
| `DCMMS-WO-003` | x | **Mock** | partly unwired (wo-approval); Math.random() in routes/permits.ts |

### 05 Mobile Offline

8 tasks · Absent 8

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-038` | x | **Absent** | no route file found for: sync |
| `DCMMS-039` | x | **Absent** | no route file found for: sync |
| `DCMMS-040` | x | **Absent** | no route file found for: sync |
| `DCMMS-041` | x | **Absent** | no route file found for: sync |
| `DCMMS-MO-01` | x | **Absent** | no route file found for: sync |
| `DCMMS-MO-02` | x | **Absent** | no route file found for: sync |
| `DCMMS-MO-03` | x | **Absent** | no route file found for: sync |
| `DCMMS-165` | x | **Absent** | no route file found for: sync |

### 06 Telemetry Ingestion

14 tasks · Partial 14

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-049` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-050` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-051` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-052` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-053` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-054` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-057` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-058` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-059` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-060` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-061` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-062` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-055` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |
| `DCMMS-056` | x | **Partial** | partly unwired (alarms); Math.random() in routes/telemetry.ts; live 500: /api/v1/telemetry, /api/v1/telemetry/ |

### 07 Notifications Alerts

16 tasks · Mock 16

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-063` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-064` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-065` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-066` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-067` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-068` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-069` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-070` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-071` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-072` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-073` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-074` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-075` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-076` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-077` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |
| `DCMMS-078` | x | **Mock** | partly unwired (notification-history, slack); Math.random() in routes/alerts.ts |

### 08 Analytics Compliance

9 tasks · Partial 9

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-080` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-081` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-082` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-083` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-088` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-089` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-090` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-090A` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |
| `DCMMS-091` | x | **Partial** | Math.random() in services/cost-analytics.service.ts; live 500: /api/v1/analytics/kpis |

### 09 Machine Learning

23 tasks · Unverified 23

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-095` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-096` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-097` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-098` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-099` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-100` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-102` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-103` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-104` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-105` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-106` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-107` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-108` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-109` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-110` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-111` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-116` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-117` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-118` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-119` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-123` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-136A` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-136B` | x | **Unverified** | registered, but no parameterless GET to probe |

### 10 Cost Management

4 tasks · Not wired 4

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-124` | x | **Not wired** | route file(s) exist but are never imported into server.ts: cost-analytics, cost-calculation, budget-management |
| `DCMMS-125` | x | **Not wired** | route file(s) exist but are never imported into server.ts: cost-analytics, cost-calculation, budget-management |
| `DCMMS-126` | x | **Not wired** | route file(s) exist but are never imported into server.ts: cost-analytics, cost-calculation, budget-management |
| `DCMMS-127` | x | **Not wired** | route file(s) exist but are never imported into server.ts: cost-analytics, cost-calculation, budget-management |

### 11 Advanced Forecasting

13 tasks · Unverified 13

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-151` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-152` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-153` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-154` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-155` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-156` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-157` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-158` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-160` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-161` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-162` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-163` | x | **Unverified** | registered, but no parameterless GET to probe |
| `DCMMS-164` | x | **Unverified** | registered, but no parameterless GET to probe |

### 12 Gap Remediation

18 tasks · Unverified 18

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-025-R` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-026-R` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-AUTH-001` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-WO-001` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-AUDIT-001` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-AUTH-002` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-WO-002` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-SEC-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-SEC-002` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-INFRA-001` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-INFRA-002` | x | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-DB-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-ENV-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-FS-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-FE-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-SMOKE-001` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-SMOKE-002` |   | **Unverified** | no single backing route file; needs per-task review |
| `DCMMS-API-001` |   | **Unverified** | no single backing route file; needs per-task review |

### 13 GenAI Implementation

12 tasks · Not wired 12

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `DCMMS-GENAI-01` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-02` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-03` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-04` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-05` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-06` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-06b` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-07` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-08` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-09` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-10` | x | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |
| `DCMMS-GENAI-11` |   | **Not wired** | route file(s) exist but are never imported into server.ts: genai.routes |

### 14 Frontend Critical Fixes

30 tasks · Unverified 30

| Task | Team | Status | Evidence |
| :--- | :--: | :----- | :------- |
| `FE-001` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-002` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-003` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-004` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-005` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-006` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-007` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-008` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-009` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-010` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-011` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-012` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-013` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-014` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-015` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-BUG-01` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-BUG-02` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-BUG-03` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-BUG-04` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-016` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-017` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-018` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-019` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-020` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-021` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-022` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-023` |   | **Unverified** | no single backing route file; needs per-task review |
| `FE-024` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-025` | x | **Unverified** | no single backing route file; needs per-task review |
| `FE-026` | x | **Unverified** | no single backing route file; needs per-task review |

---

## What this inventory does not do

- It does not assess the 84 Unverified tasks. Modules 12 and 14 are
  cross-cutting and frontend work that needs a browser, not a curl.
- It probes `GET` only. Create, update and delete paths are unexercised.
- It probes parameterless routes only; `/:id` routes need fixtures.
- A 200 means the endpoint answered, not that the answer is correct.

Each of those is a reason the real figure is likely **worse** than this
document shows, not better.

## The one number to carry forward

181 of 202 tasks are marked complete. **11** are
demonstrably working. The gap is not a reporting error to be tidied up — it is
the actual remaining scope, and every estimate should be rebuilt on it
(REV-010, REV-059).
