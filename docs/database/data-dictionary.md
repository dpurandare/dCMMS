# dCMMS Data Dictionary

**Version:** 1.0
**Date:** 2025-11-18
**Status:** ✅ Approved for Sprint 0
**Based on:** Spec 11 (Complete Data Models), ERD Diagram

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Tables](#core-tables)
3. [Operational Tables](#operational-tables)
4. [Security & Audit Tables](#security--audit-tables)
5. [Time-Series Tables](#time-series-tables)
6. [ML/AI Tables](#mlai-tables)
7. [Common Patterns](#common-patterns)
8. [Business Rules](#business-rules)

---

## Introduction

This data dictionary provides comprehensive documentation for all database tables in the dCMMS system. It includes field definitions, data types, constraints, relationships, and business rules.

### Naming Conventions

- **Tables:** Plural snake_case (e.g., `work_orders`, `inventory_items`)
- **Columns:** Snake_case (e.g., `work_order_id`, `scheduled_start`)
- **Primary Keys:** `id` (UUID)
- **Foreign Keys:** `{table}_id` (e.g., `site_id`, `asset_id`)
- **Timestamps:** `created_at`, `updated_at`, `deleted_at`
- **Soft Delete:** `deleted` (boolean)

### Data Types

| Type | PostgreSQL | Description | Example |
|------|-----------|-------------|---------|
| **UUID** | `UUID` | Universally unique identifier | `550e8400-e29b-41d4-a716-446655440000` |
| **String (Short)** | `VARCHAR(255)` | Short text fields | `"INV-001"` |
| **String (Long)** | `TEXT` | Long text, descriptions | `"Detailed description..."` |
| **Integer** | `INTEGER` | Whole numbers | `42` |
| **Decimal** | `NUMERIC(10,2)` | Monetary values | `1234.56` |
| **Boolean** | `BOOLEAN` | True/false | `true` |
| **Timestamp** | `TIMESTAMPTZ` | Date and time with timezone | `2025-11-18T12:00:00Z` |
| **JSON** | `JSONB` | Structured data | `{"key": "value"}` |
| **Array** | `TEXT[]` | Array of values | `["tag1", "tag2"]` |
| **Enum** | Custom type | Enumerated values | `'open'::work_order_status` |

---

## Core Tables

### 1. tenants

**Purpose:** Multi-tenancy support - each organization is a tenant

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `tenant_id` | VARCHAR(100) | NO | - | Unique tenant identifier (e.g., "org-acme") |
| `name` | VARCHAR(255) | NO | - | Organization name |
| `status` | VARCHAR(50) | NO | 'active' | Tenant status: active, inactive, suspended |
| `subscription_tier` | VARCHAR(50) | YES | NULL | Subscription tier: free, pro, enterprise |
| `max_users` | INTEGER | YES | NULL | Maximum allowed users |
| `max_sites` | INTEGER | YES | NULL | Maximum allowed sites |
| `metadata` | JSONB | YES | NULL | Additional tenant configuration |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Constraints:**
- `PK_tenants`: PRIMARY KEY (`id`)
- `UQ_tenants_tenant_id`: UNIQUE (`tenant_id`)
- `CK_tenants_status`: CHECK (`status` IN ('active', 'inactive', 'suspended'))

**Indexes:**
- `idx_tenants_tenant_id`: (`tenant_id`)
- `idx_tenants_status`: (`status`)

**Sample Data:**
```sql
INSERT INTO tenants VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'org-acme-solar',
  'ACME Solar Energy',
  'active',
  'enterprise',
  100,
  50,
  '{"billing_contact": "billing@acme.com"}',
  NOW(),
  NOW()
);
```

---

### 2. sites

**Purpose:** Physical locations/facilities (solar farms, wind farms, hydro plants)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `site_id` | VARCHAR(100) | NO | - | Unique site identifier (e.g., "SITE-SOLAR-01") |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `name` | VARCHAR(255) | NO | - | Site name (e.g., "Desert Solar Farm") |
| `location` | VARCHAR(255) | YES | NULL | Human-readable location |
| `geo_location` | GEOGRAPHY(POINT) | YES | NULL | GPS coordinates (lat/lon) |
| `timezone` | VARCHAR(50) | NO | 'UTC' | IANA timezone (e.g., "Asia/Kolkata") |
| `capacity_mw` | NUMERIC(10,2) | YES | NULL | Installed capacity in megawatts |
| `status` | VARCHAR(50) | NO | 'active' | Site status: active, inactive, maintenance, decommissioned |
| `metadata` | JSONB | YES | NULL | Custom site metadata |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Constraints:**
- `PK_sites`: PRIMARY KEY (`id`)
- `UQ_sites_site_id`: UNIQUE (`site_id`)
- `FK_sites_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)` ON DELETE CASCADE
- `CK_sites_status`: CHECK (`status` IN ('active', 'inactive', 'maintenance', 'decommissioned'))
- `CK_sites_capacity`: CHECK (`capacity_mw` >= 0)

**Indexes:**
- `idx_sites_tenant`: (`tenant_id`)
- `idx_sites_status`: (`status`) WHERE `status` != 'decommissioned'
- `idx_sites_geo`: USING GIST (`geo_location`)

**Business Rules:**
- Site must belong to exactly one tenant
- Site ID must be unique across all tenants
- Timezone must be valid IANA timezone
- Capacity must be non-negative

---

### 3. assets

**Purpose:** Equipment and infrastructure (inverters, transformers, turbines, etc.)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `asset_id` | VARCHAR(100) | NO | - | Unique asset identifier (e.g., "INV-001") |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `site_id` | UUID | NO | - | Foreign key to sites table |
| `parent_id` | UUID | YES | NULL | Parent asset ID (for hierarchy) |
| `name` | VARCHAR(255) | NO | - | Asset name (e.g., "Inverter 1") |
| `type` | VARCHAR(50) | NO | - | Asset type: inverter, transformer, panel, turbine, battery, meter, other |
| `status` | VARCHAR(50) | NO | 'operational' | Asset status: operational, maintenance, failed, decommissioned |
| `hierarchy_level` | INTEGER | NO | 0 | Depth in asset hierarchy (0 = site level) |
| `tags` | TEXT[] | YES | ARRAY[]::TEXT[] | Searchable tags |
| `geo_location` | GEOGRAPHY(POINT) | YES | NULL | GPS coordinates |
| `metadata` | JSONB | YES | NULL | Asset-specific metadata (model, serial, specs) |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |
| `deleted` | BOOLEAN | NO | FALSE | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |
| `deleted_by` | UUID | YES | NULL | User who deleted (FK to users) |

**Constraints:**
- `PK_assets`: PRIMARY KEY (`id`)
- `UQ_assets_asset_id`: UNIQUE (`asset_id`) WHERE `deleted` = FALSE
- `FK_assets_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`
- `FK_assets_site`: FOREIGN KEY (`site_id`) REFERENCES `sites(id)`
- `FK_assets_parent`: FOREIGN KEY (`parent_id`) REFERENCES `assets(id)`
- `CK_assets_type`: CHECK (`type` IN ('inverter', 'transformer', 'panel', 'turbine', 'battery', 'meter', 'other'))
- `CK_assets_status`: CHECK (`status` IN ('operational', 'maintenance', 'failed', 'decommissioned'))
- `CK_assets_hierarchy_level`: CHECK (`hierarchy_level` >= 0 AND `hierarchy_level` <= 5)

**Indexes:**
- `idx_assets_tenant`: (`tenant_id`)
- `idx_assets_site`: (`site_id`, `deleted`)
- `idx_assets_parent`: (`parent_id`) WHERE `parent_id` IS NOT NULL
- `idx_assets_type`: (`type`)
- `idx_assets_status`: (`status`)
- `idx_assets_tags`: USING GIN (`tags`)
- `idx_assets_deleted`: (`deleted`)

**Business Rules:**
- Asset must belong to exactly one site
- Parent asset must belong to same site
- Hierarchy depth limited to 5 levels
- Circular references prevented by trigger
- Soft delete cascades to children

---

### 4. users

**Purpose:** System users (technicians, supervisors, admins)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | VARCHAR(100) | NO | - | Unique user identifier (e.g., "USR-JOHN-001") |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `email` | VARCHAR(255) | NO | - | User email (unique per tenant) |
| `first_name` | VARCHAR(100) | NO | - | First name |
| `last_name` | VARCHAR(100) | NO | - | Last name |
| `phone` | VARCHAR(50) | YES | NULL | Phone number |
| `status` | VARCHAR(50) | NO | 'active' | User status: active, inactive, suspended |
| `idp_user_id` | VARCHAR(255) | YES | NULL | External IdP user ID (Auth0, Azure AD, etc.) |
| `idp_provider` | VARCHAR(50) | YES | NULL | IdP provider: auth0, azure-ad, keycloak, okta |
| `metadata` | JSONB | YES | NULL | Additional user data |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |
| `last_login_at` | TIMESTAMPTZ | YES | NULL | Last successful login |
| `deleted` | BOOLEAN | NO | FALSE | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete timestamp |

**Constraints:**
- `PK_users`: PRIMARY KEY (`id`)
- `UQ_users_user_id`: UNIQUE (`user_id`)
- `UQ_users_email`: UNIQUE (`tenant_id`, `email`) WHERE `deleted` = FALSE
- `FK_users_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`
- `CK_users_status`: CHECK (`status` IN ('active', 'inactive', 'suspended'))
- `CK_users_email`: CHECK (`email` ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')

**Indexes:**
- `idx_users_tenant`: (`tenant_id`)
- `idx_users_email`: (`email`)
- `idx_users_status`: (`status`)
- `idx_users_idp`: (`idp_provider`, `idp_user_id`)

**Business Rules:**
- Email must be unique within tenant
- Email must be valid format
- User must belong to exactly one tenant
- Inactive users cannot login

---

## Operational Tables

### 5. work_orders

**Purpose:** Maintenance work orders (corrective, preventive, predictive)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `work_order_id` | VARCHAR(100) | NO | - | Unique WO identifier (e.g., "WO-2025-001") |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `site_id` | UUID | NO | - | Foreign key to sites table |
| `asset_id` | UUID | YES | NULL | Foreign key to assets table |
| `title` | VARCHAR(255) | NO | - | Work order title |
| `description` | TEXT | YES | NULL | Detailed description |
| `type` | VARCHAR(50) | NO | - | WO type: corrective, preventive, predictive, inspection, emergency |
| `priority` | VARCHAR(50) | NO | 'medium' | Priority: low, medium, high, critical |
| `status` | VARCHAR(50) | NO | 'draft' | Status: draft, open, in_progress, on_hold, completed, cancelled |
| `assigned_to` | UUID | YES | NULL | Assigned user ID (FK to users) |
| `crew_id` | UUID | YES | NULL | Assigned crew ID |
| `scheduled_start` | TIMESTAMPTZ | YES | NULL | Scheduled start time |
| `scheduled_end` | TIMESTAMPTZ | YES | NULL | Scheduled end time |
| `actual_start` | TIMESTAMPTZ | YES | NULL | Actual start time |
| `actual_end` | TIMESTAMPTZ | YES | NULL | Actual completion time |
| `estimated_duration_hours` | NUMERIC(6,2) | YES | NULL | Estimated duration in hours |
| `actual_duration_hours` | NUMERIC(6,2) | YES | NULL | Actual duration in hours |
| `maintenance_schedule_id` | UUID | YES | NULL | Generated from schedule (FK) |
| `metadata` | JSONB | YES | NULL | Additional WO data |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `created_by` | UUID | NO | - | User who created (FK to users) |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |
| `updated_by` | UUID | NO | - | User who last updated (FK to users) |
| `version` | INTEGER | NO | 1 | Optimistic locking version |

**Constraints:**
- `PK_work_orders`: PRIMARY KEY (`id`)
- `UQ_work_orders_work_order_id`: UNIQUE (`work_order_id`)
- `FK_work_orders_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`
- `FK_work_orders_site`: FOREIGN KEY (`site_id`) REFERENCES `sites(id)`
- `FK_work_orders_asset`: FOREIGN KEY (`asset_id`) REFERENCES `assets(id)`
- `FK_work_orders_assigned_to`: FOREIGN KEY (`assigned_to`) REFERENCES `users(id)`
- `FK_work_orders_created_by`: FOREIGN KEY (`created_by`) REFERENCES `users(id)`
- `CK_work_orders_type`: CHECK (`type` IN ('corrective', 'preventive', 'predictive', 'inspection', 'emergency'))
- `CK_work_orders_priority`: CHECK (`priority` IN ('low', 'medium', 'high', 'critical'))
- `CK_work_orders_status`: CHECK (`status` IN ('draft', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled'))
- `CK_work_orders_scheduled_dates`: CHECK (`scheduled_end` >= `scheduled_start`)
- `CK_work_orders_actual_dates`: CHECK (`actual_end` >= `actual_start` OR `actual_end` IS NULL)

**Indexes:**
- `idx_work_orders_tenant`: (`tenant_id`)
- `idx_work_orders_site`: (`site_id`, `status`)
- `idx_work_orders_asset`: (`asset_id`)
- `idx_work_orders_assigned_to`: (`assigned_to`, `status`)
- `idx_work_orders_status`: (`status`, `priority`)
- `idx_work_orders_scheduled`: (`scheduled_start`, `scheduled_end`)
- `idx_work_orders_created_at`: (`created_at` DESC)

**Partitioning:**
```sql
-- Partition by created_at (yearly)
CREATE TABLE work_orders_2025 PARTITION OF work_orders
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

**Business Rules:**
- Work order must belong to a site
- If asset specified, asset must belong to same site
- Scheduled end must be after scheduled start
- Status transitions follow state machine (See Spec 02)
- Critical priority work orders auto-notify supervisors

---

### 6. work_order_tasks

**Purpose:** Checklist items within a work order

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `work_order_id` | UUID | NO | - | Foreign key to work_orders table |
| `title` | VARCHAR(255) | NO | - | Task title |
| `description` | TEXT | YES | NULL | Task description |
| `sequence_order` | INTEGER | NO | - | Display order (1, 2, 3...) |
| `status` | VARCHAR(50) | NO | 'pending' | Status: pending, in_progress, completed, skipped |
| `assigned_to` | UUID | YES | NULL | Assigned user ID (FK to users) |
| `completed_at` | TIMESTAMPTZ | YES | NULL | Completion timestamp |
| `completed_by` | UUID | YES | NULL | User who completed (FK to users) |
| `completion_notes` | TEXT | YES | NULL | Notes from completion |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |

**Constraints:**
- `PK_work_order_tasks`: PRIMARY KEY (`id`)
- `FK_work_order_tasks_wo`: FOREIGN KEY (`work_order_id`) REFERENCES `work_orders(id)` ON DELETE CASCADE
- `FK_work_order_tasks_assigned_to`: FOREIGN KEY (`assigned_to`) REFERENCES `users(id)`
- `FK_work_order_tasks_completed_by`: FOREIGN KEY (`completed_by`) REFERENCES `users(id)`
- `UQ_work_order_tasks_sequence`: UNIQUE (`work_order_id`, `sequence_order`)
- `CK_work_order_tasks_status`: CHECK (`status` IN ('pending', 'in_progress', 'completed', 'skipped'))

**Indexes:**
- `idx_work_order_tasks_wo`: (`work_order_id`, `sequence_order`)
- `idx_work_order_tasks_assigned`: (`assigned_to`, `status`)

**Business Rules:**
- Tasks deleted when work order is deleted (CASCADE)
- Sequence order must be unique within work order
- Completed tasks must have completed_by user

---

### 7. work_order_parts

**Purpose:** Inventory parts consumed during work order execution

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `work_order_id` | UUID | NO | - | Foreign key to work_orders table |
| `inventory_item_id` | UUID | NO | - | Foreign key to inventory_items table |
| `quantity_consumed` | INTEGER | NO | - | Number of units consumed |
| `unit_cost` | NUMERIC(10,2) | YES | NULL | Cost per unit at time of consumption |
| `total_cost` | NUMERIC(10,2) | YES | NULL | Total cost (quantity × unit_cost) |
| `consumed_at` | TIMESTAMPTZ | NO | NOW() | Timestamp of consumption |
| `consumed_by` | UUID | NO | - | User who consumed (FK to users) |

**Constraints:**
- `PK_work_order_parts`: PRIMARY KEY (`id`)
- `FK_work_order_parts_wo`: FOREIGN KEY (`work_order_id`) REFERENCES `work_orders(id)` ON DELETE CASCADE
- `FK_work_order_parts_item`: FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items(id)`
- `FK_work_order_parts_consumed_by`: FOREIGN KEY (`consumed_by`) REFERENCES `users(id)`
- `CK_work_order_parts_quantity`: CHECK (`quantity_consumed` > 0)
- `CK_work_order_parts_cost`: CHECK (`unit_cost` >= 0 AND `total_cost` >= 0)

**Indexes:**
- `idx_work_order_parts_wo`: (`work_order_id`)
- `idx_work_order_parts_item`: (`inventory_item_id`)

**Business Rules:**
- Part consumption triggers inventory reduction
- Unit cost captured at consumption time (historical pricing)
- Total cost auto-calculated: `quantity_consumed × unit_cost`

---

### 8. inventory_items

**Purpose:** Spare parts and consumables inventory

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `site_id` | UUID | NO | - | Foreign key to sites table |
| `part_number` | VARCHAR(100) | NO | - | Manufacturer part number |
| `name` | VARCHAR(255) | NO | - | Part name/description |
| `description` | TEXT | YES | NULL | Detailed description |
| `category` | VARCHAR(100) | YES | NULL | Category: electrical, mechanical, consumable, etc. |
| `unit_of_measure` | VARCHAR(50) | NO | 'each' | Unit: each, kg, meter, liter, etc. |
| `quantity_on_hand` | INTEGER | NO | 0 | Current stock quantity |
| `min_quantity` | INTEGER | YES | NULL | Minimum stock level (reorder point) |
| `max_quantity` | INTEGER | YES | NULL | Maximum stock level |
| `unit_cost` | NUMERIC(10,2) | YES | NULL | Cost per unit |
| `vendor_id` | UUID | YES | NULL | Supplier (FK to vendors table) |
| `location` | VARCHAR(255) | YES | NULL | Storage location |
| `metadata` | JSONB | YES | NULL | Additional part metadata |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Constraints:**
- `PK_inventory_items`: PRIMARY KEY (`id`)
- `UQ_inventory_items_part_number`: UNIQUE (`tenant_id`, `site_id`, `part_number`)
- `FK_inventory_items_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`
- `FK_inventory_items_site`: FOREIGN KEY (`site_id`) REFERENCES `sites(id)`
- `CK_inventory_items_quantity`: CHECK (`quantity_on_hand` >= 0)
- `CK_inventory_items_min_max`: CHECK (`max_quantity` IS NULL OR `max_quantity` >= `min_quantity`)

**Indexes:**
- `idx_inventory_items_tenant`: (`tenant_id`)
- `idx_inventory_items_site`: (`site_id`)
- `idx_inventory_items_part_number`: (`part_number`)
- `idx_inventory_items_category`: (`category`)
- `idx_inventory_items_low_stock`: (`site_id`) WHERE `quantity_on_hand` <= `min_quantity`

**Business Rules:**
- Part number unique per site
- Negative quantities not allowed
- Alert when quantity_on_hand <= min_quantity
- Max quantity must be >= min quantity

---

## Security & Audit Tables

### 9. roles

**Purpose:** System roles (admin, supervisor, technician, viewer, etc.)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `role_name` | VARCHAR(100) | NO | - | Unique role name (e.g., "admin", "technician") |
| `display_name` | VARCHAR(255) | NO | - | Human-readable name |
| `description` | TEXT | YES | NULL | Role description |
| `is_system` | BOOLEAN | NO | FALSE | System role (cannot be deleted) |
| `tenant_id` | UUID | YES | NULL | Custom role (tenant-specific) or NULL for system roles |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Constraints:**
- `PK_roles`: PRIMARY KEY (`id`)
- `UQ_roles_role_name`: UNIQUE (`role_name`)
- `FK_roles_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`

**Indexes:**
- `idx_roles_tenant`: (`tenant_id`)
- `idx_roles_is_system`: (`is_system`)

**Sample Roles (System):**
- `admin`: Full system access
- `supervisor`: Manage work orders, assign tasks
- `technician`: Execute work orders, update tasks
- `viewer`: Read-only access

---

### 10. permissions

**Purpose:** Granular permissions (feature-level access control)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `permission_name` | VARCHAR(100) | NO | - | Permission name (e.g., "workorder:create") |
| `resource` | VARCHAR(100) | NO | - | Resource: workorder, asset, user, site, etc. |
| `action` | VARCHAR(50) | NO | - | Action: create, read, update, delete, execute |
| `description` | TEXT | YES | NULL | Permission description |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |

**Constraints:**
- `PK_permissions`: PRIMARY KEY (`id`)
- `UQ_permissions_name`: UNIQUE (`permission_name`)
- `CK_permissions_action`: CHECK (`action` IN ('create', 'read', 'update', 'delete', 'execute', 'admin'))

**Indexes:**
- `idx_permissions_resource`: (`resource`)

**Sample Permissions:**
- `workorder:create`: Create work orders
- `workorder:read`: View work orders
- `workorder:update`: Update work orders
- `workorder:delete`: Delete work orders
- `asset:admin`: Full asset management

---

### 11. user_roles

**Purpose:** Many-to-many relationship between users and roles

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | Foreign key to users table |
| `role_id` | UUID | NO | - | Foreign key to roles table |
| `assigned_at` | TIMESTAMPTZ | NO | NOW() | When role was assigned |
| `assigned_by` | UUID | YES | NULL | User who assigned (FK to users) |
| `expires_at` | TIMESTAMPTZ | YES | NULL | Role expiration (optional) |

**Constraints:**
- `PK_user_roles`: PRIMARY KEY (`id`)
- `UQ_user_roles`: UNIQUE (`user_id`, `role_id`)
- `FK_user_roles_user`: FOREIGN KEY (`user_id`) REFERENCES `users(id)` ON DELETE CASCADE
- `FK_user_roles_role`: FOREIGN KEY (`role_id`) REFERENCES `roles(id)` ON DELETE CASCADE
- `FK_user_roles_assigned_by`: FOREIGN KEY (`assigned_by`) REFERENCES `users(id)`

**Indexes:**
- `idx_user_roles_user`: (`user_id`)
- `idx_user_roles_role`: (`role_id`)
- `idx_user_roles_expires`: (`expires_at`) WHERE `expires_at` IS NOT NULL

**Business Rules:**
- User can have multiple roles
- Role can be assigned to multiple users
- User-role assignment deleted when user is deleted (CASCADE)

---

### 12. audit_logs

**Purpose:** Comprehensive audit trail for all critical actions

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `timestamp` | TIMESTAMPTZ | NO | NOW() | Event timestamp |
| `tenant_id` | UUID | NO | - | Foreign key to tenants table |
| `user_id` | UUID | YES | NULL | User who performed action (FK to users) |
| `action` | VARCHAR(100) | NO | - | Action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc. |
| `resource_type` | VARCHAR(100) | YES | NULL | Resource type: workorder, asset, user, etc. |
| `resource_id` | UUID | YES | NULL | Resource ID |
| `ip_address` | INET | YES | NULL | Client IP address |
| `user_agent` | TEXT | YES | NULL | Client user agent |
| `request_id` | UUID | YES | NULL | Request correlation ID |
| `changes` | JSONB | YES | NULL | Before/after values for updates |
| `metadata` | JSONB | YES | NULL | Additional context |
| `severity` | VARCHAR(50) | NO | 'info' | Severity: debug, info, warning, error, critical |

**Constraints:**
- `PK_audit_logs`: PRIMARY KEY (`id`)
- `FK_audit_logs_tenant`: FOREIGN KEY (`tenant_id`) REFERENCES `tenants(id)`
- `FK_audit_logs_user`: FOREIGN KEY (`user_id`) REFERENCES `users(id)` ON DELETE SET NULL
- `CK_audit_logs_severity`: CHECK (`severity` IN ('debug', 'info', 'warning', 'error', 'critical'))

**Indexes:**
- `idx_audit_logs_tenant`: (`tenant_id`, `timestamp` DESC)
- `idx_audit_logs_user`: (`user_id`, `timestamp` DESC)
- `idx_audit_logs_resource`: (`resource_type`, `resource_id`)
- `idx_audit_logs_action`: (`action`, `timestamp` DESC)
- `idx_audit_logs_timestamp`: (`timestamp` DESC)

**Partitioning:**
```sql
-- Partition by timestamp (monthly)
CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

**Business Rules:**
- Immutable: No updates or deletes allowed
- Retention: 7 years for compliance
- Append-only table

**Sample Events:**
- `LOGIN_SUCCESS`: User logged in
- `LOGIN_FAILED`: Failed login attempt
- `WORKORDER_CREATED`: Work order created
- `WORKORDER_STATE_CHANGED`: Work order status changed
- `ASSET_DELETED`: Asset soft-deleted
- `PERMISSION_DENIED`: Authorization failure

---

## Time-Series Tables

### 13. telemetry_data (QuestDB)

**Purpose:** Raw telemetry data from SCADA systems (high-throughput)

**Note:** This table resides in QuestDB, not PostgreSQL

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | TIMESTAMP | Event timestamp (partition key) |
| `site_id` | SYMBOL | Site identifier (indexed) |
| `asset_id` | SYMBOL | Asset identifier (indexed) |
| `tag` | SYMBOL | Tag/sensor identifier (e.g., "INV-01.Power") |
| `value` | DOUBLE | Numeric value |
| `quality` | SYMBOL | Data quality: GOOD, BAD, UNCERTAIN |
| `source_protocol` | SYMBOL | Source: modbus, opcua, iec61850, dnp3 |
| `ingested_at` | TIMESTAMP | Edge gateway timestamp |
| `metadata` | VARCHAR | Optional JSON metadata |

**Schema:**
```sql
CREATE TABLE telemetry_data (
  timestamp TIMESTAMP,
  site_id SYMBOL,
  asset_id SYMBOL,
  tag SYMBOL,
  value DOUBLE,
  quality SYMBOL,
  source_protocol SYMBOL,
  ingested_at TIMESTAMP,
  metadata VARCHAR
) TIMESTAMP(timestamp) PARTITION BY DAY;
```

**Indexes:** Automatic on SYMBOL columns (site_id, asset_id, tag, quality)

**Data Volume:** 72,000 events/sec = 6.2 billion rows/day

**Retention:** 90 days (hot data), then archived to S3/Iceberg

**Business Rules:**
- Timestamp is partition key (daily partitions)
- High-speed ingestion optimized
- No updates or deletes (append-only)
- Quality flag tracks data reliability

---

### 14. telemetry_aggregates (TimescaleDB)

**Purpose:** Pre-aggregated telemetry data for dashboards

**Note:** This is a TimescaleDB hypertable in PostgreSQL

| Column | Type | Description |
|--------|------|-------------|
| `time` | TIMESTAMPTZ | Time bucket start |
| `site_id` | UUID | Site identifier |
| `asset_id` | UUID | Asset identifier |
| `tag` | VARCHAR(100) | Tag identifier |
| `interval` | VARCHAR(10) | Interval: 1min, 5min, 15min, 1hour, 1day |
| `avg_value` | DOUBLE PRECISION | Average value |
| `min_value` | DOUBLE PRECISION | Minimum value |
| `max_value` | DOUBLE PRECISION | Maximum value |
| `sum_value` | DOUBLE PRECISION | Sum of values |
| `count` | BIGINT | Number of readings |
| `stddev` | DOUBLE PRECISION | Standard deviation |
| `good_count` | BIGINT | Count of GOOD quality readings |
| `bad_count` | BIGINT | Count of BAD quality readings |
| `uncertain_count` | BIGINT | Count of UNCERTAIN quality readings |
| `created_at` | TIMESTAMPTZ | Aggregation timestamp |

**Schema:**
```sql
CREATE TABLE telemetry_aggregates (
  time TIMESTAMPTZ NOT NULL,
  site_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  tag VARCHAR(100) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  avg_value DOUBLE PRECISION,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  sum_value DOUBLE PRECISION,
  count BIGINT,
  stddev DOUBLE PRECISION,
  good_count BIGINT,
  bad_count BIGINT,
  uncertain_count BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('telemetry_aggregates', 'time');
```

**Indexes:**
- `idx_telemetry_agg_site`: (`site_id`, `time` DESC)
- `idx_telemetry_agg_asset`: (`asset_id`, `time` DESC)
- `idx_telemetry_agg_tag`: (`tag`, `time` DESC)

**Retention:** 5 years (compressed)

---

## ML/AI Tables

### 15. model_registry

**Purpose:** ML model metadata and versioning

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `model_name` | VARCHAR(255) | NO | - | Model name (e.g., "inverter-failure-predictor") |
| `model_version` | VARCHAR(50) | NO | - | Version (e.g., "v1.0.0") |
| `model_type` | VARCHAR(100) | NO | - | Type: classifier, regressor, anomaly-detector |
| `framework` | VARCHAR(50) | NO | - | Framework: scikit-learn, tensorflow, pytorch |
| `model_uri` | TEXT | NO | - | Storage location (S3 path) |
| `hyperparameters` | JSONB | YES | NULL | Model hyperparameters |
| `metrics` | JSONB | YES | NULL | Performance metrics (accuracy, precision, recall) |
| `status` | VARCHAR(50) | NO | 'staging' | Status: staging, production, archived |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Model training timestamp |
| `created_by` | UUID | NO | - | User/system that created (FK to users) |

**Constraints:**
- `PK_model_registry`: PRIMARY KEY (`id`)
- `UQ_model_registry_version`: UNIQUE (`model_name`, `model_version`)
- `CK_model_registry_status`: CHECK (`status` IN ('staging', 'production', 'archived'))

**Indexes:**
- `idx_model_registry_name`: (`model_name`, `model_version`)
- `idx_model_registry_status`: (`status`)

**Business Rules:**
- Only one model version can be in 'production' status per model name
- Model URI must be valid S3 path

---

### 16. predictions

**Purpose:** ML model predictions (predictive maintenance)

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `model_id` | UUID | NO | - | Foreign key to model_registry table |
| `asset_id` | UUID | NO | - | Foreign key to assets table |
| `prediction_type` | VARCHAR(100) | NO | - | Type: failure-risk, remaining-life, anomaly |
| `prediction_output` | JSONB | NO | - | Prediction results (probability, class, etc.) |
| `confidence_score` | NUMERIC(5,4) | YES | NULL | Model confidence (0.0-1.0) |
| `features` | JSONB | YES | NULL | Feature values used for prediction |
| `prediction_timestamp` | TIMESTAMPTZ | NO | NOW() | When prediction was made |
| `work_order_id` | UUID | YES | NULL | Auto-generated work order (if high risk) |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Record creation timestamp |

**Constraints:**
- `PK_predictions`: PRIMARY KEY (`id`)
- `FK_predictions_model`: FOREIGN KEY (`model_id`) REFERENCES `model_registry(id)`
- `FK_predictions_asset`: FOREIGN KEY (`asset_id`) REFERENCES `assets(id)`
- `FK_predictions_wo`: FOREIGN KEY (`work_order_id`) REFERENCES `work_orders(id)` ON DELETE SET NULL
- `CK_predictions_confidence`: CHECK (`confidence_score` >= 0.0 AND `confidence_score` <= 1.0)

**Indexes:**
- `idx_predictions_asset`: (`asset_id`, `prediction_timestamp` DESC)
- `idx_predictions_model`: (`model_id`)
- `idx_predictions_timestamp`: (`prediction_timestamp` DESC)

**Business Rules:**
- If failure probability >= 0.7 → auto-create predictive work order
- Predictions retained for 1 year

---

## Common Patterns

### Soft Delete

Tables with soft delete support:
- `users`
- `assets`
- `work_orders` (future)

**Columns:**
```sql
deleted BOOLEAN NOT NULL DEFAULT FALSE,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES users(id)
```

**Unique Constraints with Soft Delete:**
```sql
UNIQUE (tenant_id, email) WHERE deleted = FALSE
```

---

### Audit Fields

All tables include audit fields:

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id)
```

**Trigger:**
```sql
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### Optimistic Locking

Critical tables use version column:

```sql
version INTEGER NOT NULL DEFAULT 1
```

**Update Example:**
```sql
UPDATE work_orders
SET status = 'in_progress', version = version + 1
WHERE id = ? AND version = 5;

-- If 0 rows updated → concurrent modification detected
```

---

## Business Rules

### Work Order State Machine

**Valid Transitions (See Spec 02):**
```
draft → open (submit)
open → in_progress (start)
open → cancelled (cancel)
in_progress → on_hold (pause)
in_progress → completed (complete)
in_progress → cancelled (cancel)
on_hold → in_progress (resume)
on_hold → cancelled (cancel)
```

**Validation Trigger:**
```sql
CREATE TRIGGER validate_work_order_state_transition
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_state_transition();
```

---

### Asset Hierarchy

**Prevent Circular References:**
```sql
CREATE TRIGGER prevent_asset_circular_reference
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION check_asset_hierarchy_cycle();
```

**Max Depth Check:**
```sql
CHECK (hierarchy_level >= 0 AND hierarchy_level <= 5)
```

---

### Inventory Management

**Low Stock Alert:**
```sql
CREATE TRIGGER inventory_low_stock_alert
  AFTER UPDATE ON inventory_items
  FOR EACH ROW
  WHEN (NEW.quantity_on_hand <= NEW.min_quantity AND
        OLD.quantity_on_hand > OLD.min_quantity)
  EXECUTE FUNCTION send_low_stock_alert();
```

---

## References

- [ERD Diagram](./erd-diagram.md)
- [Spec 11: Complete Data Models](../../specs/11_COMPLETE_DATA_MODELS.md)
- [System Architecture](../architecture/system-architecture.md)

---

**Last Updated:** 2025-11-18
**Next Review:** Sprint 1 (during schema implementation)
**Status:** ✅ Approved for Implementation
