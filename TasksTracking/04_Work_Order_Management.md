# 04. Work Order Management

**Focus:** Work Orders, State Machines, Tasks, Parts (Sprint 2 & 4)
**Specs Covered:** 02 (State Machines), 23 (Cost - Foundations)

## Backend Implementation

- [x] **DCMMS-020** - Work Order Data Models
  - [x] WO Schema (priority, status, type)
  - [x] Maintenance Tasks schema
- [x] **DCMMS-021** - Work Order State Machine
  - [x] State transitions (Draft -> Scheduled -> In Progress -> Closed)
  - [x] Validation rules (service layer implemented)
  - [ ] 🔴 **CRITICAL:** State machine enforcement in routes (NOT enforced - see gap below)
- [x] **DCMMS-022** - Work Order CRUD API
  - [x] WO Management endpoints
- [x] **DCMMS-023** - Maintenance Tasks API
  - [x] Task checklists
- [x] **DCMMS-024** - Parts Reservation API
  - [x] Inventory integration basics

## Frontend Implementation

- [x] **DCMMS-034** - Work Order List Page
  - [x] Filtering and Sorting
- [x] **DCMMS-035** - Work Order Details Page
  - [x] Task execution UI
  - [x] State transition controls
- [x] **DCMMS-036** - Work Order Forms
  - [x] Create/Edit WO wizards

## Core Dashboard

- [x] **DCMMS-028** - Dashboard Layout
  - [x] Sidebar navigation
  - [x] Overview widgets

## Verification

- [x] **DCMMS-042** - Work Order E2E Testing
  - [x] Full lifecycle tests

### 🔴 CRITICAL GAPS IDENTIFIED (Backend Review - Jan 2026)

- [x] **DCMMS-WO-001** - Enforce State Machine in Routes ✅ COMPLETED
  - [x] Updated work-order.service.ts transitionStatus() to validate state transitions
  - [x] Calls WorkOrderStateMachine.isValidTransition() before updates
  - [x] Returns error for invalid transitions with allowed transitions list
  - [x] State transition changes automatically audited by audit middleware
  - **Status:** State machine fully enforced in backend
  - **Completed:** January 1, 2026
  - **File:** work-order.service.ts

- [x] **DCMMS-WO-002** - Implement Attachment Management ✅ COMPLETED
  - [x] Create attachments table (workOrderAttachments) with full metadata
  - [x] Implement FileStorageService (local filesystem with streaming)
  - [x] Add multipart/form-data upload endpoint with @fastify/multipart
  - [x] Add file download endpoint with streaming and access control
  - [x] Add file list and delete endpoints
  - [x] Support multiple file types (images, PDFs, Office docs, text files)
  - [x] Implement file size validation (10MB max)
  - [x] Implement MIME type validation
  - [x] Add RBAC protection (create/read/delete:work-orders)
  - [x] Add tenant isolation checks
  - [x] Organize files in subfolders by work order ID
  - **Status:** Complete file attachment system with streaming I/O
  - **Storage:** Local filesystem (S3/MinIO integration deferred)
  - **Completed:** January 1, 2026
  - **Files:** file-storage.service.ts, attachments.ts routes, server.ts, schema.ts

- [ ] **DCMMS-WO-003** - Implement Crew/Team Management
  - [ ] Create crews table per spec
  - [ ] Implement CrewService with CRUD operations
  - [ ] Add crew assignment to work orders
  - [ ] Add crew routes /api/v1/crews
  - [ ] Update WO assignment to support crew vs individual
  - **Issue:** Spec defines crews but not in database
  - **Impact:** Team-based work assignment not possible
  - **Effort:** 1 week
