# dCMMS Data Dictionary

This document provides a reference for the entity relationship diagram (ERD) and data schema used in dCMMS.

## Core Entities

### Tenants (`tenants`)
- **Purpose**: Multi-tenancy isolation. All major entities belong to a tenant.
- **Key Columns**: `id` (PK, UUID), `tenantId` (Human-readable ID).

### Users (`users`)
- **Purpose**: System users, including technicians, admins, and operators.
- **Key Columns**: `id` (PK), `username`, `role` (EnumType).

### Sites (`sites`)
- **Purpose**: Physical locations (e.g., Solar Farm A, Wind Park B).
- **Key Columns**: `id` (PK), `siteId`.

### Assets (`assets`)
- **Purpose**: Physical equipment (Inverters, Turbines, Panels).
- **Key Columns**: `id` (PK), `assetId`, `parentId` (Hierarchy), `status`.

## Work Order Management

### Work Orders (`work_orders`)
- **Purpose**: Main operational unit for maintenance.
- **Key Columns**: `id`, `status` (Draft, Open, In Progress...), `priority`, `assignedTo`.

### Work Order Tasks (`work_order_tasks`)
- **Purpose**: Granular steps within a work order.
- **Key Columns**: `workOrderId` (FK), `isCompleted`.

### Permits (`permits`)
- **Purpose**: Safety permits required before hazardous work.
- **Key Columns**: `id`, `type` (Hot Work, etc.), `status`, `validFrom`, `validUntil`.

## Offline Mobile Sync
Currently managed via Drift (SQLite) on mobile and synced via API.

### Sync Queue (`sync_queue`) (Mobile Only)
- **Purpose**: Tracks offline changes to be pushed to backend.
- **Columns**: `operation`, `table`, `payload`, `status`.

## Telemetry & Alerts

### Alerts (`alerts`)
- **Purpose**: System-generated or user-generated alarms.
- **Key Columns**: `severity`, `status`, `triggeredAt`.
