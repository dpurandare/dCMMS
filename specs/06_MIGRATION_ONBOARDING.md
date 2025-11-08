# dCMMS Migration & Onboarding Plan

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Site Onboarding Overview](#1-site-onboarding-overview)
2. [Data Migration](#2-data-migration)
3. [System Integration](#3-system-integration)
4. [User Onboarding](#4-user-onboarding)
5. [Go-Live Checklist](#5-go-live-checklist)

---

## 1. Site Onboarding Overview

### 1.1 Onboarding Phases

| Phase | Duration | Activities | Deliverables |
|-------|----------|------------|--------------|
| **1. Discovery** | Week 1 | Site survey, data inventory, integration assessment | Onboarding plan, data mapping document |
| **2. Preparation** | Week 2-3 | Data extraction, cleansing, user account setup | Cleaned datasets, configured tenant |
| **3. Migration** | Week 4 | Data import, integration testing | Populated system, test results |
| **4. Training** | Week 5 | User training, documentation handoff | Trained users, training materials |
| **5. Go-Live** | Week 6 | Cutover, hypercare support | Live system, handoff to operations |

---

## 2. Data Migration

### 2.1 Data Discovery

**Step 1: Inventory Existing Data Sources**

**Survey Questionnaire:**
```
Site Information:
- Site Name:
- Location:
- Capacity (MW):
- Commissioning Date:
- Technology Type: [ ] Solar [ ] Wind [ ] BESS [ ] Hybrid

Existing Systems:
- CMMS System: ________________ (e.g., Maximo, SAP PM, spreadsheets)
- SCADA System: ________________ (e.g., Siemens, Schneider, ABB)
- ERP System: ________________ (e.g., SAP, Oracle, custom)
- Document Management: ________________

Data Volumes:
- Number of Assets: ______
- Number of Open Work Orders: ______
- Historical Work Orders (last year): ______
- Number of Inventory Items: ______
- Number of Users: ______

Data Formats:
- Asset Registry: [ ] CSV [ ] Excel [ ] Database [ ] Other: ______
- Work Order History: [ ] CSV [ ] Excel [ ] Database [ ] Other: ______
- Manuals/Documents: [ ] PDF [ ] Word [ ] Paper [ ] Other: ______
```

**Step 2: Assess Data Quality**
```
Data Quality Checklist:

Asset Data:
[ ] Asset IDs unique and consistent
[ ] Manufacturer and model information complete
[ ] Location data available (GPS coordinates)
[ ] Commissioning dates recorded
[ ] Parent-child relationships defined

Work Order Data:
[ ] Work order IDs unique
[ ] Asset associations clear
[ ] Dates in consistent format (ISO 8601 preferred)
[ ] Status values standardized
[ ] Labor and parts records available

Gaps Identified:
_________________________________
_________________________________
```

### 2.2 Data Mapping

**Asset Mapping Example:**

| Legacy Field | dCMMS Field | Transformation |
|--------------|-------------|----------------|
| Equipment_ID | assetId | Direct mapping |
| Equipment_Name | title (in metadata) | Direct mapping |
| Type_Code | category | Map: INV → inverter, TRF → transformer |
| Install_Date | commissionDate | Convert to ISO 8601 |
| Lat / Lon | location.lat / location.lon | Combine into location object |
| Warranty_End | warrantyExpiry | Convert to ISO 8601 |

**Work Order Mapping Example:**

| Legacy Field | dCMMS Field | Transformation |
|--------------|-------------|----------------|
| WO_Number | workOrderId | Prefix with site code: SITE-{WO_Number} |
| WO_Type | type | Map: PM → preventive, CM → corrective |
| Priority_Code | priority | Map: 1 → urgent, 2 → high, 3 → medium, 4 → low |
| Status_Code | status | Map: OPEN → scheduled, IP → in-progress, COMP → completed |
| Assigned_Tech | assignedTo | Lookup user ID from email |

### 2.3 Data Extraction

**Export Scripts (Examples):**

**From Spreadsheet (Excel/CSV):**
```python
import pandas as pd

# Load legacy data
df = pd.read_excel('legacy_assets.xlsx')

# Transform to dCMMS format
dcmms_assets = df.rename(columns={
    'Equipment_ID': 'assetId',
    'Equipment_Name': 'title',
    'Type_Code': 'category'
})

# Map category codes
category_map = {'INV': 'inverter', 'TRF': 'transformer', 'PNL': 'panel'}
dcmms_assets['category'] = dcmms_assets['category'].map(category_map)

# Export to JSON
dcmms_assets.to_json('assets_import.json', orient='records', date_format='iso')
```

**From Legacy Database:**
```sql
-- Extract assets from legacy CMMS
COPY (
  SELECT
    equipment_id AS "assetId",
    site_id AS "siteId",
    equipment_type AS "category",
    manufacturer,
    model,
    serial_number AS "serialNumber",
    install_date AS "commissionDate",
    latitude AS "location.lat",
    longitude AS "location.lon"
  FROM legacy.equipment
  WHERE site_id = 'SITE-ALPHA'
) TO '/tmp/assets_export.csv' WITH CSV HEADER;
```

### 2.4 Data Transformation & Validation

**Transformation Script:**
```python
import json
from datetime import datetime

def transform_asset(legacy_asset):
    """Transform legacy asset format to dCMMS schema"""
    return {
        "assetId": f"SITE-ALPHA-{legacy_asset['Equipment_ID']}",
        "siteId": "SITE-ALPHA-001",
        "type": legacy_asset['Equipment_Name'],
        "category": category_mapping.get(legacy_asset['Type_Code']),
        "manufacturer": legacy_asset['Manufacturer'],
        "model": legacy_asset['Model'],
        "serialNumber": legacy_asset['Serial_Number'],
        "commissionDate": datetime.strptime(legacy_asset['Install_Date'], '%m/%d/%Y').isoformat(),
        "location": {
            "lat": float(legacy_asset['Latitude']),
            "lon": float(legacy_asset['Longitude'])
        },
        "specifications": {
            "ratedPowerKw": float(legacy_asset['Rated_Power_kW'])
        },
        "compliance": {
            "certifications": [],
            "standards": []
        },
        "maintenance": {
            "criticality": "medium",  # default, update manually later
            "maintenanceStrategy": "preventive"
        }
    }

# Process all assets
with open('legacy_assets.json') as f:
    legacy_assets = json.load(f)

dcmms_assets = [transform_asset(asset) for asset in legacy_assets]

# Validate against JSON schema
from jsonschema import validate
with open('metadata/asset.schema.json') as f:
    schema = json.load(f)

for asset in dcmms_assets:
    validate(instance=asset, schema=schema)  # Raises error if invalid

# Export
with open('assets_ready_for_import.json', 'w') as f:
    json.dump(dcmms_assets, f, indent=2)
```

### 2.5 Data Import

**Bulk Import API:**

```http
POST /api/v1/bulk/assets
Content-Type: application/json
Authorization: Bearer {admin-token}

{
  "dryRun": true,  // Validate only, don't commit
  "upsert": false,  // Fail if duplicate IDs found
  "assets": [
    { "assetId": "...", ... },
    { "assetId": "...", ... }
  ]
}
```

**Response:**
```json
{
  "summary": {
    "total": 450,
    "successful": 448,
    "failed": 2,
    "warnings": 15
  },
  "errors": [
    {
      "index": 42,
      "assetId": "SITE-ALPHA-INV-042",
      "error": "Duplicate assetId"
    }
  ],
  "warnings": [
    {
      "index": 5,
      "assetId": "SITE-ALPHA-INV-005",
      "warning": "Missing warranty expiry date"
    }
  ]
}
```

**Import Steps:**
1. Run import with `dryRun: true` → Review errors/warnings
2. Fix data issues
3. Run import with `dryRun: false` → Commit data
4. Verify import success

**Verification Queries:**
```sql
-- Check row counts match
SELECT COUNT(*) FROM assets WHERE siteId = 'SITE-ALPHA-001';
-- Expected: 450 (from legacy count)

-- Check for missing required fields
SELECT assetId FROM assets WHERE manufacturer IS NULL OR model IS NULL;
-- Expected: 0 rows

-- Sample random assets for manual review
SELECT * FROM assets WHERE siteId = 'SITE-ALPHA-001' ORDER BY RANDOM() LIMIT 10;
```

### 2.6 Historical Data Handling

**Work Order History:**
- **Import last 12 months** of closed work orders (for reporting)
- **Import all open work orders** (to continue execution)
- **Archive older data** (export to CSV, store in S3, don't import to live system)

**Documents:**
- **Scan and upload critical documents** (manuals, certificates, warranties)
- **Link to existing document management system** if available (via URL references)

**Telemetry:**
- **Do NOT migrate** historical telemetry (too large, diminishing value)
- **Start fresh** from cutover date
- **Optionally:** Import last 30 days of aggregate data (hourly averages) for trending

---

## 3. System Integration

### 3.1 SCADA Integration Setup

**Discovery:**
- SCADA vendor and model
- Communication protocols (OPC-UA, Modbus, MQTT)
- Network accessibility (VPN, firewall rules)
- Tag list export

**Configuration:**
```yaml
# Example SCADA adapter config
scada:
  siteId: SITE-ALPHA-001
  type: siemens-wincc
  connection:
    host: scada.site-alpha.local
    port: 4840
    protocol: opc-ua
    authentication:
      type: username-password
      username: dcmms_readonly
      password: ${SCADA_PASSWORD}  # from vault
  tags:
    - tagName: Inverter_3A_ActivePower
      assetId: SITE-ALPHA-INV-3A
      metricName: active_power_kw
      sampleRate: 60s  # 1 sample per minute
    - tagName: Inverter_3A_Temperature
      assetId: SITE-ALPHA-INV-3A
      metricName: temperature_c
      sampleRate: 60s
```

**Testing:**
```bash
# Test SCADA connectivity
curl -X POST https://api.dcmms.io/api/v1/integrations/scada/test \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"siteId":"SITE-ALPHA-001"}'

# Expected response:
# {"status":"connected","tagsRead":245,"lastReading":"2025-11-08T10:00:00Z"}
```

### 3.2 IdP Integration Setup

**Supported IdPs:** Okta, Azure AD, Google Workspace

**Configuration Steps:**
1. Create OAuth application in IdP
2. Configure redirect URIs: `https://app.dcmms.io/auth/callback`
3. Add OIDC discovery URL to dCMMS config
4. Map IdP groups to dCMMS roles
5. Test SSO login

**Example Role Mapping:**
```yaml
# IdP group → dCMMS role mapping
roleMapping:
  - idpGroup: "DCMMS-SiteAlpha-Admins"
    dcmmsRole: "site-manager"
    siteIds: ["SITE-ALPHA-001"]
  - idpGroup: "DCMMS-SiteAlpha-Techs"
    dcmmsRole: "field-technician"
    siteIds: ["SITE-ALPHA-001"]
```

### 3.3 ERP Integration (Optional for MVP)

**Defer to Post-MVP** unless critical for customer.

If required:
- Sync inventory levels (daily batch)
- Post work order costs (on WO closure)
- Sync asset master data (weekly)

---

## 4. User Onboarding

### 4.1 User Account Creation

**Bulk User Import:**

**CSV Format:**
```csv
email,firstName,lastName,role,siteIds,skills
john.smith@example.com,John,Smith,field-technician,SITE-ALPHA-001,"electrical-hv,inverter-repair"
jane.doe@example.com,Jane,Doe,maintenance-supervisor,SITE-ALPHA-001,""
```

**Import API:**
```http
POST /api/v1/bulk/users
{
  "users": [
    {
      "email": "john.smith@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "field-technician",
      "siteIds": ["SITE-ALPHA-001"],
      "skills": ["electrical-hv", "inverter-repair"]
    }
  ],
  "sendInviteEmails": true  // Sends welcome email with login instructions
}
```

**User Invitation Email:**
```
Subject: Welcome to dCMMS

Hello John,

Your account has been created for dCMMS (Computerized Maintenance Management System).

Login URL: https://app.dcmms.io
Username: john.smith@example.com

Click here to set your password: [Reset Password Link]

If you have questions, contact your site manager or email support@dcmms.io.

Welcome aboard!
```

### 4.2 Training Program

**Training Tracks:**

| Role | Training Duration | Format | Topics |
|------|-------------------|--------|--------|
| System Admin | 4 hours | Virtual instructor-led | System config, user management, integrations |
| Site Manager | 3 hours | Virtual instructor-led | Dashboards, reporting, work order approval |
| Supervisor | 2 hours | Virtual instructor-led | Scheduling, assignment, SLA monitoring |
| Field Technician | 1.5 hours | Hands-on (mobile app) | Work order execution, offline mode, attachments |

**Training Materials:**
- Slides (PowerPoint/PDF)
- Video recordings (for asynchronous learning)
- Quick reference cards (1-page cheat sheets)
- Sandbox environment for practice

**Training Schedule Example:**
```
Week 1: System Admins & Site Managers (Wednesday 10am-2pm)
Week 2: Supervisors (Tuesday 2pm-4pm)
Week 3: Field Technicians - Batch 1 (Monday 9am-10:30am)
Week 3: Field Technicians - Batch 2 (Monday 2pm-3:30pm)
Week 4: Refresher session (Friday 10am-11am, optional)
```

### 4.3 Super User Program

**Designate 2-3 super users per site:**
- Power users who learn system deeply
- Act as first line of support for colleagues
- Provide feedback to product team

**Super User Benefits:**
- Early access to new features
- Direct line to product team
- Recognized in organization

---

## 5. Go-Live Checklist

### 5.1 Pre-Go-Live (T-1 week)

**Data Validation:**
- [ ] All assets imported and verified (spot-check 10%)
- [ ] Open work orders imported
- [ ] Users created and invitations sent
- [ ] Inventory levels imported
- [ ] Documents uploaded to key assets

**Integration Testing:**
- [ ] SCADA integration live and streaming data
- [ ] IdP SSO login working for all users
- [ ] Notifications sending (email, SMS)

**User Readiness:**
- [ ] All users completed training
- [ ] Mobile app installed on technician devices
- [ ] Test accounts created for key workflows
- [ ] Runbook documented for common tasks

**Operations Readiness:**
- [ ] Support team trained
- [ ] Escalation contacts identified
- [ ] Monitoring dashboards configured
- [ ] Backup procedures tested

### 5.2 Cutover Plan

**Cutover Window:** Friday 6pm - Sunday 6pm (minimal operations impact)

**Friday 6pm:**
- [ ] Put legacy system in read-only mode (if applicable)
- [ ] Final data sync from legacy → dCMMS
- [ ] Verify data sync successful

**Saturday 9am:**
- [ ] Production deployment of dCMMS
- [ ] Smoke tests passed
- [ ] Notify users: system ready Monday 6am

**Sunday:**
- [ ] Hypercare team on standby
- [ ] Monitor for any issues

**Monday 6am:**
- [ ] Official go-live
- [ ] Send "Welcome to dCMMS" email to all users
- [ ] Hypercare team available 6am-8pm

### 5.3 Hypercare Support (Week 1 Post-Go-Live)

**Extended Support:**
- Dedicated support team available 6am-8pm (extended hours)
- Response time SLA: 15 minutes for P0/P1 issues
- Daily check-in calls with site manager (10am, 4pm)

**Common Issues & Resolutions:**
| Issue | Resolution |
|-------|------------|
| Can't log in | Check IdP group membership, resend invite email |
| Work order not syncing to mobile | Verify user is `assignedTo`, check mobile sync settings |
| SCADA data not appearing | Check SCADA adapter logs, verify tag mapping |
| Missing permissions | Verify role assignment, check site access |

**Success Metrics (Week 1):**
- User adoption: >90% of active users logged in
- Work orders created: >50 (indicates usage)
- Mobile app usage: >80% of technicians used app
- Support tickets: <20 (indicates good training & onboarding)

---

## Migration Rollback Plan

**If Go-Live Fails (Critical Issues):**

1. **Revert to Legacy System**
   - Enable write access to legacy system
   - Notify users to return to old system

2. **Root Cause Analysis**
   - Identify what went wrong
   - Fix issues in staging

3. **Reschedule Go-Live**
   - Communicate new go-live date
   - Repeat pre-go-live checklist

**Criteria for Rollback:**
- System unavailable for >2 hours
- Data loss detected
- Critical functionality broken (e.g., can't create work orders)
- >50% of users unable to access system

---

## Post-Go-Live Review

**After 30 Days:**
- [ ] Survey users (satisfaction, pain points)
- [ ] Review support tickets (identify patterns)
- [ ] Analyze usage metrics (adoption rates)
- [ ] Conduct lessons learned session
- [ ] Document best practices for next site onboarding
- [ ] Handoff from onboarding team to operations team

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial migration and onboarding plan |

