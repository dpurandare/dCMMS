# dCMMS Deployment Runbooks

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Deployment Architecture](#1-deployment-architecture)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Database Migration Procedure](#3-database-migration-procedure)
4. [Service Deployment Procedure](#4-service-deployment-procedure)
5. [Rollback Procedure](#5-rollback-procedure)
6. [Post-Deployment Validation](#6-post-deployment-validation)
7. [Emergency Procedures](#7-emergency-procedures)

---

## 1. Deployment Architecture

### 1.1 Environments

| Environment | Purpose | Deploy Trigger | Approval |
|-------------|---------|----------------|----------|
| **Development** | Developer testing | On commit to `develop` branch | Auto |
| **Staging** | QA & UAT testing | On tag `staging-*` | Auto |
| **Production** | Live system | On tag `release-*` | Manual (Product Owner + Tech Lead) |

### 1.2 Infrastructure Components

**Kubernetes Clusters:**
- App Cluster (API services, web frontend)
- Data Cluster (databases, message queues)
- Edge Cluster (MQTT broker, edge services)

**Services:**
- API Gateway (Nginx/Kong)
- Backend Services (Node.js/Python containers)
- Frontend (React SPA served via CDN)
- Databases (PostgreSQL, TimescaleDB)
- Message Queues (Kafka, Redis)
- Object Storage (S3/MinIO)

---

## 2. Pre-Deployment Checklist

### 2.1 Code Freeze (Production Only)

**T-48 hours:**
- [ ] Announce code freeze in team Slack
- [ ] Merge all approved PRs for release
- [ ] Create release branch `release/v1.x.x`
- [ ] Run full regression test suite
- [ ] Generate release notes

**T-24 hours:**
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Conduct UAT with stakeholders
- [ ] Obtain sign-off from QA Lead
- [ ] Obtain sign-off from Product Owner

### 2.2 Pre-Flight Checks

**Infrastructure:**
- [ ] Verify cluster health (all nodes ready)
- [ ] Check disk space (>30% free on all volumes)
- [ ] Check database backup completed in last 24h
- [ ] Verify database connection pool healthy
- [ ] Check Kafka lag (all consumer groups < 1000 messages behind)

**Dependencies:**
- [ ] Verify external API health (IdP, weather API, ERP)
- [ ] Check certificate expiry (>30 days remaining)
- [ ] Verify secret rotation is current

**Monitoring:**
- [ ] Grafana dashboards accessible
- [ ] Alert channels working (send test alert)
- [ ] On-call engineer identified and notified

**Communication:**
- [ ] Maintenance window scheduled (if required)
- [ ] Stakeholders notified via email
- [ ] Status page updated (planned maintenance)

---

## 3. Database Migration Procedure

### 3.1 Migration Strategy

**Tool:** Flyway or Liquibase

**Migration Files Naming:** `V{version}__{description}.sql`

**Example:** `V001__create_work_orders_table.sql`

### 3.2 Migration Execution (Production)

**Step 1: Backup Database**
```bash
# Create full backup
pg_dump -h $DB_HOST -U $DB_USER -d dcmms_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to S3
aws s3 cp backup_*.sql s3://dcmms-backups/pre-deployment/

# Verify backup integrity
pg_restore --list backup_*.sql | head -20
```

**Step 2: Review Migration Scripts**
```bash
# List pending migrations
flyway info -configFile=flyway-prod.conf

# Review each migration SQL
cat migrations/V010__add_work_order_fields.sql

# Check for:
# - No data loss operations (DROP TABLE, DROP COLUMN)
# - Indexes added CONCURRENTLY (for zero-downtime)
# - Default values for new NOT NULL columns
```

**Step 3: Execute Migrations (Dry-Run)**
```bash
# Dry-run on staging
flyway migrate -configFile=flyway-staging.conf -dryRun=true

# Review output for errors
```

**Step 4: Execute Migrations (Production)**
```bash
# Run migrations
flyway migrate -configFile=flyway-prod.conf

# Verify success
flyway info -configFile=flyway-prod.conf
# All migrations should show "Success"
```

**Step 5: Validate Database State**
```sql
-- Check table row counts
SELECT 'work_orders' AS table, COUNT(*) FROM work_orders
UNION ALL
SELECT 'assets', COUNT(*) FROM assets;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'work_orders' AND column_name = 'new_field';
```

### 3.3 Migration Rollback

**If migration fails:**
```bash
# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d dcmms_prod -c backup_*.sql

# Verify data integrity
SELECT COUNT(*) FROM work_orders;

# Mark migration as failed
flyway repair -configFile=flyway-prod.conf
```

---

## 4. Service Deployment Procedure

### 4.1 Deployment Strategy: Rolling Update

**Parameters:**
- Max Unavailable: 0 (zero-downtime)
- Max Surge: 1 (one extra pod during rollout)
- Health Check Grace Period: 60s

### 4.2 Deployment Steps

**Step 1: Build & Push Container Images**
```bash
# Authenticate to container registry
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build images
docker build -t dcmms-api:v1.2.0 -f Dockerfile.api .
docker build -t dcmms-frontend:v1.2.0 -f Dockerfile.frontend .

# Tag for registry
docker tag dcmms-api:v1.2.0 $ECR_REGISTRY/dcmms-api:v1.2.0
docker tag dcmms-frontend:v1.2.0 $ECR_REGISTRY/dcmms-frontend:v1.2.0

# Push to registry
docker push $ECR_REGISTRY/dcmms-api:v1.2.0
docker push $ECR_REGISTRY/dcmms-frontend:v1.2.0

# Tag as latest (if this is production release)
docker tag dcmms-api:v1.2.0 $ECR_REGISTRY/dcmms-api:latest
docker push $ECR_REGISTRY/dcmms-api:latest
```

**Step 2: Update Kubernetes Manifests**
```bash
# Update image tags in Kubernetes deployment YAMLs
sed -i 's/dcmms-api:v1.1.0/dcmms-api:v1.2.0/g' k8s/production/api-deployment.yaml

# Or use Kustomize
cd k8s/overlays/production
kustomize edit set image dcmms-api=$ECR_REGISTRY/dcmms-api:v1.2.0

# Review changes
git diff k8s/
```

**Step 3: Apply Kubernetes Manifests**
```bash
# Apply in order: ConfigMaps -> Secrets -> Deployments -> Services

# 1. Update ConfigMaps (if changed)
kubectl apply -f k8s/production/configmap.yaml

# 2. Update Secrets (if changed)
kubectl apply -f k8s/production/secrets.yaml

# 3. Deploy backend services
kubectl apply -f k8s/production/api-deployment.yaml

# 4. Deploy frontend
kubectl apply -f k8s/production/frontend-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/dcmms-api -n production --timeout=10m
kubectl rollout status deployment/dcmms-frontend -n production --timeout=5m
```

**Step 4: Monitor Deployment**
```bash
# Watch pods rolling
kubectl get pods -n production -w

# Check for crashloops
kubectl get pods -n production | grep -E 'CrashLoop|Error'

# Check logs of new pods
NEW_POD=$(kubectl get pods -n production -l app=dcmms-api --sort-by=.metadata.creationTimestamp | tail -1 | awk '{print $1}')
kubectl logs $NEW_POD -n production -f

# Monitor error rates in Grafana
open https://grafana.dcmms.io/d/api-errors
```

**Step 5: Smoke Tests**
```bash
# API health check
curl https://api.dcmms.io/health
# Expected: {"status":"healthy","version":"1.2.0"}

# Create test work order
curl -X POST https://api.dcmms.io/api/v1/work-orders \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"preventive","title":"Test WO","siteId":"SITE-TEST","priority":"low","status":"draft"}'
# Expected: 201 Created

# Verify frontend loads
curl -I https://app.dcmms.io
# Expected: 200 OK
```

### 4.3 Feature Flag Activation (if applicable)

```bash
# If using feature flags, enable new features after deployment

# Example: Enable new dashboard widget
curl -X POST https://api.dcmms.io/api/v1/feature-flags/dashboard-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled":true,"rolloutPercentage":10}'  # 10% rollout

# Monitor for errors, then increase rollout
# 10% -> 25% -> 50% -> 100% over 1 hour
```

---

## 5. Rollback Procedure

### 5.1 When to Rollback

**Rollback Immediately If:**
- Error rate > 5% for more than 2 minutes
- Critical functionality broken (e.g., can't create work orders)
- Database corruption detected
- Security vulnerability introduced

**DO NOT Rollback (Fix Forward Instead):**
- Minor UI glitches
- Non-critical bugs with workarounds
- Performance degradation < 20%

### 5.2 Rollback Steps

**Step 1: Rollback Services**
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/dcmms-api -n production
kubectl rollout undo deployment/dcmms-frontend -n production

# Or rollback to specific revision
kubectl rollout history deployment/dcmms-api -n production
kubectl rollout undo deployment/dcmms-api -n production --to-revision=42

# Wait for rollback to complete
kubectl rollout status deployment/dcmms-api -n production
```

**Step 2: Rollback Database (if needed)**

**CAUTION:** Only if database migration caused the issue AND migration is reversible

```bash
# Restore from pre-deployment backup
pg_restore -h $DB_HOST -U $DB_USER -d dcmms_prod -c backup_*.sql

# Or run rollback migration script (if prepared)
flyway migrate -configFile=flyway-prod.conf -target=V009  # rollback to version 9
```

**Step 3: Verify Rollback**
```bash
# Check service version
curl https://api.dcmms.io/health
# Expected: {"status":"healthy","version":"1.1.0"}  # previous version

# Run smoke tests
./scripts/smoke-tests.sh production

# Monitor error rates
# Should return to normal within 5 minutes
```

**Step 4: Post-Rollback Actions**
- [ ] Update status page: "Issue resolved, system rolled back"
- [ ] Notify stakeholders via email
- [ ] Create incident post-mortem ticket
- [ ] Schedule root cause analysis meeting within 24h

---

## 6. Post-Deployment Validation

### 6.1 Automated Checks

**Run post-deployment test suite:**
```bash
# API integration tests
npm run test:integration:production

# End-to-end tests
npm run test:e2e:production

# Performance tests (compare to baseline)
npm run test:performance:production
```

### 6.2 Manual Checks

**Functional Validation:**
- [ ] Login as each role type (admin, supervisor, technician)
- [ ] Create a work order
- [ ] Upload an attachment
- [ ] Assign work order to technician
- [ ] Execute work order (change status to in-progress)
- [ ] Complete work order
- [ ] Verify work order appears in reports

**Integration Validation:**
- [ ] SCADA telemetry flowing (check recent sensor readings)
- [ ] IdP login works (SSO)
- [ ] Notifications sent (email, SMS)
- [ ] Mobile app syncing

**Performance Validation:**
- [ ] Dashboard loads in < 2 seconds
- [ ] API p95 latency < 300ms
- [ ] No database connection pool exhaustion

### 6.3 Monitoring Review (first 24 hours)

**Metrics to Watch:**
- Error rate (should be < 0.1%)
- API latency (p50, p95, p99)
- Database query time
- Queue lag (Kafka consumer lag)
- Memory usage (should be stable, no leaks)
- Active sessions
- Failed logins

**Set up alerts:**
```yaml
# Example alert rule
- alert: HighErrorRatePostDeployment
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected after deployment"
```

---

## 7. Emergency Procedures

### 7.1 Incident Response

**Incident Detected:**
1. **Assess Severity** (use incident matrix)
2. **Declare Incident** (in Slack #incidents channel)
3. **Assign Incident Commander** (on-call engineer)
4. **Assemble Response Team** (IC decides who to page)
5. **Communicate Status** (update status page)

**Incident Severity Matrix:**

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| **P0 - Critical** | Complete outage | Immediate | API down, database unavailable |
| **P1 - High** | Major feature broken | 15 min | Work orders can't be created |
| **P2 - Medium** | Minor feature degraded | 1 hour | Attachments slow to upload |
| **P3 - Low** | Cosmetic issue | Next business day | UI alignment issue |

### 7.2 Degraded Mode Operation

**If partial outage (e.g., telemetry pipeline down but API up):**

**Enable Degraded Mode:**
```bash
# Disable non-critical features
kubectl scale deployment/telemetry-processor --replicas=0 -n production

# Update status page
curl -X POST https://status.dcmms.io/api/incidents \
  -d '{"name":"Telemetry Processing Degraded","status":"investigating"}'

# Route traffic away from failing component
kubectl patch service telemetry-api -p '{"spec":{"selector":{"version":"stable"}}}' -n production
```

### 7.3 Database Emergency Access

**If API is down but database is accessible:**

**Read-Only Query Access (for critical data retrieval):**
```sql
-- Connect to replica (read-only)
psql -h db-replica.dcmms.io -U readonly_user -d dcmms_prod

-- Query critical work orders
SELECT workOrderId, title, status, priority, assignedTo
FROM work_orders
WHERE status IN ('in-progress', 'scheduled')
  AND priority = 'urgent'
ORDER BY scheduledStart;
```

**Emergency Data Fix (requires approval):**
```sql
-- Connect to primary (write access) - REQUIRES INCIDENT COMMANDER APPROVAL
psql -h db-primary.dcmms.io -U admin_user -d dcmms_prod

-- Example: Unlock stuck work order
BEGIN;
UPDATE work_orders SET status = 'scheduled' WHERE workOrderId = 'WO-12345';
-- Review change
SELECT * FROM work_orders WHERE workOrderId = 'WO-12345';
COMMIT;  -- or ROLLBACK if incorrect
```

### 7.4 Communication Templates

**Incident Notification (Internal):**
```
🚨 Incident Declared: P1 - API High Error Rate

Status: Investigating
Started: 2025-11-08 14:30 UTC
IC: @jane.doe
War Room: #incident-2025-11-08

Impact: API error rate at 12%, some requests failing
Next Update: In 15 minutes

[Link to status page]
```

**Customer Communication (External):**
```
Subject: [dCMMS] Service Degradation - Investigating

We are currently investigating elevated error rates affecting the dCMMS API.
Some users may experience intermittent failures when creating or updating work orders.

Our team is actively working to resolve this issue.
We will provide an update within 30 minutes.

Status: https://status.dcmms.io
```

---

## Deployment Approval Matrix

| Environment | Approver(s) | Required Tests |
|-------------|-------------|----------------|
| Development | Auto-deploy | Linting, unit tests |
| Staging | Auto-deploy | Integration tests, smoke tests |
| Production | Product Owner + Tech Lead | All tests + UAT sign-off |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial deployment runbooks |

