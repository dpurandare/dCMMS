# dCMMS Task Tracking System

This directory contains the master task list for the dCMMS project, broken down by functional area and development phase. This structure replaces the monolithic `IMPLEMENTATION_TASK_LIST.md` and `SPRINT_STATUS_TRACKER.md`.

**Version:** 3.0 (Reorganized)
**Date:** December 17, 2025
**Status:** Active Development

## Task Modules

| ID     | Module Name                                                | Focus Area                             | Status     |
| :----- | :--------------------------------------------------------- | :------------------------------------- | :--------- |
| **01** | [Foundation & Architecture](01_Foundation_Architecture.md) | Specs 01, 05, 07, 13, 17, 19           | ✅ Complete |
| **02** | [Identity & Access](02_Identity_Access.md)                 | Specs 03, 08, 09                       | ✅ Complete |
| **03** | [Asset Management](03_Asset_Management.md)                 | Spec 11 (Assets)                       | ✅ Complete |
| **04** | [Work Order Management](04_Work_Order_Management.md)       | Spec 02 (WO), Spec 23 (Basic)          | ✅ Complete |
| **05** | [Mobile & Offline](05_Mobile_Offline.md)                   | Spec 04 (Offline), Spec 21 (Mobile)    | ✅ Complete |
| **06** | [Telemetry Ingestion](06_Telemetry_Ingestion.md)           | Spec 10, Spec 18, Spec 21              | ✅ Complete |
| **07** | [Notifications & Alerts](07_Notifications_Alerts.md)       | Spec 14                                | ✅ Complete |
| **08** | [Analytics & Compliance](08_Analytics_Compliance.md)       | Spec 15, Spec 16                       | ✅ Complete |
| **09** | [Machine Learning](09_Machine_Learning.md)                 | Spec 22                                | ✅ Complete |
| **10** | [Cost Management](10_Cost_Management.md)                   | Spec 23 (Advanced)                     | ✅ Complete |
| **11** | [Advanced Forecasting](11_Advanced_Forecasting.md)         | Spec 25                                | ✅ Complete |
| **12** | [Gap Remediation](12_Gap_Remediation.md)                   | Safety Gates, Permits (Sprint 3 Fixes) | ✅ Complete |
| **13** | [GenAI Implementation](13_GenAI_Implementation.md)         | Spec 26 (RAG Pipeline)                 | ✅ Complete |
| **14** | [Frontend Critical Fixes](14_Frontend_Critical_Fixes.md)   | Auth, API Client, RBAC                 | ✅ Complete |
| **15** | [Review Remediation](15_Review_Remediation.md)             | Findings from the Sep 2026 project review | 🔴 Not Started |
| **99** | [Descoped Tasks](99_Descoped_Tasks.md)                     | Historical Archive                     | ⏹️ Archived |

## Status Legend
- ✅ **Complete**: Implemented and Verified — see the Definition of Done below.
- ⚠️ **In Progress**: Implementation underway or pending verification.
- 🔴 **Blocked**: External dependency or major issue.
- ⏹️ **Descoped**: Removed from current scope.
- ⚠️ **PARTIAL**: Some subtasks done, remainder split out. A valid, blameless status.

## How to Update
1.  Navigate to the relevant module file.
2.  Update the status of individual tasks ( `[ ]` to `[x]` ).
3.  Add new tasks to the appropriate section if requirements change.
4.  For module 15, run the task's `Verify:` command and paste the result into its `Evidence:` line **before** ticking it. No evidence, no tick.

---

## ⚠️ Status under review (September 2026)

A project-wide review ([`review-plan.md`](../review-plan.md)) found that the `✅ Complete` statuses in modules 01–14 are **not reliable**. Verified examples: modules 09 and 10 are marked Complete while their backend routes are never registered in `server.ts`; several "complete" services return mock or randomly-generated data; and the 16 SQL migrations in `backend/src/db/migrations/` are executed by nothing.

**Do not use modules 01–14 for planning until [`15_Review_Remediation.md`](15_Review_Remediation.md) task REV-009 (verified feature inventory) is complete.** Those status tables will be regenerated from evidence, not edited.

## Definition of Done

Applies to all work from September 2026 onward. A task is `✅ Complete` only when **every** box is ticked:

1. Merged to `main` via PR, approved by someone who did not write it.
2. CI green: lint, strict type-check, unit tests, integration tests.
3. Route registered in `server.ts` and reachable — proven by an integration test against the live endpoint.
4. No mock in the path, or the feature is labelled `Mock` and the mock refuses to load in production.
5. Tenant-scoped, with a test proving cross-tenant access is denied.
6. Authorised with a permission from `constants/permissions.ts`, with a test per role.
7. Migration (if any) applies cleanly to a database migrated from the previous release.
8. `openapi.yaml` regenerated; user-facing docs updated.
9. Manually exercised through the UI, with the steps recorded.

Anything short of all nine is `⚠️ PARTIAL`. **`PARTIAL` is acceptable and carries no blame; `✅ Complete` without evidence does not.** The absence of a way to say "not finished" is what produced the status drift this review found.
