# dCMMS Data Retention Policy

**Version:** 1.0
**Effective Date:** 2025-11-18
**Last Updated:** 2025-11-18
**Document Owner:** Compliance & Security Team
**Review Frequency:** Annual

## 1. Purpose and Scope

This Data Retention Policy defines the retention schedules, deletion procedures, and compliance requirements for all data stored and processed by the Distributed Computerized Maintenance Management System (dCMMS).

### 1.1 Objectives
- Ensure compliance with applicable laws and regulations
- Minimize data storage costs and security risks
- Support operational and business continuity requirements
- Facilitate auditing and legal discovery processes
- Protect user privacy rights (GDPR, India DPDP Act)

### 1.2 Scope
This policy applies to all data types within dCMMS, including but not limited to:
- Operational data (work orders, assets, sites)
- Time-series telemetry data
- Compliance and audit records
- User and authentication data
- System logs and backups

---

## 2. Retention Schedules by Data Type

### 2.1 Work Orders
- **Retention Period:** 7 years
- **Legal Basis:** CEA compliance requirements, industry best practices
- **Storage:** PostgreSQL primary database
- **Notes:**
  - All work order statuses (draft, completed, cancelled) retained equally
  - Includes attachments, comments, and change history
  - Critical for regulatory audits and maintenance history analysis

### 2.2 Assets
- **Active Assets:** Permanent retention
- **Decommissioned Assets:** 10 years after decommission date
- **Legal Basis:** Long-term asset lifecycle management, warranty claims
- **Storage:** PostgreSQL primary database
- **Notes:**
  - Asset metadata, specifications, and relationships preserved
  - Decommissioned date triggers countdown for eventual deletion
  - Historical asset data supports predictive maintenance models

### 2.3 Telemetry Data
- **Raw Telemetry (PostgreSQL):** 90 days
- **Aggregated Telemetry (ClickHouse):** 10 years
- **Legal Basis:** MNRE reporting (5 years minimum), extended for analytics
- **Storage:**
  - Raw: PostgreSQL `telemetry_readings` table
  - Aggregated: ClickHouse `telemetry_aggregates` table
- **Notes:**
  - Raw data purged after 90 days to optimize storage
  - Hourly, daily, and monthly aggregates retained for long-term analysis
  - Generation data (solar, wind) retained per MNRE requirements

### 2.4 Audit Logs
- **Retention Period:** 7 years
- **Legal Basis:** CEA compliance, SOX (if applicable), industry standards
- **Storage:** PostgreSQL `audit_logs` table (append-only, tamper-proof)
- **Notes:**
  - Covers all compliance-related actions
  - Immutable by design (triggers prevent updates/deletes)
  - Used for regulatory audits and forensic investigations
  - Export to external archival systems after 3 years for performance

### 2.5 User Data
- **Active Accounts:** Permanent retention
- **Deleted/Deactivated Accounts:** 30 days, then anonymized
- **Legal Basis:** GDPR Article 17 (Right to Erasure), India DPDP Act
- **Storage:** PostgreSQL `users` table
- **Notes:**
  - Personal identifiable information (PII) anonymized after 30-day grace period
  - Work orders, audit logs retain user ID but anonymize name/email
  - User can request immediate deletion (GDPR compliance)

### 2.6 Compliance Reports
- **Retention Period:** 7 years
- **Legal Basis:** CEA/MNRE reporting requirements, audit trails
- **Storage:**
  - Metadata: PostgreSQL `compliance_generated_reports` table
  - Files: Local filesystem or S3 (configurable)
- **Notes:**
  - DRAFT, FINAL, and SUBMITTED reports retained equally
  - PDF, CSV, JSON formats all retained
  - Required for regulatory inspections and legal discovery

### 2.7 Alerts and Notifications
- **Active Alerts:** Until resolved
- **Resolved Alerts:** 2 years
- **Notification History:** 1 year
- **Legal Basis:** Operational troubleshooting and incident analysis
- **Storage:** PostgreSQL `alerts` and `notification_history` tables
- **Notes:**
  - Critical alerts may be escalated to audit logs for longer retention
  - Notification delivery logs support compliance verification

### 2.8 System Logs
- **Debug Logs:** 90 days
- **Audit/Security Logs:** 1 year
- **Legal Basis:** Security incident response, performance troubleshooting
- **Storage:** Application log files (Pino), log aggregation services
- **Notes:**
  - Debug logs rotated and purged automatically
  - Security logs archived for extended analysis
  - PII must be redacted from application logs

### 2.9 Backups
- **Daily Backups:** 7 days
- **Weekly Backups:** 4 weeks
- **Monthly Backups:** 12 months
- **Legal Basis:** Business continuity, disaster recovery
- **Storage:** S3 or equivalent cloud storage
- **Notes:**
  - Backups follow 3-2-1 rule (3 copies, 2 media types, 1 offsite)
  - Encrypted at rest and in transit
  - Backup restoration tested quarterly

---

## 3. Data Deletion Procedures

### 3.1 Automated Purge Jobs
dCMMS implements automated data purge jobs to enforce retention policies without manual intervention.

#### 3.1.1 Scheduled Jobs
- **Raw Telemetry Purge:** Daily at 2:00 AM UTC
  - Deletes telemetry readings older than 90 days
  - SQL: `DELETE FROM telemetry_readings WHERE created_at < NOW() - INTERVAL '90 days'`

- **Resolved Alerts Purge:** Weekly on Sundays at 3:00 AM UTC
  - Deletes resolved alerts older than 2 years
  - SQL: `DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '2 years'`

- **Notification History Purge:** Monthly on 1st at 4:00 AM UTC
  - Deletes notification history older than 1 year
  - SQL: `DELETE FROM notification_history WHERE created_at < NOW() - INTERVAL '1 year'`

- **Debug Log Rotation:** Daily at 1:00 AM UTC
  - Rotates and archives debug logs older than 7 days
  - Purges logs older than 90 days

- **Decommissioned Assets Purge:** Quarterly
  - Archives and deletes assets decommissioned more than 10 years ago
  - Requires manual approval for production environments

#### 3.1.2 Purge Job Monitoring
- All purge jobs log execution results to audit logs
- Alerts sent to administrators if purge job fails
- Monthly reports generated showing data volumes purged

### 3.2 Soft Delete vs Hard Delete Policies

#### Soft Delete (Logical Deletion)
Used for:
- User accounts (30-day grace period)
- Work orders (never hard deleted)
- Assets (10-year retention after decommission)
- Compliance reports (7-year retention)

Implementation:
- `deleted_at` timestamp field
- `is_deleted` boolean flag
- Queries exclude soft-deleted records by default
- Admin interface for restoring soft-deleted records

#### Hard Delete (Physical Deletion)
Used for:
- Expired telemetry data
- Expired notification history
- Expired system logs
- Post-retention period data

Implementation:
- `DELETE` SQL statements executed by purge jobs
- Irreversible and permanent
- Requires audit log entry before deletion
- Database vacuum after large deletions

### 3.3 Anonymization Procedures (GDPR/DPDP Compliance)

When user accounts are deleted, personal data is anonymized:

```sql
-- Anonymization query example
UPDATE users
SET
  first_name = 'Deleted',
  last_name = 'User',
  email = CONCAT('deleted-', id, '@anonymized.local'),
  phone_number = NULL,
  metadata = '{}',
  deleted_at = NOW()
WHERE id = ?;
```

Fields retained:
- User ID (for referential integrity)
- Created date
- Tenant ID

Fields anonymized:
- First name, last name
- Email address
- Phone number
- Any custom metadata

Associated records:
- Work orders: User ID retained, but name anonymized
- Audit logs: User ID retained, but PII scrubbed
- Notifications: Historical records anonymized

### 3.4 Manual Deletion Approval Workflow

For critical data types (work orders, compliance reports, audit logs), manual deletion requires:

1. **Request Submission:**
   - User submits deletion request via admin interface
   - Request includes justification and affected data scope

2. **Approval Chain:**
   - Tenant Admin approval required
   - Super Admin approval for audit logs and compliance data
   - Legal/Compliance team review for regulatory data

3. **Audit Trail:**
   - All deletion requests logged with timestamps
   - Approver identity and IP address recorded
   - Data snapshot exported before deletion

4. **Execution:**
   - Manual execution by authorized administrator
   - Confirmation step to prevent accidental deletion
   - Post-deletion verification report generated

---

## 4. CEA/MNRE Compliance Alignment

### 4.1 Central Electricity Authority (CEA) Requirements

**Applicable Regulations:**
- CEA (Technical Standards for Connectivity to the Grid) Regulations, 2007
- CEA (Measures relating to Safety and Electric Supply) Regulations, 2010

**Retention Requirements:**
- Maintenance records: 5-7 years minimum
- Equipment test reports: 7 years
- Safety inspection records: 7 years
- Incident/outage reports: Permanent

**dCMMS Implementation:**
- Work orders (including preventive/corrective maintenance): 7 years
- Compliance reports (inspection reports): 7 years
- Asset records (equipment specifications): Permanent (active), 10 years (decommissioned)
- Audit logs (incident tracking): 7 years

### 4.2 Ministry of New and Renewable Energy (MNRE) Requirements

**Applicable Regulations:**
- MNRE Guidelines for Solar/Wind Projects
- India Renewable Energy Development Agency (IREDA) Reporting

**Retention Requirements:**
- Generation data: 5 years minimum
- Performance monitoring: 5 years
- Grid integration data: 5 years
- Subsidy/incentive records: 7 years

**dCMMS Implementation:**
- Telemetry aggregates (generation data): 10 years (exceeds 5-year minimum)
- Compliance reports (MNRE Generation Reports): 7 years
- Assets (solar panels, wind turbines): Permanent (active), 10 years (decommissioned)

### 4.3 India Digital Personal Data Protection Act (DPDP) 2023

**Key Provisions:**
- Right to erasure (Article 12)
- Purpose limitation (Article 6)
- Data minimization (Article 7)
- Storage limitation (Article 8)

**dCMMS Implementation:**
- User anonymization after 30 days of account deletion
- Personal data retention only for active operational purposes
- GDPR-compliant deletion workflows
- Consent management for data processing

---

## 5. Legal and Regulatory Basis

### 5.1 International Standards
- **ISO 27001:** Information security management (audit log retention)
- **SOX (Sarbanes-Oxley):** 7-year retention for financial/operational records (if applicable)
- **GDPR:** Right to erasure, data minimization (EU customers)

### 5.2 India-Specific Regulations
- **Central Electricity Authority (CEA) Regulations**
- **MNRE Guidelines for Renewable Energy Projects**
- **Digital Personal Data Protection Act (DPDP), 2023**
- **Indian Companies Act, 2013:** 8-year retention for company records

### 5.3 Industry Best Practices
- **Gartner Data Retention Recommendations:** 5-7 years for operational data
- **CMMS Industry Standards:** Permanent asset records, 7-year work order history
- **Cybersecurity Frameworks:** NIST, CIS Controls (1-year security log retention)

---

## 6. Data Archival Strategy

### 6.1 Archival Triggers
Data is archived (moved to low-cost storage) when:
- Data exceeds 3 years old (audit logs, compliance reports)
- Data is no longer actively queried (decommissioned assets)
- Data volume exceeds performance thresholds

### 6.2 Archival Storage
- **Primary Storage:** PostgreSQL, ClickHouse (hot data)
- **Archival Storage:** AWS S3 Glacier, Azure Archive Storage (cold data)
- **Compression:** Archived data compressed to reduce costs
- **Encryption:** AES-256 encryption at rest

### 6.3 Archival Retrieval
- Archived data accessible via admin interface
- Retrieval SLA: 24-48 hours for cold storage
- Retrieval logged in audit trail

---

## 7. Exceptions and Special Cases

### 7.1 Legal Holds
- Data subject to litigation or investigation is exempt from deletion
- Legal hold flag prevents automated purge
- Legal team approval required to lift hold

### 7.2 Incident Response
- Data related to security incidents retained until incident closed
- Minimum 2-year retention post-incident
- Forensic copies may be retained indefinitely

### 7.3 Customer Requests
- Customers can request extended retention for specific data
- Extension requests logged and approved by account manager
- Custom retention schedules documented per customer

---

## 8. Roles and Responsibilities

### 8.1 Data Owners
- **Tenant Admins:** Responsible for tenant-specific data retention
- **Site Managers:** Manage site-level operational data
- **Compliance Team:** Oversee regulatory compliance

### 8.2 Data Custodians
- **Database Administrators:** Implement and monitor purge jobs
- **System Administrators:** Manage log retention and backups
- **Security Team:** Ensure secure deletion and anonymization

### 8.3 Data Protection Officer (DPO)
- Oversees GDPR/DPDP compliance
- Approves data deletion policies
- Handles user data access/erasure requests

---

## 9. Policy Review and Updates

### 9.1 Review Schedule
- **Annual Review:** Full policy review by Compliance and Legal teams
- **Regulatory Monitoring:** Continuous tracking of CEA/MNRE updates
- **Incident-Triggered Review:** Policy review after data breaches or audits

### 9.2 Version Control
- All policy changes versioned and documented
- Change log maintained with rationale
- Stakeholder approval required for material changes

### 9.3 Communication
- Policy changes communicated to all users
- Training provided to administrators on new procedures
- External customers notified of material changes

---

## 10. Appendix A: Data Retention Summary Table

| Data Type                 | Retention Period                          | Storage Location    | Purge Method       |
|---------------------------|-------------------------------------------|---------------------|--------------------|
| Work Orders               | 7 years                                   | PostgreSQL          | Manual/Automated   |
| Assets (Active)           | Permanent                                 | PostgreSQL          | N/A                |
| Assets (Decommissioned)   | 10 years after decommission               | PostgreSQL          | Manual             |
| Telemetry (Raw)           | 90 days                                   | PostgreSQL          | Automated          |
| Telemetry (Aggregated)    | 10 years                                  | ClickHouse          | Automated          |
| Audit Logs                | 7 years                                   | PostgreSQL          | Manual (Archive)   |
| User Accounts (Active)    | Permanent                                 | PostgreSQL          | N/A                |
| User Accounts (Deleted)   | 30 days (then anonymized)                 | PostgreSQL          | Automated          |
| Compliance Reports        | 7 years                                   | PostgreSQL + S3     | Manual/Automated   |
| Alerts (Active)           | Until resolved                            | PostgreSQL          | N/A                |
| Alerts (Resolved)         | 2 years                                   | PostgreSQL          | Automated          |
| Notification History      | 1 year                                    | PostgreSQL          | Automated          |
| System Logs (Debug)       | 90 days                                   | Log Files           | Automated          |
| System Logs (Audit)       | 1 year                                    | Log Files           | Automated          |
| Backups (Daily)           | 7 days                                    | S3                  | Automated          |
| Backups (Weekly)          | 4 weeks                                   | S3                  | Automated          |
| Backups (Monthly)         | 12 months                                 | S3                  | Automated          |

---

## 11. Appendix B: Automated Purge Job Configuration

### PostgreSQL Purge Jobs (pg_cron)

```sql
-- Daily: Purge raw telemetry older than 90 days
SELECT cron.schedule('purge-telemetry', '0 2 * * *', $$
  DELETE FROM telemetry_readings WHERE created_at < NOW() - INTERVAL '90 days';
$$);

-- Weekly: Purge resolved alerts older than 2 years
SELECT cron.schedule('purge-alerts', '0 3 * * 0', $$
  DELETE FROM alerts WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '2 years';
$$);

-- Monthly: Purge notification history older than 1 year
SELECT cron.schedule('purge-notifications', '0 4 1 * *', $$
  DELETE FROM notification_history WHERE created_at < NOW() - INTERVAL '1 year';
$$);

-- Quarterly: Archive and purge decommissioned assets older than 10 years
SELECT cron.schedule('purge-decommissioned-assets', '0 5 1 1,4,7,10 *', $$
  -- Archive to S3 first (external script)
  -- Then delete from database
  DELETE FROM assets WHERE status = 'decommissioned' AND decommissioned_at < NOW() - INTERVAL '10 years';
$$);
```

### ClickHouse Purge Jobs (TTL)

```sql
-- Telemetry aggregates with 10-year TTL
ALTER TABLE telemetry_aggregates MODIFY TTL time_bucket + INTERVAL 10 YEAR;
```

---

## 12. Contact Information

**Policy Owner:**
Compliance & Security Team
Email: compliance@dcmms.com

**Data Protection Officer:**
Email: dpo@dcmms.com

**Technical Support:**
Email: support@dcmms.com

---

**Document History:**

| Version | Date       | Author            | Changes                        |
|---------|------------|-------------------|--------------------------------|
| 1.0     | 2025-11-18 | Compliance Team   | Initial policy creation        |

---

**Approval:**

| Role                      | Name              | Signature | Date       |
|---------------------------|-------------------|-----------|------------|
| Chief Compliance Officer  | [Name]            | [Sign]    | 2025-11-18 |
| Chief Technology Officer  | [Name]            | [Sign]    | 2025-11-18 |
| Legal Counsel             | [Name]            | [Sign]    | 2025-11-18 |

---

*This document is confidential and proprietary to dCMMS. Unauthorized distribution is prohibited.*
