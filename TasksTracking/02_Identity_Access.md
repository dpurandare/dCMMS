# 02. Identity & Access

**Focus:** Authentication, Authorization, RBAC, User Management
**Specs Covered:** 03 (Auth), 08 (Org Structure), 09 (RBAC)

## Authentication Infrastructure

- [x] **DCMMS-006** - Authentication Scaffolding
  - [x] JWT implementation
  - [x] IdP Adapter pattern (Auth0/Okta support hooks)
  - [x] Login/Logout API endpoints
- [x] **DCMMS-009** - Authentication UI
  - [x] Login page implementation
  - [x] Token handling in frontend
  - [x] Protected route wrappers

## Authorization & RBAC

- [x] **DCMMS-018** - RBAC Implementation (Assets)
  - [x] Role definitions (Admin, Supervisor, Tech, Viewer)
  - [x] Permission middleware (`requirePermission`)
  - [x] Asset-level access controls
- [ ] **DCMMS-XXX** - RBAC Implementation (Work Orders)
  - *Included in Work Order implementation tasks*

## Organizational Structure

- [x] **DCMMS-001C** - User & Role Models
  - [x] Database schema for Users, Roles, Permissions (via Spec 11)
