# 09. Machine Learning

**Focus:** Feature Store, Model Serving, PdM (Sprint 12-15)
**Specs Covered:** 22 (AI/ML)
**Status correction (REV-025, 2026-09-19):** five of this module's API routes were
self-certified `✅ Complete` while never registered in `server.ts`. Two (Inference,
Governance) were registered as **declared mocks** — real endpoints, honestly labeled
fake data (`X-Mock-Data: true`), backing two live frontend pages that previously 404'd.
The other three were deleted: nothing referenced them and their services were
hardcoded/mock stubs. See `TasksTracking/15_Review_Remediation.md` REV-025/REV-027a.

## Infrastructure (Sprint 12)

- [x] **DCMMS-095** - Feast Feature Store Setup
- [x] **DCMMS-096** - MLflow Model Registry Setup
- [x] **DCMMS-097** - Metaflow Setup
- [x] **DCMMS-098** - Feature Engineering Pipeline
- [x] **DCMMS-099** - Training Dataset Creation
- [x] **DCMMS-100** - Baseline Model Training

## Optimization & Training (Sprint 13)

- [x] **DCMMS-102** - Advanced Feature Engineering
- [x] **DCMMS-103** - Hyperparameter Tuning
- [x] **DCMMS-104** - Model Evaluation
- [x] **DCMMS-105** - Drift Detection
- [x] **DCMMS-106** - Retraining Pipeline
- [x] **DCMMS-107** - Validation Testing

## Serving & Explainability (Sprint 14)

- [x] **DCMMS-108** - KServe Setup
- [ ] ~~**DCMMS-109** - Deployment API~~ — **descoped 2026-09-19.** Route never registered;
      service was a hardcoded "Mock Provider" stub, nothing referenced it. Deleted.
- [x] **DCMMS-110** - Inference API — **corrected 2026-09-19: registered as a declared
      mock**, not a real inference service. `ml-inference.mock.ts` always returns
      hardcoded predictions; every response carries `X-Mock-Data: true` and the service
      refuses to load under `NODE_ENV=production`. Backs the live `ml/anomalies` frontend
      page, which previously 404'd. Real inference is unbuilt.
- [ ] ~~**DCMMS-111** - SHAP Explainability Integration~~ — **descoped 2026-09-19,** same
      reason as DCMMS-109.

## Predictive Maintenance (Sprint 15)

- [ ] ~~**DCMMS-116** - Predictive WO Service~~ — **descoped 2026-09-19.** Route never
      registered; service kept state in an in-memory `Map` and had three unimplemented
      TODOs where DB reads/writes should be — predictions were never saved. Its cron job
      was also never started anywhere. Deleted; see REV-028 for the broader stubbed-
      integration decision.
- [ ] ~~**DCMMS-117** - Human-in-Loop Workflow~~ — **descoped 2026-09-19.** `wo-approval.ts`
      route never registered; service never persisted approvals (TODOs at
      `wo-approval.service.ts:322,335,349,361`). Deleted; see REV-028.
- [ ] ~~**DCMMS-118** - Performance Tracking~~ — **descoped 2026-09-19,** same pattern as
      DCMMS-109/111: unregistered route, mock service, orphaned cron job. Deleted.
- [x] **DCMMS-119** - Governance Framework — **corrected 2026-09-19: registered as a
      declared mock**, not real governance. `model-governance.mock.ts` returns hardcoded
      IDs (`mock-model-id`, etc.) and persists nothing; every response carries
      `X-Mock-Data: true` and the service refuses to load under `NODE_ENV=production`.
      Backs the live `ml/models` frontend page, which previously 404'd.
- [x] **DCMMS-123** - E2E Testing

## Documentation (Sprint 17)

- [x] **DCMMS-136A** - Model Cards
- [x] **DCMMS-136B** - Pipeline Docs
