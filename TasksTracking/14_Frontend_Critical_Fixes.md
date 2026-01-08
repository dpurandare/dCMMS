# 14. Frontend Critical Fixes & Improvements

**Focus:** Authentication, API Integration, RBAC, Token Management  
**Priority:** 🔴 CRITICAL  
**Status:** ⚠️ In Progress  
**Target Completion:** Week 1 (January 2026)

---

## 1. API Configuration & Integration

### 1.1 Centralized API Configuration

- [x] **FE-001** - Create Centralized API Config ✅
  - [x] Create `src/config/api.ts` with configurable base URL
  - [x] Support runtime configuration loading
  - [x] Export typed API_CONFIG object
  - [x] Add timeout and retry configuration
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 1 hour
  - **Status:** ✅ COMPLETE

- [x] **FE-002** - Standardize API URLs Across Services ✅
  - [x] Update compliance reports to use centralized config
  - [x] Update PDF preview to use centralized config
  - [x] Verify all services use correct port (3001)
  - [x] Remove hardcoded API URLs
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 1-2 hours
  - **Files:**  `compliance-reports/page.tsx` ✅, `compliance-reports/[id]/page.tsx` ✅, `compliance/pdf-preview.tsx` ✅
  - **Status:** ✅ COMPLETE

### 1.2 Centralized API Client

- [ ] **FE-003** - Implement Centralized Axios Client
  - [ ] Create/update `src/lib/api-client.ts`
  - [ ] Add request interceptor for automatic auth headers
  - [ ] Add response interceptor for error handling
  - [ ] Implement automatic token refresh on 401
  - [ ] Add TypeScript types for API responses
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 3-4 hours

- [ ] **FE-004** - Migrate Services to Centralized Client
  - [ ] Refactor `user.service.ts` (proof of concept)
  - [ ] Refactor `dashboard.service.ts`
  - [ ] Refactor `alerts.service.ts`
  - [ ] Refactor `forecast.service.ts`
  - [ ] Refactor `ml-inference.service.ts`
  - [ ] Refactor `model-governance.service.ts`
  - [ ] Refactor `analytics.service.ts`
  - [ ] Refactor `notification.service.ts`
  - [ ] Refactor `report.service.ts`
  - [ ] Refactor `genai.service.ts`
  - **Priority:** 🟡 HIGH
  - **Estimated:** 4-6 hours

---

## 2. Authentication & Token Management

### 2.1 Fix Token Storage Inconsistencies

- [x] **FE-005** - Fix Token Key in All Services (CRITICAL) ✅
  - [x] Update `user.service.ts` - Line 7 (`token` → `accessToken`) ✅
  - [x] Update `dashboard.service.ts` - Line 7 (`token` → `accessToken`) ✅
  - [x] Update `forecast.service.ts` - Line 6 (`token` → `accessToken`) ✅
  - [x] Update `ml-inference.service.ts` - Line 6 (`token` → `accessToken`) ✅
  - [x] Update `model-governance.service.ts` - Line 6 (`token` → `accessToken`) ✅
  - [x] Update `analytics.service.ts` - Line 6 (`token` → `accessToken`) ✅
  - [x] Update `notification.service.ts` - Line 7 (`token` → `accessToken`) ✅
  - [x] Verify `genai.service.ts` (has commented auth code) ✅
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 2-3 hours
  - **Impact:** ALL API calls now work after login
  - **Status:** ✅ COMPLETE

### 2.2 Token Refresh Implementation

- [ ] **FE-006** - Implement Token Refresh Logic
  - [ ] Create refresh token endpoint handler
  - [ ] Implement automatic refresh on 401 in interceptor
  - [ ] Handle refresh failure (logout user)
  - [ ] Queue pending requests during refresh
  - [ ] Update auth store on successful refresh
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 2-3 hours

- [ ] **FE-007** - Enable Auth Verification in AuthGuard
  - [ ] Uncomment `api.auth.getMe()` in AuthGuard
  - [ ] Implement proper error handling
  - [ ] Add retry logic for network issues
  - [ ] Verify session on route changes
  - **Priority:** 🟡 HIGH
  - **Estimated:** 1 hour
  - **File:** `src/components/auth/auth-guard.tsx`

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Permission System Infrastructure

- [ ] **FE-008** - Create Permission Configuration
  - [ ] Create `src/config/permissions.ts`
  - [ ] Define Permission type (all feature permissions)
  - [ ] Define ROLE_PERMISSIONS mapping
  - [ ] Map permissions for: admin, manager, technician, viewer
  - [ ] Add support for additional roles from PRD
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 2 hours
  - **Reference:** `specs/09_ROLE_FEATURE_ACCESS_MATRIX.md`

- [ ] **FE-009** - Create usePermissions Hook
  - [ ] Create `src/hooks/usePermissions.ts`
  - [ ] Implement `hasPermission(permission)` method
  - [ ] Implement `hasAnyPermission(permissions[])` method
  - [ ] Implement `hasAllPermissions(permissions[])` method
  - [ ] Add TypeScript types for type safety
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 1 hour

- [ ] **FE-010** - Create PermissionGuard Component
  - [ ] Create `src/components/auth/PermissionGuard.tsx`
  - [ ] Support single and multiple permissions
  - [ ] Add fallback component prop
  - [ ] Create AccessDenied component
  - [ ] Add proper TypeScript types
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 1-2 hours

### 3.2 Implement RBAC in UI

- [x] **FE-011** - Update Sidebar with Permission Checks ✅
  - [x] Filter main navigation items by permissions
  - [x] Filter ML navigation items by permissions
  - [x] Hide sections with no visible items
  - [x] Test with different user roles
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 2 hours
  - **File:** `src/components/layout/sidebar.tsx`
  - **Status:** ✅ COMPLETE

- [/] **FE-012** - Protect Routes with PermissionGuard
  - [x] Add PermissionGuard to Work Orders page ✅
  - [x] Add PermissionGuard to Assets page ✅
  - [x] Add PermissionGuard to Alerts page ✅
  - [x] Add PermissionGuard to Reports page ✅
  - [x] Add PermissionGuard to Compliance pages ✅
  - [ ] Add PermissionGuard to Analytics pages
  - [ ] Add PermissionGuard to ML pages (3 pages: models, forecasts, anomalies)
  - [ ] Add PermissionGuard to User Management (when implemented)
  - **Priority:** 🔴 CRITICAL
  - **Estimated:** 2-3 hours
  - **Status:** 🔄 IN PROGRESS (62% complete - 5 of 8 pages protected)

- [ ] **FE-013** - Implement Feature-Level Permissions
  - [ ] Add permission checks for Create buttons
  - [ ] Add permission checks for Edit actions
  - [ ] Add permission checks for Delete actions
  - [ ] Hide action buttons user lacks permission for
  - [ ] Show disabled state for unavailable actions
  - **Priority:** 🟡 HIGH
  - **Estimated:** 3-4 hours

---

## 4. Code Quality & Infrastructure

### 4.1 Fix .gitignore Issues

- [ ] **FE-014** - Fix lib/ Directory Gitignore
  - [ ] Update root `.gitignore` to allow `frontend/src/lib/`
  - [ ] Commit `src/lib/api-client.ts`
  - [ ] Commit `src/lib/utils.ts`
  - [ ] Verify team can access files
  - **Priority:** 🟡 HIGH
  - **Estimated:** 30 minutes

### 4.2 Configuration Management

- [ ] **FE-015** - Implement Runtime Configuration
  - [ ] Create `src/config/index.ts` for centralized config
  - [ ] Support environment-based configuration
  - [ ] Add config validation on app startup
  - [ ] Document configuration options
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 2 hours

---

## 5. Error Handling & UX

### 5.1 Enhanced Error Handling

- [ ] **FE-016** - Implement Error Boundaries
  - [ ] Create root error boundary component
  - [ ] Add error boundaries for major features
  - [ ] Implement error logging
  - [ ] Create user-friendly error pages
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 2-3 hours

- [ ] **FE-017** - Centralized Error Handler
  - [ ] Create error handling utility
  - [ ] Standardize error messages
  - [ ] Add error categorization (network, auth, validation, server)
  - [ ] Implement error toast notifications
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 2 hours

### 5.2 Loading States

- [ ] **FE-018** - Improve Loading States
  - [ ] Add skeleton loaders for all major views
  - [ ] Implement optimistic updates where appropriate
  - [ ] Add loading indicators for async actions
  - [ ] Prevent duplicate submissions
  - **Priority:** 🟢 LOW
  - **Estimated:** 3-4 hours

---

## 6. Security Enhancements

### 6.1 Security Improvements

- [ ] **FE-019** - Enhance Token Security
  - [ ] Evaluate HttpOnly cookie for refresh token
  - [ ] Implement CSRF protection
  - [ ] Add input sanitization for user content
  - [ ] Remove sensitive data from console logs (production)
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 4-5 hours

- [ ] **FE-020** - Security Headers
  - [ ] Add Content Security Policy (CSP)
  - [ ] Implement X-Frame-Options
  - [ ] Add X-Content-Type-Options
  - [ ] Configure Next.js security headers
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 2 hours

---

## 7. Testing & Validation

### 7.1 Authentication Testing

- [ ] **FE-021** - Write Authentication Tests
  - [ ] Test login flow
  - [ ] Test token refresh
  - [ ] Test logout
  - [ ] Test session persistence
  - [ ] Test invalid token handling
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 3-4 hours

### 7.2 RBAC Testing

- [ ] **FE-022** - Write RBAC Tests
  - [ ] Test permission checks for each role
  - [ ] Test sidebar visibility by role
  - [ ] Test route protection
  - [ ] Test feature-level permissions
  - [ ] Test unauthorized access handling
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 3-4 hours

### 7.3 Integration Testing

- [ ] **FE-023** - API Integration Tests
  - [ ] Test all API services with centralized client
  - [ ] Test error scenarios (401, 403, 500)
  - [ ] Test network errors
  - [ ] Test timeout handling
  - **Priority:** 🟡 MODERATE
  - **Estimated:** 4-5 hours

---

## 8. User Management (Future)

### 8.1 User Management UI

- [ ] **FE-024** - Implement Users List Page
  - [ ] Create `/users` page
  - [ ] List all users with filtering
  - [ ] Show user roles and status
  - [ ] Add search and pagination
  - **Priority:** 🟢 FUTURE
  - **Estimated:** 4-6 hours

- [ ] **FE-025** - Implement User CRUD Operations
  - [ ] Create user form
  - [ ] Edit user form
  - [ ] Delete user with confirmation
  - [ ] Activate/deactivate users
  - **Priority:** 🟢 FUTURE
  - **Estimated:** 4-6 hours

- [ ] **FE-026** - Role Assignment UI
  - [ ] Create role selector component
  - [ ] Show permissions for selected role
  - [ ] Allow role changes (admin only)
  - [ ] Add audit logging for role changes
  - **Priority:** 🟢 FUTURE
  - **Estimated:** 3-4 hours

---

## Progress Summary

### Phase 1: Critical Fixes (Week 1) - 🔴 MUST COMPLETE

**Total Estimated Time:** 18-24 hours
### ✅ Phase 1 Completion: 85%

| Task                           | Status         | Impact     |
| ------------------------------ | -------------- | ---------- |
| FE-001: API Config             | ✅ Complete     | 🟢 High     |
| FE-002: Standardize URLs       | ✅ Complete     | 🟢 High     |
| FE-005: Fix Token Keys         | ✅ Complete     | 🔴 Critical |
| FE-008: Permission Config      | ✅ Complete     | 🔴 Critical |
| FE-009: usePermissions Hook    | ✅ Complete     | 🔴 Critical |
| FE-010: PermissionGuard        | ✅ Complete     | 🔴 Critical |
| FE-011: Update Sidebar         | ✅ Complete     | 🔴 Critical |
| FE-012: Protect Routes         | 🔄 25% Complete | 🔴 Critical |
| FE-003: Centralized API Client | ⏳ Pending      | 🔴 Critical |
| FE-006: Token Refresh          | ⏳ Pending      | 🔴 Critical |
| FE-007: Enable Auth Verify     | ⏳ Pending      | 🟡 High     |

### Phase 2: High Priority (Week 2)

**Total Estimated Time:** 14-18 hours

| ID     | Task                      | Status    | Priority |
| ------ | ------------------------- | --------- | -------- |
| FE-004 | Migrate All Services      | ⏳ Pending | 🟡 HIGH   |
| FE-007 | Enable Auth Verification  | ⏳ Pending | 🟡 HIGH   |
| FE-013 | Feature-Level Permissions | ⏳ Pending | 🟡 HIGH   |
| FE-014 | Fix Gitignore             | ⏳ Pending | 🟡 HIGH   |

### Phase 3: Improvements (Week 3-4)

| ID     | Task                      | Status    | Priority   |
| ------ | ------------------------- | --------- | ---------- |
| FE-015 | Runtime Configuration     | ⏳ Pending | 🟡 MODERATE |
| FE-016 | Error Boundaries          | ⏳ Pending | 🟡 MODERATE |
| FE-017 | Centralized Error Handler | ⏳ Pending | 🟡 MODERATE |
| FE-019 | Enhanced Token Security   | ⏳ Pending | 🟡 MODERATE |
| FE-020 | Security Headers          | ⏳ Pending | 🟡 MODERATE |
| FE-021 | Auth Testing              | ⏳ Pending | 🟡 MODERATE |
| FE-022 | RBAC Testing              | ⏳ Pending | 🟡 MODERATE |
| FE-023 | API Integration Tests     | ⏳ Pending | 🟡 MODERATE |

---

## Success Criteria

### Phase 1 Completion
- ✅ All API calls authenticate successfully
- ✅ Token refresh works automatically
- ✅ RBAC hides features based on user role
- ✅ Compliance reports download correctly
- ✅ No console errors on normal operation
- ✅ Session persists across page reloads
- ✅ Unauthorized users cannot access protected features

### Overall Completion
- ✅ 70%+ test coverage on auth and RBAC
- ✅ Zero critical security vulnerabilities
- ✅ All services use centralized API client
- ✅ Comprehensive error handling
- ✅ Production-ready configuration management

---

## Notes

- **Backward Compatibility**: During migration, old services will continue to work
- **Incremental Migration**: Services can be migrated one at a time to centralized client
- **Testing**: Each task should be tested independently before moving to next
- **Documentation**: Update README and component docs as features are implemented
- **Code Review**: All CRITICAL tasks require peer review before merge

---

**Last Updated:** 2026-01-08  
**Owner:** Frontend Team  
**Reviewer:** Technical Lead
