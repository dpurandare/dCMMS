# RBAC Permissions Developer Guide

**Version:** 1.0
**Date:** 2026-02-23
**Audience:** Developers adding features, pages, or API endpoints

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Authoritative Permission Catalog](#2-the-authoritative-permission-catalog)
3. [Role Definitions](#3-role-definitions)
4. [How to Add a New Permission](#4-how-to-add-a-new-permission)
5. [How to Add a New Role](#5-how-to-add-a-new-role)
6. [How to Guard a Backend Route](#6-how-to-guard-a-backend-route)
7. [How to Guard Frontend UI](#7-how-to-guard-frontend-ui)
8. [Common Mistakes](#8-common-mistakes)

---

## 1. Overview

dCMMS uses Role-Based Access Control (RBAC). A **role** is assigned to each user (e.g. `tenant_admin`, `technician`). Each role is granted a set of **permissions** (e.g. `read:work-orders`, `create:assets`). The system checks permissions at two points:

- **Backend:** Every API route's `preHandler` verifies the token's role has the required permission before the handler runs.
- **Frontend:** Sidebar nav items, page guards, and action buttons check the logged-in user's role before rendering.

The frontend uses a single, unified permission system (colon-notation `action:resource`) that matches the backend exactly. All permission checks go through `frontend/src/hooks/use-permissions.ts` and `frontend/src/lib/permissions.ts`.

---

## 2. The Authoritative Permission Catalog

The **backend** is the single source of truth. All valid permission strings are defined in:

```
backend/src/constants/permissions.ts  ← source of truth
frontend/src/types/api.ts              ← must match backend (TypeScript type)
```

### Full Permission List

#### Work Orders
| Permission | Description |
|------------|-------------|
| `create:work-orders` | Create new work orders |
| `read:work-orders` | View work orders |
| `update:work-orders` | Edit work orders |
| `delete:work-orders` | Delete work orders |
| `approve:work-orders` | Approve work orders |
| `assign:work-orders` | Assign work orders to users |
| `close:work-orders` | Close completed work orders |

#### Assets
| Permission | Description |
|------------|-------------|
| `create:assets` | Create new assets |
| `read:assets` | View assets |
| `update:assets` | Edit assets |
| `delete:assets` | Delete assets |
| `manage:assets` | Full asset management (admin-level) |

#### Parts & Inventory
| Permission | Description |
|------------|-------------|
| `create:parts` | Add new parts |
| `read:parts` | View parts/inventory |
| `update:parts` | Edit parts |
| `delete:parts` | Delete parts |
| `consume:parts` | Mark parts as consumed on a work order |

#### Sites
| Permission | Description |
|------------|-------------|
| `create:sites` | Create new sites |
| `read:sites` | View sites |
| `update:sites` | Edit sites |
| `delete:sites` | Delete sites |

#### Users & Access
| Permission | Description |
|------------|-------------|
| `create:users` | Create new users |
| `read:users` | View users |
| `update:users` | Edit users |
| `delete:users` | Delete users |
| `manage:roles` | Assign/change user roles |

#### Alerts & Notifications
| Permission | Description |
|------------|-------------|
| `create:alerts` | Create alerts |
| `read:alerts` | View alerts |
| `acknowledge:alerts` | Acknowledge alerts |
| `resolve:alerts` | Resolve alerts |
| `update:alerts` | Update alert state |
| `manage:notifications` | Manage notification settings |
| `read:notifications` | View notifications |
| `update:notifications` | Update notifications |

#### Reports & Analytics
| Permission | Description |
|------------|-------------|
| `read:reports` | View reports |
| `create:reports` | Create/generate reports |
| `read:analytics` | View analytics dashboards |
| `read:dashboards` | View dashboards |
| `read:telemetry` | View telemetry/sensor data |

#### Compliance & Permits
| Permission | Description |
|------------|-------------|
| `read:compliance` | View compliance reports |
| `create:compliance` | Create compliance reports |
| `approve:compliance` | Approve compliance submissions |
| `submit:compliance` | Submit compliance reports |
| `create:permits` | Create work permits |
| `read:permits` | View permits |
| `approve:permits` | Approve permits |
| `close:permits` | Close permits |
| `update:permits` | Edit permits |
| `delete:permits` | Delete permits |

#### ML / Forecasting / AI
| Permission | Description |
|------------|-------------|
| `read:ml-features` | Access ML model registry and feature store |
| `read:forecasts` | View generation forecasts |
| `use:genai` | Use the AI assistant |

#### System Administration
| Permission | Description |
|------------|-------------|
| `manage:system` | System-level configuration (super_admin only) |
| `manage:tenants` | Manage tenant accounts (super_admin only) |
| `manage:integrations` | Manage external integrations |
| `manage:webhooks` | Manage webhook configurations |
| `read:audit-logs` | View audit trail |

---

## 4. Role Definitions

These are the active roles in the system (set in the user's JWT at login):

| Role | Description | Key Restrictions |
|------|-------------|-----------------|
| `super_admin` | Full platform access | Can manage tenants and system config |
| `tenant_admin` | Full access within their tenant | No system/tenant management |
| `site_manager` | Operational management | No user deletion, no system admin |
| `technician` | Execute assigned work | Read-only assets; can consume parts |
| `operator` | Monitor and respond to alerts | No write access to work orders |
| `viewer` | Read-only access | View only, no mutations |

> **Note:** The specs (`specs/03_AUTH_AUTHORIZATION.md`, `specs/09_ROLE_FEATURE_ACCESS_MATRIX.md`) describe 17 granular industry roles (Plant Manager, Field Technician - Electrical, SCADA Operator, etc.). The current implementation consolidates these into 6 roles. Future work may expand this.

---

## 4. How to Add a New Permission

Follow all steps. Skipping any step causes silent failures (missing nav items, "Access Denied" pages, or 403 errors).

### Step 1 — Add to the backend Permission type

**File:** `backend/src/constants/permissions.ts`

```typescript
export type Permission =
  // ... existing permissions ...
  | "your-new:permission";   // ← add here
```

### Step 2 — Assign it to roles in the backend

In the same file, add the permission to each role that should have it:

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  tenant_admin: [
    // ... existing permissions ...
    "your-new:permission",   // ← add here
  ],
  // repeat for other roles as needed
};
```

### Step 3 — Add to the frontend Permission type

**File:** `frontend/src/types/api.ts`

```typescript
export type Permission =
  // ... existing permissions ...
  | "your-new:permission";   // ← must exactly match backend
```

TypeScript will show an error in step 4 if this is missing.

### Step 4 — Add to the frontend role maps

**File:** `frontend/src/lib/permissions.ts`

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  tenant_admin: [
    // ... existing permissions ...
    "your-new:permission",   // ← add here
  ],
};
```

### Step 5 — Guard the backend route

See [Section 6](#6-how-to-guard-a-backend-route).

### Step 6 — Guard the frontend UI

See [Section 7](#7-how-to-guard-frontend-ui).

---

## 5. How to Add a New Role

### Step 1 — Add to the UserRole type

**File:** `backend/src/constants/permissions.ts`

```typescript
export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "your-new-role";   // ← add here
```

### Step 2 — Define its permissions

In the same file, add an entry to `ROLE_PERMISSIONS`:

```typescript
your_new_role: [
  "read:work-orders",
  "read:assets",
  // only the permissions this role needs
],
```

### Step 3 — Mirror in the frontend permission files

Add the same role + permissions to:
- `frontend/src/types/api.ts` (the `UserRole` type)
- `frontend/src/lib/permissions.ts` (`ROLE_PERMISSIONS`)

### Step 4 — Add to the DB enum (if storing in DB)

**File:** `backend/src/db/schema.ts`

```typescript
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "tenant_admin",
  "your_new_role",   // ← add here (use underscores for DB enum)
]);
```

Then run a DB migration.

---

## 6. How to Guard a Backend Route

Use the `authorize()` middleware in the route's `preHandler` array:

```typescript
// Require user to have ALL listed permissions
server.get("/some-resource", {
  preHandler: [
    authenticate,
    authorize({ permissions: ["read:some-resource"] }),
  ],
}, handler);

// Require user to have ANY of the listed permissions
server.post("/some-action", {
  preHandler: [
    authenticate,
    authorize({ anyPermissions: ["update:work-orders", "close:work-orders"] }),
  ],
}, handler);

// Admin only (super_admin or tenant_admin)
server.delete("/admin-only", {
  preHandler: [
    authenticate,
    authorize({ adminOnly: true }),
  ],
}, handler);
```

The `authorize` middleware is at `backend/src/middleware/authorize.ts`. It reads the role from the JWT (`request.user.role`) and checks it against `backend/src/constants/permissions.ts`.

---

## 7. How to Guard Frontend UI

### Sidebar nav items

**File:** `frontend/src/components/layout/sidebar.tsx`

Add an entry to the relevant nav section with a `permissions` array:

```typescript
{
  label: 'My New Page',
  href: '/my-page',
  icon: SomeIcon,
  permissions: ['read:my-resource']   // colon notation
}
```

### Inline content (show/hide a section)

Use `ProtectedSection` from `components/auth/protected.tsx`:

```tsx
import { ProtectedSection } from '@/components/auth/protected';

<ProtectedSection permissions={["create:work-orders"]}>
  <Button>Create Work Order</Button>
</ProtectedSection>
```

### Action buttons

Use `ProtectedButton`:

```tsx
import { ProtectedButton } from '@/components/auth/protected';

<ProtectedButton
  permissions={["delete:assets"]}
  variant="destructive"
  onClick={handleDelete}
  disabledTooltip="You don't have permission to delete assets"
>
  Delete
</ProtectedButton>
```

### Full page guard

Use `ProtectedSection` wrapping the page content:

```tsx
<ProtectedSection permissions={["read:my-resource"]}>
  <MyPageContent />
</ProtectedSection>
```

### Programmatic permission check in component logic

Use the `usePermissions` hook from `hooks/use-permissions.ts`:

```tsx
import { usePermissions } from '@/hooks/use-permissions';

const { can, canAny, isAdmin } = usePermissions();

if (can('update:work-orders')) {
  // show edit button
}
```

---

## 8. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Added permission to backend but not `frontend/src/types/api.ts` | TypeScript error when adding to `lib/permissions.ts` | Add to `types/api.ts` first |
| Added permission to `types/api.ts` but not `lib/permissions.ts` | Role doesn't see the permission | Add to `lib/permissions.ts` for each role that needs it |
| Added permission to frontend files but not the backend | Frontend shows the page, but API returns 403 | Add to `backend/src/constants/permissions.ts` |
| Role missing from `lib/permissions.ts` entirely | That role sees no nav items and "Access Denied" on all guarded pages | Add the role with its permissions to `lib/permissions.ts` |
| Used dot-notation string in `ProtectedSection` | TypeScript error (it expects `Permission` type from `types/api`) | Switch to colon-notation (e.g. `read:analytics`) |
| Added route to sidebar but permission not in role | Nav item not visible | Add permission to role in `lib/permissions.ts` |

---

## Reference: File Map

```
backend/
  src/
    constants/
      permissions.ts        ← SOURCE OF TRUTH: all permission strings & role maps
    middleware/
      authorize.ts          ← Fastify preHandler factory for route guards

frontend/
  src/
    types/
      api.ts                ← Permission and UserRole types (must match backend)
    lib/
      permissions.ts        ← Frontend role maps (used by sidebar & ProtectedSection)
    hooks/
      use-permissions.ts    ← Hook: can(), canAny(), canAll(), isAdmin
    components/
      auth/
        protected.tsx       ← ProtectedSection, ProtectedButton, ProtectedLink

specs/
  03_AUTH_AUTHORIZATION.md          ← Business-level auth patterns & token flow
  09_ROLE_FEATURE_ACCESS_MATRIX.md  ← Feature access matrix for 17 industry roles
```
