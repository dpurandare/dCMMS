# Backend Findings — Phase 2 Deep Code Review

Two review passes land in this file: a per-route pass (REV-029) and a
per-service pass (REV-030), from `TasksTracking/15_Review_Remediation.md`.
Findings are blameless — they attach to code and process, not people —
matching the tone of the rest of this review.

---

## Per-Route Review (REV-029)

**Scope:** all 28 files in `backend/src/routes/` as of 2026-09-19 (39
originally — 11 deleted the same day as dead/fake/unsafe-duplicate code
under REV-025). Checked per file: registered · authenticated · authorized
with the right permission · Zod/schema-validated at the boundary ·
tenant-scoped · errors handled without leaking internals · matches its
`specs/` definition where one exists.

**Note on this section's provenance:** this review pass was done by a
background agent. Its full per-route table was lost to a race condition —
a parallel agent doing the REV-030 service pass wrote to this same file at
nearly the same time, and the later write silently clobbered the earlier
one (both used a full-file write rather than an append). The agent that
did the per-route work hit a session rate limit before it could be
re-run to regenerate the full table. What follows is reconstructed from
its own completion summary (which did retain full file:line detail on
the findings below) rather than the original row-by-row table for all 28
files. **Treat the specific findings below as verified** (each was
independently re-confirmed or fixed by the coordinating session, not
just asserted) — but don't treat the absence of a row for any given
route file as "that file was checked and is clean." A full re-run of
this pass is worth doing before treating backend routes as exhaustively
reviewed.

**Result:** 28 routes reviewed, 12 clean, 16 with findings, ranging from
one critical bug down to minor consistency issues.

**Findings, most severe first:**

1. **🔴 P0 → Fixed same day.** SSRF + no request-signature verification in
   `routes/integrations.ts`. `/integrations/slack/interactive` and
   `/integrations/slack/events` sat behind `fastify.authenticate` (a dCMMS
   user bearer token) even though Slack's own servers call them — meaning
   real Slack traffic could never authenticate, and the *actual* live
   exposure was that `handleSlackAction` took `response_url` straight from
   the unverified request body and `fetch()`'d it, a full SSRF primitive,
   reachable by any authenticated dCMMS user with `manage:integrations`
   (verified: the endpoint required a bearer token, so this was
   privileged-user-triggered SSRF, not fully anonymous internet-wide —
   still a real, serious bug, and the endpoint didn't even work for its
   stated purpose). **Fixed:** the file is now split into two Fastify
   plugin scopes — an authenticated admin group (`install`/`test`/
   `status`/`uninstall`) and a public `slackPublic` group (`callback`/
   `interactive`/`events`, none of which can ever carry a dCMMS token).
   `/interactive` and `/events` now require a valid Slack request
   signature (HMAC-SHA256 via `SLACK_SIGNING_SECRET`, timing-safe compare,
   5-minute replay window) or 401. Added a defense-in-depth check that
   `response_url` must be on `https://hooks.slack.com/` before it's ever
   fetched. Verified end-to-end against the running stack: an unsigned
   request now 401s, and a correctly-signed request succeeds (tested the
   `url_verification` handshake Slack requires to accept a webhook URL).
2. **🟠 P1 → Fixed same day.** Cross-tenant IDOR in
   `routes/ml-features.ts` + `services/feast-feature.service.ts`.
   `POST /api/v1/ml/features/assets` took arbitrary `assetIds` with zero
   tenant check anywhere in the route or service — any authenticated user
   with `read:ml-features` could read another tenant's asset type/age,
   health score, work-order counts, and telemetry rollups (capacity
   factor, anomaly counts) just by guessing or enumerating asset UUIDs.
   Same bug class as the `alerts.ts` cross-tenant IDOR fixed earlier in
   this review. **Fixed:** the route now checks every requested
   `assetId` against the caller's own tenant (`db.select from assets
   where id in (...) and tenantId = <caller's>`) before calling Feast,
   returning 403 if any don't belong. Added a regression test to
   `backend/tests/security/tenant-isolation.spec.ts` (confirmed it fails
   without the fix, passes with it — same discipline as the original
   alerts.ts fix).
3. **🟠 P1 — open.** `routes/weather.ts` isn't actually per-site. Three of
   its five endpoints hardcode Delhi's coordinates regardless of the
   `siteId` parameter (lines ~43-46, ~96-99, ~256-259) — the route
   registered today under REV-025 as "real" (genuine external API call,
   real DB persistence) makes that real call against the wrong location
   for every site that isn't Delhi. Not yet fixed — needs each site's
   actual lat/lon wired through instead of a hardcoded constant.
4. **🟠 P1 (systemic) — open.** CSRF protection applied inconsistently
   across at least 8 route files, including `auth.ts` itself, which
   generates and deletes a CSRF token on login/logout but never validates
   one anywhere, not even on `/logout`. `dashboards.ts` and
   `integrations.ts` (before today's rewrite) imported the middleware but
   never wired it into a `preHandler`. This is the same underlying gap
   tracked as REV-018a (csrfProtection historically only exercised by its
   own test) — this pass adds concrete evidence of which files are
   actually affected today.
5. **🟡 P2 — open.** `routes/crews.ts:42-50` wraps its CSRF import in a
   try/catch that silently substitutes a no-op function ("mock if
   missing") on failure — a fail-open pattern on a security control.
   Dormant today (the import doesn't actually fail), but a real footgun:
   if the import path ever breaks, CSRF protection on this route silently
   vanishes instead of the app failing to boot.

**Not yet fixed, tracked as open findings for a future pass:** #3, #4, #5
above. #1 and #2 were fixed the same day they were found, matching the
project's own severity rule (P0 → 24h).

---

## Per-Service Review (REV-030)

**Scope:** every file in `backend/src/services/` as of 2026-09-19 (42 files
— 9 were deleted earlier the same day as dead/fake code under REV-025:
`budget-management`, `cost-analytics`, `cost-calculation`,
`ml-deployment`, `ml-explainability`, `model-performance`,
`predictive-wo`, `wo-approval`, `slack.service.ts`).

**Method:** for every file — real vs. mock, transaction safety on
multi-write operations, N+1 query patterns. Read each file's actual
logic; where a file showed no risk signal on a systematic grep sweep for
fabrication (`Math.random`, `mock`, `TODO`, "would be sent", hardcoded
returns) and its writes were confirmed single-statement, depth was
lighter but every file was opened and checked, not sampled/extrapolated.

**Headline finding: zero use of database transactions anywhere in the
service layer.** No `db.transaction(`, no raw `BEGIN`/`COMMIT`, no
`pool.connect()`-based client transaction, in any of the 42 files. In
practice this matters less than the raw number suggests — most services
here do at most one write statement per logical operation (see table) —
but it is a systemic gap: nothing in this codebase can currently perform
an atomic multi-table write. Two real occurrences of a MISSING
transaction actually mattering are noted below (webhook.service.ts is
NOT one of them — see its row).

| File | Real / Mock | Transaction safety | N+1 risk | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `alert-notification-handler.service.ts` | Real | N/A — no direct DB writes in this file, orchestrates notification + webhook services | None found | In-memory `Map` used for escalation timers (`escalationTimers`) — lost on restart, same accepted class of limitation as webhook retries. Not flagged as a bug; timers are ephemeral by nature. |
| `asset-health-scoring.service.ts` | Real | Single-statement writes | Not checked in depth (lighter pass, no risk signal found) | — |
| `asset.service.ts` | Real, **with one dead no-op pair** | Single-statement writes elsewhere | None found | `createWindMetadata()` / `updateWindMetadata()` (lines 221-230, 266-269) are placeholders that accept turbine metadata and silently return it without writing anywhere — the comment claims uncertainty about whether a `wind_turbine_metadata` table exists in Drizzle, but it does (`db/schema.ts:892`, confirmed populated table, real relations). **Zero callers found anywhere in the codebase** — not actively lying to a user today, but if ever wired up (there's a `wind-dashboard` frontend page and a `wind-power-curve.service.ts`, so this looks like unfinished, not abandoned, work), it would silently drop data while appearing to succeed. Implement against the existing table, or delete. |
| `audit-log.service.ts` | Real | Single insert | None found | — |
| `auth.service.ts` | Real | Single-statement | None found | bcrypt + real Drizzle queries. |
| `clickhouse-etl.service.ts` | Real, **with silently wrong values** | N/A (ETL, single insert per batch) | None found | `syncWorkOrders` (~line 135) hardcodes `cost: 0`, `parts_count: 0`, `tasks_count: 0`, `tasks_completed: 0` for **every** work order synced into ClickHouse, with `// TODO: Count from parts/tasks table` comments — despite `workOrderParts`/`workOrderTasks`/`workOrderLabor` being real, populated tables (`work-order.service.ts` writes to them). Any dashboard or KPI reading parts/tasks/cost from ClickHouse analytics will show **zero, always**, for real underlying data. Not fabricated (doesn't invent a nonzero number) but silently, permanently wrong — the kind of gap that's easy to mistake for "no parts have ever been used." |
| `compliance-report-generation.service.ts` | Real | Single insert (generates a real file to disk, then one DB insert) | None found | If the file write succeeds but the DB insert fails, an orphaned file is left on disk — minor resource leak, not a user-facing correctness bug. |
| `compliance-template.service.ts` | Real, **with one honest gap** | Single-statement | None found | `fetchAuditLogData()` (line ~400) is `// TODO: Implement audit log querying`, returns `[]` with an explicit `fastify.log.warn("Audit log fetching not yet implemented")`. Unlike most findings in this review, this one is **honest** — it warns rather than fabricates — but any compliance report that's supposed to include audit-derived evidence will silently render that section empty. |
| `crew.service.ts` | Real | Single-statement writes throughout | None found | — |
| `dashboard.service.ts` | Real | Single-statement | Not checked in depth | — |
| `email-provider.service.ts` | Real (SMTP, console) + **honestly-failing stubs** (SendGrid, SES) | N/A | N/A | Fixed today under REV-027b — previously fabricated `"sent"` for unimplemented providers; now returns honest `status: "failed"`. Not a new finding, confirming it's still correct. |
| `email.service.ts` | Dead duplicate | N/A | N/A | Zero live importers confirmed; only referenced by the orphaned `notification-batch.service.ts`. Tracked under REV-031. |
| `etl-scheduler.service.ts` | Real | N/A (cron wrapper) | N/A | Thin wrapper around `clickhouse-etl.service.ts` using `node-cron`; gated by `CLICKHOUSE_ETL_ENABLED`. |
| `feast-feature.service.ts` | Real (confirmed live DB/API calls) | Single-statement | Not checked in depth | — |
| `file-storage.service.ts` | Real | N/A (filesystem, not DB) | N/A | Local disk only (`fs` module) — already tracked separately (REV-046) as writing to local disk while MinIO sits provisioned and unused. Not a new finding. |
| `forecast.service.ts` | **Live, registered, and silently 100% mock in every real environment** — see below | N/A | N/A | **Most significant finding in this pass.** `callMLForecastService()` makes a real `axios.post` to `ML_SERVICE_URL` (documented in `backend/.env.example` as `http://localhost:8001`) — but no such ML microservice exists anywhere in this repository (checked: no Python service, no `ml-service/` directory, nothing in `docker-compose.yml`). The call will fail in every environment, every time, and `generateForecast` silently falls back to `generateMockForecast()` — sine-wave solar curves, Weibull-distributed wind speeds, a fabricated `model_accuracy_score: 0.85`, tagged internally `algorithm: "MOCK"`. That tag is buried in the JSON body with no `X-Mock-Data` header and no `NODE_ENV=production` guard (unlike `ml-inference.mock.ts`/`model-governance.mock.ts`, which do have both). This is functionally identical in severity to the deleted `cost-analytics.service.ts` (`Math.random()` fabricated data), except this one is registered, live, and — per the frontend — feeds a real `ml/forecasts` page and likely the `wind-dashboard` page. Recommend: apply the same mock-policy treatment (REV-027a's pattern) here — rename, guard, header — as its own follow-up task, since it wasn't part of REV-025's original 14-route list and deserves its own decision rather than a silent fix buried in this findings doc. |
| `genai.service.ts` | Real (Gemini API calls, real DB via `queue.service.ts`) | Single-statement | Not checked in depth | — |
| `kafka.service.ts` | Real | N/A (producer/consumer setup) | N/A | — |
| `kpi-calculation.service.ts` | Real (ClickHouse-backed) + **one proxy metric** + **fragile query pattern** | N/A | N/A | (1) `firstTimeFixRate` (line 230) is set equal to `completionRate` with `// TODO: Implement proper tracking` — a named KPI that isn't actually the metric it claims to be, just an honest proxy with a code comment, not surfaced to the API consumer as an approximation. (2) Every ClickHouse query in this file builds its `WHERE` clause via raw string interpolation (`` `tenant_id = '${tenantId}'` ``, `siteId`, date ranges) rather than parameterized queries. **Checked the one caller found** (`routes/analytics.ts`): `site_id` is `z.string().uuid()`-validated and `tenantId` comes from the JWT, so this isn't exploitable via that route today — but the pattern itself is fragile. A future filter added without equally careful Zod validation would reopen a real SQL-injection surface. Recommend parameterizing rather than trusting every future caller to validate as carefully. |
| `login-throttle.service.ts` | Real (Redis-backed) | N/A | Not checked in depth | — |
| `notification-batch.service.ts` | Dead duplicate (script-only, not `server.ts`) | — | — | Imports `email.service.ts` (also dead). Tracked under REV-031. |
| `notification-batching.service.ts` | Real, live (used by `server.ts`) | Single-statement per operation | **N+1 confirmed, see `notification.service.ts` below** — this file dynamically imports the provider services per digest send but doesn't itself loop over multiple DB writes in one function | — |
| `notification.service.ts` | Real | **Missing transaction — assessed as not actually a bug** | **N+1 confirmed** | `sendNotification()` (line 164): loops `for (const channel of channels) { await checkRateLimit(...) }` — sequential awaited DB round-trips per channel, then a second loop `for (const channel of allowedChannels) { await queueNotification(...); await incrementRateLimit(...) }`. Channel counts are always small (1-3: email/sms/push), so impact is minor, but it's a real sequential-query pattern where a single batched check/increment would do. On the transaction question: this loop deliberately has no transaction wrapping it — but each channel's queuing is logically independent (partial success, e.g. email queued but SMS not yet, is the *correct* behavior here, not a bug), so the sweeping "no transactions anywhere" finding does NOT apply as a real defect in this specific function. |
| `permit.service.ts` | Real | Single-statement writes | None found | — |
| `push-notification.service.ts` | Real (getUserDeviceTokens, console) + **honestly-failing stub** (FCM) | N/A | N/A | Fixed today under REV-027b, same pattern as email/SMS. Confirmed correct. |
| `push.service.ts` | Dead duplicate | N/A | N/A | **Zero importers found anywhere**, not even from the orphaned script path. Tracked under REV-031. |
| `queue.service.ts` | Real | N/A | N/A | Real BullMQ worker + real Gemini embedding calls for GenAI document ingestion. |
| `refresh-token.service.ts` | Real | Single-statement | None found | — |
| `report-builder.service.ts` | Real, live (`routes/reports.ts`) | Not checked in depth | Not checked in depth | Duplicate pair with `report.service.ts`, tracked under REV-031 — both imported by the same route file, unclear which is authoritative without a deeper read than this pass had time for. |
| `report.service.ts` | Real, live (`routes/reports.ts`) | Not checked in depth | Not checked in depth | See above. |
| `site.service.ts` | Real | Single-statement writes | None found | — |
| `slack-provider.service.ts` | Real, live (`routes/integrations.ts`) | N/A | N/A | Already confirmed real during REV-025 (real OAuth exchange, real `fetch()` to slack.com). Installation state is in-memory (`Map`) — a known, separately-flagged persistence gap, not new. |
| `sms-provider.service.ts` | Real (console) + **honestly-failing stubs** (Twilio, SNS) | N/A | N/A | Fixed today under REV-027b. Confirmed correct — also dropped a fabricated per-message `cost` field that used to ship alongside the fake "sent" status. |
| `sms.service.ts` | Dead duplicate | N/A | N/A | **Zero importers found anywhere.** Tracked under REV-031. |
| `token.service.ts` | Real | N/A | N/A | Orchestrates `refresh-token.service.ts`; no direct DB access itself. |
| `user.service.ts` | Real, **with a known scaling gap** | Single-statement | **Confirmed still present** | Line 119 still filters in memory with the cited `// so we'll do filtering in memory for now / In production, build dynamic where clauses` comment. Impact scales with total user count per tenant — for a CMMS with hundreds of users per tenant this is a minor inefficiency today; if any tenant reaches thousands of users it becomes a real latency/memory concern. Not urgent, but the comment itself flags it as known technical debt rather than an oversight. |
| `webhook.service.ts` | Real, live — **completely rewritten today** (REV-025b) | **Deliberately in-memory retry, not a bug** | None found | Previously queried columns that didn't exist in the schema at all, silently swallowed by both its callers. Now real, verified end-to-end (real signed HTTP delivery to an external URL, confirmed via the running stack). Retry scheduling is `setTimeout`-based, not persisted — a considered decision documented in the file itself: `webhook_delivery_status` has no "retrying" value and there's no `next_retry_at` column, and each attempt gets its own permanent delivery row regardless of retry outcome. Do not re-flag this as a bug in a future pass. |
| `weather-api.service.ts` | Real, live (`routes/weather.ts`, registered today under REV-025) | Single-statement | None found | Real Drizzle persistence, real external API call (OpenWeatherMap) with an optional API key; confirmed to honestly 401 when the key isn't configured in this dev environment rather than fabricating weather data. |
| `wind-power-curve.service.ts` | N/A — pure validation utility | N/A | N/A | Zod schema validator only, no DB or external calls; "real vs mock" doesn't apply. |
| `work-order-state.ts` | Real | N/A | N/A | State machine logic only. |
| `work-order.service.ts` | Real | Single-statement writes throughout (create/update/delete/tasks/parts/labor are each one statement — the missing-transaction finding does not bite here) | None found | `generateWorkOrderId()` (line 87) uses `Math.random()` for a 4-character ID suffix — this is legitimate (a readable ID, not fabricated business data) but has no collision check or retry, and `workOrderId` (the human-readable string column) has **no unique constraint** in `db/schema.ts`. Low-probability but real: two work orders created the same day could get the same `WO-YYYYMMDD-XXXX` id with nothing to stop it. Real safety gate confirmed working: critical/emergency work orders correctly require an active permit before transitioning to `in_progress`. |

### Summary

- **34 of 42 files are real** (query the actual database or call a real
  external service).
- **5 are dead duplicates** (`email.service.ts`, `sms.service.ts`,
  `push.service.ts`, `notification-batch.service.ts`, and effectively
  `report.service.ts`/`report-builder.service.ts` pending REV-031's
  consolidation call) — none actively mislead anyone since nothing live
  calls them, but they're maintenance debt and source-of-truth confusion
  risk.
- **2 are intentional, honestly-labeled mocks** (`ml-inference.mock.ts`,
  `model-governance.mock.ts`) — correct by design.
- **1 is a pure utility with no DB/mock dimension**
  (`wind-power-curve.service.ts`).
- **3 were fixed today** as part of this same review pass
  (`email-provider`, `sms-provider`, `push-notification` — REV-027b) and
  are now honest rather than fabricating success.

**Ranked findings, most severe first:**

1. 🔴 **`forecast.service.ts`** — a live, registered feature that has
   never once returned real data in any environment, with no disclosure
   at the API layer. Same class of bug as the deleted `cost-analytics`,
   but this one is still live. Recommend a new task applying the
   REV-027a mock-policy pattern here.
2. 🟠 **`clickhouse-etl.service.ts`** — permanently reports zero
   parts/tasks/cost for every work order in analytics, despite real
   underlying data existing.
3. 🟡 **`kpi-calculation.service.ts`** — raw string-interpolated SQL
   into ClickHouse queries. Not exploitable via its one confirmed
   caller today, but a fragile pattern.
4. 🟡 **`asset.service.ts`** — `createWindMetadata`/`updateWindMetadata`
   are silent no-ops against a table that actually exists. No live
   callers today, so no active harm, but it's a trap for whoever wires
   up wind turbine metadata next.
5. 🟢 **`notification.service.ts`** — minor N+1 pattern in the
   per-channel send loop; low impact given small channel counts.
6. 🟢 **`work-order.service.ts`** — no uniqueness enforcement on
   human-readable work order IDs.

No critical (immediately exploitable, data-destroying) findings in this
pass — REV-020's tenant-isolation work already covers the highest-risk
class of bug (cross-tenant data access) at the route layer, and this
service-layer pass didn't surface a new instance of it.
