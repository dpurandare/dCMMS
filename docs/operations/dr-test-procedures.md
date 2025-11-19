# Disaster Recovery Test Procedures

**Document:** DR Test Procedures
**Version:** 1.0
**Last Updated:** 2025-11-19
**Owner:** Infrastructure Team
**Review Frequency:** Quarterly

---

## Purpose

This document outlines procedures for testing the dCMMS Disaster Recovery Plan to ensure:
- Backup systems are functioning correctly
- Recovery procedures can restore systems within RTO targets
- Team members are familiar with DR processes
- Recovery plans are up-to-date and effective

---

## Testing Schedule

| Test Type | Frequency | RTO Target | RPO Target | Duration | Owner |
|-----------|-----------|------------|------------|----------|-------|
| **Backup Verification** | Daily | N/A | N/A | 15 min | DevOps |
| **Partial Restore** | Quarterly | 4 hours | 24 hours | 4 hours | Infrastructure Lead |
| **Full DR Drill** | Annually | 4 hours | 24 hours | 8 hours | DR Coordinator |
| **Tabletop Exercise** | Semi-annually | N/A | N/A | 2 hours | All Teams |

---

## Test Type 1: Backup Verification (Daily)

### Objective
Verify all automated backups are completing successfully and are restorable.

### Scope
- PostgreSQL full/incremental backups
- QuestDB snapshots
- Configuration backups
- WAL archives

### Procedure

#### Automated Test (Runs Daily at 4:00 AM UTC)

```bash
# Script runs automatically via cron
/opt/dcmms/scripts/backup/verify-backups.sh
```

#### Manual Verification (Weekly)

1. **Check Backup Logs**
   ```bash
   # Review backup logs for errors
   tail -n 100 /var/log/dcmms/backup-postgres-full.log
   tail -n 100 /var/log/dcmms/backup-questdb.log
   tail -n 100 /var/log/dcmms/backup-config.log
   ```

2. **Verify Backup Sizes**
   ```bash
   # Check backup file sizes (should be consistent)
   ls -lh /opt/dcmms/backups/postgres/full/ | tail -n 5
   ls -lh /opt/dcmms/backups/questdb/ | tail -n 5
   ```

3. **Check S3 Replication**
   ```bash
   # Verify backups are uploaded to S3
   aws s3 ls s3://dcmms-dr-backups/postgres/full/ | tail -n 5
   aws s3 ls s3://dcmms-dr-backups/questdb/ | tail -n 5
   ```

4. **Review Verification Report**
   ```bash
   # Check latest verification report
   cat /opt/dcmms/backups/verification_report_*.json | jq .
   ```

### Success Criteria
- ✅ All backups completed in last 24 hours
- ✅ No errors in backup logs
- ✅ Backup integrity checks pass
- ✅ S3 replication successful
- ✅ Backup sizes within expected range (±20%)

### Failure Actions
- Alert DR Coordinator via Slack/email
- Investigate root cause
- Rerun failed backups
- Document incident in backup log

---

## Test Type 2: Partial Restore (Quarterly)

### Objective
Validate ability to restore individual components within RTO/RPO targets.

### Scope
- Restore PostgreSQL database to staging environment
- Verify data integrity
- Test application connectivity

### Procedure

#### Preparation (1 week before test)

1. **Schedule Test Window**
   - Date/Time: [Quarterly scheduled]
   - Duration: 4 hours
   - Environment: Staging
   - Notify: Infrastructure team, DevOps, Application team

2. **Pre-Test Checklist**
   - [ ] Staging environment available
   - [ ] Latest backups verified (< 24 hours old)
   - [ ] Test team on standby
   - [ ] Monitoring tools ready
   - [ ] Rollback plan prepared

#### Execution (Day of Test)

**Step 1: Pre-Test Snapshot (T+0)**

```bash
# Take snapshot of current staging environment
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "DR Test started at $TIMESTAMP" > /opt/dcmms/dr-tests/test_${TIMESTAMP}.log
```

**Step 2: Identify Backup to Restore (T+5)**

```bash
# Find latest PostgreSQL backup
BACKUP_FILE=$(find /opt/dcmms/backups/postgres/full -name "postgres_full_*.sql.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

echo "Using backup: $BACKUP_FILE" | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log
```

**Step 3: Stop Staging Application (T+10)**

```bash
# Stop staging services
systemctl stop dcmms-backend-staging
systemctl stop dcmms-frontend-staging

# Verify stopped
systemctl status dcmms-backend-staging
```

**Step 4: Restore PostgreSQL Database (T+15)**

```bash
# Execute restore
cd /opt/dcmms/scripts/backup
echo "yes" | ./restore-postgres-from-backup.sh "$BACKUP_FILE" 2>&1 | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log

# Record restore completion time
echo "Database restored at $(date)" | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log
```

**Step 5: Verify Data Integrity (T+120)**

```bash
# Run data integrity checks
sudo -u postgres psql -d dcmms_staging <<EOF
-- Check table counts
SELECT
  schemaname,
  COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Check record counts in key tables
SELECT 'users' as table_name, COUNT(*) as records FROM users
UNION ALL
SELECT 'sites', COUNT(*) FROM sites
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders;

-- Check latest timestamps
SELECT
  'work_orders' as table_name,
  MAX(created_at) as latest_record
FROM work_orders;
EOF
```

**Step 6: Start Application Services (T+180)**

```bash
# Start staging services
systemctl start dcmms-backend-staging
systemctl start dcmms-frontend-staging

# Wait for services to be ready
sleep 30

# Check health endpoints
curl http://staging.dcmms.local/api/v1/health
```

**Step 7: Application Testing (T+210)**

```bash
# Run automated API tests
cd /opt/dcmms/tests
npm run test:api:staging

# Test key workflows
curl -X POST http://staging.dcmms.local/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Verify data retrieval
curl http://staging.dcmms.local/api/v1/sites \
  -H "Authorization: Bearer $TOKEN"
```

**Step 8: Performance Validation (T+225)**

```bash
# Run performance tests
k6 run /opt/dcmms/tests/performance/load-test-staging.js

# Check query performance
sudo -u postgres psql -d dcmms_staging -c "SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;"
```

**Step 9: Calculate Metrics (T+240)**

```bash
# Calculate RTO (time from failure to recovery)
BACKUP_TIME=$(stat -c %Y "$BACKUP_FILE")
RESTORE_START=$(date -d "$TIMESTAMP" +%s)
RESTORE_END=$(date +%s)

RTO_SECONDS=$((RESTORE_END - RESTORE_START))
RTO_MINUTES=$((RTO_SECONDS / 60))

echo "RTO Achieved: $RTO_MINUTES minutes (Target: < 240 minutes)" | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log

# Calculate RPO (data loss window)
LATEST_DATA=$(sudo -u postgres psql -d dcmms_staging -tAc "SELECT MAX(created_at) FROM work_orders")
CURRENT_TIME=$(date -Iseconds)

echo "Latest data in backup: $LATEST_DATA" | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log
echo "Current time: $CURRENT_TIME" | tee -a /opt/dcmms/dr-tests/test_${TIMESTAMP}.log
```

#### Post-Test Activities

1. **Generate Test Report**
   ```bash
   cat > /opt/dcmms/dr-tests/report_${TIMESTAMP}.md <<EOF
   # DR Partial Restore Test Report

   **Test Date:** $(date)
   **Test Type:** Quarterly Partial Restore
   **Environment:** Staging

   ## Results

   - **RTO Target:** 240 minutes (4 hours)
   - **RTO Achieved:** $RTO_MINUTES minutes
   - **RTO Status:** [PASS/FAIL]

   - **RPO Target:** 24 hours
   - **RPO Achieved:** [Calculate from latest data timestamp]
   - **RPO Status:** [PASS/FAIL]

   ## Test Steps

   1. Backup selection: PASS
   2. Service shutdown: PASS
   3. Database restore: PASS
   4. Data integrity: PASS
   5. Service startup: PASS
   6. Application testing: PASS
   7. Performance validation: PASS

   ## Issues Encountered

   - [List any issues]

   ## Recommendations

   - [List any improvements needed]

   ## Sign-off

   - **Tested By:** [Name]
   - **Reviewed By:** [DR Coordinator]
   - **Date:** $(date)
   EOF
   ```

2. **Review Findings**
   - Team meeting to discuss results
   - Document lessons learned
   - Update DR plan if needed

3. **Archive Test Results**
   ```bash
   # Archive test logs
   tar -czf /opt/dcmms/dr-tests/archive/test_${TIMESTAMP}.tar.gz \
     /opt/dcmms/dr-tests/test_${TIMESTAMP}.log \
     /opt/dcmms/dr-tests/report_${TIMESTAMP}.md
   ```

### Success Criteria
- ✅ RTO < 4 hours (240 minutes)
- ✅ RPO < 24 hours
- ✅ All data integrity checks pass
- ✅ Application fully functional after restore
- ✅ No data loss in critical tables
- ✅ Performance within acceptable range

### Failure Actions
- Document all issues encountered
- Schedule follow-up test within 2 weeks
- Update DR procedures based on findings
- Escalate to DR Coordinator if RTO/RPO targets not met

---

## Test Type 3: Full DR Drill (Annual)

### Objective
Simulate complete disaster scenario and restore entire production system to DR environment.

### Scope
- All databases (PostgreSQL, QuestDB, Redis)
- All application services
- Network configuration
- Load balancers and DNS
- Full production workload

### Procedure

#### Preparation (1 month before drill)

1. **Planning Meeting**
   - Define disaster scenario (e.g., regional outage, ransomware)
   - Assign roles and responsibilities
   - Create detailed runbook
   - Schedule 8-hour test window
   - Notify all stakeholders

2. **Pre-Drill Checklist**
   - [ ] DR environment provisioned and tested
   - [ ] All teams briefed on roles
   - [ ] Communication channels established (Slack #dr-drill)
   - [ ] Monitoring dashboards configured
   - [ ] External stakeholders notified (customers, partners)
   - [ ] Rollback plan documented

#### Execution (Day of Drill)

**Hour 1: Scenario Initiation**

```bash
# Simulate disaster (DO NOT run in production!)
# This is simulation only - actual disaster scenario will differ

echo "========================================="
echo "DISASTER RECOVERY DRILL INITIATED"
echo "Scenario: Regional AWS us-east-1 Outage"
echo "Time: $(date)"
echo "========================================="
```

1. DR Coordinator declares disaster
2. Activate incident response team
3. Begin communication to stakeholders
4. Start RTO clock

**Hour 2-3: Infrastructure Recovery**

1. Provision DR infrastructure (if not already running)
   ```bash
   # Switch to DR region (us-west-2)
   cd /opt/dcmms/infrastructure/terraform
   terraform workspace select dr-region
   terraform apply -auto-approve
   ```

2. Configure networking and DNS
   ```bash
   # Update DNS to point to DR environment
   # (Coordination with DNS team required)
   aws route53 change-resource-record-sets --hosted-zone-id Z1234567890ABC \
     --change-batch file://dns-failover-to-dr.json
   ```

3. Verify infrastructure health
   ```bash
   # Check all EC2 instances running
   aws ec2 describe-instances --region us-west-2 \
     --filters "Name=tag:Environment,Values=dr" \
     --query 'Reservations[].Instances[].State.Name'
   ```

**Hour 3-5: Database Recovery**

1. Restore all databases from S3 backups
   ```bash
   # Execute full restore script
   cd /opt/dcmms/scripts/backup
   ./restore-all-databases.sh --auto --skip-confirmation
   ```

2. Verify database connectivity
   ```bash
   # PostgreSQL
   PGPASSWORD=$POSTGRES_PASSWORD psql -h dr-postgres.dcmms.local -U dcmms_admin -d dcmms -c "SELECT COUNT(*) FROM users;"

   # QuestDB
   curl "http://dr-questdb.dcmms.local:9000/exec?query=SELECT%20COUNT(*)%20FROM%20telemetry"

   # Redis
   redis-cli -h dr-redis.dcmms.local PING
   ```

**Hour 5-6: Application Deployment**

1. Deploy application services
   ```bash
   # Deploy using CI/CD pipeline to DR environment
   kubectl apply -f k8s/manifests/dr-deployment.yaml --namespace=dcmms-dr

   # Or using Docker Compose
   docker-compose -f docker-compose.dr.yml up -d
   ```

2. Verify service health
   ```bash
   # Check all services running
   kubectl get pods -n dcmms-dr

   # Test health endpoints
   for service in backend frontend ml-service mqtt-bridge; do
     curl https://dr.dcmms.com/api/v1/$service/health
   done
   ```

**Hour 6-7: Validation and Testing**

1. Run smoke tests
   ```bash
   cd /opt/dcmms/tests
   npm run test:smoke:dr
   ```

2. Test critical user workflows
   - User login
   - View sites and assets
   - Create work order
   - View telemetry data
   - Generate compliance report

3. Load testing
   ```bash
   # Run load tests to verify capacity
   k6 run tests/performance/load-test-dr.js
   ```

**Hour 7-8: Monitoring and Documentation**

1. Configure monitoring
   - Verify Prometheus scraping DR targets
   - Configure Grafana dashboards for DR environment
   - Set up alerts for DR environment

2. Document actual vs. planned
   - Record actual RTO achieved
   - Document issues encountered
   - Capture lessons learned

3. **Stop RTO Clock**
   ```bash
   END_TIME=$(date +%s)
   RTO_ACTUAL=$(( (END_TIME - START_TIME) / 60 ))
   echo "RTO Achieved: $RTO_ACTUAL minutes (Target: < 240 minutes)"
   ```

#### Post-Drill Activities

1. **Generate Comprehensive Report**
   - Executive summary
   - Timeline of events
   - RTO/RPO metrics
   - Issues and resolutions
   - Lessons learned
   - Action items for improvement

2. **Team Debrief Meeting**
   - Review what went well
   - Discuss challenges
   - Identify process improvements
   - Update DR plan and runbooks

3. **Shutdown DR Environment** (if temporary)
   ```bash
   # Cleanup DR resources
   terraform workspace select dr-region
   terraform destroy -auto-approve
   ```

### Success Criteria
- ✅ Full system recovery within 4-hour RTO
- ✅ Data loss < 24 hours (RPO)
- ✅ All critical services operational
- ✅ Application passes smoke tests
- ✅ Performance acceptable (> 80% of production)
- ✅ All team members executed their roles successfully

### Metrics to Track

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to disaster declaration | < 15 min | | |
| Infrastructure provisioning | < 60 min | | |
| Database restore completion | < 120 min | | |
| Application deployment | < 30 min | | |
| Total RTO | < 240 min | | |
| Data loss (RPO) | < 24 hours | | |
| Smoke test pass rate | 100% | | |
| Critical workflow success | 100% | | |

---

## Test Type 4: Tabletop Exercise (Semi-annual)

### Objective
Walk through disaster scenarios without actually performing recovery to:
- Ensure team members understand their roles
- Identify gaps in documentation
- Practice decision-making and communication

### Scope
- Scenario discussion and role-playing
- Review of DR plan and procedures
- Communication plan testing
- Decision-making exercises

### Procedure

#### Preparation (2 weeks before)

1. **Select Scenario**
   - Regional cloud outage
   - Ransomware attack
   - Database corruption
   - Security breach
   - Natural disaster

2. **Invite Participants**
   - DR Coordinator
   - Infrastructure Team
   - Database Administrators
   - Application Team
   - Security Team
   - Communications Team
   - Executive Sponsor

3. **Prepare Materials**
   - Scenario description
   - Timeline of events
   - Discussion questions
   - DR plan documents

#### Execution (2-hour session)

**15 min: Introduction**
- Explain exercise objectives
- Introduce scenario
- Review ground rules

**30 min: Scenario Walkthrough**
- Facilitator presents disaster scenario in stages
- Teams discuss appropriate responses
- Document decisions and actions

**45 min: Deep Dive Discussion**
- Review DR plan step-by-step
- Identify unclear procedures
- Discuss communication protocols
- Review escalation paths

**30 min: Gap Analysis and Action Items**
- Document identified gaps
- Assign action items
- Set deadlines for improvements

#### Post-Exercise

1. **Document Findings**
   ```markdown
   # Tabletop Exercise Report

   **Date:** [Date]
   **Scenario:** [Scenario description]
   **Participants:** [List]

   ## Key Findings

   ### Strengths
   - [What worked well]

   ### Gaps Identified
   - [Documentation gaps]
   - [Process improvements needed]
   - [Training needs]

   ### Action Items
   - [ ] Update DR plan section X
   - [ ] Provide training on Y
   - [ ] Test procedure Z

   ### Recommendations
   - [List recommendations]
   ```

2. **Follow-up Actions**
   - Update DR documentation
   - Schedule training sessions
   - Plan additional tests

### Success Criteria
- ✅ All key personnel participate
- ✅ Team demonstrates understanding of DR procedures
- ✅ Communication protocols tested
- ✅ Gaps identified and documented
- ✅ Action items assigned with owners

---

## RTO/RPO Validation Report Template

```markdown
# RTO/RPO Validation Report

**Test Date:** [Date]
**Test Type:** [Backup Verification / Partial Restore / Full DR Drill]
**Environment:** [Staging / DR / Production]

## Objectives
- Validate RTO target: < 4 hours
- Validate RPO target: < 24 hours

## Test Results

### RTO Metrics

| Phase | Start Time | End Time | Duration | Status |
|-------|------------|----------|----------|--------|
| Disaster Declaration | | | | |
| Infrastructure Provisioning | | | | |
| Database Restore | | | | |
| Application Deployment | | | | |
| Validation & Testing | | | | |
| **Total RTO** | | | | **[PASS/FAIL]** |

**RTO Target:** 240 minutes (4 hours)
**RTO Achieved:** [X] minutes
**RTO Status:** [✅ PASS / ❌ FAIL]

### RPO Metrics

| Database | Backup Timestamp | Latest Data Timestamp | Data Loss Window | Status |
|----------|------------------|----------------------|------------------|--------|
| PostgreSQL | | | | |
| QuestDB | | | | |
| **Total RPO** | | | | **[PASS/FAIL]** |

**RPO Target:** 24 hours
**RPO Achieved:** [X] hours
**RPO Status:** [✅ PASS / ❌ FAIL]

## Data Integrity Validation

| Table | Expected Records | Actual Records | Status |
|-------|-----------------|----------------|--------|
| users | | | |
| sites | | | |
| assets | | | |
| work_orders | | | |
| telemetry | | | |

## Issues Encountered

1. **Issue:** [Description]
   - **Impact:** [High/Medium/Low]
   - **Resolution:** [How it was resolved]
   - **Action Item:** [Follow-up task]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Sign-off

- **Tested By:** _________________________ Date: _________
- **Reviewed By:** _________________________ Date: _________
- **Approved By:** _________________________ Date: _________

---

**Next Test Date:** [Scheduled date]
```

---

## Test Failure Escalation

### Minor Issues (RTO within 10% of target)
1. Document in test report
2. Create improvement tickets
3. Address in next sprint

### Major Issues (RTO exceeds target by > 10%)
1. Immediate notification to DR Coordinator
2. Schedule emergency review meeting
3. Create critical action items
4. Retest within 2 weeks

### Critical Failures (Unable to restore)
1. Escalate to CTO immediately
2. Assemble emergency task force
3. Daily standup until resolved
4. External expert consultation if needed

---

## Continuous Improvement

### After Each Test
1. Update DR plan based on findings
2. Improve automation where possible
3. Enhance monitoring and alerting
4. Conduct team training on gaps

### Quarterly Review
1. Review all test results
2. Trend analysis of RTO/RPO metrics
3. Update DR plan as needed
4. Budget planning for DR improvements

---

## Appendix A: Test Checklist Templates

### Pre-Test Checklist

```
[ ] Test scheduled and communicated
[ ] All participants confirmed
[ ] Backup verification completed (< 24 hours old)
[ ] Test environment prepared
[ ] Monitoring tools configured
[ ] Rollback plan documented
[ ] Stakeholders notified
[ ] Communication channels tested
```

### During-Test Checklist

```
[ ] RTO clock started
[ ] All steps documented with timestamps
[ ] Issues logged as encountered
[ ] Communication protocol followed
[ ] Performance metrics captured
[ ] RTO clock stopped upon completion
```

### Post-Test Checklist

```
[ ] Test report generated
[ ] Metrics calculated and documented
[ ] Issues cataloged
[ ] Action items assigned
[ ] Lessons learned documented
[ ] DR plan updated (if needed)
[ ] Stakeholders informed of results
[ ] Next test scheduled
```

---

## Contact Information

**DR Coordinator:** [Name] - [Email] - [Phone]
**Infrastructure Lead:** [Name] - [Email] - [Phone]
**Database Administrator:** [Name] - [Email] - [Phone]
**Application Lead:** [Name] - [Email] - [Phone]

**Emergency Escalation:** [24/7 On-call Number]

---

**Document Version:** 1.0
**Last Reviewed:** 2025-11-19
**Next Review:** 2026-02-19
