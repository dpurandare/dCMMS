# Remediation Plan: Gap Closure Strategy

**Date:** December 11, 2025
**Version:** 1.0
**Status:** Draft

## 1. Strategy

The immediate goal is to **bridge the gap between the Analytics-heavy current implementation and the "Field Ready MVP" operational requirements**. This requires pausing new Analytics/ML features and focusing exclusively on Data Model and API implementation for Core CMMS domains.

## 2. Prioritized Task List (Workflow-Focused)

### 🚨 Phase 0: Emergency Workflow Fixes (Immediate)
**Goal:** Unblock the "Technician" and "Buyer" personas.

#### 0.1 Mobile Offline Foundation (Technician Blocker)
- [ ] **Architecture**: Implement `workbox` for PWA capabilities in Next.js.
- [ ] **Local DB**: Add `dexie.js` (IndexedDB wrapper) to Frontend.
- [ ] **Sync Engine**: Create basic "Offline Queue" -> "Sync on Connect" logic.
- [ ] **Auth**: Implement "Long-lived Token" or "Offline PIN" strategy.

#### 0.2 Safety Gates (Compliance Risk)
- [ ] **Schema**: Implement `Permit` table (LOTO).
- [ ] **Guard**: Add `PermitGuard` to critical WO transitions (e.g., cannot start 'High Voltage' task without active permit).

### Phase 1: Operational Tables (Weeks 2-3)
**Goal:** Enable basic material handling.

#### 1.1 Vendor & Inventory Loop
- [ ] **Schema**: Create `vendor` table (minimal: id, name).
- [ ] **Schema**: Create `purchase_order` table (id, vendor_id, status: DRAFT/SENT/RECEIVED).
- [ ] **UI**: Simple "Request Part" button on Work Order.

### Phase 2: Refactoring Core (Weeks 4-5)
**Goal:** Pay down technical debt.

#### 2.1 State & Auth Hardening
- [ ] **Auth**: Move from Basic Role to RBAC (Permissions).
- [ ] **State**: Replace Mock Approval Service with real DB-backed workflow.

### ⏸️ Paused Tracks (Do Not Touch)
- [ ] **Advanced AI/ML**: Feature store is good enough. Pause.
- [ ] **Cost Analytics**: Budget logic is complete. Pause.
- [ ] **Notifications**: Channel logic is complete. Pause.

## 3. Implementation Guidelines for Developers

1.  **Strict Adherence to Metadata**: When creating `inventory_items` (for example), strictly follow `metadata/inventoryitem.schema.json`. Do not guess fields.
2.  **Use Drizzle ORM**: Define all new tables in `backend/src/db/schema.ts` and export them.
3.  **Route Pattern**: Clone existing `routes/assets.ts` pattern: Zod validation -> Service call -> Drizzle query -> Response.
4.  **Enforce RBAC**: Ensure new routes check `req.user.role` as established in the Auth routes refactoring.

## 4. Next Steps
1.  Approve this remediation plan.
2.  Create tickets for Phase 1 (Inventory & Crews).
3.  Begin implementation of `inventory_items` schema.
