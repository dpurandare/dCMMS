# 10. Cost Management

**Focus:** Budgeting, Cost Analysis (Sprint 16)
**Specs Covered:** 23 (Cost Management)
**Status correction (REV-025, 2026-09-19):** this module was self-certified `✅ Complete`
while all three of its API routes were never registered in `server.ts`, and two of the
three backing services never touched a database — see `docs/review/feature-inventory.md`
and `TasksTracking/99_Descoped_Tasks.md`. Descoped rather than completed; see
`TasksTracking/15_Review_Remediation.md` REV-025 for evidence.

**Final decision (Deepak, 2026-11-17, REV-061): descoped; reopenable as backlog.** The ✅ marks below are the team's
original self-certification and are not evidence of anything. Cost *inputs* (part price, cost per unit, labor rate)
are still captured in the schema; see `specs/23_COST_MANAGEMENT.md` for the cheapest first slice if this is reopened.

## Implementation

- [x] **DCMMS-124** - Cost Tracking Models
  - [x] Cost Record schema
- [ ] ~~**DCMMS-125** - Budget Management API~~ — **descoped 2026-09-19.** Route existed but
      was never registered; service stored data in an in-memory `Map`, lost on every
      restart. Deleted rather than completed. `TasksTracking/99_Descoped_Tasks.md`.
- [ ] ~~**DCMMS-126** - Cost Calculation Service~~ — **descoped 2026-09-19,** same reason.
- [ ] ~~**DCMMS-127** - Cost Analytics API~~ — **descoped 2026-09-19.** Route existed but was
      never registered; the service fabricated every figure with `Math.random()`. Deleted.
