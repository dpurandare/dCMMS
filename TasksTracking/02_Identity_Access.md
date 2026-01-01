# 02. Identity & Access

**Focus:** Authentication, Authorization, RBAC, User Management

- [ ] **DCMMS-NEW** - Production admin user is seeded if no users exist; admin is shown a mandatory password change reminder on first login in production.
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

### 🔴 CRITICAL GAPS IDENTIFIED (Backend Review - Jan 2026)

- [x] **DCMMS-AUTH-001** - Enforce RBAC in All Routes ✅ COMPLETED
  - [x] Create `authorize` middleware decorator
  - [x] Add permission checks to all 18+ critical route files
  - [x] Define permission matrix (50+ permissions across 6 roles)
  - [x] Applied RBAC using global hooks for efficiency
  - **Status:** RBAC fully deployed across all backend routes
  - **Completed:** January 1, 2026
  - **Files:** permissions.ts, authorize.ts, + 18 route files

- [x] **DCMMS-AUTH-002** - Implement Refresh Token Mechanism ✅ COMPLETED
  - [x] Create refreshTokens database table (with migration)
  - [x] Implement token rotation logic (RefreshTokenService)
  - [x] Add /api/v1/auth/refresh endpoint with rotation
  - [x] Add refresh token theft detection (revokes all tokens on reuse)
  - [x] Implement SHA-256 token hashing for security
  - [x] Add IP address and user agent tracking
  - [x] Integrate with login and logout endpoints
  - **Status:** Database-backed refresh tokens with automatic rotation
  - **Security Features:** Token hashing, rotation, theft detection, 7-day expiry
  - **Completed:** January 1, 2026
  - **Files:** refresh-token.service.ts, token.service.ts, auth.ts routes, schema.ts

- [ ] **DCMMS-AUTH-003** - Implement Multi-Factor Authentication (MFA)
  - [ ] Add TOTP support (authenticator app)
  - [ ] Create MFA enrollment flow
  - [ ] Enforce MFA for admin/privileged roles
  - [ ] Add backup codes generation
  - **Issue:** MFA specified in security spec but not implemented
  - **Impact:** Required for production security
  - **Effort:** 1 week

## Organizational Structure

- [x] **DCMMS-001C** - User & Role Models
  - [x] Database schema for Users, Roles, Permissions (via Spec 11)
