# Holistic Gap Analysis

## methodology
This verification process checks alignment across three axes:
1.  **Vision Alignment (PRD vs Specs)**: Do the specifications accurately reflect the Product Requirements? Are they over-engineered or missing scope?
2.  **Architectural Integrity (Specs vs Architecture)**: Do the component specifications align with the overall system design (Microservices, Event-Driven, Offline-First)?
3.  **Implementation Reality (Specs/PRD vs Code)**: Does the actual code deliver the specified value? (Beyond just data models—checking logic, patterns, and workflows).

---

## 1. Baseline: Product Vision & Architecture

**Source of Truth:** `PRD_FINAL.md`, `bootstrap.md`

### Key Tenants
*   **Offline-First**: Mobile app must work without connection.
*   **Scalable**: High-volume telemetry support.
*   **Audit-Ready**: Compliance and safety are paramount.
*   **MVP Scope**: Focus on Core CMMS (Work Orders, Assets) first, then Analytics.

## 2. Areas of High Alignment (Success Stories)

Before looking at gaps, it is critical to acknowledge where the implementation successfully realizes the Product Vision.

### 🌟 1. Backend Service Maturity (Notifications & Cost)
*   **Alignment**: The `notification.service.ts` and `cost-calculation.service.ts` are fully implemented with the complex logic requested in Specs 14 and 23.
*   **Evidence**: Multi-channel support (SMS/Email/Push) is active. CAPEX/OPEX budget tracking logic is present. This puts the **Advanced Features** track ahead of schedule.

### 🌟 2. AI/ML Foundation
*   **Alignment**: The `ml/` directory structure with Feast, Metaflow, and MLflow fully mirrors the architecture in Spec 22.
*   **Evidence**: Feature store definitions and model training pipelines are scaffolded correctly, ready for the "Predictive WO" scope in Release 2.

### 🌟 3. Automated Testing Culture
*   **Alignment**: The extensive test suite (Unit, Integration, Performance) in `backend/tests/` perfectly aligns with the "TDD First" tenant in Spec 07.
*   **Evidence**: `global-setup.ts` and `performance/` tests show a maturity level rarely seen in MVP phases.

---

## 3. Workflow & Process Analysis

This section analyzes the **operational capability** of the system. Can the users actually perform their critical jobs?

### 🔄 Workflow 1: Field Operations (The Technician's Journey)
**Goal**: Tech goes to remote site -> Works Offline -> Syncs later.
*   **PRD Requirement**: "Enable field technicians to work offline" (P0).
*   **Capability Check**:
    *   [ ] **Offline Login**: ❌ Impossible (Auth requires server).
    *   [ ] **Queue Actions**: ❌ Missing (No local queue logic).
    *   [ ] **Conflict Resolution**: ❌ Missing (No mechanisms).
*   **Operational Verdict**: **COMPLETE BLOCKER**. The mobile workforce cannot function.

### 🚜 Workflow 2: Maintenance Planning (The Supervisor's Journey)
**Goal**: Planner schedules preventive maintenance -> Assigns Skill-matched Crew.
*   **PRD Requirement**: "Skills-based assignment" (Release 1).
*   **Capability Check**:
    *   [x] **Create Work Order**: ✅ Functional.
    *   [ ] **Skill Matching**: ❌ Missing (No logic to check user skills vs task).
    *   [ ] **Rules Engine**: ⚠️ Partial (State machine exists but mocked).
*   **Operational Verdict**: **MANUAL WORKAROUNDS REQUIRED**. Dispatch works, but intelligence is missing.

### 💳 Workflow 3: Procurement & Inventory (The Buyer's Journey)
**Goal**: Part Low -> Auto Reorder -> PO Created -> Received -> Stock Updated.
*   **PRD Requirement**: "Procurement/ERP hooks" (Release 0).
*   **Capability Check**:
    *   [x] **Check Stock**: ✅ Functional.
    *   [ ] **Generate PO**: ❌ Impossible (No PO system).
    *   [ ] **Receive Goods**: ❌ Impossible (No Receipting UI/Logic).
*   **Operational Verdict**: **BROKEN LOOP**. We can track usage, but cannot replenish stock digitally.

### 🛡️ Workflow 4: Safety & Compliance (The Officer's Journey)
**Goal**: Hazardous Job -> Permit Request -> Approval -> LOTO -> Execution.
*   **PRD Requirement**: "State enforcement with audit trail" (P0).
*   **Capability Check**:
    *   [ ] **Permit Gate**: ❌ Missing (Tech can start dangerous job without check).
    *   [ ] **Audit Trail**: ✅ Validated (Audit logs capture actions).
*   **Operational Verdict**: **HIGH SAFETY RISK**. Digital safety barriers are theoretical only.

## 4. Summary & Recommendation

**The "Good" (Ready for Production)**:
- **Backend Logic**: The "Brain" (Cost, Notifications, AI) is smart and ready.
- **Observability**: We can see what's happening (Logs/Metrics).

**The "Bad" (Needs Immediate Focus)**:
- **The "Hands" (Mobile)**: Techs are paralyzed.
- **The "Safety Net" (Permits/Auth)**: Dangerous actions are unblocked.

**Recommendation**:
Shift all engineering resources to **Workflows 1 (Mobile) and 4 (Safety)**. Pause all AI/Cost work.

---

## 3. Discrepancy Matrix

| Component   | PRD Requirement    | Spec Definition      | Current Code | Alignment Verdict |
| :---------- | :----------------- | :------------------- | :----------- | :---------------- |
| **Example** | "User must log in" | "OAuth 2.0 with MFA" | "Basic Auth" | 🔴 Critical Gap    |

