# Plan for Tomorrow (Dec 12, 2025)

**Focus**: Mobile Offline Capability & Safety Gates

## 1. Mobile Offline Database (The "Brain" of the App)
*   **Task**: [DCMMS-011] Implement Drift (SQLite) Schema.
*   **Details**: Define tables for `WorkOrder`, `Asset`, `User`, and `SyncQueue`.
*   **Goal**: App can store data locally without crashing.

## 2. Sync Engine (The "Heart" of Offline Mode)
*   **Task**: Implement Basic Sync Logic.
*   **Details**: Create a `SyncRepository` that pushes `SyncQueue` items when internet is detected.
*   **Goal**: Changes made offline don't disappear.

## 3. Safety First (The "Shield")
*   **Task**: Backend Permit Schema.
*   **Details**: Create `permits` table in Postgres.
*   **Goal**: Prepare the backend to block dangerous work orders.

**Note**: We will continue using the **Native Flutter** approach as verified today.

## 4. Documentation & Hygiene (Pay Down Debt)
*   **Task**: [DCMMS-012A] Database Data Dictionary.
*   **Details**: Document all 20+ tables (purpose, keys, indexes).
*   **Goal**: Ensure the "Holistic Analysis" findings are permanently recorded.
*   **Task**: [DCMMS-012C] Local Setup Troubleshooting Guide.
*   **Details**: Document common setup issues (Docker ports, Node versions).
*   **Goal**: Smoother onboarding for future devs (or us in 2 weeks).
