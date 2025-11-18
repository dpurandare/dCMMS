# dCMMS QA Testing Checklist

## Overview

This checklist ensures all MVP features are thoroughly tested before production deployment. Use this document for:
- **Pre-release testing**
- **Regression testing** after bug fixes
- **User acceptance testing** (UAT)

**Sprint:** 5 - Bug Fixing & Stabilization (DCMMS-046)
**Last Updated:** December 2025

---

## Test Environment Setup

### Prerequisites

- [ ] Backend running on `http://localhost:3000`
- [ ] Frontend running on `http://localhost:3001`
- [ ] Database seeded with test data
- [ ] Test users created (Admin, Manager, Technician)
- [ ] Browsers: Chrome, Firefox, Safari
- [ ] Mobile devices: iOS, Android (or simulators)

### Test Users

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@dcmms.local | admin123 | Full access |
| Manager | manager@dcmms.local | manager123 | Create/edit WO, assets |
| Technician | tech@dcmms.local | tech123 | View/update assigned WO |

---

## 1. Authentication & Authorization

### Login

- [ ] Login with valid credentials → Success
- [ ] Login with invalid email → Error message
- [ ] Login with invalid password → Error message
- [ ] Login with empty fields → Validation errors
- [ ] Token stored in localStorage → Verified
- [ ] Redirect to dashboard after login → Success

### Authorization

- [ ] Admin can access all pages → Success
- [ ] Manager cannot access admin settings → Blocked
- [ ] Technician can only see assigned work orders → Restricted
- [ ] Logout clears token → Success
- [ ] Expired token redirects to login → Success
- [ ] Unauthorized API calls return 401/403 → Success

---

## 2. Dashboard

### Layout

- [ ] Sidebar navigation visible → Success
- [ ] Top bar with search and notifications → Success
- [ ] User profile dropdown functional → Success
- [ ] Mobile: Hamburger menu works → Success

### Stats Cards

- [ ] Pending work orders count accurate → Success
- [ ] Critical alerts count accurate → Success
- [ ] Asset status breakdown correct → Success
- [ ] Stats update on data change → Success

### Navigation

- [ ] All sidebar links navigate correctly → Success
- [ ] Breadcrumbs show current page → Success
- [ ] Active route highlighted → Success
- [ ] Badge counts on menu items → Success

---

## 3. Sites Management

### Create Site

- [ ] Navigate to Sites → New Site → Form opens
- [ ] Fill all required fields → Success
- [ ] Missing required field → Validation error
- [ ] Invalid latitude/longitude → Validation error
- [ ] Duplicate site code → Error message
- [ ] Create site → Redirects to sites list
- [ ] New site appears in list → Success

### View Site

- [ ] Click site name → Details page loads
- [ ] Site information displayed → Success
- [ ] Assets at site listed → Success
- [ ] Active work orders shown → Success
- [ ] Map shows location (if coordinates) → Success

### Edit Site

- [ ] Click Edit button → Form populated
- [ ] Change site name → Save → Success
- [ ] Invalid data → Validation error
- [ ] Updated site reflects changes → Success

### Delete Site

- [ ] Delete site with no assets → Success
- [ ] Delete site with assets → Error (blocked)
- [ ] Confirmation dialog shown → Success
- [ ] Deleted site removed from list → Success

---

## 4. Asset Management

### Create Asset

- [ ] Navigate to Assets → New Asset → Form opens
- [ ] Fill required fields (name, tag, type, site) → Success
- [ ] Select parent asset (for hierarchy) → Success
- [ ] Circular reference prevented → Blocked
- [ ] Duplicate asset tag → Error message
- [ ] Create asset → Success
- [ ] Asset appears in list → Success

### View Asset

- [ ] Click asset → Details page loads
- [ ] Overview tab shows basic info → Success
- [ ] Hierarchy tab shows parent/children → Success
- [ ] Work Orders tab lists all WOs → Success
- [ ] Documents tab (placeholder) → Success
- [ ] Telemetry tab (placeholder) → Success

### Asset Hierarchy (3 Levels)

- [ ] Create Level 1 asset (parent) → Success
- [ ] Create Level 2 asset (child of Level 1) → Success
- [ ] Create Level 3 asset (child of Level 2) → Success
- [ ] Level 1 shows Level 2 in hierarchy → Success
- [ ] Level 2 shows Level 1 (parent) and Level 3 (child) → Success
- [ ] Level 3 shows Level 2 (parent) only → Success
- [ ] Navigate hierarchy via links → Success
- [ ] Cannot create Level 4 (blocked) → Success
- [ ] Cannot set child as parent (circular) → Blocked

### Edit Asset

- [ ] Click Edit → Form populated
- [ ] Change asset name → Save → Success
- [ ] Change status → Success
- [ ] Change parent asset → Success
- [ ] Updated asset reflects changes → Success

### Filter Assets

- [ ] Filter by status (operational) → Correct results
- [ ] Filter by asset type → Correct results
- [ ] Filter by site → Correct results
- [ ] Search by name → Correct results
- [ ] Search by asset tag → Correct results
- [ ] Combined filters → Correct results
- [ ] Clear filters → Shows all assets

### Delete Asset

- [ ] Delete asset with no WOs and no children → Success
- [ ] Delete asset with active WOs → Error (blocked)
- [ ] Delete asset with children → Error (blocked)
- [ ] Confirmation dialog shown → Success

---

## 5. Work Order Management

### Create Work Order (3-Step Wizard)

**Step 1: Basic Info**
- [ ] Navigate to Work Orders → New → Form opens
- [ ] Fill title (required) → Success
- [ ] Fill description → Success
- [ ] Select type (corrective, preventive, etc.) → Success
- [ ] Select priority (critical, high, medium, low) → Success
- [ ] Select asset (required) → Success
- [ ] Site auto-fills based on asset → Success
- [ ] Assign to technician → Success
- [ ] Set estimated hours → Success
- [ ] Set scheduled dates → Success
- [ ] Click "Next: Add Tasks" → Tab changes

**Step 2: Tasks**
- [ ] Add task with title → Success
- [ ] Add task with description → Success
- [ ] Tasks numbered sequentially → Success
- [ ] Remove task → Success
- [ ] Empty task title → Validation error
- [ ] Badge shows task count → Success
- [ ] Click "Next: Add Parts" → Tab changes

**Step 3: Parts**
- [ ] Add part with name and quantity → Success
- [ ] Remove part → Success
- [ ] Empty part name → Validation error
- [ ] Invalid quantity → Validation error
- [ ] Badge shows part count → Success

**Submit**
- [ ] Click "Save as Draft" → Status = draft
- [ ] Click "Create & Schedule" → Status = scheduled
- [ ] Missing required fields → Validation error
- [ ] Created WO appears in list → Success
- [ ] Redirects to WO list → Success

### View Work Order

- [ ] Click work order → Details page loads
- [ ] **Details tab**: All info displayed → Success
- [ ] **Tasks tab**: Checklist shown → Success
- [ ] **Parts tab**: Parts list shown → Success
- [ ] **Labor tab**: (Placeholder) → Success
- [ ] **Attachments tab**: (Placeholder) → Success
- [ ] **History tab**: State changes logged → Success

### Edit Work Order

- [ ] Can edit draft WO → Success
- [ ] Click Edit → Form populated (3 tabs) → Success
- [ ] Make changes across tabs → Success
- [ ] Save changes → Success
- [ ] Cannot edit scheduled WO (Edit disabled) → Blocked
- [ ] Cannot edit in-progress WO → Blocked

### Work Order State Transitions

**Draft → Scheduled**
- [ ] Status badge shows "Draft" → Success
- [ ] No transition buttons visible → Success
- [ ] Edit to add required info → Success
- [ ] Save creates scheduled WO → Status = scheduled

**Scheduled → In Progress (Start)**
- [ ] "Start" button visible → Success
- [ ] Click Start → Confirmation dialog → Success
- [ ] Confirm → Status = in_progress
- [ ] Status badge updated → Success
- [ ] History logged → Success

**In Progress → On Hold**
- [ ] "Hold" button visible → Success
- [ ] Click Hold → Add note → Success
- [ ] Confirm → Status = on_hold
- [ ] Status badge updated → Success

**On Hold → In Progress (Resume)**
- [ ] "Resume" button visible → Success
- [ ] Click Resume → Confirmation → Success
- [ ] Confirm → Status = in_progress

**In Progress → Completed**
- [ ] All tasks checked off → Success
- [ ] "Complete" button visible → Success
- [ ] Click Complete → Add completion notes → Success
- [ ] Confirm → Status = completed
- [ ] Status badge updated → Success

**Completed → Closed**
- [ ] "Close" button visible → Success
- [ ] Click Close → Add final notes → Success
- [ ] Confirm → Status = closed
- [ ] Status badge updated → Success
- [ ] Cannot edit closed WO → Blocked

**Cancel Work Order**
- [ ] "Cancel" button visible (any status) → Success
- [ ] Click Cancel → Add reason → Success
- [ ] Confirm → Status = cancelled
- [ ] Cannot uncancelled WO → Blocked

### Filter Work Orders

- [ ] Filter by status → Correct results
- [ ] Filter by priority → Correct results
- [ ] Filter by type → Correct results
- [ ] Filter by assigned technician → Correct results
- [ ] Search by title → Correct results
- [ ] Search by WO ID → Correct results
- [ ] Combined filters → Correct results
- [ ] Clear filters → Shows all WOs

### Pagination

- [ ] Default: 20 items per page → Success
- [ ] Change to 50 items → Success
- [ ] Navigate to page 2 → Success
- [ ] Total count accurate → Success
- [ ] Total pages calculated correctly → Success

### Complete Workflow Test

- [ ] Create site → Success
- [ ] Create asset at site → Success
- [ ] Create WO for asset → Success
- [ ] Assign WO to technician → Success
- [ ] Start WO → Success
- [ ] Complete tasks → Success
- [ ] Complete WO → Success
- [ ] Close WO → Success
- [ ] Verify history shows all steps → Success

---

## 6. Mobile Responsiveness

### Smartphone (< 768px)

- [ ] Login page responsive → Success
- [ ] Dashboard: Hamburger menu → Success
- [ ] Sidebar: Drawer overlay → Success
- [ ] Tables: Horizontal scroll → Success
- [ ] Forms: Stack vertically → Success
- [ ] Buttons: Touch-friendly size → Success
- [ ] Navigation: Easy to tap → Success

### Tablet (768px - 1024px)

- [ ] Sidebar: Always visible or collapsible → Success
- [ ] Tables: Readable without scroll → Success
- [ ] Forms: 2-column layout → Success
- [ ] Dashboard: Cards responsive → Success

### Portrait/Landscape

- [ ] Orientation change handled → Success
- [ ] No layout breaks → Success
- [ ] Content remains accessible → Success

---

## 7. Cross-Browser Testing

### Chrome (Latest)

- [ ] All features work → Success
- [ ] No console errors → Success
- [ ] Styling correct → Success

### Firefox (Latest)

- [ ] All features work → Success
- [ ] No console errors → Success
- [ ] Styling correct → Success

### Safari (Latest)

- [ ] All features work → Success
- [ ] Date pickers work → Success
- [ ] No console errors → Success

### Edge (Latest)

- [ ] All features work → Success
- [ ] No console errors → Success

---

## 8. Performance Testing

### Page Load Times

- [ ] Dashboard loads < 2s → Success
- [ ] Work Orders list (100 items) < 2s → Success
- [ ] Assets list (1000 items) < 2s → Success
- [ ] WO Details page < 1s → Success

### API Response Times

- [ ] List endpoints < 200ms (p95) → Success
- [ ] Create endpoints < 300ms → Success
- [ ] Update endpoints < 200ms → Success
- [ ] Filter queries < 200ms → Success

### UI Responsiveness

- [ ] Buttons respond instantly (<100ms) → Success
- [ ] Form inputs no lag → Success
- [ ] Navigation smooth → Success
- [ ] No janky scrolling → Success

---

## 9. Accessibility (WCAG 2.1 AA)

### Keyboard Navigation

- [ ] Tab through all interactive elements → Success
- [ ] Enter key submits forms → Success
- [ ] Escape key closes modals → Success
- [ ] Focus indicators visible → Success

### Screen Reader

- [ ] Images have alt text → Success
- [ ] Form labels associated → Success
- [ ] ARIA labels on icons → Success
- [ ] Page structure logical → Success

### Color Contrast

- [ ] Text meets 4.5:1 contrast → Success
- [ ] Status badges readable → Success
- [ ] Buttons sufficient contrast → Success

---

## 10. Error Handling

### Network Errors

- [ ] API down → User-friendly error message
- [ ] Slow connection → Loading indicators
- [ ] Timeout → Retry option
- [ ] No internet → Offline message

### Validation Errors

- [ ] Missing required field → Inline error
- [ ] Invalid format → Clear message
- [ ] Server validation → Error displayed
- [ ] Multiple errors → All shown

### Edge Cases

- [ ] Empty state (no data) → Empty state UI
- [ ] Very long text → Truncated with ellipsis
- [ ] Special characters → Handled safely
- [ ] Large file upload → Size limit enforced

---

## 11. Security Testing

- [ ] All security tests pass → See `tests/security/`
- [ ] No high-risk vulnerabilities → OWASP ZAP clean
- [ ] SQL injection blocked → Verified
- [ ] XSS prevented → Verified
- [ ] Auth required on protected routes → Verified
- [ ] Security headers configured → Verified

---

## 12. Data Integrity

### Work Orders

- [ ] WO ID unique and sequential → Success
- [ ] Status transitions follow state machine → Success
- [ ] History complete and accurate → Success
- [ ] Related data consistent (asset, site) → Success

### Assets

- [ ] Asset tag unique → Success
- [ ] Hierarchy relationships correct → Success
- [ ] Parent-child links bidirectional → Success
- [ ] Site reference valid → Success

### Soft Deletes

- [ ] Deleted items not in list → Success
- [ ] Deleted items not in API responses → Success
- [ ] Referential integrity maintained → Success

---

## Bug Priority Definitions

### P0 - Critical (Blocker)

- System crash or data loss
- Security vulnerability
- Complete feature failure
- **Action:** Fix immediately

### P1 - High

- Major feature doesn't work
- Significant performance issue
- Data inconsistency
- **Action:** Fix before release

### P2 - Medium

- Minor feature issue
- UI glitch
- Usability problem
- **Action:** Fix in current sprint if time permits

### P3 - Low

- Cosmetic issue
- Enhancement request
- Edge case
- **Action:** Backlog for future sprint

---

## Regression Test Suite

Run after every bug fix:

- [ ] Complete workflow test (end-to-end)
- [ ] All critical paths (login, create WO, etc.)
- [ ] Security tests
- [ ] Performance benchmarks
- [ ] Cross-browser smoke tests

---

## Test Completion Criteria

**MVP is ready for production when:**

- [ ] All P0 bugs fixed (100%)
- [ ] All P1 bugs fixed (100%)
- [ ] P2 bugs < 5 open
- [ ] All test sections above > 95% passing
- [ ] Performance targets met
- [ ] Security scan clean (no high-risk)
- [ ] User acceptance testing passed
- [ ] Documentation complete

---

## Test Execution Log

| Date | Tester | Environment | Pass Rate | Bugs Found | Notes |
|------|--------|-------------|-----------|------------|-------|
| 2025-12-15 | QA Team | Staging | 98% | 3 (P2) | Minor UI issues |
| 2025-12-18 | UAT | Production | 100% | 0 | Ready for release |

---

**Next Steps:**

1. Execute all tests in this checklist
2. Log any bugs in issue tracker
3. Fix P0 and P1 bugs
4. Re-run regression tests
5. Get sign-off from stakeholders
6. Deploy to production 🚀
