# dCMMS Manual Testing Guide

**Version:** 1.0
**Date:** February 10, 2026
**Purpose:** Step-by-step manual testing procedures for QA and systematic verification

---

## Table of Contents

1. [Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
2. [Test Accounts](#2-test-accounts)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Sites Management](#4-sites-management)
5. [Assets Management](#5-assets-management)
6. [Work Orders](#6-work-orders)
7. [Alerts](#7-alerts)
8. [Users Management](#8-users-management)
9. [Audit Logs](#9-audit-logs)
10. [Reports](#10-reports)
11. [Compliance Reports](#11-compliance-reports)
12. [GenAI Features](#12-genai-features)
13. [Settings](#13-settings)
14. [Dashboard & Analytics](#14-dashboard--analytics)
15. [Cross-Browser Testing](#15-cross-browser-testing)
16. [Mobile Responsiveness](#16-mobile-responsiveness)

---

## 1. Prerequisites & Environment Setup

### 1.1 Environment URLs

| Environment | Frontend URL | Backend API URL |
|-------------|--------------|-----------------|
| Local Dev | http://localhost:3001 | http://localhost:3000/api/v1 |
| Staging | TBD | TBD |
| Production | TBD | TBD |

### 1.2 Starting Local Environment

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Start database (if using Docker)
docker-compose up postgres redis
```

### 1.3 Verify Services Running

- [ ] Backend health check: `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] Frontend loads: http://localhost:3001 shows login page
- [ ] Database connected: Backend logs show "Database connected"

---

## 2. Test Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Super Admin | admin@dcmms.io | (use seeded password) | Full access |
| Tenant Admin | tenantadmin@test.com | (create during testing) | Tenant-level admin |
| Site Manager | sitemanager@test.com | (create during testing) | Site-level management |
| Technician | tech@test.com | (create during testing) | Work order execution |
| Operator | operator@test.com | (create during testing) | Read-only + basic ops |
| Viewer | viewer@test.com | (create during testing) | Read-only |

---

## 3. Authentication & Authorization

### 3.1 Login Flow

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| AUTH-001 | Valid login | 1. Navigate to /auth/login<br>2. Enter valid email/password<br>3. Click "Sign In" | Redirected to /dashboard, user info visible in header | |
| AUTH-002 | Invalid password | 1. Navigate to /auth/login<br>2. Enter valid email, wrong password<br>3. Click "Sign In" | Error message "Invalid credentials", stays on login page | |
| AUTH-003 | Invalid email format | 1. Enter "notanemail" in email field<br>2. Try to submit | Validation error on email field | |
| AUTH-004 | Empty fields | 1. Click "Sign In" without entering credentials | Validation errors on both fields | |
| AUTH-005 | Session persistence | 1. Login successfully<br>2. Close browser tab<br>3. Open new tab, navigate to /dashboard | User remains logged in | |
| AUTH-006 | Logout | 1. Login successfully<br>2. Click user menu<br>3. Click "Logout" | Redirected to login page, cannot access protected routes | |
| AUTH-007 | Token refresh | 1. Login successfully<br>2. Wait 14+ minutes (access token expiry)<br>3. Perform an action | Action completes successfully (token auto-refreshed) | |
| AUTH-008 | Password change reminder | 1. Login as user with `requirePasswordChange=true` | Banner/modal prompting password change appears | |

### 3.2 Authorization (RBAC)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| RBAC-001 | Viewer cannot create | 1. Login as Viewer<br>2. Navigate to /work-orders<br>3. Look for "Create" button | "Create" button not visible or disabled | |
| RBAC-002 | Technician cannot delete WO | 1. Login as Technician<br>2. Navigate to a work order<br>3. Look for "Delete" button | "Delete" button not visible | |
| RBAC-003 | Admin can access audit logs | 1. Login as Tenant Admin<br>2. Navigate to /audit-logs | Audit logs page loads with data | |
| RBAC-004 | Non-admin cannot access audit logs | 1. Login as Technician<br>2. Navigate to /audit-logs | Access denied or menu item not visible | |
| RBAC-005 | Site-scoped access | 1. Login as Site Manager (assigned to Site A)<br>2. Try to view Site B assets | Only Site A assets visible | |

---

## 4. Sites Management

### 4.1 Site CRUD Operations

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| SITE-001 | List sites | 1. Login as Admin<br>2. Navigate to /sites | Sites list displayed with pagination | |
| SITE-002 | Create site | 1. Click "Add Site"<br>2. Fill required fields (name, type)<br>3. Click "Save" | Site created, appears in list, success toast | |
| SITE-003 | Create site - validation | 1. Click "Add Site"<br>2. Leave name empty<br>3. Click "Save" | Validation error on name field | |
| SITE-004 | View site details | 1. Click on a site row/name | Site detail page shows all info + asset count | |
| SITE-005 | Edit site | 1. Open site detail<br>2. Click "Edit"<br>3. Change name<br>4. Save | Changes saved, success toast | |
| SITE-006 | Delete site (no assets) | 1. Create a new site<br>2. Click "Delete"<br>3. Confirm | Site removed from list | |
| SITE-007 | Delete site (has assets) | 1. Try to delete site with assets | Error: "Cannot delete site with assets" | |
| SITE-008 | Search sites | 1. Type in search box<br>2. Press Enter | List filtered by search term | |
| SITE-009 | Sort sites | 1. Click column header (Name, Created) | List sorted by that column | |

---

## 5. Assets Management

### 5.1 Asset CRUD Operations

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| ASSET-001 | List assets | 1. Navigate to /assets | Assets list with pagination, filters | |
| ASSET-002 | Filter by site | 1. Select site from dropdown filter | Only assets for that site shown | |
| ASSET-003 | Filter by status | 1. Select "Down" from status filter | Only down assets shown | |
| ASSET-004 | Create asset | 1. Click "Add Asset"<br>2. Select site<br>3. Fill name, type<br>4. Save | Asset created with auto-generated tag | |
| ASSET-005 | Create child asset | 1. Create asset<br>2. Create another asset<br>3. Set parent to first asset | Hierarchy displayed correctly | |
| ASSET-006 | View asset details | 1. Click on asset | Detail page shows specs, history, children | |
| ASSET-007 | Edit asset | 1. Open asset<br>2. Edit fields<br>3. Save | Changes persisted | |
| ASSET-008 | Change asset status | 1. Open asset<br>2. Change status to "Maintenance"<br>3. Save | Status updated, reflected in list | |
| ASSET-009 | Delete asset (no children) | 1. Delete asset without children | Asset removed | |
| ASSET-010 | Delete asset (has children) | 1. Try to delete asset with children | Error: "Cannot delete asset with children" | |
| ASSET-011 | Add tag to asset | 1. Open asset<br>2. Add tag "critical"<br>3. Save | Tag visible on asset | |
| ASSET-012 | Search assets | 1. Search by asset name or tag | Matching assets shown | |

---

## 6. Work Orders

### 6.1 Work Order CRUD

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| WO-001 | List work orders | 1. Navigate to /work-orders | WO list with filters, pagination | |
| WO-002 | Filter by status | 1. Select "In Progress" filter | Only in-progress WOs shown | |
| WO-003 | Filter by priority | 1. Select "Critical" priority | Only critical WOs shown | |
| WO-004 | Create work order | 1. Click "Create Work Order"<br>2. Fill title, type, priority, site<br>3. Save | WO created with auto ID (WO-YYYYMMDD-XXXX) | |
| WO-005 | Create WO - validation | 1. Try to create WO without title | Validation error | |
| WO-006 | View WO details | 1. Click on WO | Detail page with tasks, parts, labor, history | |
| WO-007 | Edit WO | 1. Edit WO description<br>2. Save | Changes saved | |
| WO-008 | Assign WO | 1. Open WO<br>2. Select assignee<br>3. Save | Assignee updated | |
| WO-009 | Delete WO (draft) | 1. Delete a draft WO | WO removed | |

### 6.2 Work Order Status Transitions

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| WO-010 | Draft -> Open | 1. Open draft WO<br>2. Change status to "Open" | Status changed | |
| WO-011 | Open -> Scheduled | 1. Open WO<br>2. Set scheduled dates<br>3. Change to "Scheduled" | Status changed | |
| WO-012 | Scheduled -> In Progress | 1. Change scheduled WO to "In Progress" | Status changed, actualStart recorded | |
| WO-013 | In Progress -> On Hold | 1. Change in-progress WO to "On Hold" | Status changed | |
| WO-014 | In Progress -> Completed | 1. Complete all tasks<br>2. Change to "Completed" | Status changed, actualEnd recorded | |
| WO-015 | Invalid transition | 1. Try Draft -> Completed directly | Error: Invalid state transition | |
| WO-016 | Cancel WO | 1. Cancel any non-closed WO | Status changed to "Cancelled" | |

### 6.3 Work Order Tasks

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| WO-017 | Add task | 1. Open WO<br>2. Add task with title<br>3. Save | Task appears in list | |
| WO-018 | Complete task | 1. Check task checkbox | Task marked complete with timestamp | |
| WO-019 | Reorder tasks | 1. Drag task to new position | Order updated | |
| WO-020 | Delete task | 1. Delete a task | Task removed | |
| WO-021 | Add task notes | 1. Add notes to completed task | Notes saved | |

### 6.4 Work Order Parts & Labor

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| WO-022 | Add part | 1. Add part to WO with quantity | Part appears in parts list | |
| WO-023 | Remove part | 1. Remove part from WO | Part removed | |
| WO-024 | Add labor entry | 1. Add labor hours for a user | Labor entry recorded | |

---

## 7. Alerts

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| ALERT-001 | List alerts | 1. Navigate to /alerts | Alerts list with severity indicators | |
| ALERT-002 | Filter by severity | 1. Filter by "Critical" | Only critical alerts shown | |
| ALERT-003 | Filter by status | 1. Filter by "Active" | Only active alerts shown | |
| ALERT-004 | Acknowledge alert | 1. Click "Acknowledge" on alert | Status changes, acknowledgedBy recorded | |
| ALERT-005 | Resolve alert | 1. Click "Resolve" on acknowledged alert | Status changes to resolved | |
| ALERT-006 | View alert details | 1. Click on alert | Detail page with full info, history | |
| ALERT-007 | Alert sorting | 1. Sort by severity, then date | Sorting works correctly | |

---

## 8. Users Management

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| USER-001 | List users | 1. Navigate to /users (as Admin) | Users list with roles | |
| USER-002 | Create user | 1. Click "Add User"<br>2. Fill email, name, role<br>3. Save | User created | |
| USER-003 | Create user - duplicate email | 1. Create user with existing email | Error: Email already exists | |
| USER-004 | Edit user | 1. Edit user's name<br>2. Save | Changes saved | |
| USER-005 | Change user role | 1. Change user role<br>2. Save | Role updated | |
| USER-006 | Deactivate user | 1. Toggle user active status to off | User deactivated, cannot login | |
| USER-007 | Reactivate user | 1. Toggle inactive user to active | User can login again | |
| USER-008 | Delete user | 1. Delete user | User removed (or soft deleted) | |
| USER-009 | Search users | 1. Search by name or email | Matching users shown | |

---

## 9. Audit Logs

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| AUDIT-001 | View audit logs | 1. Navigate to /audit-logs (as Admin) | Logs displayed with timestamps | |
| AUDIT-002 | Filter by user | 1. Select user filter | Only that user's actions shown | |
| AUDIT-003 | Filter by action | 1. Select action type (CREATE, UPDATE, DELETE) | Filtered results | |
| AUDIT-004 | Filter by entity type | 1. Filter by "work_order" | Only WO-related logs | |
| AUDIT-005 | Filter by date range | 1. Set start and end date | Logs within range shown | |
| AUDIT-006 | Export audit logs | 1. Click "Export CSV" | CSV file downloaded | |
| AUDIT-007 | Verify logging | 1. Create a work order<br>2. Check audit logs | CREATE action logged with details | |

---

## 10. Reports

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| REPORT-001 | View reports page | 1. Navigate to /reports | Report types listed | |
| REPORT-002 | Generate WO summary | 1. Select date range<br>2. Generate report | Report displayed with charts | |
| REPORT-003 | Export report PDF | 1. Generate report<br>2. Click "Export PDF" | PDF downloaded | |
| REPORT-004 | Export report CSV | 1. Generate report<br>2. Click "Export CSV" | CSV downloaded | |

---

## 11. Compliance Reports

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| COMP-001 | List compliance reports | 1. Navigate to /compliance-reports | Reports list shown | |
| COMP-002 | Generate report | 1. Select template<br>2. Select site/date range<br>3. Generate | Report generated | |
| COMP-003 | Download report | 1. Click download on generated report | File downloads | |
| COMP-004 | Change report status | 1. Change draft to final | Status updated, watermark changes | |

---

## 12. GenAI Features

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| GENAI-001 | Access GenAI chat | 1. Navigate to /genai | Chat interface loads | |
| GENAI-002 | Ask a question | 1. Type question about maintenance<br>2. Send | AI responds with relevant answer | |
| GENAI-003 | Context awareness | 1. Ask about specific asset | Response includes asset-specific info | |
| GENAI-004 | Document upload | 1. Upload a PDF document | Document processed, can be queried | |
| GENAI-005 | Citation display | 1. Ask question with document context | Response includes citations | |

---

## 13. Settings

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| SET-001 | View settings | 1. Navigate to /settings | Settings page loads | |
| SET-002 | Update profile | 1. Change name<br>2. Save | Profile updated | |
| SET-003 | Change password | 1. Enter current password<br>2. Enter new password<br>3. Save | Password changed, can login with new | |
| SET-004 | Notification preferences | 1. Toggle email notifications<br>2. Save | Preference saved | |

---

## 14. Dashboard & Analytics

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| DASH-001 | View dashboard | 1. Navigate to /dashboard | KPI widgets load with data | |
| DASH-002 | Widget data accuracy | 1. Compare WO count widget with /work-orders list | Counts match | |
| DASH-003 | Date range filter | 1. Change dashboard date range | Widgets update | |
| DASH-004 | Analytics page | 1. Navigate to /analytics | Charts and graphs load | |
| DASH-005 | Chart interactivity | 1. Hover over chart elements | Tooltips display | |

---

## 15. Cross-Browser Testing

Test the following browsers with critical flows (Login, Create WO, View Dashboard):

| Browser | Version | Login | Create WO | Dashboard | Notes |
|---------|---------|-------|-----------|-----------|-------|
| Chrome | Latest | | | | |
| Firefox | Latest | | | | |
| Safari | Latest | | | | |
| Edge | Latest | | | | |

---

## 16. Mobile Responsiveness

Test on the following viewport sizes:

| Device | Width | Login | Navigation | Work Order List | WO Detail |
|--------|-------|-------|------------|-----------------|-----------|
| iPhone SE | 375px | | | | |
| iPhone 14 | 390px | | | | |
| iPad | 768px | | | | |
| iPad Pro | 1024px | | | | |

---

## Test Execution Log

| Date | Tester | Environment | Tests Run | Passed | Failed | Blocked | Notes |
|------|--------|-------------|-----------|--------|--------|---------|-------|
| | | | | | | | |
| | | | | | | | |

---

## Defect Reporting Template

When a test fails, create a defect report with:

```
Title: [MODULE-ID] Brief description
Severity: Critical / High / Medium / Low
Environment: Local / Staging / Production
Browser: Chrome 120 / Firefox / Safari / etc.

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Screenshots/Videos: [Attach]

Console Errors: [If any]
```

---

## Appendix: API Endpoint Quick Reference

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | /api/v1/auth/login | POST |
| Auth | /api/v1/auth/refresh | POST |
| Sites | /api/v1/sites | GET, POST |
| Sites | /api/v1/sites/:id | GET, PATCH, DELETE |
| Assets | /api/v1/assets | GET, POST |
| Assets | /api/v1/assets/:id | GET, PATCH, DELETE |
| Work Orders | /api/v1/work-orders | GET, POST |
| Work Orders | /api/v1/work-orders/:id | GET, PATCH, DELETE |
| Work Orders | /api/v1/work-orders/:id/transition | POST |
| Alerts | /api/v1/alerts | GET, POST |
| Users | /api/v1/users | GET, POST |
| Audit Logs | /api/v1/audit-logs | GET |

---

**Document Maintainer:** DevOps/QA Team
**Last Updated:** February 10, 2026
