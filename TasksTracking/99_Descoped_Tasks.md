# 99. Descoped Tasks

**Purpose:** Track tasks removed from scope to maintain numerical continuity and historical context.

## Descoped / Deferred Items

| Task ID              | Description                | Reason                                      |
| :------------------- | :------------------------- | :------------------------------------------ |
| **DCMMS-018 to 027** | *Various Sprint 1-4 items* | Merged or Deferred (ERP related)            |
| **DCMMS-038 to 041** | *Early Mobile items*       | Replaced by detailed implementation         |
| **DCMMS-045**        | *Unassigned*               | Gap in numbering                            |
| **DCMMS-048**        | *Unassigned*               | Gap in numbering                            |
| **DCMMS-079**        | *Analytics*                | Merged into Analytics Engine                |
| **DCMMS-084 to 087** | *Compliance*               | NERC/AEMO deferred to Release 3             |
| **DCMMS-091 to 094** | *Compliance*               | Deferred                                    |
| **DCMMS-101**        | *ML Infra*                 | Merged                                      |
| **DCMMS-112 to 115** | *PdM*                      | Deferred                                    |
| **DCMMS-120 to 122** | *Cost*                     | Deferred                                    |
| **DCMMS-128 to 135** | *i18n*                     | Full i18n deferred (Hindi only implemented) |
| **DCMMS-145**        | Cloud Provider Selection   | AWS selected by default. Task deferred.     |

## Descoped under REV-025 (2026-09-19) — self-certified `✅ Complete`, code deleted

These were all previously marked complete in their module trackers while their route
was never registered in `server.ts` and their backing code was fabricated, in-memory
only, or an unauthenticated duplicate of something that already worked. Deleted rather
than completed. Evidence: `TasksTracking/15_Review_Remediation.md` REV-025.

| Task ID        | Description               | Reason                                                     |
| :------------- | :------------------------ | :----------------------------------------------------------|
| **DCMMS-125**  | Budget Management API     | Service was an in-memory `Map`; data lost every restart     |
| **DCMMS-126**  | Cost Calculation Service  | Same — in-memory only, no persistence                       |
| **DCMMS-127**  | Cost Analytics API        | Service fabricated every figure with `Math.random()`        |
| **DCMMS-109**  | ML Deployment API         | Hardcoded "Mock Provider" stub, nothing referenced it        |
| **DCMMS-111**  | SHAP Explainability       | Hardcoded "Mock Provider" stub, nothing referenced it        |
| **DCMMS-118**  | Model Performance Tracking| Mock stub; its cron job was also never started anywhere      |
| **DCMMS-116**  | Predictive WO Service     | In-memory + unimplemented TODOs; predictions never saved. See REV-028 |
| **DCMMS-117**  | WO Approval / Human-in-Loop | In-memory + unimplemented TODOs; approvals never persisted. See REV-028 |
| *(unlisted)*   | `routes/notification-history.ts` | Duplicated the already-working `/notifications/history`, but with raw SQL trusting an unvalidated `x-tenant-id` header — the pattern behind the cross-tenant IDOR fixed earlier in `alerts.ts` |
| *(unlisted)*   | `routes/alarms.ts`        | Queried a table that was never created; structurally superseded by the already-live `alerts` table. The sensor-driven auto-alarm behavior `specs/ALARMS_DASHBOARD_SPEC.md` describes doesn't exist anywhere today — legitimate future backlog, not this file |
| *(unlisted)*   | `routes/slack.ts`, `services/slack.service.ts` | Zero auth guard, queried nonexistent tables, self-labeled "Mock Provider" — a real, working Slack integration already exists via `routes/integrations.ts` + `slack-provider.service.ts` |

**Registered instead of deleted, but corrected to declared mocks (not descoped — see
REV-025/REV-027a):** DCMMS-110 (ML Inference API) and DCMMS-119 (Governance Framework).
Both back live frontend pages that were previously 404ing; both now honestly report
`X-Mock-Data: true` and refuse to load under `NODE_ENV=production`.
