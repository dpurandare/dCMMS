# dCMMS Organizational Structure & User Roles
## Non-Conventional Energy Sector (Solar, Wind, BESS)

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Based on Industry Research
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Industry Research Summary](#1-industry-research-summary)
2. [Organizational Structure](#2-organizational-structure)
3. [Detailed Role Definitions](#3-detailed-role-definitions)
4. [Role Hierarchy & Reporting](#4-role-hierarchy--reporting)
5. [Staffing Models by Asset Type](#5-staffing-models-by-asset-type)
6. [Contractor vs Employee Distinctions](#6-contractor-vs-employee-distinctions)

---

## 1. Industry Research Summary

### 1.1 Research Sources

This document is based on research into actual organizational structures in:
- **Solar Farms**: Utility-scale PV installations (1-500 MW)
- **Wind Farms**: Onshore/offshore wind installations
- **BESS**: Battery Energy Storage Systems
- **Hybrid Microgrids**: Combined solar + wind + storage

### 1.2 Key Industry Findings

**Organizational Models:**
- **Owner/Developer**: Often separate from operations (financial ownership)
- **Asset Manager**: Strategic portfolio management (financial + commercial)
- **O&M Contractor**: Day-to-day technical operations (can be in-house or outsourced)
- **EPC Contractor**: Construction phase, may provide warranty period O&M

**Team Size Benchmarks:**
- Small solar farm (1-10 MW): 1 site engineer + 2-3 technicians
- Medium solar farm (10-50 MW): 1 plant manager + 1 site engineer + 5-10 technicians
- Large solar farm (50-200 MW): 1 plant manager + 2-3 site engineers + 15-30 technicians
- Wind farm (50-100 turbines): 1 operations manager + 10-20 wind turbine technicians + specialized rope access/blade repair teams
- BESS (50-200 MWh): Often managed by existing solar/wind team + 1-2 BESS specialists

**Critical Insight for CMMS:**
- **Mobile-first is essential**: 80%+ of maintenance work happens in the field
- **Vernacular language support**: Many technicians are local hires, non-English speakers
- **Offline capability is mandatory**: Remote sites have unreliable connectivity
- **Multi-tenant architecture needed**: O&M contractors manage multiple client sites

---

## 2. Organizational Structure

### 2.1 Typical Renewable Energy Plant Organization

```
┌─────────────────────────────────────────────────────────────┐
│                    ASSET OWNER / DEVELOPER                   │
│              (Financial ownership, investment decisions)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ASSET MANAGER                           │
│  (Portfolio management, financial optimization, commercial)  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    O&M CONTRACTOR                            │
│          (Technical operations, maintenance delivery)        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │            PLANT / OPERATIONS MANAGER              │     │
│  │      (Site-level P&L, staff management, safety)    │     │
│  └─────────────────────┬──────────────────────────────┘     │
│                        │                                     │
│       ┌────────────────┼────────────────┐                   │
│       ▼                ▼                ▼                    │
│  ┌─────────┐    ┌──────────┐    ┌──────────────┐           │
│  │ Site    │    │ O&M      │    │ Maintenance  │           │
│  │ Engineer│    │ Coord.   │    │ Supervisor   │           │
│  └────┬────┘    └────┬─────┘    └──────┬───────┘           │
│       │              │                  │                   │
│       ▼              ▼                  ▼                   │
│  ┌─────────────────────────────────────────────┐           │
│  │          FIELD TECHNICIANS                  │           │
│  │  • Electrical Techs  • Mechanical Techs     │           │
│  │  • Wind Turbine Techs • BESS Specialists    │           │
│  │  • Rope Access Techs  • Blade Repair Techs  │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │          SUPPORT FUNCTIONS                   │          │
│  │  • SCADA/Control Room Operators              │          │
│  │  • Inventory/Warehouse Coordinators          │          │
│  │  • EHS (Safety) Officers                     │          │
│  │  • Admin/Planning Coordinators               │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SPECIALIZED SUPPORT (as needed)                 │
│  • Reliability Engineers  • Performance Analysts            │
│  • Compliance Officers    • HSE Auditors                    │
│  • Training Coordinators  • Quality Assurance               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Cross-Functional Relationships

**Remote Monitoring:**
- **Control Room / Operations Center**: Monitors multiple sites remotely (24/7)
- **First-level support**: Remote diagnosis, dispatch field teams
- **Escalation**: To on-site engineers or specialized support

**Maintenance Coordination:**
- **Preventive Maintenance**: Planned by O&M Coordinator, executed by technicians
- **Corrective Maintenance**: Triggered by SCADA alarms, assigned by supervisor
- **Predictive Maintenance**: Recommended by Reliability Engineers, approved by Plant Manager

---

## 3. Detailed Role Definitions

### 3.1 Executive & Strategic Roles

#### Asset Owner / Developer
**NOT a CMMS user** - Receives executive dashboards and reports

**Focus:** ROI, portfolio strategy, financing
**Typical Background:** Finance, business development
**Key Concerns:** Asset valuation, investor reporting, M&A activity

---

#### Asset Manager (Portfolio)
**CMMS Role:** `portfolio-manager` (read-only across all sites, export reports)

**Responsibilities:**
- Manage portfolio of 5-50 sites (typically 500 MW - 2 GW total capacity)
- Financial performance optimization (revenue, costs, budgets)
- Commercial contract management (PPAs, offtake agreements)
- Insurance and warranty coordination
- Regulatory compliance oversight
- Quarterly/annual reporting to owners/investors

**Typical Background:** Engineering + MBA, or Finance + energy sector experience
**Reports To:** Chief Operating Officer or VP Operations
**Team Size:** 1 Asset Manager per 10-20 sites

**CMMS Usage:**
- View KPIs across all sites in portfolio
- Export financial reports (cost per MWh, O&M budget variance)
- Review major work orders (>$50k spend)
- Audit compliance certificates
- Do NOT create or execute work orders

---

### 3.2 Site Management Roles

#### Plant Manager / Operations Manager
**CMMS Role:** `plant-manager` (full access to assigned site, approval authority)

**Responsibilities:**
- Overall site operations (safety, production, maintenance, financials)
- Staff management (hiring, training, performance reviews)
- Budget ownership (O&M P&L responsibility)
- Stakeholder management (owner, grid operator, local authorities)
- Safety leadership (incident investigation, safety culture)
- Approve high-priority work orders and emergency expenditures
- Annual maintenance planning and budget forecasting

**Typical Background:** Electrical/Mechanical Engineering + 10+ years experience
**Reports To:** Asset Manager or Regional O&M Director
**Team Size:** 1 per site (sites >100 MW may have dedicated Operations Manager)

**CMMS Usage:**
- Approve work orders (budgeted and emergency)
- Review daily/weekly operational dashboards
- Analyze maintenance cost trends
- Manage work order backlog and priorities
- Oversee inventory budgets
- Sign-off on contractor invoices

**Key Metrics:**
- Plant availability (target: 97-99%)
- O&M cost per MWh
- Safety incidents (target: zero lost-time injuries)
- Budget variance

---

#### Site Engineer / Site Supervisor
**CMMS Role:** `site-engineer` (site-scoped, technical authority)

**Responsibilities:**
- Day-to-day technical operations
- SCADA monitoring and alarm response
- Root cause analysis for equipment failures
- Vendor and contractor coordination
- Technical work order creation and review
- Performance analysis (PR, CF, losses)
- Preventive maintenance scheduling
- Mentor technicians on complex troubleshooting

**Typical Background:** Electrical/Mechanical Engineering, 5-7 years experience
**Reports To:** Plant Manager
**Team Size:** 1-3 per site depending on capacity

**CMMS Usage:**
- Create corrective work orders from SCADA alarms
- Assign work orders to technicians
- Review completed work orders for technical accuracy
- Analyze equipment failure trends
- Schedule preventive maintenance tasks
- Update asset technical specifications

**Key Metrics:**
- Mean time to repair (MTTR)
- Equipment availability
- First-time fix rate
- Technical accuracy of work orders

---

#### O&M Coordinator / Planning Coordinator
**CMMS Role:** `om-coordinator` (site-scoped, planning and scheduling)

**Responsibilities:**
- Preventive maintenance scheduling (annual, monthly, weekly)
- Work order planning and preparation
- Parts procurement and logistics
- Crew scheduling and resource allocation
- Contractor coordination (mobilization, access, permits)
- Maintenance backlog management
- Documentation and record-keeping
- Compliance calendar management (certifications, inspections)

**Typical Background:** Engineering or operations background, 3-5 years
**Reports To:** Plant Manager or Site Engineer
**Team Size:** 1 per site (or 1 per 2-3 smaller sites)

**CMMS Usage:**
- Create preventive maintenance schedules
- Assign work orders based on technician availability and skills
- Reserve parts for scheduled work
- Track SLA compliance
- Generate weekly work plans
- Coordinate outage windows
- Manage permit workflows

**Key Metrics:**
- PM completion rate (target: 95%+)
- Schedule adherence
- Backlog age (target: <30 days for non-critical)
- Parts availability for planned work

---

### 3.3 Supervisory Roles

#### Maintenance Supervisor / Field Supervisor
**CMMS Role:** `maintenance-supervisor` (site-scoped, crew leadership)

**Responsibilities:**
- Lead field technician teams (3-15 direct reports)
- Daily work assignment and prioritization
- On-site safety supervision (JSA, LOTO, PPE enforcement)
- Quality control of completed work
- Technician skill development and training
- Tool and equipment management
- Emergency response coordination
- Verify work order completion before closure

**Typical Background:** Trade background + supervisor training, 7-10 years experience
**Reports To:** Plant Manager or Site Engineer
**Team Size:** 1 supervisor per 5-10 technicians

**CMMS Usage:**
- Review and assign daily work orders
- Verify completed work orders (quality check)
- Approve timesheets and labor hours
- Flag equipment for replacement/decommissioning
- Create urgent/emergency work orders
- Track technician certifications and training

**Key Metrics:**
- Team productivity (work orders completed per day)
- Safety incidents (target: zero)
- Technician utilization rate
- Rework rate (target: <5%)

---

### 3.4 Field Execution Roles

#### Field Technician (Electrical)
**CMMS Role:** `field-technician-electrical` (assigned work orders only)

**Responsibilities:**
- Execute electrical maintenance and repairs
- Perform inspections (infrared thermography, visual)
- Troubleshoot electrical faults (inverters, transformers, switchgear)
- Cable testing and repairs
- String testing and I-V curve tracing (solar)
- Grounding system testing
- Replace electrical components (contactors, fuses, breakers)
- Document work performed with photos and notes

**Typical Background:** Electrical trade certification + HV certification
**Reports To:** Maintenance Supervisor
**Team Size:** 40-60% of field technician headcount

**CMMS Usage (Mobile App):**
- View assigned work orders
- Update work order status (start, in-progress, complete)
- Record parts used
- Upload photos and measurements
- Complete safety checklists
- Log labor time
- **Offline capability required**

**Required Certifications:**
- Electrical license
- High voltage (HV) certification
- Arc flash training
- LOTO certification

---

#### Field Technician (Mechanical)
**CMMS Role:** `field-technician-mechanical` (assigned work orders only)

**Responsibilities:**
- Execute mechanical maintenance and repairs
- Tracker maintenance (solar): motor, gearbox, controller
- Lubrication and vibration analysis
- Bolt torque inspections
- Cooling system maintenance
- Replace mechanical components
- Structural inspections and repairs

**Typical Background:** Mechanical trade certification
**Reports To:** Maintenance Supervisor
**Team Size:** 20-30% of field technician headcount

**CMMS Usage:** Same as Electrical Technician (mobile app)

**Required Certifications:**
- Mechanical certification
- Confined space (if applicable)
- Working at height (for wind/tracker work)

---

#### Wind Turbine Technician (Windtech)
**CMMS Role:** `wind-turbine-technician` (assigned work orders only)

**Responsibilities:**
- Perform turbine inspections and maintenance
- Climb turbines (80-120 meter heights)
- Troubleshoot mechanical, electrical, and hydraulic systems
- Gearbox oil sampling and analysis
- Brake system maintenance
- Generator maintenance
- Replace worn components (bearings, seals, filters)
- Emergency shutdown and safety system checks

**Typical Background:** Wind turbine technician training + apprenticeship
**Reports To:** Maintenance Supervisor or Wind Site Manager
**Team Size:** 2-3 technicians per 10-15 turbines (onshore), higher for offshore

**CMMS Usage:** Same as Field Technician (mobile app)

**Required Certifications:**
- GWO (Global Wind Organization) certifications:
  - Basic Safety Training
  - Advanced Rescue Training
  - Blade Repair
- Electrical and mechanical certifications
- First aid and CPR

**Median Salary (2024):** $62,580/year (U.S. BLS data)

---

#### BESS Specialist / Battery Technician
**CMMS Role:** `bess-specialist` (assigned work orders only)

**Responsibilities:**
- Battery system inspections and maintenance
- Battery Management System (BMS) monitoring and diagnostics
- Thermal management system maintenance
- Fire suppression system testing
- DC electrical testing
- Cell voltage and temperature monitoring
- Replace battery modules or racks (as needed)
- Coordinate with inverter and transformer technicians

**Typical Background:** Electrical certification + BESS-specific training
**Reports To:** Maintenance Supervisor or BESS Site Manager
**Team Size:** 1-2 specialists per 50-200 MWh BESS installation

**CMMS Usage:** Same as Field Technician (mobile app)

**Required Certifications:**
- Electrical license
- HV certification
- BESS safety training (thermal runaway, arc flash specific to DC)
- Hazmat awareness (lithium-ion battery safety)

---

#### Rope Access Technician (Wind)
**CMMS Role:** `rope-access-technician` (assigned work orders only)

**Responsibilities:**
- External blade inspections and repairs
- Tower inspections
- Painting and coating repairs
- Install/replace aviation lights
- Camera and sensor installations
- Emergency rescues

**Typical Background:** IRATA or SPRAT rope access certification + wind training
**Reports To:** Maintenance Supervisor
**Team Size:** Specialized contractors, called in as needed

**CMMS Usage:** View assigned work orders, upload inspection photos

**Required Certifications:**
- IRATA Level 1/2/3 or SPRAT Level 1/2/3
- GWO certifications
- NDT certifications (if performing inspections)

---

#### Blade Repair Technician (Wind)
**CMMS Role:** `blade-repair-technician` (assigned work orders only)

**Responsibilities:**
- Leading edge erosion repair
- Crack detection and repair (internal/external)
- Lightning protection system repairs
- Composite laminate repairs
- Surface preparation and coating

**Typical Background:** Composite materials training + wind blade specific
**Reports To:** Maintenance Supervisor
**Team Size:** Specialized contractors or in-house team for large fleets

**CMMS Usage:** View assigned work orders, document repairs with photos

**Required Certifications:**
- Composite repair certification
- GWO Blade Repair
- Working at height
- Confined space (internal blade access)

---

### 3.5 Support & Specialized Roles

#### SCADA / Control Room Operator
**CMMS Role:** `scada-operator` (read-only assets, create alarms/work orders)

**Responsibilities:**
- 24/7 remote monitoring of multiple sites
- Real-time alarm response and diagnosis
- Remote troubleshooting (reset inverters, adjust setpoints)
- Dispatch field technicians to site
- Log events and create work orders from alarms
- Coordinate with grid operator (curtailment, frequency response)
- First-level technical support

**Typical Background:** Electrical/control systems training
**Reports To:** Operations Manager or Control Center Manager
**Team Size:** 3-5 operators per control center (24/7 coverage for 10-50 sites)

**CMMS Usage:**
- Monitor asset status and alarms
- Create corrective work orders from SCADA alarms
- View work order status (track technician dispatch)
- Log alarm events
- Generate availability reports

**Shift Pattern:** 12-hour rotating shifts (day/night)

---

#### Inventory / Warehouse Coordinator
**CMMS Role:** `inventory-coordinator` (site-scoped inventory management)

**Responsibilities:**
- Manage spare parts inventory
- Receive and inspect deliveries
- Issue parts to technicians
- Conduct cycle counts and physical inventory
- Monitor stock levels and reorder points
- Coordinate procurement with O&M Coordinator
- Manage consignment inventory (vendor-owned parts)
- Warranty parts tracking and returns

**Typical Background:** Logistics or supply chain background
**Reports To:** Plant Manager or O&M Coordinator
**Team Size:** 1 per site (or 1 per 2-3 sites)

**CMMS Usage:**
- Manage inventory records (quantities, locations, costs)
- Process parts reservations and issues
- Record parts receipts
- Perform inventory adjustments
- Generate reorder reports
- Track warranty parts

---

#### EHS (Environmental Health & Safety) Officer / Safety Coordinator
**CMMS Role:** `ehs-officer` (site-scoped, safety oversight)

**Responsibilities:**
- Safety program management (LOTO, confined space, working at height)
- Incident investigation and root cause analysis
- Safety training coordination
- Permit-to-work administration
- Safety audits and inspections
- PPE management
- Emergency response planning
- Regulatory compliance (OSHA, EPA, etc.)

**Typical Background:** Safety certification (CSP, CIH) + industry experience
**Reports To:** Plant Manager
**Team Size:** 1 per site (large sites) or regional coverage

**CMMS Usage:**
- Review work orders for safety compliance
- Approve permit-to-work requests
- Track safety training and certifications
- Investigate incidents linked to work orders
- Audit LOTO procedures in work orders
- Generate safety metrics reports

---

#### Reliability Engineer / Performance Analyst
**CMMS Role:** `reliability-engineer` (read-only across sites, analytics)

**Responsibilities:**
- Asset performance analysis (PR, CF, losses)
- Failure mode and effects analysis (FMEA)
- Predictive maintenance strategy development
- Condition monitoring program design
- Underperformance investigation
- Budget and forecast support (failure rate predictions)
- Continuous improvement initiatives
- Telemetry data analysis

**Typical Background:** Engineering degree + data analysis skills
**Reports To:** VP Operations or Engineering Director (often corporate role)
**Team Size:** 1 per 500-1000 MW of portfolio capacity

**CMMS Usage:**
- Read all work order history for analysis
- Access asset failure history
- Export data for analysis (failure rates, MTTR, MTBF)
- View telemetry data correlated with work orders
- Do NOT create or execute work orders

---

#### Compliance Officer / Regulatory Specialist
**CMMS Role:** `compliance-officer` (read-only across sites, compliance tracking)

**Responsibilities:**
- Regulatory compliance tracking (NERC, FERC, EPA, state PUCs)
- Compliance reporting and submissions
- Certificate and permit management
- Audit coordination (regulatory, investor, lender)
- Training compliance tracking
- Environmental reporting
- Renewable energy credit (REC) tracking

**Typical Background:** Legal, regulatory, or environmental background
**Reports To:** VP Compliance or General Counsel
**Team Size:** 1 per 500-1000 MW or regional coverage

**CMMS Usage:**
- View compliance certificates and expiry dates
- Export compliance reports
- Track training certifications
- Audit work order records for regulatory evidence
- Do NOT create or execute work orders

---

### 3.6 External / Contractor Roles

#### OEM Service Technician (Vendor)
**CMMS Role:** `contractor-oem` (limited, assigned work orders only)

**Responsibilities:**
- Warranty repairs for specific equipment (inverters, trackers, turbines)
- Annual maintenance per service contracts
- Specialized diagnostics and repairs
- Software updates and commissioning
- Training for site technicians

**Access Level:** Temporary, limited to assigned work orders
**CMMS Usage:**
- View assigned work order details
- Update work order status
- Upload service reports and photos
- Record parts used (warranty tracking)
- **Cannot** view other work orders or site data

---

#### Third-Party O&M Contractor
**CMMS Role:** `contractor-om` (site-scoped, time-limited)

**Responsibilities:**
- Temporary maintenance support (outage support, specialized projects)
- Vegetation management
- Module cleaning
- Civil/structural repairs

**Access Level:** Temporary, expires after contract period
**CMMS Usage:**
- View assigned work orders
- Update work order status and upload documentation
- Record labor and materials
- **Cannot** access asset financial data

---

## 4. Role Hierarchy & Reporting

### 4.1 Reporting Structure

```
Asset Owner/Developer
    └── Asset Manager (Portfolio)
          └── Plant/Operations Manager (Site)
                ├── Site Engineer
                │     ├── Field Technicians (Electrical)
                │     ├── Field Technicians (Mechanical)
                │     ├── Wind Turbine Technicians
                │     └── BESS Specialists
                ├── Maintenance Supervisor
                │     └── Field Technicians (same as above)
                ├── O&M Coordinator
                │     └── Inventory Coordinator
                ├── SCADA Operators (may report to central Control Center)
                └── EHS Officer

Corporate/Regional Support (matrixed):
    ├── Reliability Engineers
    ├── Compliance Officers
    └── Training Coordinators
```

### 4.2 Decision Authority Levels

| Decision | Authority Level | Work Order Approval Limit |
|----------|----------------|---------------------------|
| **Emergency work** | Maintenance Supervisor | Up to $10,000 |
| **Routine corrective** | Site Engineer | Up to $25,000 |
| **Planned preventive** | O&M Coordinator (pre-approved budget) | N/A |
| **Major repairs** | Plant Manager | $25,000 - $100,000 |
| **Capital projects** | Asset Manager | $100,000+ |

---

## 5. Staffing Models by Asset Type

### 5.1 Utility-Scale Solar (50 MW PV Farm)

**Full-Time Staff:**
- 1 Plant Manager
- 1 Site Engineer
- 1 O&M Coordinator
- 8-10 Field Technicians (mix of electrical and mechanical)
- 1 Inventory Coordinator (shared with nearby sites)

**Shared/Remote:**
- SCADA monitoring from regional control center
- EHS Officer (covers 3-5 sites)
- Reliability Engineer (corporate)

**Contract:**
- Module cleaning crews (quarterly)
- Vegetation management (as needed)
- Specialized repairs (inverter OEM, tracker OEM)

**Total Headcount:** ~12 FTE on-site, 3-4 FTE shared

---

### 5.2 Onshore Wind Farm (50 Turbines, 150 MW)

**Full-Time Staff:**
- 1 Operations Manager
- 1-2 Site Engineers
- 12-15 Wind Turbine Technicians
- 1 O&M Coordinator
- 1 Inventory Coordinator

**Shared/Remote:**
- SCADA monitoring from regional control center
- EHS Officer (wind-specific safety expertise)

**Contract:**
- Rope access technicians (annual inspections)
- Blade repair specialists (as needed)
- Major component replacements (gearbox, generator)
- Crane services

**Total Headcount:** ~17 FTE on-site, 2-3 FTE shared

---

### 5.3 Hybrid Solar + BESS (50 MW PV + 50 MWh BESS)

**Full-Time Staff:**
- 1 Plant Manager
- 1 Site Engineer (solar expertise)
- 1 BESS Specialist
- 8-10 Field Technicians
- 1 O&M Coordinator

**Shared/Remote:**
- SCADA monitoring (solar + BESS combined)
- Reliability Engineer (with BESS degradation expertise)

**Total Headcount:** ~13 FTE on-site

---

## 6. Contractor vs Employee Distinctions

### 6.1 Employee Roles (Direct Hire by O&M Company)

**Characteristics:**
- Long-term employment
- Full benefits
- Site-specific knowledge
- Quick response times
- Higher trust and access levels

**Typical Roles:**
- Plant Manager
- Site Engineers
- O&M Coordinators
- Maintenance Supervisors
- Most Field Technicians
- Inventory Coordinators

---

### 6.2 Contractor Roles (Third-Party Services)

**Characteristics:**
- Project-based or annual contracts
- Specialized expertise
- Cost flexibility (variable vs fixed)
- Limited site access
- Vendor-managed

**Typical Services:**
- OEM warranty service (inverters, trackers, turbines)
- Specialized inspections (thermography, drone, blade)
- Major component replacements (cranes, specialized tools)
- Cleaning and vegetation management
- Civil and structural work

---

### 6.3 CMMS Access Differences

| Aspect | Employee | Contractor |
|--------|----------|------------|
| **Access Duration** | Permanent (until termination) | Temporary (contract period only) |
| **Data Visibility** | Full site data | Work order-specific only |
| **Work Order Creation** | Yes (based on role) | No (only view assigned WOs) |
| **Asset Data** | Read/write (based on role) | Read-only (for assigned assets) |
| **Financial Data** | Yes (managers/coordinators) | No (hidden) |
| **Historical Records** | Full access | Limited to current contract |
| **Training Records** | System tracks internal training | Must upload certifications |
| **Audit Trail** | Standard logging | Enhanced logging (external user flag) |

---

## 7. Multi-Tenant Considerations

### 7.1 O&M Contractor Managing Multiple Client Sites

**Scenario:** O&M contractor operates sites for 5 different asset owners

**Organizational Structure:**
```
O&M Contractor (Company Level)
    ├── Regional Manager (manages 10-20 sites across 3-5 owners)
    │     ├── Site A (Owner 1)
    │     ├── Site B (Owner 1)
    │     ├── Site C (Owner 2)
    │     └── Site D (Owner 3)
    ├── Shared Services
    │     ├── Control Center (monitors all sites)
    │     ├── Reliability Team (analyzes all sites)
    │     └── Inventory Hub (central warehouse)
    └── Corporate Functions
          ├── Safety (EHS oversight)
          ├── Training
          └── Compliance
```

**CMMS Requirements:**
- **Data Isolation:** Site A staff cannot see Site C data (different owners)
- **Shared Resources:** Control room operators see all sites they monitor
- **Reporting Separation:** Each asset owner gets only their site reports
- **Cost Allocation:** Labor hours tracked per site for billing

### 7.2 Role Mapping in Multi-Tenant Scenario

| Role | Access Pattern |
|------|----------------|
| **Regional Manager** | All sites in region, but cost data segregated per owner |
| **Control Room Operator** | All sites monitored (read-only alarms, create WOs) |
| **Reliability Engineer** | All sites (aggregated analysis), but reports separated |
| **Site-based staff** | Only their assigned site |
| **Asset Owner users** | Only sites they own (read-only dashboards) |

---

## 8. Recommendations for dCMMS

### 8.1 Role Configuration

**Implement 15 distinct roles** (based on research):
1. `asset-owner` (executive dashboards only)
2. `portfolio-manager` (multi-site read-only)
3. `plant-manager` (site admin)
4. `site-engineer` (site technical lead)
5. `om-coordinator` (planning and scheduling)
6. `maintenance-supervisor` (crew leader)
7. `field-technician-electrical`
8. `field-technician-mechanical`
9. `wind-turbine-technician`
10. `bess-specialist`
11. `scada-operator` (remote monitoring)
12. `inventory-coordinator`
13. `ehs-officer` (safety oversight)
14. `reliability-engineer` (analytics)
15. `compliance-officer` (regulatory)
16. `contractor-oem` (vendor service)
17. `contractor-om` (third-party O&M)

### 8.2 Priority Features by Role

**Field Technicians (highest volume users):**
- Mobile app with offline mode (P0)
- Barcode scanning for assets and parts (P0)
- Voice-to-text for notes (P1)
- Photo/video capture (P0)
- Vernacular language support (P1 for India, LatAm markets)

**Supervisors & Coordinators:**
- Drag-and-drop scheduling (P0)
- Skills-based assignment (P0)
- Resource utilization dashboards (P1)

**Plant Managers:**
- Executive dashboards (availability, costs, backlog) (P0)
- Budget tracking and variance analysis (P1)
- One-click reporting for weekly reviews (P0)

**SCADA Operators:**
- Alarm-to-work-order automation (P0)
- Asset real-time status view (P0)
- Quick dispatch interface (P0)

### 8.3 Localization Priorities

Based on global renewable energy markets:
- **English** (global)
- **Spanish** (LatAm, Spain)
- **Portuguese** (Brazil)
- **Hindi** (India)
- **Mandarin** (China - if targeting Chinese market)
- **German** (Germany, Austria)
- **French** (France, Africa)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | Industry Research | Initial organizational structure based on solar, wind, BESS industry standards |

---

## Sources & References

- U.S. Department of Energy - Solar O&M Resources
- U.S. Bureau of Labor Statistics - Wind Turbine Technicians Occupational Outlook
- CleanMax Solar - Operation and Maintenance of Solar Power Plants
- Industry job descriptions from Indeed, ZipRecruiter (2024-2025)
- CMMS vendor documentation (TeroTAM, Fiix, 60Hertz Energy)
- Renewable energy O&M market reports

