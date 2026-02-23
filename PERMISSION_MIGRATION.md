# Permission System Migration Plan
## System A (Legacy) → System B (Canonical)

**Created:** 2026-02-23
**Status:** Pending
**Branch:** Create `feat/permission-migration` from `main`

---

## Background

The frontend currently has two independent RBAC permission systems that must be kept in sync manually. This is fragile and has already caused real bugs (Analytics, Compliance, ML pages showing "Access Denied" for admin users).

| | System A — Legacy | System B — Canonical |
|---|---|---|
| Hook | `hooks/usePermissions.ts` | `hooks/use-permissions.ts` |
| Config | `config/permissions.ts` | `lib/permissions.ts` |
| Component | `components/auth/PermissionGuard.tsx` | `components/auth/protected.tsx` |
| Format | Dot notation: `analytics.view` | Colon notation: `read:analytics` |
| Matches backend? | ❌ No | ✅ Yes |
| TypeScript-typed? | Partial | ✅ Fully typed via `types/api.ts` |

**Goal:** Migrate all 8 pages and 1 test file from System A to System B, then delete the three System A source files entirely.

---

## Permission Mapping Reference

Use this table for all replacements during migration.

| System A (dot notation) | System B (colon notation) | Notes |
|------------------------|--------------------------|-------|
| `dashboard.view` | `read:dashboards` | |
| `work-orders.view` | `read:work-orders` | |
| `work-orders.create` | `create:work-orders` | |
| `work-orders.edit` | `update:work-orders` | |
| `work-orders.delete` | `delete:work-orders` | |
| `work-orders.assign` | `assign:work-orders` | |
| `work-orders.complete` | `close:work-orders` | |
| `assets.view` | `read:assets` | |
| `assets.create` | `create:assets` | |
| `assets.edit` | `update:assets` | |
| `assets.delete` | `delete:assets` | |
| `alerts.view` | `read:alerts` | |
| `alerts.acknowledge` | `acknowledge:alerts` | |
| `alerts.resolve` | `resolve:alerts` | |
| `alerts.manage` | `update:alerts` | |
| `analytics.view` | `read:analytics` | |
| `analytics.advanced` | `read:analytics` | No separate advanced level in System B |
| `reports.view` | `read:reports` | |
| `reports.create` | `create:reports` | |
| `reports.export` | `read:reports` | No separate export permission in System B |
| `compliance.view` | `read:compliance` | |
| `compliance.create` | `create:compliance` | |
| `compliance.submit` | `submit:compliance` | |
| `compliance.manage` | `approve:compliance` | |
| `ml.models.view` | `read:ml-features` | |
| `ml.models.deploy` | `read:ml-features` | No separate deploy permission in System B |
| `ml.forecasts.view` | `read:forecasts` | |
| `ml.anomalies.view` | `read:alerts` | Anomalies are surfaced as alerts |
| `genai.use` | `use:genai` | |
| `genai.admin` | `use:genai` | No separate admin level in System B |
| `users.view` | `read:users` | |
| `users.create` | `create:users` | |
| `users.edit` | `update:users` | |
| `users.delete` | `delete:users` | |
| `users.manage-roles` | `manage:roles` | |
| `settings.view` | `read:dashboards` | Approximate — no settings permission in B |
| `settings.edit` | `manage:system` | |
| `settings.system` | `manage:system` | |
| `sites.view` | `read:sites` | |
| `sites.manage` | `update:sites` | |
| `audit-logs.view` | `read:audit-logs` | |

---

## Migration Tasks

### Phase 1 — Migrate Pages (8 files)

The pattern is the same for every page. Replace:

```tsx
// BEFORE (System A)
import { PermissionGuard } from '@/components/auth/PermissionGuard';
...
<PermissionGuard permission="feature.action" showAccessDenied>
  <PageContent />
</PermissionGuard>
```

```tsx
// AFTER (System B)
import { ProtectedSection } from '@/components/auth/protected';
...
<ProtectedSection permissions={["action:resource"]} fallback={<AccessDenied />}>
  <PageContent />
</ProtectedSection>
```

> If the page already has an "Access Denied" or error state component, reuse it as the `fallback`. Otherwise import the shared one from `@/components/common`.

---

- [ ] **TASK-1** Migrate `frontend/src/app/compliance-reports/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"compliance.view"` → `"read:compliance"`

- [ ] **TASK-2** Migrate `frontend/src/app/analytics/dashboard/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"analytics.view"` → `"read:analytics"`

- [ ] **TASK-3** Migrate `frontend/src/app/ml/models/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"ml.models.view"` → `"read:ml-features"`

- [ ] **TASK-4** Migrate `frontend/src/app/ml/anomalies/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"ml.anomalies.view"` → `"read:alerts"`

- [ ] **TASK-5** Migrate `frontend/src/app/ml/forecasts/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"ml.forecasts.view"` → `"read:forecasts"`

- [ ] **TASK-6** Migrate `frontend/src/app/users/[id]/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"users.view"` → `"read:users"`

- [ ] **TASK-7** Migrate `frontend/src/app/users/new/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"users.create"` → `"create:users"`

- [ ] **TASK-8** Migrate `frontend/src/app/users/[id]/edit/page.tsx`
  - Replace `PermissionGuard` import with `ProtectedSection`
  - Change permission: `"users.edit"` → `"update:users"`

---

### Phase 2 — Update Tests (1 file)

- [ ] **TASK-9** Update `frontend/src/__tests__/rbac/permissions.test.ts`
  - Replace all dot-notation permission strings with colon-notation equivalents (use mapping table above)
  - Update all imports: remove references to `config/permissions.ts` or `hooks/usePermissions.ts`; import from `lib/permissions.ts` and `hooks/use-permissions.ts` instead
  - Verify all test cases still pass after migration

---

### Phase 3 — Delete System A Files

> Only do this after all Tasks 1–9 are complete and tests pass.

- [ ] **TASK-10** Verify no remaining imports of System A
  - Run: `grep -r "PermissionGuard\|config/permissions\|hooks/usePermissions" frontend/src --include="*.tsx" --include="*.ts"`
  - Result must be zero matches (excluding the System A source files themselves)

- [ ] **TASK-11** Delete `frontend/src/components/auth/PermissionGuard.tsx`

- [ ] **TASK-12** Delete `frontend/src/hooks/usePermissions.ts`

- [ ] **TASK-13** Delete `frontend/src/config/permissions.ts`

- [ ] **TASK-14** Run full TypeScript check
  - Run: `cd frontend && npx tsc --noEmit`
  - Must produce zero new errors related to permissions

- [ ] **TASK-15** Run the test suite
  - Run: `cd frontend && npm test`
  - All tests must pass

---

### Phase 4 — Document Updates

- [ ] **TASK-16** Update `docs/guides/RBAC_PERMISSIONS_GUIDE.md`
  - Remove Section 2 ("Why Are There Two Permission Systems?") — the situation it describes no longer exists
  - Remove Step 5 from Section 5 ("Add to System A role maps") — no longer needed
  - Remove the "System A — do not use" example from Section 8
  - Remove System A files from the File Map in Section 9
  - Update the opening paragraph to reflect a single unified system

- [ ] **TASK-17** Update `docs/MANUAL_TESTING_GUIDE.md`
  - If any permission names are referenced, update them to colon notation

- [ ] **TASK-18** Update `specs/03_AUTH_AUTHORIZATION.md`
  - The spec references permission format — ensure examples use colon notation consistently

- [ ] **TASK-19** Update this file (`PERMISSION_MIGRATION.md`)
  - Mark status as **Completed**
  - Record the completion date

---

## Definition of Done

The migration is complete when:

1. ✅ Zero files import from `config/permissions.ts`, `hooks/usePermissions.ts`, or `PermissionGuard.tsx`
2. ✅ All three System A files are deleted from the repository
3. ✅ `npx tsc --noEmit` passes with no new errors
4. ✅ All tests in `__tests__/rbac/permissions.test.ts` pass
5. ✅ Manual smoke test: log in as `tenant_admin` and verify Analytics, Compliance, ML pages, and User pages load without "Access Denied"
6. ✅ `docs/guides/RBAC_PERMISSIONS_GUIDE.md` no longer mentions System A
7. ✅ This file is marked **Completed**

---

## What Does NOT Change

- The backend (`backend/src/constants/permissions.ts`) — no changes needed
- `frontend/src/lib/permissions.ts` — no changes needed
- `frontend/src/types/api.ts` — no changes needed
- `frontend/src/hooks/use-permissions.ts` — no changes needed
- `frontend/src/components/auth/protected.tsx` — no changes needed
- All pages already on System B (work orders, assets, sites, alerts, reports) — no changes needed
- The sidebar (`components/layout/sidebar.tsx`) — no changes needed
