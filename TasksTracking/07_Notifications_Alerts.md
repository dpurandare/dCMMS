# 07. Notifications & Alerts

**Focus:** Alert Rules, Multi-Channel Notifications (Sprint 8 & 9)
**Specs Covered:** 14 (Notifications)
**Partial status correction (2026-09-19, REV-025b):** three items below were
self-certified `✅ Complete` and demonstrably weren't; corrected in place with
evidence. The rest of this file (DCMMS-064/065/066/068/072–075/078) has **not**
been re-verified — treat it as unconfirmed, same as every other TasksTracking
module before its own review pass, not as trustworthy by omission.

## Notification Core (Sprint 8)

- [x] **DCMMS-063** - Notification Service Setup
  - [x] Service scaffolding
- [x] **DCMMS-064** - Email Notifications
  - [x] Email provider integration
- [x] **DCMMS-065** - SMS Notifications
  - [x] SMS provider integration
- [x] **DCMMS-066** - Push Notifications
  - [x] FCM integration
- [x] **DCMMS-067** - Notification Preferences API
- [x] **DCMMS-068** - Alarm to Notification Integration
  - [x] Trigger logic
- [x] **DCMMS-069** - Notification Preferences UI
- [x] **DCMMS-070** - Notification System Testing

## Advanced Channels (Sprint 9)

- [x] **DCMMS-071** - Webhook Notifications — **was false, now true (2026-09-19,
      REV-025b).** `routes/webhooks.ts` and `services/webhook.service.ts` queried
      columns (`custom_headers`, `event_types`, `secret_key`, `active`,
      `request_url`, `response_status`, `next_retry_at`, a `retrying` delivery
      status, `generate_webhook_secret()`) that never existed in `schema.ts` or
      the database. Every delivery attempt — including from the two live call
      sites in `alert-notification-handler.service.ts` and
      `notification.service.ts` — failed at its first query and was silently
      swallowed. Rewrote both files against the real schema; verified end-to-end
      against a running stack: created a webhook, delivered a real signed HTTP
      POST to an external URL, and confirmed the delivery persisted correctly
      in `webhook_deliveries`. See `TasksTracking/15_Review_Remediation.md`
      REV-025b for full evidence.
- [x] **DCMMS-072** - Slack Integration — unverified by this pass. Note: a real,
      working, registered Slack integration exists at `routes/integrations.ts` +
      `slack-provider.service.ts`; a separate dead, unauthenticated, mock
      duplicate (`routes/slack.ts`) was deleted under REV-025. Whether *this*
      task refers to the real one hasn't been checked.
- [x] **DCMMS-073** - Notification Batching
- [x] **DCMMS-074** - Notification History & Audit
- [x] **DCMMS-075** - Alarm Acknowledgment API
- [ ] ~~**DCMMS-076** - Alarms Dashboard UI~~ — **false, corrected 2026-09-19
      (REV-025).** No alarms dashboard exists anywhere in `frontend/src` — the
      only "alarm" hits are an unrelated `recentAlarms` counter in the analytics
      page. `specs/ALARMS_DASHBOARD_SPEC.md` describes a real-time
      sensor-threshold-driven dashboard that was never built, backend or
      frontend; see `TasksTracking/15_Review_Remediation.md` REV-063.
- [ ] ~~**DCMMS-077** - Webhook Configuration UI~~ — **false, corrected
      2026-09-19.** No webhook UI exists anywhere in `frontend/src` — only a
      type definition and a permission-string reference, no page or component.
      The backend is now real (DCMMS-071 above); this task remains undone.
- [x] **DCMMS-078** - Mobile Push Notification Handling UI
