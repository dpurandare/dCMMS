# dCMMS Role-to-Feature Access Matrix

**Version:** 1.0
**Date:** November 8, 2025
**Based on:** Industry Research - Solar, Wind, BESS Operations
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Master Access Matrix](#1-master-access-matrix)
2. [Feature-Level Permissions](#2-feature-level-permissions)
3. [Data Access Patterns](#3-data-access-patterns)
4. [Mobile vs Web Access](#4-mobile-vs-web-access)
5. [API Permission Mapping](#5-api-permission-mapping)

---

## 1. Master Access Matrix

### Legend
- ✅ **Full Access** - Create, Read, Update, Delete
- 📖 **Read Only** - View only, no modifications
- 📝 **Create/Update** - Can create new and update existing
- ⚡ **Assigned Only** - Limited to items assigned to user
- 🚫 **No Access** - Cannot view or access
- 💰 **No Cost Data** - Can access but financial data hidden
- ⏰ **Time-Limited** - Access expires after contract period

---

## 2. Core Feature Access Matrix

### 2.1 Work Order Management

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Work Orders** | 📖 All sites | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 📖 Monitored sites | 📖 Own site | 📖 Own site | 📖 All sites | 📖 All sites | ⚡ Assigned | ⚡ Assigned |
| **Create Work Orders** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | ✅ From alarms | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Edit Work Orders** | 🚫 | ✅ | ✅ | ✅ | ✅ Own team | ⚡ Assigned (limited) | ⚡ Assigned (limited) | ⚡ Assigned (limited) | ⚡ Assigned (limited) | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ⚡ Assigned (limited) | ⚡ Assigned (limited) |
| **Delete Work Orders** | 🚫 | ✅ Draft only | ✅ Draft only | ✅ Draft only | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Approve Work Orders** | 🚫 | ✅ | ✅ Limited $ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Assign Work Orders** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Execute Work (Start/Complete)** | 🚫 | ✅ | ✅ | 🚫 | ✅ | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ⚡ Assigned | ⚡ Assigned |
| **Verify Completed Work** | 🚫 | ✅ | ✅ | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Close Work Orders** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Cancel Work Orders** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **View Work Order Costs** | ✅ All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 📖 Parts only | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **Add Attachments** | 🚫 | ✅ | ✅ | ✅ | ✅ | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 🚫 | 🚫 | ✅ Safety docs | 🚫 | ✅ Compliance docs | ⚡ Assigned | ⚡ Assigned |
| **Record Labor Hours** | 🚫 | ✅ | ✅ | 🚫 | ✅ | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ⚡ Assigned | ⚡ Assigned |
| **Record Parts Used** | 🚫 | ✅ | ✅ | 🚫 | ✅ | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | ⚡ Assigned | ⚡ Assigned |
| **Bulk Work Order Operations** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

### 2.2 Asset Management

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Assets** | 📖 All sites | ✅ Own site | ✅ Own site | 📖 Own site | 📖 Own site | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | 📖 Monitored | 📖 Own site | 📖 Own site | 📖 All sites | 📖 All sites | ⚡ WO-related | ⚡ WO-related |
| **Create Assets** | 🚫 | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Edit Asset Details** | 🚫 | ✅ | ✅ | 📝 Limited | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Update Asset Status** | 🚫 | ✅ | ✅ | 🚫 | 📝 Field status | 📝 Field status | 📝 Field status | 📝 Field status | 📝 Field status | 📝 Remote status | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Decommission Assets** | 🚫 | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **View Asset Hierarchy** | 📖 All | ✅ Own site | ✅ Own site | 📖 Own site | 📖 Own site | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | 📖 Monitored | 📖 Own site | 📖 Own site | 📖 All | 📖 All | ⚡ WO-related | ⚡ WO-related |
| **View Asset History** | 📖 All | ✅ Own site | ✅ Own site | 📖 Own site | 📖 Own site | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | ⚡ WO-related | 📖 Monitored | 📖 Own site | 📖 Safety history | 📖 All | 📖 All | 🚫 | 🚫 |
| **View Telemetry Data** | 📖 All sites | ✅ Own site | ✅ Own site | 📖 Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 📖 BESS only | ✅ Monitored | 🚫 | 🚫 | ✅ All | 🚫 | 🚫 | 🚫 |
| **Upload Asset Documents** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Safety docs | 🚫 | ✅ Certificates | 🚫 | 🚫 |
| **Update Asset Location (GPS)** | 🚫 | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

### 2.3 Inventory & Parts Management

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Inventory** | 📖 Aggregated | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Availability | 📖 Availability | 📖 Availability | 📖 Availability | 🚫 | ✅ Own site | 🚫 | 📖 All | 🚫 | 💰 WO-related | 💰 WO-related |
| **Add New Parts** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Update Part Details** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Adjust Inventory Qty** | 🚫 | ✅ Approval | ✅ Approval | ✅ Approval | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Reserve Parts** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 Auto | 🚫 Auto | 🚫 Auto | 🚫 Auto | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Issue Parts** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Consume Parts (WO)** | 🚫 | ✅ | ✅ | 🚫 | ✅ | ⚡ Assigned WO | ⚡ Assigned WO | ⚡ Assigned WO | ⚡ Assigned WO | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | ⚡ Assigned WO | ⚡ Assigned WO |
| **Return Parts** | 🚫 | ✅ | ✅ | ✅ | ✅ | ⚡ From WO | ⚡ From WO | ⚡ From WO | ⚡ From WO | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **View Part Costs** | ✅ All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Own site | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **Initiate Purchase Req** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Receive Shipments** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Cycle Count** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

### 2.4 Scheduling & Planning

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Schedule/Calendar** | 📖 All sites | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | ⚡ Assigned | 📖 Monitored | 📖 Own site | 📖 Own site | 📖 All | 📖 All | ⚡ Assigned | ⚡ Assigned |
| **Create PM Schedules** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Edit PM Schedules** | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Assign Work to Techs** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Drag-Drop Scheduling** | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Reschedule Work** | 🚫 | ✅ | ✅ | ✅ | ✅ Limited | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **View Crew Utilization** | 📖 All | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **Request Time Off** | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| **Approve Time Off** | 🚫 | ✅ | ✅ | 🚫 | ✅ Own team | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

### 2.5 Dashboards & Reporting

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **Executive Dashboard** | ✅ Portfolio | ✅ Own site | 📖 Own site | 📖 Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ All | 🚫 | 🚫 | 🚫 |
| **Operations Dashboard** | 📖 All | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Personal | 📖 Personal | 📖 Personal | 📖 Personal | ✅ Monitored | 📖 Own site | 📖 Own site | ✅ All | 📖 All | 🚫 | 🚫 |
| **Maintenance Backlog** | 📖 All | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Assigned | 📖 Assigned | 📖 Assigned | 📖 Assigned | 🚫 | 🚫 | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **SLA Compliance Report** | ✅ All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 📖 All | ✅ All | 🚫 | 🚫 |
| **Cost Reports** | ✅ All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 📖 Inventory | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **Safety Metrics** | 📖 All | ✅ Own site | 📖 Own site | 📖 Own site | ✅ Own site | 📖 Personal | 📖 Personal | 📖 Personal | 📖 Personal | 🚫 | 🚫 | ✅ All | 📖 All | 📖 All | 🚫 | 🚫 |
| **Asset Performance** | ✅ All | ✅ Own site | ✅ Own site | 📖 Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 📖 BESS only | ✅ Monitored | 🚫 | 🚫 | ✅ All | 📖 All | 🚫 | 🚫 |
| **Technician Productivity** | 📖 All | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own | 📖 Own | 📖 Own | 📖 Own | 🚫 | 🚫 | 🚫 | 📖 All | 🚫 | 🚫 | 🚫 |
| **Export Reports (CSV/PDF)** | ✅ All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Inventory | ✅ Safety | ✅ All | ✅ Compliance | 🚫 | 🚫 |
| **Custom Report Builder** | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| **Schedule Reports (email)** | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ | ✅ | 🚫 | 🚫 |

---

### 2.6 User & System Administration

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Users** | 📖 All | ✅ Own site | 📖 Own site | 📖 Own site | 📖 Own team | 🚫 | 🚫 | 🚫 | 🚫 | 📖 Operators | 🚫 | 📖 Own site | 📖 All | 📖 All | 🚫 | 🚫 |
| **Create Users** | 🚫 | ✅ Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Edit User Profiles** | 🚫 | ✅ Own site | 🚫 | 🚫 | 🚫 | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| **Assign Roles** | 🚫 | ✅ Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Deactivate Users** | 🚫 | ✅ Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Manage Skills/Certs** | 🚫 | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Own team | ✅ Own | ✅ Own | ✅ Own | ✅ Own | 🚫 | 🚫 | ✅ All certs | 🚫 | ✅ Compliance certs | 🚫 Upload own | 🚫 Upload own |
| **View Audit Logs** | 📖 Portfolio | ✅ Own site | 📖 Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Safety events | 📖 All | ✅ All | 🚫 | 🚫 |
| **System Settings** | 🚫 | ✅ Site config | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| **Integration Config** | 🚫 | ✅ | ✅ SCADA | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ SCADA | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

### 2.7 Safety & Compliance

| Feature | Portfolio Mgr | Plant Mgr | Site Eng | O&M Coord | Maint Supv | Elec Tech | Mech Tech | Wind Tech | BESS Spec | SCADA Op | Inventory | EHS | Reliability | Compliance | Contractor OEM | Contractor O&M |
|---------|--------------|-----------|----------|-----------|------------|-----------|-----------|-----------|-----------|----------|-----------|-----|-------------|------------|----------------|----------------|
| **View Safety Procedures** | 📖 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 📖 | ✅ | ✅ | ✅ |
| **Acknowledge Safety Docs** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Complete Safety Checklists** | 🚫 | ✅ | ✅ | 🚫 | ✅ | ⚡ WO-required | ⚡ WO-required | ⚡ WO-required | ⚡ WO-required | 🚫 | 🚫 | ✅ | 🚫 | 🚫 | ⚡ WO-required | ⚡ WO-required |
| **Submit Permit-to-Work** | 🚫 | ✅ | ✅ | ✅ | ✅ | ✅ Request | ✅ Request | ✅ Request | ✅ Request | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Request | ✅ Request |
| **Approve Permits** | 🚫 | ✅ | ✅ | 🚫 | ✅ LOTO only | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ All | 🚫 | 🚫 | 🚫 | 🚫 |
| **Report Incidents** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Investigate Incidents** | 🚫 | ✅ | ✅ | 🚫 | ✅ Minor | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ All | 🚫 | 📖 | 🚫 | 🚫 |
| **Manage Compliance Certs** | 📖 All | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Safety certs | 📖 All | ✅ All | 🚫 | 🚫 |
| **Generate Compliance Reports** | 📖 All | ✅ Own site | 📖 Own site | 📖 Own site | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Safety | 📖 All | ✅ Regulatory | 🚫 | 🚫 |

---

## 3. Data Access Patterns

### 3.1 Geographic Scope

| Role | Single Site | Multiple Sites | All Sites (Portfolio) | Cross-Owner Sites |
|------|------------|----------------|----------------------|------------------|
| Portfolio Manager | 🚫 | ✅ Assigned portfolio | ✅ Same O&M contractor | 🚫 Data isolated |
| Plant Manager | ✅ Assigned site only | 🚫 | 🚫 | 🚫 |
| Site Engineer | ✅ Assigned site only | 🚫 | 🚫 | 🚫 |
| O&M Coordinator | ✅ Assigned site(s) | ✅ May cover 2-3 small sites | 🚫 | 🚫 |
| Maintenance Supervisor | ✅ Assigned site only | 🚫 | 🚫 | 🚫 |
| Field Technicians | ⚡ Assigned WOs only | ⚡ If traveling tech | 🚫 | 🚫 |
| SCADA Operator | 🚫 | ✅ All monitored sites | ✅ Control center coverage | 🚫 Data isolated |
| Reliability Engineer | 📖 Read-only | 📖 All in portfolio | ✅ For analysis | 🚫 Aggregated only |
| Compliance Officer | 📖 Read-only | 📖 All in region | ✅ For compliance | 🚫 Data isolated |
| Contractors | ⚡ Assigned WO site only | 🚫 | 🚫 | 🚫 |

### 3.2 Time-Based Access

| Role | Historical Data | Real-Time Data | Future Schedules |
|------|----------------|----------------|------------------|
| Portfolio Manager | ✅ All history | 📖 Dashboards only | ✅ Forecasts |
| Plant Manager | ✅ All site history | ✅ SCADA + WOs | ✅ Full schedule |
| Site Engineer | ✅ All site history | ✅ SCADA + WOs | ✅ Full schedule |
| Field Technicians | ⚡ Assigned WO history | 🚫 | ⚡ Assigned schedule |
| SCADA Operator | 📖 Recent history (30 days) | ✅ Real-time monitoring | 📖 Scheduled outages |
| Reliability Engineer | ✅ All history for analysis | ✅ Telemetry streams | 📖 PM schedules |
| Contractors | ⏰ Contract period only | ⚡ Assigned WO only | ⚡ Assigned schedule |

### 3.3 Financial Data Access

| Role | Part Costs | Labor Costs | Total WO Cost | Budget Data | Invoice Data |
|------|-----------|-------------|---------------|-------------|--------------|
| Portfolio Manager | ✅ All | ✅ All | ✅ All | ✅ Portfolio budget | ✅ All invoices |
| Plant Manager | ✅ Own site | ✅ Own site | ✅ Own site | ✅ Site budget | ✅ Site invoices |
| Site Engineer | ✅ Own site | ✅ Own site | ✅ Own site | 📖 Site budget | 📖 Review invoices |
| O&M Coordinator | ✅ Own site | 📖 Aggregated | ✅ Own site | 📖 PM budget | 📖 Parts invoices |
| Maintenance Supervisor | 📖 Parts only | 📖 Own team | 📖 Estimated | 🚫 | 🚫 |
| Field Technicians | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| Inventory Coordinator | ✅ Parts | 🚫 | 🚫 | 📖 Inventory budget | ✅ Parts invoices |
| All Contractors | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |

---

## 4. Mobile vs Web Access

### 4.1 Mobile App Access (iOS/Android/PWA)

**Primary Mobile Users:**
- Field Technicians (all types) - **95% mobile, 5% web**
- Maintenance Supervisors - **70% mobile, 30% web**
- BESS Specialists - **80% mobile, 20% web**
- Contractors - **90% mobile, 10% web**

**Mobile Features Required:**
- Work order execution (start, update, complete)
- Photo/video capture and upload
- Barcode/QR code scanning
- GPS location capture
- Offline mode (critical - see section 4.2)
- Voice-to-text notes
- Digital signatures
- Safety checklists
- Parts lookup and consumption

**Limited Mobile Users:**
- Plant Manager - **30% mobile, 70% web** (field inspections, approvals on-the-go)
- Site Engineer - **40% mobile, 60% web** (field verification, SCADA on laptop)
- O&M Coordinator - **20% mobile, 80% web** (primarily desktop planning)

**Web-Only Users:**
- Portfolio Manager - **100% web** (executive dashboards)
- SCADA Operators - **100% web** (multi-monitor control room)
- Reliability Engineers - **100% web** (data analysis tools)
- Compliance Officers - **100% web** (reporting and document review)

### 4.2 Offline Mode Requirements

**Critical for:**
- All field technician roles
- Maintenance supervisors (field presence)
- Plant managers (site walks)

**Offline Capabilities:**
| Feature | Offline Support |
|---------|-----------------|
| View assigned work orders | ✅ Full offline |
| Update work order status | ✅ Queued for sync |
| Add photos/attachments | ✅ Queued for upload |
| Record parts used | ✅ Queued for sync |
| Log labor hours | ✅ Queued for sync |
| Complete safety checklists | ✅ Queued for sync |
| View asset details | ✅ Cached data |
| View inventory availability | ⚠️ Last synced values |
| Create new work orders | ⚠️ Limited (emergency only) |
| View real-time SCADA data | 🚫 Requires connectivity |

**Data Sync Priority (when online):**
1. Safety incidents / emergency work orders
2. Work order completions
3. Parts consumption
4. Photos/attachments (compressed)
5. Labor time logs
6. Non-critical updates

---

## 5. API Permission Mapping

### 5.1 Permission Syntax

Format: `<action>:<resource>:<scope>`

Examples:
- `read:work-orders:all` - Read all work orders across all sites
- `create:work-orders:own-site` - Create work orders for assigned site
- `execute:work-orders:assigned` - Execute only assigned work orders
- `approve:work-orders:budget-10k` - Approve work orders up to $10,000

### 5.2 Role-to-Permission Assignment

#### Portfolio Manager
```json
{
  "role": "portfolio-manager",
  "permissions": [
    "read:work-orders:portfolio",
    "read:assets:portfolio",
    "read:inventory:portfolio",
    "read:reports:portfolio",
    "export:reports:portfolio",
    "read:dashboards:executive",
    "read:costs:portfolio",
    "read:compliance:portfolio"
  ],
  "scope": {
    "siteIds": ["*"],  // All sites in portfolio
    "portfolioId": "portfolio-123"
  }
}
```

#### Plant Manager
```json
{
  "role": "plant-manager",
  "permissions": [
    "create:work-orders:own-site",
    "read:work-orders:own-site",
    "update:work-orders:own-site",
    "delete:work-orders:draft",
    "approve:work-orders:budget-100k",
    "assign:work-orders:own-site",
    "verify:work-orders:own-site",
    "close:work-orders:own-site",
    "create:assets:own-site",
    "read:assets:own-site",
    "update:assets:own-site",
    "manage:inventory:own-site",
    "read:reports:own-site",
    "export:reports:own-site",
    "manage:users:own-site",
    "read:costs:own-site",
    "configure:site-settings"
  ],
  "scope": {
    "siteIds": ["SITE-ALPHA-001"]
  }
}
```

#### Field Technician (Electrical)
```json
{
  "role": "field-technician-electrical",
  "permissions": [
    "read:work-orders:assigned",
    "update:work-orders:assigned-fields",  // Limited fields: status, notes, attachments
    "execute:work-orders:assigned",
    "read:assets:wo-related",
    "read:inventory:availability",
    "consume:parts:assigned-wo",
    "upload:attachments:assigned-wo",
    "log:labor:own",
    "read:procedures:all",
    "complete:safety-checklists",
    "request:permits",
    "report:incidents",
    "read:profile:own",
    "update:profile:own"
  ],
  "scope": {
    "siteIds": ["SITE-ALPHA-001"],
    "userId": "user-123"
  }
}
```

#### SCADA Operator
```json
{
  "role": "scada-operator",
  "permissions": [
    "read:assets:monitored-sites",
    "update:assets:status-remote",  // Remote status updates
    "read:telemetry:monitored-sites",
    "read:alarms:monitored-sites",
    "create:work-orders:from-alarms",
    "read:work-orders:monitored-sites",
    "update:scada-config:monitored-sites",
    "read:dashboards:scada",
    "export:reports:availability"
  ],
  "scope": {
    "siteIds": ["SITE-ALPHA-001", "SITE-BETA-002", "SITE-GAMMA-003"],  // All monitored
    "controlCenterId": "control-center-west"
  }
}
```

#### Contractor (OEM)
```json
{
  "role": "contractor-oem",
  "permissions": [
    "read:work-orders:assigned",
    "update:work-orders:assigned-status",
    "read:assets:wo-related-no-cost",  // Cost data hidden
    "consume:parts:assigned-wo-warranty",  // Only warranty parts
    "upload:attachments:assigned-wo",
    "log:labor:own",
    "complete:safety-checklists",
    "read:procedures:safety-only"
  ],
  "scope": {
    "siteIds": ["SITE-ALPHA-001"],
    "userId": "contractor-456",
    "contractExpiry": "2026-12-31",  // Time-limited access
    "dataVisibility": "minimal"  // Flag for hiding sensitive data
  }
}
```

---

## 6. Implementation Notes

### 6.1 Role Assignment Workflow

**New Employee Onboarding:**
1. HR creates user account (email, name, employee ID)
2. Plant Manager assigns role + site(s)
3. O&M Coordinator assigns skills/certifications
4. EHS Officer confirms safety training completion
5. User receives welcome email with login credentials
6. User completes MFA setup
7. Access activated

**Contractor Onboarding:**
1. Procurement creates contractor company profile
2. Plant Manager creates individual contractor users
3. Contractor users assigned to specific work orders
4. Access auto-expires when contract ends
5. Contractor data archived (not deleted for audit)

### 6.2 Dynamic Permission Evaluation

**Context-Aware Permissions:**
```javascript
// Example: Technician can only execute WO if:
// 1. WO is assigned to them
// 2. Current time is within scheduled window (±2 hours)
// 3. They have required skills
// 4. Permit is approved (if required)

function canExecuteWorkOrder(user, workOrder) {
  if (workOrder.assignedTo !== user.userId) return false;
  if (!user.skills.includes(...workOrder.requiredSkills)) return false;
  if (workOrder.requiresPermit && workOrder.permit.status !== 'approved') return false;
  const now = new Date();
  const scheduledStart = new Date(workOrder.scheduledStart);
  const timeDiff = Math.abs(now - scheduledStart) / (1000 * 60 * 60); // hours
  if (timeDiff > 2) return false;  // More than 2 hours outside schedule
  return true;
}
```

### 6.3 Role Hierarchy (Escalation Paths)

```
Incident Occurs → Field Technician reports
                ↓
      Maintenance Supervisor acknowledges
                ↓
       Site Engineer investigates
                ↓
      Plant Manager approves corrective action
                ↓
      (If major incident) → Portfolio Manager notified
```

**Approval Escalation:**
- Work order >$10k → Maintenance Supervisor → Site Engineer → Plant Manager
- Work order >$100k → Plant Manager → Portfolio Manager → Asset Owner

---

## 7. Role Access Summary Table

**Quick Reference:**

| Role | Primary Device | Offline Required | Sites Access | Financial Data | Create WO | Execute WO | Approve WO | Manage Inventory | Export Reports |
|------|---------------|------------------|--------------|----------------|-----------|------------|------------|------------------|----------------|
| Portfolio Manager | Web | No | Multiple | ✅ All | 🚫 | 🚫 | 🚫 | 🚫 | ✅ |
| Plant Manager | Web + Mobile | Sometimes | Single | ✅ Site | ✅ | ✅ | ✅ | ✅ | ✅ |
| Site Engineer | Web + Mobile | Sometimes | Single | ✅ Site | ✅ | ✅ | ✅ Limited | ✅ | ✅ |
| O&M Coordinator | Web | No | 1-3 | ✅ Site | ✅ | 🚫 | 🚫 | ✅ Reserve | ✅ |
| Maintenance Supervisor | Mobile + Web | Yes | Single | 📖 | ✅ | ✅ | 🚫 | ✅ Issue | 🚫 |
| Field Techs (all) | Mobile | **Yes** | Assigned | 🚫 | 🚫 | ⚡ Assigned | 🚫 | ⚡ Consume | 🚫 |
| SCADA Operator | Web | No | Multiple | 🚫 | ✅ Alarms | 🚫 | 🚫 | 🚫 | ✅ Availability |
| Inventory Coordinator | Web | No | Single | ✅ Parts | 🚫 | 🚫 | 🚫 | ✅ Full | ✅ Inventory |
| EHS Officer | Web + Mobile | Sometimes | Single | 🚫 | 🚫 | 🚫 | ✅ Permits | 🚫 | ✅ Safety |
| Reliability Engineer | Web | No | All | 📖 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Performance |
| Compliance Officer | Web | No | All | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ Compliance |
| Contractor OEM | Mobile | **Yes** | Assigned | 🚫 | 🚫 | ⚡ Assigned | 🚫 | ⚡ Warranty parts | 🚫 |
| Contractor O&M | Mobile | **Yes** | Assigned | 🚫 | 🚫 | ⚡ Assigned | 🚫 | 🚫 | 🚫 |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | Industry Research | Initial role-feature access matrix based on solar, wind, BESS operations |

