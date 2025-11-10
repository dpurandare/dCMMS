# dCMMS State Machine Specifications

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Work Order State Machine](#1-work-order-state-machine)
2. [Asset Lifecycle State Machine](#2-asset-lifecycle-state-machine)
3. [Inventory Item State Machine](#3-inventory-item-state-machine)
4. [Permit Workflow State Machine](#4-permit-workflow-state-machine)
5. [Maintenance Task State Machine](#5-maintenance-task-state-machine)
6. [Implementation Requirements](#6-implementation-requirements)

---

## 1. Work Order State Machine

### 1.1 States

| State | Description | Terminal | Cancelable |
|-------|-------------|----------|------------|
| `draft` | Initial state, work order being created | No | Yes |
| `submitted` | Submitted for approval | No | Yes |
| `approved` | Approved, ready for scheduling | No | Yes |
| `scheduled` | Scheduled with date/time | No | Yes |
| `assigned` | Assigned to technician/crew | No | Yes |
| `in-progress` | Work actively being performed | No | Yes |
| `on-hold` | Temporarily paused | No | Yes |
| `completed` | Work finished, pending verification | No | No |
| `verified` | Work verified by supervisor | No | No |
| `closed` | Fully closed and archived | Yes | No |
| `cancelled` | Work order cancelled | Yes | No |

### 1.2 State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> submitted
    draft --> cancelled

    submitted --> approved
    submitted --> draft: reject
    submitted --> cancelled

    approved --> scheduled
    approved --> cancelled

    scheduled --> assigned
    scheduled --> approved: reschedule
    scheduled --> cancelled

    assigned --> in-progress
    assigned --> scheduled: reassign
    assigned --> cancelled

    in-progress --> on-hold
    in-progress --> completed
    in-progress --> cancelled: emergency

    on-hold --> in-progress
    on-hold --> cancelled

    completed --> verified
    completed --> in-progress: reopen

    verified --> closed

    cancelled --> [*]
    closed --> [*]
```

### 1.3 Transition Rules

#### draft → submitted
**Trigger:** User submits work order for approval
**Required Conditions:**
- `title` is not empty
- `description` is not empty (for non-preventive types)
- `siteId` exists and user has access
- `assetId` exists if specified
- `priority` is set
- If `assignedTo` specified, user has required `skills`

**Side Effects:**
- Set `submittedAt` timestamp
- Set `submittedBy` user ID
- Create notification for approvers
- Log audit event

**Permissions:** Any authenticated user with `create:work-orders` on the site

**Reversible:** Yes (via reject)

---

#### submitted → approved
**Trigger:** Approver approves work order
**Required Conditions:**
- User has `approve:work-orders` permission
- Budget available if cost estimate exceeds threshold
- No conflicting work orders on same asset

**Side Effects:**
- Set `approvedAt` timestamp
- Set `approvedBy` user ID
- Create notification for scheduler
- Reserve budget if applicable
- Log audit event

**Permissions:** `approve:work-orders`

**Reversible:** Yes (can transition back to draft)

---

#### submitted → draft (reject)
**Trigger:** Approver rejects work order
**Required Conditions:**
- User has `approve:work-orders` permission
- Rejection reason provided

**Side Effects:**
- Set `rejectedAt` timestamp
- Set `rejectedBy` user ID
- Set `rejectionReason` field
- Notify submitter
- Log audit event

**Permissions:** `approve:work-orders`

---

#### approved → scheduled
**Trigger:** Scheduler assigns date/time
**Required Conditions:**
- `scheduledStart` is set and in future
- `scheduledEnd` is set and after `scheduledStart`
- No scheduling conflicts for assigned resource
- Required permits identified

**Side Effects:**
- Reserve parts if `partsRequired` specified
- Create calendar events
- Notify assigned personnel
- Check for permit requirements
- Log audit event

**Permissions:** `schedule:work-orders`

---

#### scheduled → assigned
**Trigger:** Work order assigned to specific technician/crew
**Required Conditions:**
- `assignedTo` is set
- Assigned user/crew has required `skills`
- Assigned user/crew available during scheduled window
- Required permits issued or in progress

**Side Effects:**
- Set `assignedAt` timestamp
- Create mobile app notification for technician
- Sync to mobile device
- Log audit event

**Permissions:** `assign:work-orders`

---

#### assigned → in-progress
**Trigger:** Technician starts work
**Required Conditions:**
- Current user is `assignedTo` or supervisor
- Current time within reasonable range of `scheduledStart` (configurable tolerance, e.g., ±2 hours)
- Required permits are `issued` status
- Safety checklist acknowledged (if required)

**Side Effects:**
- Set `actualStart` timestamp
- Start SLA resolution timer
- Create labor record with `startTime`
- Update asset status to `under-maintenance` if applicable
- Log audit event

**Permissions:** `execute:work-orders` (self) or `manage:work-orders` (supervisor)

---

#### in-progress → on-hold
**Trigger:** Work paused for external reason
**Required Conditions:**
- User executing or supervisor
- Hold reason specified

**Side Effects:**
- Set `onHoldAt` timestamp
- Set `onHoldReason` field
- Pause labor record (set `endTime` for current labor entry)
- Create notification for supervisor
- Log audit event

**Permissions:** `execute:work-orders` or `manage:work-orders`

**Reversible:** Yes (can resume)

---

#### on-hold → in-progress (resume)
**Trigger:** Work resumed
**Required Conditions:**
- Hold reason resolved or override provided
- Permits still valid

**Side Effects:**
- Set `resumedAt` timestamp
- Create new labor record with `startTime`
- Log audit event

**Permissions:** `execute:work-orders` or `manage:work-orders`

---

#### in-progress → completed
**Trigger:** Work finished by technician
**Required Conditions:**
- All tasks in `tasks` array are `completed` or `skipped`
- If parts reserved, `partsUsed` recorded (or explicitly marked as not used)
- At least one labor record exists
- Required measurements captured (if defined)
- `completionNotes` provided
- Safety checklist completed (if required)

**Side Effects:**
- Set `actualEnd` timestamp
- Calculate `actualDurationMinutes`
- End current labor record (set `endTime`)
- Update asset status to `operational` or previous status
- Capture completion signature (optional)
- Log audit event

**Permissions:** `execute:work-orders`

**Reversible:** Yes (can reopen to in-progress)

---

#### completed → verified
**Trigger:** Supervisor verifies completed work
**Required Conditions:**
- User has `verify:work-orders` permission
- User is not the same as technician (separation of duties)
- Quality checks passed (if defined)
- Asset tested and operational (if applicable)

**Side Effects:**
- Set `verifiedAt` timestamp
- Set `verifiedBy` user ID
- Calculate total costs (labor + parts + other)
- Generate cost records for ERP posting
- Log audit event

**Permissions:** `verify:work-orders`

---

#### completed → in-progress (reopen)
**Trigger:** Work needs rework
**Required Conditions:**
- User has `verify:work-orders` or `manage:work-orders` permission
- Reopen reason specified
- Work order not yet verified

**Side Effects:**
- Set `reopenedAt` timestamp
- Set `reopenReason` field
- Notify technician
- Log audit event

**Permissions:** `verify:work-orders` or `manage:work-orders`

---

#### verified → closed
**Trigger:** Final closure
**Required Conditions:**
- All costs finalized
- All attachments uploaded
- Customer/operations sign-off (if required)
- SLA recorded

**Side Effects:**
- Set `closedAt` timestamp
- Set `closedBy` user ID
- Release any remaining part reservations
- Archive to data warehouse
- Update asset maintenance history
- Calculate KPIs (MTTR, first-time fix rate, etc.)
- Generate follow-up preventive maintenance if applicable
- Log audit event

**Permissions:** `close:work-orders`

**Terminal State:** Yes (no further transitions)

---

#### * → cancelled
**Trigger:** Work order cancelled
**Allowed From States:** `draft`, `submitted`, `approved`, `scheduled`, `assigned`, `in-progress` (emergency only), `on-hold`
**Required Conditions:**
- User has `cancel:work-orders` permission
- Cancellation reason provided
- For `in-progress`, requires emergency override or supervisor approval

**Side Effects:**
- Set `cancelledAt` timestamp
- Set `cancelledBy` user ID
- Set `cancellationReason` field
- Release part reservations
- End any open labor records
- Notify all stakeholders
- Update asset status back to previous
- Log audit event

**Permissions:** `cancel:work-orders` (or `emergency:override` if in-progress)

**Terminal State:** Yes

---

### 1.4 State-Specific Field Mutability

| Field | Mutable in States | Immutable After |
|-------|-------------------|-----------------|
| `workOrderId` | Never | Creation |
| `type` | draft, submitted | approved |
| `title` | draft, submitted, approved | scheduled |
| `description` | draft, submitted, approved, scheduled | in-progress |
| `priority` | Any non-terminal | closed, cancelled |
| `siteId` | Never | Creation |
| `assetId` | draft, submitted | approved |
| `assignedTo` | approved, scheduled, assigned | in-progress |
| `scheduledStart`/`End` | approved, scheduled, assigned | in-progress |
| `tasks` | draft, submitted, approved, scheduled, assigned, in-progress | completed |
| `partsRequired` | draft, submitted, approved, scheduled | assigned |
| `partsUsed` | in-progress, completed | verified |
| `laborRecords` | in-progress, completed | verified |
| `completionNotes` | completed | closed |
| `rootCause` | completed, verified | closed |

### 1.5 Automated State Transitions

**Trigger:** SLA breach
- If `status=scheduled` and current time > `sla.responseDeadline` → Create alert, notify escalation chain
- If current time > `sla.resolutionDeadline` and not `completed` → Set `sla.resolutionBreached=true`, escalate

**Trigger:** Scheduled time reached
- If `status=scheduled` and current time ≈ `scheduledStart` → Send reminder notification to `assignedTo`

**Trigger:** Part availability
- If `status=on-hold` with reason=`awaiting-parts` and parts become available → Notify supervisor for resume decision

---

## 2. Asset Lifecycle State Machine

### 2.1 States

| State | Description | Operational | Maintenance Allowed |
|-------|-------------|-------------|---------------------|
| `planned` | Planned for installation | No | No |
| `procured` | Purchased, not yet installed | No | No |
| `installing` | Installation in progress | No | No |
| `commissioning` | Being commissioned | No | Yes (commissioning tasks) |
| `operational` | Fully operational | Yes | Yes |
| `under-maintenance` | Maintenance in progress | No | Yes |
| `degraded` | Operating below spec | Partial | Yes |
| `failed` | Non-operational, requires repair | No | Yes (corrective only) |
| `decommissioning` | Being decommissioned | No | Yes (decommissioning tasks) |
| `decommissioned` | Removed from service | No | No |
| `retired` | Permanently retired | No | No |

### 2.2 Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> planned
    planned --> procured
    procured --> installing
    installing --> commissioning
    commissioning --> operational

    operational --> under-maintenance
    operational --> degraded
    operational --> failed

    under-maintenance --> operational
    under-maintenance --> degraded
    under-maintenance --> failed

    degraded --> under-maintenance
    degraded --> operational
    degraded --> failed

    failed --> under-maintenance

    operational --> decommissioning
    degraded --> decommissioning
    failed --> decommissioning

    decommissioning --> decommissioned
    decommissioned --> retired

    retired --> [*]
```

### 2.3 Key Transition Rules

#### operational → under-maintenance
**Trigger:** Work order with this asset starts (WO status → `in-progress`)
**Automatic:** Yes
**Side Effects:**
- Notify operations team
- Update availability metrics
- Start downtime tracking

#### under-maintenance → operational
**Trigger:** Work order completed and verified
**Automatic:** Yes (if no other active WOs on asset)
**Conditions:**
- No other `in-progress` work orders on this asset
- Post-maintenance tests passed (if required)
**Side Effects:**
- End downtime tracking
- Update availability metrics
- Resume telemetry monitoring

#### operational → failed
**Trigger:** Critical alarm or manual override
**Automatic:** Yes (for critical alarms)
**Conditions:**
- Critical threshold breach (e.g., protection trip)
- Or manual status change by operator
**Side Effects:**
- Create emergency work order (if automation enabled)
- Notify on-call personnel
- Update dashboards

#### failed → under-maintenance
**Trigger:** Corrective work order assigned
**Automatic:** Yes

---

## 3. Inventory Item State Machine

### 3.1 States

| State | Description | Available for Use |
|-------|-------------|-------------------|
| `ordered` | On order from supplier | No |
| `in-transit` | Shipped, not yet received | No |
| `received` | Received, pending inspection | No |
| `available` | In stock, available for use | Yes |
| `reserved` | Reserved for specific work order | No (reserved) |
| `issued` | Issued for use | No |
| `consumed` | Used/consumed | No |
| `returned` | Returned to stock | Yes |
| `quarantined` | Quality hold | No |
| `obsolete` | Obsolete, to be disposed | No |

### 3.2 Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> ordered
    ordered --> in-transit
    in-transit --> received
    received --> available
    received --> quarantined

    quarantined --> available: passed inspection
    quarantined --> obsolete: failed inspection

    available --> reserved
    available --> issued

    reserved --> issued
    reserved --> available: reservation expired

    issued --> consumed
    issued --> returned

    returned --> available

    available --> obsolete

    consumed --> [*]
    obsolete --> [*]
```

### 3.3 Key Transition Rules

#### available → reserved
**Trigger:** Work order part reservation
**Conditions:**
- Sufficient quantity in `available` state
- Reservation expiry time set
**Side Effects:**
- Decrement available quantity
- Increment reserved quantity
- Create reservation record with expiry

#### reserved → available (expiry)
**Trigger:** Reservation expiry time reached, work order not started
**Automatic:** Yes (background job)
**Side Effects:**
- Increment available quantity
- Decrement reserved quantity
- Notify planner of expired reservation

#### reserved → issued → consumed
**Trigger:** Technician records parts usage in work order
**Side Effects:**
- Decrement inventory quantity permanently
- Record consumption in work order `partsUsed`
- Update inventory value
- Trigger reorder if quantity < reorder point

---

## 4. Permit Workflow State Machine

### 4.1 States

| State | Description |
|-------|-------------|
| `required` | Permit identified as required |
| `requested` | Permit request submitted |
| `under-review` | Being reviewed by approver |
| `issued` | Permit issued and active |
| `expired` | Permit expired |
| `revoked` | Permit revoked |

### 4.2 Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> required
    required --> requested
    requested --> under-review
    under-review --> issued
    under-review --> required: rejected
    issued --> expired: time
    issued --> revoked: safety issue
    expired --> [*]
    revoked --> [*]
```

### 4.3 Key Transitions

#### required → requested
**Trigger:** Technician or supervisor requests permit
**Conditions:**
- Permit type defined
- Required information provided (e.g., LOTO points)
**Side Effects:**
- Notify permit issuer
- Create approval task

#### under-review → issued
**Trigger:** Authorized issuer approves permit
**Conditions:**
- User has `issue-permit:<permitType>` permission
- Safety conditions met
**Side Effects:**
- Set `issuedAt` timestamp
- Set `expiresAt` based on permit type rules
- Notify requester
- Allow work order to proceed

#### issued → expired
**Trigger:** Current time > `expiresAt`
**Automatic:** Yes
**Side Effects:**
- If work order still `in-progress`, force to `on-hold`
- Notify supervisor
- Require permit renewal

---

## 5. Maintenance Task State Machine

(Individual tasks within a work order)

### 5.1 States

| State | Description |
|-------|-------------|
| `pending` | Not yet started |
| `in-progress` | Currently being performed |
| `completed` | Finished successfully |
| `skipped` | Intentionally skipped with reason |

### 5.2 Transition Rules

- Tasks must be completed in `sequence` order (or marked as skipped)
- `in-progress` task must be completed before next task starts
- Skipping a task requires reason and supervisor approval (for critical tasks)

---

## 6. Implementation Requirements

### 6.1 State Transition Enforcement

**Database-Level:**
- Use CHECK constraints or triggers to validate state transitions
- Store state history in audit table

**Application-Level:**
- Centralized state machine service/library
- Validation before any state change
- Transaction boundaries around state change + side effects

**API-Level:**
- Dedicated transition endpoints (e.g., `POST /work-orders/{id}/transitions`)
- Return error code `INVALID_STATE_TRANSITION` (422) for invalid transitions

### 6.2 Audit Requirements

**For every state transition, record:**
- Previous state
- New state
- Transition timestamp
- User who triggered transition
- Reason/comment (if provided)
- Request ID for traceability

**Audit Log Schema:**
```json
{
  "auditId": "uuid",
  "entityType": "work-order",
  "entityId": "WO-001",
  "fromState": "scheduled",
  "toState": "in-progress",
  "transitionedAt": "2025-11-08T10:00:00Z",
  "transitionedBy": "user-123",
  "reason": "Starting contactor replacement",
  "requestId": "req-uuid",
  "metadata": {}
}
```

### 6.3 Event Publishing

**For every state transition, publish event to message bus (Kafka):**

**Topic:** `dcmms.work-orders.state-changed`

**Event Payload:**
```json
{
  "eventId": "uuid",
  "eventType": "WorkOrderStateChanged",
  "timestamp": "2025-11-08T10:00:00Z",
  "workOrderId": "WO-001",
  "previousState": "scheduled",
  "newState": "in-progress",
  "changedBy": "user-123",
  "metadata": {
    "siteId": "SITE-ALPHA-001",
    "assetId": "INV-3A",
    "priority": "high"
  }
}
```

**Consumers:**
- Notification service (send alerts)
- Analytics service (update KPIs)
- Integration service (sync to ERP)
- WebSocket service (real-time dashboard updates)

### 6.4 Rollback Handling

**For reversible transitions:**
- Support rollback via dedicated endpoint (e.g., `POST /work-orders/{id}/rollback`)
- Require reason for rollback
- Publish rollback event

**For irreversible terminal states:**
- No rollback allowed
- Create compensating work order if needed (e.g., new WO to undo closed WO)

### 6.5 State Machine Testing

**Unit Tests:**
- Test all valid transitions
- Test all invalid transitions (expect errors)
- Test conditional transitions
- Test side effects

**Integration Tests:**
- Test transition triggers (e.g., alarm → failed asset → auto-create WO)
- Test event publishing
- Test audit log creation

**Acceptance Tests:**
- End-to-end workflows per persona
- Concurrent state changes (optimistic locking)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial state machine definitions |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | [TBD] | | |
| Product Owner | [TBD] | | |
