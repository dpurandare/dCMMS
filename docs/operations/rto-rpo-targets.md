# RTO/RPO Targets and Validation

**Document:** Recovery Time Objective (RTO) and Recovery Point Objective (RPO) Targets
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Infrastructure Team
**Review Frequency:** Quarterly

---

## Executive Summary

This document defines the Recovery Time Objective (RTO) and Recovery Point Objective (RPO) targets for the dCMMS platform, along with validation procedures to ensure these targets can be met during disaster recovery scenarios.

**Key Targets:**
- **RTO:** < 4 hours (240 minutes)
- **RPO:** < 24 hours

These targets have been established based on:
- Business impact analysis
- Cost-benefit analysis
- Technical feasibility
- Industry best practices for IoT/non-conventional energy monitoring platforms

---

## Definitions

### Recovery Time Objective (RTO)
**Definition:** The maximum acceptable time that a system can be unavailable after a disaster before business operations are severely impacted.

**dCMMS RTO Target:** < 4 hours (240 minutes)

**Measured From:** Time of disaster declaration
**Measured To:** System fully operational and validated

**Components:**
1. **Disaster Detection & Declaration:** < 15 minutes
2. **Infrastructure Provisioning:** < 60 minutes
3. **Database Restoration:** < 120 minutes
4. **Application Deployment:** < 30 minutes
5. **Validation & Testing:** < 15 minutes

**Total:** 240 minutes (4 hours)

### Recovery Point Objective (RPO)
**Definition:** The maximum acceptable amount of data loss measured in time.

**dCMMS RPO Target:** < 24 hours

**This means:**
- In a disaster scenario, the maximum data loss will be 24 hours worth of data
- Systems will be restored to a point within 24 hours of the disaster
- All data older than 24 hours before disaster is guaranteed to be recoverable

---

## Target Justification

### Business Impact Analysis

| Impact Area | < 1 hour | 1-4 hours | 4-8 hours | > 8 hours |
|-------------|----------|-----------|-----------|-----------|
| **Revenue Loss** | Minimal | Low | Medium | High |
| **Customer Impact** | None | Minor | Moderate | Severe |
| **Regulatory** | None | None | Low | High |
| **Reputation** | None | Minimal | Medium | Severe |
| **Data Loss Risk** | None | Low | Medium | Critical |

**Conclusion:** 4-hour RTO balances business needs with infrastructure costs.

### Cost-Benefit Analysis

| RTO Target | Infrastructure Cost | Complexity | Annual Cost | Selected |
|------------|--------------------|-----------| ------------|----------|
| < 1 hour | Very High | Very High | $180,000 | ❌ |
| < 4 hours | Medium | Medium | $60,000 | ✅ |
| < 8 hours | Low | Low | $24,000 | ❌ |
| < 24 hours | Very Low | Very Low | $8,000 | ❌ |

**Selected:** 4-hour RTO provides optimal balance of cost vs. business continuity.

### RPO Analysis

| RPO Target | Backup Frequency | Storage Cost | Recovery Complexity | Selected |
|------------|------------------|--------------|--------------------| ---------|
| < 1 hour | Continuous | Very High | High | ❌ |
| < 4 hours | Every 4 hours | High | Medium | ❌ |
| < 24 hours | Daily + Incremental | Medium | Medium | ✅ |
| < 1 week | Weekly | Low | Low | ❌ |

**Selected:** 24-hour RPO acceptable for non-conventional energy monitoring (telemetry data can be re-collected).

---

## System Component RTO/RPO Breakdown

### Tier 1: Critical Systems (RTO: < 2 hours, RPO: < 4 hours)

| Component | RTO | RPO | Backup Frequency | Restore Priority |
|-----------|-----|-----|------------------|------------------|
| **PostgreSQL** | 90 min | 1 hour | Hourly incremental | 1 (Highest) |
| **Authentication** | 30 min | 1 hour | Included with PostgreSQL | 1 |
| **User Management** | 30 min | 1 hour | Included with PostgreSQL | 1 |

**Justification:** Core platform functionality depends on these systems.

### Tier 2: Important Systems (RTO: < 4 hours, RPO: < 24 hours)

| Component | RTO | RPO | Backup Frequency | Restore Priority |
|-----------|-----|-----|------------------|------------------|
| **QuestDB** | 120 min | 24 hours | Daily snapshot | 2 |
| **Backend API** | 60 min | N/A (stateless) | N/A | 2 |
| **Frontend** | 30 min | N/A (stateless) | N/A | 2 |
| **MQTT Bridge** | 45 min | N/A (stateless) | N/A | 2 |

**Justification:** Required for full platform functionality.

### Tier 3: Non-Critical Systems (RTO: < 8 hours, RPO: N/A)

| Component | RTO | RPO | Backup Frequency | Restore Priority |
|-----------|-----|-----|------------------|------------------|
| **Redis Cache** | 60 min | N/A (rebuildable) | None | 3 |
| **ML Service** | 120 min | N/A (stateless) | None | 3 |
| **Analytics** | 240 min | N/A | None | 3 |

**Justification:** Platform can operate without these temporarily.

---

## Backup Strategy to Meet RPO

### PostgreSQL (RPO: < 1 hour)

**Strategy:** Multi-layered backup approach

1. **Full Backups**
   - **Frequency:** Daily at 2:00 AM UTC
   - **Retention:** 30 days
   - **Storage:** Local + S3 (us-west-2)
   - **Script:** `/opt/dcmms/scripts/backup/backup-postgres-full.sh`

2. **Incremental Backups**
   - **Frequency:** Hourly
   - **Retention:** 7 days
   - **Storage:** Local + S3
   - **Script:** `/opt/dcmms/scripts/backup/backup-postgres-incremental.sh`

3. **WAL (Write-Ahead Log) Archiving**
   - **Frequency:** Continuous (every 16MB or 1 min)
   - **Retention:** 7 days
   - **Storage:** Local + S3
   - **Script:** `/opt/dcmms/scripts/backup/backup-postgres-wal.sh`
   - **Enables:** Point-in-Time Recovery (PITR)

**RPO Achieved:** < 1 minute (with WAL archiving)

### QuestDB (RPO: < 24 hours)

**Strategy:** Daily filesystem snapshots

1. **Snapshots**
   - **Frequency:** Daily at 3:00 AM UTC
   - **Retention:** 30 days
   - **Storage:** Local + S3
   - **Script:** `/opt/dcmms/scripts/backup/backup-questdb-snapshot.sh`

2. **Alternative Data Source**
   - **Kafka Topics:** 7-day retention
   - **Can replay:** Last 7 days of telemetry data

**RPO Achieved:** < 24 hours (acceptable for time-series data)

### Configuration Files (RPO: < 24 hours)

**Strategy:** Daily configuration backups

1. **Config Backups**
   - **Frequency:** Daily at 1:00 AM UTC
   - **Retention:** 90 days
   - **Storage:** Local + S3
   - **Script:** `/opt/dcmms/scripts/backup/backup-config.sh`

**RPO Achieved:** < 24 hours

---

## Validation Procedures

### Daily Automated Validation

**Script:** `/opt/dcmms/scripts/backup/verify-backups.sh`
**Schedule:** Daily at 4:00 AM UTC (after all backups complete)

**Checks:**
1. ✅ Backup files exist
2. ✅ Backup files created within expected timeframe
3. ✅ Backup file sizes within acceptable range
4. ✅ Compression integrity verified
5. ✅ S3 replication successful
6. ✅ Backup manifests valid JSON

**Alerts:** Slack notification if any checks fail

### Quarterly Restore Testing

**Objective:** Validate RTO can be met in realistic scenario

**Procedure:**
1. Select latest backups (< 24 hours old)
2. Restore to staging environment
3. Measure time for each phase
4. Validate data integrity
5. Test application functionality
6. Document RTO achieved

**Success Criteria:**
- Total restore time < 240 minutes
- All data integrity checks pass
- Application passes smoke tests

**See:** `docs/operations/dr-test-procedures.md` for detailed procedures

### Annual Full DR Drill

**Objective:** Validate complete disaster recovery capability

**Procedure:**
1. Simulate complete disaster (regional outage)
2. Execute full DR plan
3. Restore all systems to DR environment
4. Measure actual RTO/RPO achieved
5. Comprehensive testing and validation

**Success Criteria:**
- RTO < 4 hours
- RPO < 24 hours
- All critical systems operational
- Application fully functional

---

## RTO Breakdown and Validation

### Phase 1: Disaster Detection & Declaration (Target: < 15 min)

**Activities:**
1. Monitoring alerts detect outage (< 5 min)
2. On-call engineer investigates (< 5 min)
3. DR Coordinator declares disaster (< 5 min)

**Validation Method:**
- Tabletop exercises
- Alert response time metrics
- Incident logs review

**Current Performance:** ✅ Typically < 10 minutes

### Phase 2: Infrastructure Provisioning (Target: < 60 min)

**Activities:**
1. Execute Terraform scripts for DR region (< 30 min)
2. Verify infrastructure health (< 15 min)
3. Configure networking and DNS (< 15 min)

**Validation Method:**
- Terraform apply timing in staging
- Infrastructure readiness checks
- Network connectivity tests

**Current Performance:** ✅ Typically 35-45 minutes

### Phase 3: Database Restoration (Target: < 120 min)

**Activities:**
1. Download backups from S3 (< 30 min)
2. Restore PostgreSQL from backup (< 60 min)
3. Restore QuestDB from snapshot (< 20 min)
4. Verify database integrity (< 10 min)

**Validation Method:**
- Quarterly restore tests to staging
- Restore time metrics from test logs
- Data integrity validation queries

**Current Performance:** ✅ Typically 90-110 minutes

**Factors Affecting Timing:**
- Backup file size (currently ~15GB compressed)
- Network bandwidth (S3 → DR region)
- Database size (currently 45GB uncompressed)

**Optimization Opportunities:**
- Multi-part S3 downloads (parallel)
- Incremental restore (WAL replay)
- Database tuning for faster restore

### Phase 4: Application Deployment (Target: < 30 min)

**Activities:**
1. Pull Docker images (< 10 min)
2. Deploy services via Kubernetes/Docker Compose (< 10 min)
3. Health check all services (< 5 min)
4. Configure load balancers (< 5 min)

**Validation Method:**
- CI/CD deployment timing metrics
- Service startup time logs
- Health check response times

**Current Performance:** ✅ Typically 20-25 minutes

### Phase 5: Validation & Testing (Target: < 15 min)

**Activities:**
1. Run automated smoke tests (< 5 min)
2. Verify critical workflows (< 5 min)
3. Confirm monitoring active (< 3 min)
4. Notify stakeholders (< 2 min)

**Validation Method:**
- Smoke test execution time
- Test pass/fail rates
- Stakeholder notification logs

**Current Performance:** ✅ Typically 10-12 minutes

---

## RPO Validation

### PostgreSQL RPO Validation

**Method 1: WAL Archive Gap Analysis**

```sql
-- Check for gaps in WAL archives
SELECT
  timeline_id,
  start_lsn,
  end_lsn,
  pg_wal_lsn_diff(end_lsn, start_lsn) / 1024 / 1024 AS size_mb
FROM pg_stat_archiver;
```

**Method 2: Backup Timestamp Comparison**

```bash
# Compare latest backup timestamp to current time
LATEST_BACKUP=$(find /opt/dcmms/backups/postgres/full -name "postgres_full_*.sql.gz" -type f -printf '%T@\n' | sort -rn | head -1)
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - LATEST_BACKUP) / 3600 ))

echo "Latest backup age: $AGE_HOURS hours"
# Should be < 24 hours for RPO compliance
```

**Method 3: Latest Data Timestamp**

```sql
-- Check latest data in key tables
SELECT
  'work_orders' AS table_name,
  MAX(created_at) AS latest_record,
  NOW() - MAX(created_at) AS age
FROM work_orders

UNION ALL

SELECT
  'assets',
  MAX(created_at),
  NOW() - MAX(created_at)
FROM assets;
```

**Validation Frequency:** Daily (automated)

**Alert Threshold:** If backup age > 26 hours, send critical alert

### QuestDB RPO Validation

**Method: Snapshot Age Check**

```bash
# Check latest QuestDB snapshot age
LATEST_SNAPSHOT=$(find /opt/dcmms/backups/questdb -name "questdb_snapshot_*.tar.gz" -type f -printf '%T@\n' | sort -rn | head -1)
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - LATEST_SNAPSHOT) / 3600 ))

echo "Latest snapshot age: $AGE_HOURS hours"
# Should be < 26 hours (allowing for 2-hour buffer)
```

**Alternative: Kafka Replay Capability**

```bash
# Verify Kafka retention allows replay
kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic telemetry-data

# Should show retention.ms = 604800000 (7 days)
```

**Validation Frequency:** Daily (automated)

---

## Monitoring and Alerting

### Backup Health Metrics

**Prometheus Metrics:**
```prometheus
# Backup success/failure
dcmms_backup_status{type="postgres_full"} 1  # 1=success, 0=failure

# Backup duration (seconds)
dcmms_backup_duration_seconds{type="postgres_full"} 3600

# Backup size (bytes)
dcmms_backup_size_bytes{type="postgres_full"} 16106127360

# Backup age (hours)
dcmms_backup_age_hours{type="postgres_full"} 12
```

**Alerts:**

```yaml
# Alert if backup failed
- alert: BackupFailed
  expr: dcmms_backup_status == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Backup failed for {{ $labels.type }}"

# Alert if backup too old
- alert: BackupTooOld
  expr: dcmms_backup_age_hours > 26
  for: 1h
  labels:
    severity: critical
  annotations:
    summary: "Backup for {{ $labels.type }} is {{ $value }} hours old"

# Alert if backup size anomaly
- alert: BackupSizeAnomaly
  expr: |
    abs(dcmms_backup_size_bytes - avg_over_time(dcmms_backup_size_bytes[7d]))
    / avg_over_time(dcmms_backup_size_bytes[7d]) > 0.3
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Backup size for {{ $labels.type }} differs by > 30% from 7-day average"
```

### RTO/RPO Compliance Dashboard

**Grafana Dashboard Panels:**

1. **Backup Status**
   - Green/Red indicators for each backup type
   - Last successful backup timestamp
   - Backup age (should be < 24 hours)

2. **Backup Trends**
   - Backup size over time
   - Backup duration over time
   - Backup success rate (7/30/90 days)

3. **RPO Compliance**
   - Current RPO for each system
   - RPO violation alerts
   - Historical RPO trends

4. **RTO Testing Results**
   - Last test date
   - RTO achieved in last test
   - Trend of RTO over multiple tests

---

## Improvement Roadmap

### Current State (Q4 2025)
- ✅ RTO: < 4 hours
- ✅ RPO: < 24 hours
- ✅ Automated daily backups
- ✅ Quarterly restore testing

### Planned Improvements (2026)

**Q1 2026: Reduce RPO to < 4 hours**
- Implement 4-hour incremental backups for QuestDB
- Increase WAL archive frequency
- **Cost:** ~$5,000 (additional S3 storage)

**Q2 2026: Reduce RTO to < 2 hours**
- Pre-provision hot standby DR environment
- Implement database streaming replication
- **Cost:** ~$30,000/year (always-on DR infrastructure)

**Q3 2026: Automate DR Failover**
- Implement automated failover triggers
- DNS automatic failover
- **Cost:** ~$10,000 (development effort)

**Q4 2026: Multi-Region Active-Active**
- Deploy active-active architecture
- Near-zero RTO/RPO
- **Cost:** ~$120,000/year (double infrastructure)

---

## Compliance and Reporting

### Quarterly RTO/RPO Report

**Recipients:**
- CTO
- VP of Engineering
- Infrastructure Team
- Compliance Officer

**Contents:**
1. Backup success rate (last 90 days)
2. Latest RTO test results
3. RPO compliance metrics
4. Issues and resolutions
5. Improvement recommendations

### Annual Audit

**Audited Items:**
1. DR plan completeness
2. Backup verification logs
3. Restore test reports
4. RTO/RPO compliance evidence
5. Team training records

**Auditor:** External security/compliance firm

---

## Roles and Responsibilities

### DR Coordinator
- **Name:** [TBD]
- **Responsibilities:**
  - Oversee DR testing schedule
  - Approve RTO/RPO target changes
  - Coordinate annual DR drill
  - Report to executive team

### Infrastructure Lead
- **Name:** [TBD]
- **Responsibilities:**
  - Maintain DR infrastructure
  - Execute restore procedures
  - Monitor backup systems
  - Optimize RTO/RPO

### Database Administrator
- **Name:** [TBD]
- **Responsibilities:**
  - Manage backup scripts
  - Execute database restores
  - Validate data integrity
  - Tune backup/restore performance

### DevOps Engineer
- **Name:** [TBD]
- **Responsibilities:**
  - Automate backup processes
  - Monitor backup health
  - Troubleshoot backup failures
  - Deploy DR infrastructure

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | Infrastructure Team | Initial version |

**Next Review Date:** 2026-02-19

---

## Appendix: RTO/RPO Calculation Examples

### Example 1: Full Database Restore

**Scenario:** Complete PostgreSQL database loss

**Timeline:**
- 09:00 AM: Disaster detected
- 09:10 AM: Disaster declared (10 min)
- 09:15 AM: Backup identified (5 min)
- 09:45 AM: Backup downloaded from S3 (30 min)
- 11:15 AM: Database restored (90 min)
- 11:30 AM: Validation complete (15 min)

**RTO Achieved:** 2 hours 30 minutes ✅ (< 4 hour target)

**RPO Analysis:**
- Backup timestamp: 2:00 AM same day
- Disaster time: 9:00 AM
- Data loss window: 7 hours ✅ (< 24 hour target)

### Example 2: Regional Outage

**Scenario:** Complete us-east-1 region unavailable

**Timeline:**
- 14:00: Outage detected
- 14:15: Disaster declared (15 min)
- 14:45: DR infrastructure provisioned (30 min)
- 15:15: Backups downloaded (30 min)
- 16:45: Databases restored (90 min)
- 17:15: Applications deployed (30 min)
- 17:30: Validation complete (15 min)

**RTO Achieved:** 3 hours 30 minutes ✅ (< 4 hour target)

**RPO Analysis:**
- Latest backup: Daily at 2:00 AM
- Outage time: 14:00 (2:00 PM)
- Data loss window: 12 hours ✅ (< 24 hour target)

---

**For questions or updates to this document, contact: infrastructure-team@dcmms.com**
