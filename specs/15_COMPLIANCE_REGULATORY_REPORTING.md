# Compliance and Regulatory Reporting Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Regulatory Frameworks](#2-regulatory-frameworks)
3. [Compliance Reporting Templates](#3-compliance-reporting-templates)
4. [Automated Compliance Workflows](#4-automated-compliance-workflows)
5. [Audit Trail System](#5-audit-trail-system)
6. [Regulatory Submission Automation](#6-regulatory-submission-automation)
7. [Compliance Dashboards](#7-compliance-dashboards)
8. [Document Retention](#8-document-retention)
9. [Certification & Attestation](#9-certification--attestation)

---

## 1. Overview

### 1.1 Purpose

The dCMMS Compliance and Regulatory Reporting system ensures renewable energy facilities comply with regional and international regulations for grid operations, safety, environmental protection, and financial reporting.

### 1.2 Key Requirements

- **Multi-jurisdiction support:** NERC/FERC (North America), CEA (India), MNRE (India), AEMO (Australia), NESO (UK)
- **Automated report generation:** Scheduled and event-driven compliance reports
- **Audit trail:** Immutable audit logs for all compliance-relevant activities
- **Regulatory submission:** Direct integration with regulatory portals (e.g., NERC EARS)
- **Document retention:** Compliance with retention policies (7 years for NERC, 10 years for tax)
- **Attestation workflows:** Multi-level review and digital signatures for compliance certifications

### 1.3 Regulatory Context

**Renewable Energy Compliance Landscape:**
- **Grid Reliability:** NERC CIP (Critical Infrastructure Protection), PRC (Protection and Control)
- **Incident Reporting:** NERC EOP-004 (disturbance reporting within 1 hour)
- **Environmental:** EPA reporting for large solar installations, water usage for CSP
- **Safety:** OSHA 300 logs, safety incident reporting
- **Financial:** SOX compliance for publicly traded asset owners, tax credit reporting (ITC/PTC)
- **Renewable Energy Certificates (RECs):** Generation tracking and certificate issuance

---

## 2. Regulatory Frameworks

### 2.1 Supported Frameworks

```yaml
regulatory_frameworks:
  north_america:
    nerc:
      name: "North American Electric Reliability Corporation"
      jurisdiction: "USA, Canada, Mexico (bulk electric system)"
      applicable_standards:
        - "CIP-002: BES Cyber System Categorization"
        - "CIP-003: Security Management Controls"
        - "CIP-005: Electronic Security Perimeter"
        - "CIP-007: Systems Security Management"
        - "CIP-010: Configuration Change Management"
        - "EOP-004: Event Reporting (1-hour disturbance reporting)"
        - "PRC-002: Disturbance Monitoring Equipment"
        - "MOD-026: Verification of Models and Data"
      reporting_frequency:
        self_certification: "annual"
        spot_check: "as_requested"
        disturbance: "within_1_hour"
      retention_period: "7 years"

    ferc:
      name: "Federal Energy Regulatory Commission"
      jurisdiction: "USA (interstate wholesale electricity)"
      applicable_regulations:
        - "Form 1: Annual Report of Major Electric Utilities"
        - "Form 556: Certification of Qualifying Facility Status"
        - "EQR: Electric Quarterly Reports"
      reporting_frequency:
        form_1: "annual"
        eqr: "quarterly"
      retention_period: "10 years"

    osha:
      name: "Occupational Safety and Health Administration"
      jurisdiction: "USA"
      applicable_standards:
        - "OSHA 300: Log of Work-Related Injuries and Illnesses"
        - "OSHA 301: Injury and Illness Incident Report"
        - "OSHA 300A: Summary of Work-Related Injuries and Illnesses"
      reporting_frequency:
        osha_300: "ongoing"
        osha_300a: "annual (February 1 - April 30 posting)"
      retention_period: "5 years"

  india:
    cea:
      name: "Central Electricity Authority"
      jurisdiction: "India (grid-connected generation)"
      applicable_regulations:
        - "CEA (Grid Standards) Regulations 2010"
        - "CEA (Technical Standards for Connectivity) Regulations 2007"
        - "Monthly Generation Report"
        - "Annual Performance Report"
      reporting_frequency:
        monthly: "generation, outages, grid disturbances"
        annual: "performance, reliability indices"
      retention_period: "7 years"

    mnre:
      name: "Ministry of New and Renewable Energy"
      jurisdiction: "India (renewable energy projects)"
      applicable_regulations:
        - "Solar Park Scheme Progress Report"
        - "REC Mechanism Compliance"
        - "Performance-Based Incentive Reporting"
      reporting_frequency:
        monthly: "generation, REC issuance"
        quarterly: "scheme milestones"
      retention_period: "7 years"

  australia:
    aemo:
      name: "Australian Energy Market Operator"
      jurisdiction: "Australia (NEM)"
      applicable_regulations:
        - "NER 4.9: Information, Documents and Data for the NEM"
        - "GPS (Generator Performance Standards)"
        - "5-Minute Settlement Data"
      reporting_frequency:
        real_time: "5-minute SCADA"
        daily: "generation, availability"
      retention_period: "7 years"

  united_kingdom:
    neso:
      name: "National Energy System Operator"
      jurisdiction: "UK"
      applicable_regulations:
        - "Grid Code Compliance"
        - "Balancing Mechanism Reporting"
        - "Renewable Obligation Certificate (ROC) Reporting"
      reporting_frequency:
        real_time: "SCADA telemetry"
        monthly: "ROC submissions"
      retention_period: "6 years"

  environmental:
    epa:
      name: "Environmental Protection Agency"
      jurisdiction: "USA"
      applicable_regulations:
        - "Toxic Release Inventory (TRI) - for large CSP plants"
        - "Water Pollution Discharge (NPDES) - for CSP cooling"
        - "Stormwater Pollution Prevention Plan (SWPPP)"
      reporting_frequency:
        annual: "TRI"
        ongoing: "SWPPP monitoring"
      retention_period: "5 years"

  financial:
    irs:
      name: "Internal Revenue Service"
      jurisdiction: "USA (tax credits)"
      applicable_regulations:
        - "Form 3468: Investment Tax Credit (ITC)"
        - "Form 8835: Renewable Electricity Production Credit (PTC)"
        - "Beginning of Construction Evidence"
      reporting_frequency:
        annual: "tax filing"
      retention_period: "10 years"
```

### 2.2 Compliance Scope Matrix

```yaml
# Maps dCMMS activities to regulatory requirements
compliance_mapping:
  work_orders:
    triggers:
      - framework: "NERC CIP-007"
        requirement: "Security patch management within 35 days"
        mapped_fields: ["workOrder.category = security_patch", "workOrder.completedAt"]

      - framework: "OSHA 300"
        requirement: "Log work-related injuries within 7 days"
        mapped_fields: ["workOrder.safetyIncident", "workOrder.injuryDetails"]

  incident_reports:
    triggers:
      - framework: "NERC EOP-004"
        requirement: "Report disturbances within 1 hour"
        criteria: "event.type = grid_disturbance && event.impact > 100MW"

      - framework: "OSHA 301"
        requirement: "File incident report within 7 days of injury"
        criteria: "incident.type = injury && incident.severity >= lost_time"

  asset_maintenance:
    triggers:
      - framework: "NERC PRC-002"
        requirement: "Disturbance monitoring equipment calibration"
        mapped_fields: ["asset.type = disturbance_monitor", "maintenance.lastCalibration"]

  security_logs:
    triggers:
      - framework: "NERC CIP-003"
        requirement: "Retain security logs for 90 days (critical assets)"
        mapped_fields: ["auditLog.category = security", "auditLog.assetCriticality"]

  generation_data:
    triggers:
      - framework: "CEA"
        requirement: "Monthly generation report"
        mapped_fields: ["telemetry.metric = active_power", "aggregation = monthly"]

      - framework: "AEMO"
        requirement: "5-minute settlement data"
        mapped_fields: ["telemetry.metric = active_power", "aggregation = 5_minute"]

      - framework: "IRS Form 3468"
        requirement: "Annual generation evidence for PTC"
        mapped_fields: ["telemetry.metric = active_power", "aggregation = annual"]
```

---

## 3. Compliance Reporting Templates

### 3.1 NERC EOP-004 Disturbance Report

```json
{
  "reportId": "EOP004-2025-001",
  "framework": "NERC EOP-004-3",
  "reportType": "disturbance_report",
  "tenantId": "tenant-acme-solar",
  "siteId": "SITE-TX-001",

  "disturbance_details": {
    "event_date": "2025-11-11T14:32:15Z",
    "event_duration_minutes": 12,
    "event_type": "frequency_deviation",
    "description": "Transmission line fault caused sudden generator trip, resulting in 150 MW loss of generation",

    "impact": {
      "generation_loss_mw": 150,
      "customers_affected": 0,
      "duration_minutes": 12
    },

    "reporting_criteria_met": [
      "Loss of 100 MW or more of firm system demand",
      "Frequency deviation > 0.2 Hz"
    ]
  },

  "asset_details": {
    "assets_affected": [
      {
        "assetId": "GEN-TX-001",
        "assetName": "Solar Inverter Array 1",
        "capacity_mw": 50,
        "status_before": "operational",
        "status_after": "tripped"
      },
      {
        "assetId": "GEN-TX-002",
        "assetName": "Solar Inverter Array 2",
        "capacity_mw": 50,
        "status_before": "operational",
        "status_after": "tripped"
      },
      {
        "assetId": "GEN-TX-003",
        "assetName": "Solar Inverter Array 3",
        "capacity_mw": 50,
        "status_before": "operational",
        "status_after": "tripped"
      }
    ]
  },

  "telemetry_data": {
    "frequency_nadir": {
      "value": 59.78,
      "unit": "Hz",
      "timestamp": "2025-11-11T14:32:18Z"
    },
    "voltage_dip": {
      "value": 0.92,
      "unit": "pu",
      "timestamp": "2025-11-11T14:32:16Z"
    }
  },

  "response_actions": [
    {
      "timestamp": "2025-11-11T14:32:20Z",
      "action": "Automatic protection relay tripped generators",
      "actor": "system"
    },
    {
      "timestamp": "2025-11-11T14:35:00Z",
      "action": "Control room notified, grid operator contacted",
      "actor": "user-ops-001"
    },
    {
      "timestamp": "2025-11-11T14:44:00Z",
      "action": "Generators restored after fault cleared",
      "actor": "user-ops-001"
    }
  ],

  "root_cause": {
    "preliminary": "Transmission line fault due to equipment failure at substation",
    "investigation_status": "ongoing",
    "expected_final_report_date": "2025-11-25"
  },

  "notifications_sent": [
    {
      "recipient": "ERCOT Control Center",
      "method": "phone",
      "timestamp": "2025-11-11T14:38:00Z",
      "contact_person": "John Smith, Shift Supervisor"
    },
    {
      "recipient": "NERC EARS (Event Analysis and Reporting System)",
      "method": "web_portal",
      "timestamp": "2025-11-11T15:25:00Z",
      "confirmation_number": "EARS-2025-TX-00123"
    }
  ],

  "compliance_status": {
    "submitted_within_1_hour": true,
    "submission_timestamp": "2025-11-11T15:25:00Z",
    "time_to_submission_minutes": 53,
    "compliant": true
  },

  "attachments": [
    {
      "filename": "frequency_deviation_chart.pdf",
      "type": "telemetry_analysis",
      "fileUrl": "s3://dcmms-compliance/EOP004-2025-001/frequency_chart.pdf"
    },
    {
      "filename": "disturbance_recording.csv",
      "type": "raw_data",
      "fileUrl": "s3://dcmms-compliance/EOP004-2025-001/scada_data.csv"
    }
  ],

  "certification": {
    "certifiedBy": "user-mgr-001",
    "certifiedByName": "Jane Doe",
    "certifiedByTitle": "Operations Manager",
    "certificationDate": "2025-11-11T15:20:00Z",
    "digitalSignature": "base64_encoded_signature"
  }
}
```

### 3.2 OSHA 300 Injury Log Entry

```json
{
  "reportId": "OSHA300-2025-003",
  "framework": "OSHA 300",
  "reportType": "injury_log",
  "tenantId": "tenant-acme-solar",
  "siteId": "SITE-AZ-001",

  "incident_details": {
    "case_number": "2025-003",
    "incident_date": "2025-11-10",
    "incident_time": "10:45:00",
    "location": "Solar Array Section 3B",
    "workOrderId": "WO-5678"
  },

  "employee_details": {
    "name": "redacted_for_privacy",
    "employee_id": "EMP-1234",
    "job_title": "Solar Technician",
    "date_of_birth": "redacted",
    "date_hired": "2023-05-15"
  },

  "injury_classification": {
    "type": "injury",
    "body_part": "hand",
    "nature_of_injury": "laceration",
    "injury_source": "inverter panel edge",
    "event_or_exposure": "struck_by_object",
    "severity": "medical_treatment_beyond_first_aid",
    "days_away_from_work": 0,
    "days_on_job_transfer_restriction": 3,
    "recordable": true
  },

  "treatment": {
    "first_aid_administered": true,
    "medical_facility": "Urgent Care Clinic",
    "treatment_description": "Laceration cleaned and sutured (4 stitches), tetanus shot administered",
    "return_to_work_date": "2025-11-11",
    "work_restrictions": "No lifting over 10 lbs, no fine motor tasks for 3 days"
  },

  "investigation": {
    "root_cause": "Inverter panel cover not properly secured, sharp edge exposed",
    "corrective_actions": [
      {
        "action": "Inspect all inverter panel covers for sharp edges",
        "assignedTo": "user-safety-001",
        "dueDate": "2025-11-15",
        "status": "in_progress"
      },
      {
        "action": "Issue safety bulletin on proper PPE for inverter work",
        "assignedTo": "user-safety-001",
        "dueDate": "2025-11-12",
        "status": "completed"
      },
      {
        "action": "Add edge guards to all inverter panels",
        "assignedTo": "user-maint-001",
        "dueDate": "2025-11-30",
        "status": "pending"
      }
    ]
  },

  "privacy_case": false,
  "posted_on_300a": false,

  "compliance_status": {
    "logged_within_7_days": true,
    "log_date": "2025-11-11",
    "compliant": true
  }
}
```

### 3.3 CEA Monthly Generation Report (India)

```json
{
  "reportId": "CEA-GEN-2025-10",
  "framework": "CEA Grid Standards",
  "reportType": "monthly_generation",
  "tenantId": "tenant-solaris-india",
  "siteId": "SITE-KA-001",

  "reporting_period": {
    "month": 10,
    "year": 2025,
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  },

  "plant_details": {
    "name": "Karnataka Solar Park - Zone A",
    "capacity_mw_dc": 100,
    "capacity_mw_ac": 80,
    "location": "Pavagada, Karnataka",
    "connection_voltage_kv": 220,
    "substation": "Pavagada Pooling Station"
  },

  "generation_summary": {
    "gross_generation_mwh": 12450.5,
    "auxiliary_consumption_mwh": 125.2,
    "net_generation_mwh": 12325.3,
    "plant_load_factor_percent": 62.3,
    "capacity_utilization_factor_percent": 65.8
  },

  "daily_generation": [
    {
      "date": "2025-10-01",
      "gross_generation_mwh": 410.2,
      "net_generation_mwh": 406.5,
      "peak_generation_mw": 78.5,
      "irradiation_kwh_m2": 6.2,
      "availability_percent": 98.5
    }
    // ... 30 more daily entries
  ],

  "outage_details": [
    {
      "outage_id": "OUT-2025-045",
      "start_date": "2025-10-15T08:30:00+05:30",
      "end_date": "2025-10-15T14:00:00+05:30",
      "duration_hours": 5.5,
      "capacity_lost_mw": 25,
      "type": "forced",
      "reason": "Inverter fault - INV-12",
      "generation_loss_mwh": 137.5
    },
    {
      "outage_id": "OUT-2025-046",
      "start_date": "2025-10-22T00:00:00+05:30",
      "end_date": "2025-10-22T08:00:00+05:30",
      "duration_hours": 8,
      "capacity_lost_mw": 80,
      "type": "scheduled",
      "reason": "Preventive maintenance - transformer annual service",
      "generation_loss_mwh": 0
    }
  ],

  "grid_incidents": [
    {
      "incident_id": "GRID-2025-012",
      "date": "2025-10-18T16:45:00+05:30",
      "type": "under_frequency",
      "description": "Grid frequency dropped to 49.7 Hz, plant tripped on under-frequency relay",
      "duration_minutes": 8,
      "generation_loss_mwh": 10.2,
      "notified_to": "Karnataka SLDC"
    }
  ],

  "recs_issued": {
    "rec_category": "solar",
    "recs_eligible_mwh": 12325.3,
    "recs_issued": 12325,
    "rec_registry": "NPCIL REC Registry"
  },

  "certification": {
    "certifiedBy": "user-mgr-india-001",
    "certifiedByName": "Rajesh Kumar",
    "certifiedByTitle": "Plant Manager",
    "certificationDate": "2025-11-05T10:00:00+05:30",
    "digitalSignature": "base64_encoded_signature"
  }
}
```

### 3.4 IRS Form 3468 (Investment Tax Credit)

```json
{
  "reportId": "IRS-3468-2025",
  "framework": "IRS Tax Credits",
  "reportType": "investment_tax_credit",
  "tenantId": "tenant-acme-solar",
  "taxYear": 2025,

  "facility_details": {
    "facility_name": "Texas Solar Farm Phase 1",
    "ein": "12-3456789",
    "address": "1234 Solar Road, Austin, TX 78701",
    "placed_in_service_date": "2025-06-15"
  },

  "eligible_costs": {
    "solar_panels": {
      "description": "450W monocrystalline panels (250,000 units)",
      "cost": 25000000.00
    },
    "inverters": {
      "description": "Central inverters (50 units @ 2MW each)",
      "cost": 12000000.00
    },
    "mounting_structures": {
      "description": "Racking and tracking systems",
      "cost": 8000000.00
    },
    "electrical_equipment": {
      "description": "Transformers, switchgear, cabling",
      "cost": 5000000.00
    },
    "site_preparation": {
      "description": "Grading, access roads, foundations",
      "cost": 3000000.00
    },
    "interconnection": {
      "description": "Substation and grid connection equipment",
      "cost": 4000000.00
    },
    "total_eligible_basis": 57000000.00
  },

  "credit_calculation": {
    "eligible_basis": 57000000.00,
    "credit_rate_percent": 30,
    "credit_amount": 17100000.00,
    "bonus_credit_applicable": false
  },

  "beginning_of_construction_evidence": {
    "method": "physical_work_test",
    "evidence": [
      {
        "date": "2024-03-15",
        "description": "Site preparation commenced - grading and excavation",
        "cost": 250000.00,
        "documentation": "s3://dcmms-tax/BOC/site_prep_invoice.pdf"
      },
      {
        "date": "2024-04-01",
        "description": "Foundation installation for tracker system",
        "cost": 500000.00,
        "documentation": "s3://dcmms-tax/BOC/foundation_contract.pdf"
      }
    ]
  },

  "annual_generation_kwh": 125000000,

  "attachments": [
    {
      "filename": "equipment_purchase_invoices.pdf",
      "fileUrl": "s3://dcmms-tax/2025/invoices.pdf"
    },
    {
      "filename": "engineer_certification.pdf",
      "fileUrl": "s3://dcmms-tax/2025/engineer_cert.pdf"
    }
  ],

  "preparedBy": {
    "name": "Smith & Associates CPAs",
    "contact": "tax@smithcpa.com",
    "date": "2025-02-15"
  }
}
```

---

## 4. Automated Compliance Workflows

### 4.1 Compliance Workflow Engine

```javascript
class ComplianceWorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.scheduler = new WorkflowScheduler();
  }

  /**
   * Register compliance workflow
   */
  registerWorkflow(workflow) {
    this.workflows.set(workflow.workflowId, workflow);

    // Schedule recurring workflows
    if (workflow.schedule) {
      this.scheduler.schedule(workflow);
    }

    // Register event triggers
    if (workflow.triggers) {
      workflow.triggers.forEach(trigger => {
        this.registerTrigger(trigger, workflow);
      });
    }
  }

  /**
   * Execute workflow based on trigger event
   */
  async executeTrigger(event) {
    const applicableWorkflows = this.findWorkflowsByEvent(event);

    for (const workflow of applicableWorkflows) {
      try {
        await this.executeWorkflow(workflow, event);
      } catch (error) {
        logger.error('Compliance workflow failed', {
          workflowId: workflow.workflowId,
          event,
          error: error.message
        });

        // Alert compliance team
        await this.notifyComplianceTeam(workflow, error);
      }
    }
  }

  async executeWorkflow(workflow, context) {
    const execution = {
      executionId: uuidv4(),
      workflowId: workflow.workflowId,
      status: 'running',
      startedAt: new Date(),
      context
    };

    await db.complianceWorkflowExecutions.insert(execution);

    // Execute steps sequentially
    for (const step of workflow.steps) {
      try {
        const result = await this.executeStep(step, context);

        execution.stepResults = execution.stepResults || [];
        execution.stepResults.push({
          stepId: step.stepId,
          status: 'completed',
          result,
          completedAt: new Date()
        });

        // Update context with step results
        context[step.outputVariable] = result;

      } catch (error) {
        execution.stepResults.push({
          stepId: step.stepId,
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        });

        // Handle error based on step configuration
        if (step.continueOnError) {
          logger.warn('Workflow step failed but continuing', {
            workflowId: workflow.workflowId,
            stepId: step.stepId,
            error: error.message
          });
        } else {
          throw error;
        }
      }
    }

    execution.status = 'completed';
    execution.completedAt = new Date();

    await db.complianceWorkflowExecutions.update(
      { executionId: execution.executionId },
      execution
    );

    return execution;
  }

  async executeStep(step, context) {
    switch (step.type) {
      case 'data_collection':
        return await this.collectData(step, context);

      case 'report_generation':
        return await this.generateReport(step, context);

      case 'validation':
        return await this.validateReport(step, context);

      case 'approval':
        return await this.requestApproval(step, context);

      case 'submission':
        return await this.submitReport(step, context);

      case 'notification':
        return await this.sendNotification(step, context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  async collectData(step, context) {
    const { dataSource, query, aggregation } = step.config;

    if (dataSource === 'telemetry') {
      return await this.collectTelemetryData(query, aggregation, context);
    } else if (dataSource === 'work_orders') {
      return await this.collectWorkOrderData(query, context);
    } else if (dataSource === 'incidents') {
      return await this.collectIncidentData(query, context);
    } else if (dataSource === 'audit_logs') {
      return await this.collectAuditLogData(query, context);
    }
  }

  async generateReport(step, context) {
    const { templateId, outputFormat } = step.config;

    const template = await db.complianceTemplates.findOne({ templateId });

    // Render template with collected data
    const report = await reportGenerator.render(template, context, outputFormat);

    // Store report
    const reportRecord = {
      reportId: uuidv4(),
      templateId,
      framework: template.framework,
      reportType: template.reportType,
      generatedAt: new Date(),
      data: report.data,
      fileUrl: await this.uploadReportFile(report, outputFormat)
    };

    await db.complianceReports.insert(reportRecord);

    return reportRecord;
  }

  async requestApproval(step, context) {
    const { approvers, approvalType } = step.config;

    const approvalRequest = {
      approvalId: uuidv4(),
      reportId: context.report.reportId,
      approvalType, // sequential or parallel
      approvers: approvers.map(userId => ({
        userId,
        status: 'pending',
        requestedAt: new Date()
      })),
      status: 'pending'
    };

    await db.approvalRequests.insert(approvalRequest);

    // Send approval notifications
    for (const approver of approvers) {
      await notificationService.send({
        userId: approver,
        templateId: 'TPL-COMPLIANCE-APPROVAL-REQUEST',
        context: {
          report: context.report,
          approvalUrl: `https://dcmms.company.com/compliance/approvals/${approvalRequest.approvalId}`
        }
      });
    }

    // Wait for approvals (if synchronous workflow)
    if (step.waitForApproval) {
      return await this.waitForApprovals(approvalRequest.approvalId, step.timeout);
    }

    return approvalRequest;
  }

  async submitReport(step, context) {
    const { submissionMethod, endpoint } = step.config;

    if (submissionMethod === 'web_portal') {
      return await this.submitViaWebPortal(endpoint, context.report);
    } else if (submissionMethod === 'api') {
      return await this.submitViaAPI(endpoint, context.report);
    } else if (submissionMethod === 'email') {
      return await this.submitViaEmail(endpoint, context.report);
    }
  }
}
```

### 4.2 Example Workflow: NERC EOP-004 Auto-Reporting

```json
{
  "workflowId": "WF-NERC-EOP004",
  "name": "NERC EOP-004 Disturbance Reporting",
  "framework": "NERC EOP-004",
  "description": "Automatically detect and report grid disturbances within 1 hour",

  "triggers": [
    {
      "type": "event",
      "eventType": "grid_disturbance",
      "condition": "event.impact_mw >= 100 || event.frequency_deviation >= 0.2"
    }
  ],

  "steps": [
    {
      "stepId": "detect_disturbance",
      "type": "data_collection",
      "config": {
        "dataSource": "telemetry",
        "query": {
          "metrics": ["frequency", "voltage", "active_power"],
          "timeRange": "last_15_minutes"
        }
      },
      "outputVariable": "telemetry_data"
    },

    {
      "stepId": "determine_reporting_criteria",
      "type": "validation",
      "config": {
        "validations": [
          {
            "criteria": "generation_loss_mw >= 100",
            "message": "Loss of 100 MW or more of generation"
          },
          {
            "criteria": "frequency_deviation >= 0.2",
            "message": "Frequency deviation exceeds 0.2 Hz"
          }
        ]
      },
      "outputVariable": "reporting_criteria_met"
    },

    {
      "stepId": "generate_report",
      "type": "report_generation",
      "config": {
        "templateId": "TPL-NERC-EOP004",
        "outputFormat": "json"
      },
      "outputVariable": "report"
    },

    {
      "stepId": "notify_ops_team",
      "type": "notification",
      "config": {
        "recipients": {
          "roles": ["operations_manager"],
          "users": ["user-compliance-001"]
        },
        "templateId": "TPL-DISTURBANCE-DETECTED",
        "channels": ["email", "sms"],
        "message": "Grid disturbance detected. Auto-generating NERC EOP-004 report."
      }
    },

    {
      "stepId": "request_approval",
      "type": "approval",
      "config": {
        "approvers": ["user-ops-mgr-001", "user-compliance-001"],
        "approvalType": "parallel",
        "timeout": "45m"
      },
      "waitForApproval": true,
      "outputVariable": "approval"
    },

    {
      "stepId": "submit_to_nerc",
      "type": "submission",
      "config": {
        "submissionMethod": "web_portal",
        "endpoint": "https://ears.nerc.net/submit",
        "authentication": {
          "type": "certificate",
          "certPath": "/vault/nerc/client.crt",
          "keyPath": "/vault/nerc/client.key"
        }
      },
      "outputVariable": "submission_result"
    },

    {
      "stepId": "record_compliance",
      "type": "audit_log",
      "config": {
        "category": "compliance",
        "compliance": {
          "relevant": true,
          "regulatoryFramework": ["NERC EOP-004"]
        }
      }
    }
  ],

  "sla": {
    "deadline": "1 hour from disturbance detection",
    "alertIfMissed": ["user-compliance-director-001"]
  }
}
```

---

## 5. Audit Trail System

### 5.1 Compliance Audit Log Schema

```json
{
  "auditId": "AUDIT-COMP-001",
  "category": "compliance",
  "action": "report.generated",
  "timestamp": "2025-11-11T10:00:00Z",

  "actor": {
    "type": "system",
    "userId": "system-compliance-engine",
    "ipAddress": "10.0.1.50"
  },

  "resource": {
    "type": "compliance_report",
    "id": "CEA-GEN-2025-10",
    "framework": "CEA",
    "reportType": "monthly_generation"
  },

  "details": {
    "workflowId": "WF-CEA-MONTHLY",
    "executionId": "EXEC-12345",
    "reportingPeriod": "2025-10",
    "dataPointsCollected": 2485,
    "generationDurationMs": 3420
  },

  "compliance": {
    "relevant": true,
    "regulatoryFramework": ["CEA Grid Standards"],
    "retentionPeriod": 2555,
    "immutable": true
  },

  "beforeState": null,
  "afterState": {
    "reportStatus": "draft",
    "approvalStatus": "pending"
  }
}
```

### 5.2 Immutable Audit Trail

All compliance-related audit logs are stored in immutable storage:

```javascript
class ComplianceAuditLogger extends AuditLogger {
  async log(entry) {
    // Standard audit logging
    await super.log(entry);

    // Compliance logs → immutable S3 with Object Lock
    if (entry.compliance?.relevant) {
      await s3.putObject({
        Bucket: 'dcmms-compliance-audit-immutable',
        Key: `${entry.tenantId}/${entry.compliance.regulatoryFramework[0]}/${format(entry.timestamp, 'yyyy/MM/dd')}/${entry.auditId}.json`,
        Body: JSON.stringify(entry),
        ServerSideEncryption: 'aws:kms',
        ObjectLockMode: 'COMPLIANCE',
        ObjectLockRetainUntilDate: addDays(entry.timestamp, entry.compliance.retentionPeriod)
      }).promise();

      // Create blockchain hash for tamper evidence
      const hash = crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');

      await db.complianceAuditHashes.insert({
        auditId: entry.auditId,
        hash,
        timestamp: entry.timestamp,
        blockchainTxId: await this.recordOnBlockchain(hash)
      });
    }
  }

  async recordOnBlockchain(hash) {
    // Optional: Record hash on private blockchain for tamper evidence
    // Useful for regulatory audits where immutability proof is required
    return 'blockchain-tx-id-placeholder';
  }
}
```

---

## 6. Regulatory Submission Automation

### 6.1 NERC EARS Integration

```javascript
class NErcEARSIntegration {
  constructor() {
    this.baseUrl = 'https://ears.nerc.net/api';
    this.cert = fs.readFileSync(process.env.NERC_CLIENT_CERT);
    this.key = fs.readFileSync(process.env.NERC_CLIENT_KEY);
  }

  async submitDisturbanceReport(report) {
    const axios = require('axios');
    const https = require('https');

    const httpsAgent = new https.Agent({
      cert: this.cert,
      key: this.key,
      rejectUnauthorized: true
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/disturbance-reports`,
        this.transformToEARSFormat(report),
        {
          httpsAgent,
          headers: {
            'Content-Type': 'application/json',
            'X-NERC-Entity-ID': process.env.NERC_ENTITY_ID
          }
        }
      );

      return {
        success: true,
        confirmationNumber: response.data.confirmationNumber,
        submissionId: response.data.submissionId,
        submittedAt: new Date()
      };

    } catch (error) {
      throw new Error(`NERC EARS submission failed: ${error.message}`);
    }
  }

  transformToEARSFormat(report) {
    // Transform dCMMS report format to NERC EARS API format
    return {
      entityId: process.env.NERC_ENTITY_ID,
      eventDate: report.disturbance_details.event_date,
      eventType: this.mapEventType(report.disturbance_details.event_type),
      impactMW: report.disturbance_details.impact.generation_loss_mw,
      description: report.disturbance_details.description,
      assets: report.asset_details.assets_affected.map(asset => ({
        assetName: asset.assetName,
        capacity: asset.capacity_mw,
        status: asset.status_after
      })),
      telemetry: report.telemetry_data,
      responseActions: report.response_actions
    };
  }

  mapEventType(dcmmsEventType) {
    const mapping = {
      'frequency_deviation': 'FREQ_DEV',
      'voltage_deviation': 'VOLT_DEV',
      'generator_trip': 'GEN_TRIP',
      'transmission_fault': 'TRANS_FAULT'
    };
    return mapping[dcmmsEventType] || 'OTHER';
  }
}
```

### 6.2 CEA Portal Submission (India)

```javascript
class CEAPortalIntegration {
  async submitMonthlyReport(report) {
    // CEA uses web portal submission (no API available)
    // Generate pre-filled PDF form

    const pdf = await this.generateCEAForm(report);

    // Store for manual submission or use RPA bot
    await s3.putObject({
      Bucket: 'dcmms-compliance-submissions',
      Key: `CEA/monthly/${report.reporting_period.year}/${report.reporting_period.month}/${report.reportId}.pdf`,
      Body: pdf,
      ContentType: 'application/pdf'
    }).promise();

    // Notify user to submit
    await notificationService.send({
      recipients: { roles: ['compliance_officer'] },
      templateId: 'TPL-CEA-MANUAL-SUBMISSION',
      context: {
        report,
        pdfUrl: `https://dcmms-downloads.company.com/compliance/${report.reportId}.pdf`,
        ceaPortalUrl: 'https://cea.nic.in/portal/generation-reports'
      },
      channels: ['email']
    });

    return {
      success: true,
      pdfGenerated: true,
      manualSubmissionRequired: true
    };
  }

  async generateCEAForm(report) {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    // Pre-fill CEA Form fields
    doc.fontSize(12);
    doc.text('CENTRAL ELECTRICITY AUTHORITY', { align: 'center' });
    doc.text('Monthly Generation Report', { align: 'center' });
    doc.moveDown();

    doc.text(`Plant Name: ${report.plant_details.name}`);
    doc.text(`Capacity: ${report.plant_details.capacity_mw_ac} MW AC`);
    doc.text(`Month: ${report.reporting_period.month}/${report.reporting_period.year}`);
    doc.moveDown();

    doc.text(`Gross Generation: ${report.generation_summary.gross_generation_mwh} MWh`);
    doc.text(`Net Generation: ${report.generation_summary.net_generation_mwh} MWh`);
    doc.text(`PLF: ${report.generation_summary.plant_load_factor_percent}%`);

    // ... additional form fields

    return doc;
  }
}
```

---

## 7. Compliance Dashboards

### 7.1 Compliance Status Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ dCMMS - Compliance Dashboard                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REGULATORY FRAMEWORKS                                          │
│  ┌──────────┬────────────┬──────────┬──────────┐              │
│  │ NERC     │ CEA        │ OSHA     │ IRS      │              │
│  │ ✓ 12/12  │ ✓ 8/8      │ ⚠ 2/3    │ ✓ 1/1    │              │
│  │ Compliant│ Compliant  │ Overdue  │ Compliant│              │
│  └──────────┴────────────┴──────────┴──────────┘              │
│                                                                 │
│  UPCOMING DEADLINES                                             │
│  ───────────────────────────────────────────────────────────  │
│  🔴 OSHA 300A Annual Summary        Due: 2025-11-15 (4 days)   │
│     Status: Pending approval                                    │
│     [Review Report]                                             │
│                                                                 │
│  🟡 FERC EQR Q4 2025                Due: 2025-11-30 (19 days)  │
│     Status: Data collection in progress                         │
│     [View Progress]                                             │
│                                                                 │
│  🟢 CEA Monthly Report (Nov 2025)   Due: 2025-12-05 (24 days)  │
│     Status: Automated workflow scheduled                        │
│                                                                 │
│  RECENT SUBMISSIONS                                             │
│  ───────────────────────────────────────────────────────────  │
│  ✓ CEA Monthly Report (Oct 2025)    Submitted: 2025-11-05      │
│    Confirmation: CEA-2025-10-KA001                              │
│                                                                 │
│  ✓ NERC EOP-004 Disturbance Report  Submitted: 2025-11-11      │
│    Confirmation: EARS-2025-TX-00123                             │
│    Status: Acknowledged by NERC                                 │
│                                                                 │
│  COMPLIANCE METRICS                                             │
│  ───────────────────────────────────────────────────────────  │
│  On-time Submission Rate:   97.5% (39/40 reports YTD)          │
│  Average Lead Time:         12 days before deadline            │
│  Overdue Reports:           1 (OSHA 300A)                       │
│  Audit Findings (YTD):      0 major, 2 minor                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Compliance Metrics API

```javascript
router.get('/api/v1/compliance/metrics', authenticate, async (req, res) => {
  const { tenantId } = req.user;
  const { startDate, endDate, framework } = req.query;

  const metrics = {
    submission_rate: await this.calculateSubmissionRate(tenantId, framework, startDate, endDate),
    average_lead_time: await this.calculateAverageLeadTime(tenantId, framework),
    overdue_reports: await this.getOverdueReports(tenantId, framework),
    upcoming_deadlines: await this.getUpcomingDeadlines(tenantId, framework, 30),
    audit_findings: await this.getAuditFindings(tenantId, startDate, endDate)
  };

  res.json(metrics);
});
```

---

## 8. Document Retention

### 8.1 Retention Policy Engine

```javascript
class RetentionPolicyEngine {
  constructor() {
    this.policies = new Map();
    this.loadPolicies();
  }

  loadPolicies() {
    const policies = [
      {
        framework: 'NERC',
        category: 'compliance_report',
        retentionYears: 7,
        immutable: true
      },
      {
        framework: 'FERC',
        category: 'financial_report',
        retentionYears: 10,
        immutable: true
      },
      {
        framework: 'OSHA',
        category: 'injury_log',
        retentionYears: 5,
        immutable: true
      },
      {
        framework: 'IRS',
        category: 'tax_credit',
        retentionYears: 10,
        immutable: true
      }
    ];

    policies.forEach(p => this.policies.set(`${p.framework}:${p.category}`, p));
  }

  getRetentionPolicy(framework, category) {
    return this.policies.get(`${framework}:${category}`);
  }

  async applyRetentionPolicy(document) {
    const policy = this.getRetentionPolicy(document.framework, document.category);

    if (!policy) {
      logger.warn('No retention policy found', { framework: document.framework, category: document.category });
      return;
    }

    const retentionUntil = addYears(document.createdAt, policy.retentionYears);

    await db.complianceDocuments.update(
      { documentId: document.documentId },
      {
        retentionPolicy: policy.framework,
        retentionUntil,
        immutable: policy.immutable
      }
    );

    // Apply S3 Object Lock if immutable
    if (policy.immutable && document.fileUrl) {
      await this.applyObjectLock(document.fileUrl, retentionUntil);
    }
  }

  async applyObjectLock(fileUrl, retentionUntil) {
    const { bucket, key } = this.parseS3Url(fileUrl);

    await s3.putObjectRetention({
      Bucket: bucket,
      Key: key,
      Retention: {
        Mode: 'COMPLIANCE',
        RetainUntilDate: retentionUntil
      }
    }).promise();
  }

  /**
   * Daily job to purge expired documents
   */
  async purgeExpiredDocuments() {
    const expiredDocs = await db.complianceDocuments.find({
      retentionUntil: { $lt: new Date() },
      immutable: false
    });

    for (const doc of expiredDocs) {
      await this.purgeDocument(doc);
    }

    logger.info('Document retention purge completed', {
      documentsDeleted: expiredDocs.length
    });
  }
}
```

---

## 9. Certification & Attestation

### 9.1 Digital Signature Workflow

```javascript
class ComplianceAttestationService {
  async requestAttestation(report, approvers) {
    const attestation = {
      attestationId: uuidv4(),
      reportId: report.reportId,
      framework: report.framework,
      status: 'pending',
      approvers: approvers.map(userId => ({
        userId,
        role: this.getUserRole(userId),
        status: 'pending',
        requestedAt: new Date()
      })),
      createdAt: new Date()
    };

    await db.attestations.insert(attestation);

    // Send attestation requests
    for (const approver of approvers) {
      await notificationService.send({
        userId: approver.userId,
        templateId: 'TPL-ATTESTATION-REQUEST',
        context: {
          report,
          attestationUrl: `https://dcmms.company.com/compliance/attest/${attestation.attestationId}`
        },
        channels: ['email']
      });
    }

    return attestation;
  }

  async signAttestation(attestationId, userId, signature) {
    const attestation = await db.attestations.findOne({ attestationId });

    // Verify signature
    const isValid = await this.verifyDigitalSignature(signature, userId);

    if (!isValid) {
      throw new Error('Invalid digital signature');
    }

    // Update approver status
    await db.attestations.update(
      { attestationId, 'approvers.userId': userId },
      {
        $set: {
          'approvers.$.status': 'approved',
          'approvers.$.approvedAt': new Date(),
          'approvers.$.signature': signature
        }
      }
    );

    // Check if all approvers signed
    const updated = await db.attestations.findOne({ attestationId });
    const allSigned = updated.approvers.every(a => a.status === 'approved');

    if (allSigned) {
      await this.finalizeAttestation(attestation);
    }
  }

  async verifyDigitalSignature(signature, userId) {
    const crypto = require('crypto');

    const user = await db.users.findOne({ userId });
    const publicKey = user.publicKey;

    const verify = crypto.createVerify('SHA256');
    verify.update(signature.data);
    verify.end();

    return verify.verify(publicKey, signature.signature, 'base64');
  }

  async finalizeAttestation(attestation) {
    await db.attestations.update(
      { attestationId: attestation.attestationId },
      {
        status: 'completed',
        completedAt: new Date()
      }
    );

    await db.complianceReports.update(
      { reportId: attestation.reportId },
      {
        attestationStatus: 'attested',
        attestedAt: new Date(),
        attestationId: attestation.attestationId
      }
    );

    // Audit log
    await auditLogger.log({
      category: 'compliance',
      action: 'report.attested',
      resource: { type: 'compliance_report', id: attestation.reportId },
      details: {
        attestationId: attestation.attestationId,
        approvers: attestation.approvers.map(a => a.userId)
      },
      compliance: {
        relevant: true,
        regulatoryFramework: [attestation.framework]
      }
    });
  }
}
```

---

## Summary

This specification provides comprehensive compliance and regulatory reporting capabilities for dCMMS:

1. **Multi-jurisdiction support** for NERC, FERC, OSHA, CEA, MNRE, AEMO, NESO, EPA, IRS
2. **Compliance templates** for disturbance reports, injury logs, generation reports, tax credits
3. **Automated workflows** with event triggers, scheduled execution, and SLA monitoring
4. **Immutable audit trail** with blockchain hashing for tamper evidence
5. **Regulatory submission** automation (NERC EARS API, CEA portal pre-fill)
6. **Compliance dashboards** showing status, deadlines, metrics
7. **Document retention** policies with S3 Object Lock enforcement
8. **Digital attestation** workflows with multi-level approval and signatures

**Lines:** ~1,350
**Status:** Complete
**Next:** Analytics and Reporting Enhancements (Spec 16)
