# Production Deployment Runbook - Release 2 (v0.3.0)

**Document:** Production Deployment Runbook
**Release:** dCMMS Release 2 (v0.3.0)
**Last Updated:** 2025-11-19
**Owner:** DevOps Team

---

## Pre-Deployment Checklist

### 1 Week Before Deployment

- [ ] **Code freeze** initiated
- [ ] Final smoke tests completed in staging
- [ ] Performance validation tests executed (k6 `final-validation-test.js`)
- [ ] Security scans completed (Snyk, OWASP ZAP)
- [ ] Database migration scripts reviewed and tested
- [ ] Stakeholder sign-off obtained (Product, Engineering, Security)
- [ ] Deployment window scheduled and communicated
- [ ] Rollback plan documented and tested
- [ ] Customer notification drafted (if downtime expected)

### 48 Hours Before Deployment

- [ ] Staging environment mirrors production
- [ ] Full regression test suite executed
- [ ] Backup verification completed
- [ ] DR plan reviewed
- [ ] On-call engineers confirmed and briefed
- [ ] Deployment team meeting conducted
- [ ] Go/No-Go decision checklist reviewed

### 24 Hours Before Deployment

- [ ] Production backup created and verified
- [ ] Database maintenance mode prepared
- [ ] Traffic routing plan confirmed (blue-green or canary)
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds verified
- [ ] Status page prepared for updates
- [ ] Final Go/No-Go decision

---

## Deployment Team

| Role | Name | Responsibility | Contact |
|------|------|----------------|---------|
| **Deployment Lead** | [TBD] | Overall coordination, Go/No-Go decisions | [Phone/Slack] |
| **Backend Lead** | [TBD] | Backend service deployment | [Phone/Slack] |
| **Frontend Lead** | [TBD] | Frontend deployment | [Phone/Slack] |
| **Database Administrator** | [TBD] | Database migrations | [Phone/Slack] |
| **DevOps Engineer** | [TBD] | Infrastructure, monitoring | [Phone/Slack] |
| **Security Engineer** | [TBD] | Security validation | [Phone/Slack] |
| **QA Lead** | [TBD] | Post-deployment testing | [Phone/Slack] |

---

## Deployment Timeline (4-hour window)

| Time | Activity | Duration | Owner | Rollback Point |
|------|----------|----------|-------|----------------|
| **T-0:00** | Pre-deployment checks | 15 min | All | N/A |
| **T-0:15** | Enable maintenance mode | 5 min | DevOps | Yes |
| **T-0:20** | Database backup | 20 min | DBA | Yes |
| **T-0:40** | Database migrations | 30 min | DBA | Yes |
| **T-1:10** | Deploy backend services | 30 min | Backend | Yes |
| **T-1:40** | Deploy frontend | 20 min | Frontend | Yes |
| **T-2:00** | Health checks | 15 min | DevOps | Yes |
| **T-2:15** | Smoke tests | 20 min | QA | Yes |
| **T-2:35** | Gradual traffic ramp-up | 45 min | DevOps | Yes |
| **T-3:20** | Monitoring & validation | 30 min | All | No (monitor) |
| **T-3:50** | Disable maintenance mode | 5 min | DevOps | No |
| **T-3:55** | Post-deployment review | 5 min | All | No |

---

## Deployment Procedures

### Step 1: Pre-Deployment Verification (T-0:00, 15 minutes)

```bash
# 1. Verify team is present
echo "Deployment team roll call in #deployment-release-2 Slack channel"

# 2. Verify staging environment health
curl https://staging.dcmms.com/api/v1/health
# Expected: {"status": "healthy", "version": "0.3.0"}

# 3. Verify production backup exists
aws s3 ls s3://dcmms-backups/production/ | grep $(date +%Y%m%d)

# 4. Verify deployment artifacts
docker images | grep dcmms | grep 0.3.0

# 5. Check current production metrics
# - API latency p95 < 200ms
# - Error rate < 1%
# - Active users count
```

**Go/No-Go Decision Point:** Deployment Lead confirms all checks pass

---

### Step 2: Enable Maintenance Mode (T-0:15, 5 minutes)

```bash
# 1. Update status page
curl -X POST https://api.statuspage.io/v1/pages/[PAGE_ID]/incidents \
  -H "Authorization: OAuth [TOKEN]" \
  -d '{
    "incident": {
      "name": "Scheduled Maintenance - Release 2 Deployment",
      "status": "investigating",
      "impact_override": "maintenance"
    }
  }'

# 2. Enable maintenance page (Nginx)
ssh production-lb-01
sudo ln -sf /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Verify maintenance page is live
curl https://dcmms.com
# Should return maintenance page (HTTP 503)
```

---

### Step 3: Create Production Backup (T-0:20, 20 minutes)

```bash
# 1. Trigger full database backup
ssh production-db-01
sudo /opt/dcmms/scripts/backup/backup-postgres-full.sh

# 2. Verify backup completed
ls -lh /opt/dcmms/backups/postgres/full/ | tail -1

# 3. Upload backup to S3
aws s3 cp /opt/dcmms/backups/postgres/full/postgres_full_$(date +%Y%m%d_%H%M%S).sql.gz \
  s3://dcmms-backups/production/pre-release-2/

# 4. Create application snapshot (config, secrets)
tar -czf /tmp/dcmms-config-snapshot-$(date +%Y%m%d).tar.gz \
  /etc/dcmms/ /opt/dcmms/.env /opt/dcmms/docker-compose.yml

# 5. Upload config snapshot
aws s3 cp /tmp/dcmms-config-snapshot-$(date +%Y%m%d).tar.gz \
  s3://dcmms-backups/production/pre-release-2/
```

**Rollback Point:** If backup fails, ABORT deployment

---

### Step 4: Database Migrations (T-0:40, 30 minutes)

```bash
# 1. Connect to production database
ssh production-db-01
sudo -u postgres psql -d dcmms

# 2. Verify current schema version
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
# Expected: 014 (from Sprint 11)

# 3. Run migration dry-run
cd /opt/dcmms/backend
npm run migrate:dry-run

# 4. Execute migrations
npm run migrate:up

# 5. Verify migrations completed
sudo -u postgres psql -d dcmms -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Expected new migrations (Release 2):
# 015_add_ml_features_table.sql
# 016_add_analytics_views.sql
# 017_add_compliance_enhancements.sql

# 6. Verify table structure
\d+ ml_features
\d+ analytics_views
```

**Rollback Point:** If migrations fail, run `npm run migrate:down` and ABORT

---

### Step 5: Deploy Backend Services (T-1:10, 30 minutes)

```bash
# 1. Pull new Docker images
ssh production-app-01
docker pull dcmms/backend:0.3.0
docker pull dcmms/ml-service:0.3.0
docker pull dcmms/mqtt-bridge:0.3.0

# 2. Stop current backend services
docker-compose -f docker-compose.prod.yml stop backend ml-service mqtt-bridge

# 3. Update docker-compose.yml to version 0.3.0
sed -i 's/image: dcmms\/backend:.*/image: dcmms\/backend:0.3.0/' docker-compose.prod.yml
sed -i 's/image: dcmms\/ml-service:.*/image: dcmms\/ml-service:0.3.0/' docker-compose.prod.yml
sed -i 's/image: dcmms\/mqtt-bridge:.*/image: dcmms\/mqtt-bridge:0.3.0/' docker-compose.prod.yml

# 4. Start new backend services
docker-compose -f docker-compose.prod.yml up -d backend ml-service mqtt-bridge

# 5. Wait for services to be healthy
sleep 30
docker ps | grep dcmms

# 6. Verify backend health endpoint
curl http://localhost:3000/api/v1/health
# Expected: {"status": "healthy", "version": "0.3.0", "database": "connected"}
```

**Rollback Point:** Revert to previous image version and restart

---

### Step 6: Deploy Frontend (T-1:40, 20 minutes)

```bash
# 1. Build and upload frontend assets to S3/CDN
cd /opt/dcmms/frontend
npm run build
aws s3 sync .next/static s3://dcmms-frontend-assets/0.3.0/

# 2. Deploy frontend container
docker pull dcmms/frontend:0.3.0
docker-compose -f docker-compose.prod.yml stop frontend
docker-compose -f docker-compose.prod.yml up -d frontend

# 3. Update Nginx configuration (if needed)
# Verify proxy pass configuration
cat /etc/nginx/sites-enabled/dcmms.conf

# 4. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. Verify frontend
curl https://dcmms.com/api/v1/health
# (Still in maintenance mode, should return 503)
```

---

### Step 7: Health Checks (T-2:00, 15 minutes)

```bash
# 1. Comprehensive health check script
/opt/dcmms/scripts/deployment/health-check.sh

# 2. Manual verifications:

# Check all containers running
docker ps | grep dcmms
# Expected: 5-6 containers (backend, frontend, ml-service, mqtt-bridge, etc.)

# Check database connectivity
docker exec dcmms-backend npm run db:ping

# Check Redis connectivity
docker exec dcmms-backend npm run redis:ping

# Check Kafka connectivity
docker exec dcmms-mqtt-bridge npm run kafka:ping

# Check logs for errors
docker logs --tail=50 dcmms-backend 2>&1 | grep -i error
docker logs --tail=50 dcmms-frontend 2>&1 | grep -i error

# No critical errors should be present
```

**Go/No-Go Decision Point:** All health checks must pass

---

### Step 8: Smoke Tests (T-2:15, 20 minutes)

```bash
# Temporarily allow test traffic (bypass maintenance)
# Add test IP to whitelist in Nginx

# 1. Run automated smoke test suite
cd /opt/dcmms/backend/tests
k6 run smoke-test.js --env API_BASE_URL=https://dcmms.com

# Expected: All checks pass

# 2. Manual smoke tests
# Test authentication
curl -X POST https://dcmms.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dcmms.local","password":"[REDACTED]"}'
# Expected: {"token": "..."}

# Test work orders list
curl https://dcmms.com/api/v1/work-orders \
  -H "Authorization: Bearer [TOKEN]"
# Expected: {"data": [...], "pagination": {...}}

# Test NEW Release 2 endpoints
# Compliance reports
curl https://dcmms.com/api/v1/compliance/reports \
  -H "Authorization: Bearer [TOKEN]"

# ML predictions (new feature)
curl https://dcmms.com/api/v1/ml/predict/anomaly \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"SITE-0001","assetId":"INV-001","features":{...}}'
```

**Rollback Point:** If smoke tests fail critical paths, initiate rollback

---

### Step 9: Gradual Traffic Ramp-Up (T-2:35, 45 minutes)

```bash
# Using blue-green deployment or weighted routing

# Phase 1: 10% traffic (T-2:35, 15 min)
# Update load balancer to send 10% traffic to new version
aws elbv2 modify-rule \
  --rule-arn [RULE_ARN] \
  --actions Type=forward,ForwardConfig='{
    "TargetGroups":[
      {"TargetGroupArn":"[OLD_TG]","Weight":90},
      {"TargetGroupArn":"[NEW_TG]","Weight":10}
    ]
  }'

# Monitor metrics for 15 minutes
# - Error rate should not increase
# - Latency should remain stable
# - No spike in 500 errors

# Phase 2: 50% traffic (T-2:50, 15 min)
aws elbv2 modify-rule ... Weight:50, Weight:50

# Monitor metrics for 15 minutes

# Phase 3: 100% traffic (T-3:05, 15 min)
aws elbv2 modify-rule ... Weight:0, Weight:100

# Monitor metrics for 15 minutes
# Full traffic on new version

# If any phase shows issues: HALT ramp-up, investigate, potentially rollback
```

---

### Step 10: Monitoring & Validation (T-3:20, 30 minutes)

```bash
# 1. Monitor Grafana dashboards
# - API Latency (p95 should be < 200ms)
# - Error Rate (should be < 1%)
# - Request Rate (should match pre-deployment levels)
# - Database Query Performance
# - ML Inference Latency (new metric)

# 2. Monitor application logs
tail -f /var/log/dcmms/backend.log | grep ERROR

# 3. Monitor user activity
# Check active sessions, user logins

# 4. Monitor specific Release 2 features
# - Compliance report generation count
# - ML prediction requests
# - New UI components loading correctly

# 5. Check security alerts
# No suspicious activity should be detected
```

---

### Step 11: Disable Maintenance Mode (T-3:50, 5 minutes)

```bash
# 1. Disable maintenance page
ssh production-lb-01
sudo rm /etc/nginx/sites-enabled/maintenance.conf
sudo nginx -t && sudo systemctl reload nginx

# 2. Update status page to "Operational"
curl -X PATCH https://api.statuspage.io/v1/pages/[PAGE_ID]/incidents/[INCIDENT_ID] \
  -H "Authorization: OAuth [TOKEN]" \
  -d '{"incident": {"status": "resolved"}}'

# 3. Verify live site is accessible
curl https://dcmms.com
# Should return normal application (not maintenance page)

# 4. Send "Deployment Complete" notification
# Slack #general channel
# Email to stakeholders
```

---

### Step 12: Post-Deployment Review (T-3:55, 5 minutes)

**Quick team sync:**
- Any issues encountered during deployment?
- All rollback points successful (if needed)?
- Monitoring looks good?
- Customer reports of issues?
- Action items for next deployment?

**Post-Deployment Tasks (next 24 hours):**
- [ ] Monitor system health for 24 hours
- [ ] Review deployment metrics
- [ ] Customer feedback review
- [ ] Performance comparison (pre vs. post deployment)
- [ ] Update deployment runbook with learnings
- [ ] Schedule post-deployment retrospective (within 1 week)

---

## Rollback Procedures

### When to Rollback

- Critical functionality broken
- Error rate > 5%
- Performance degradation > 50%
- Data integrity issues
- Security vulnerability introduced

### Rollback Decision

**Authority:** Deployment Lead (with consultation from Engineering Manager/CTO for critical decision)

### Rollback Steps (30-60 minutes)

```bash
# 1. Enable maintenance mode
ssh production-lb-01
sudo ln -sf /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# 2. Revert backend services to previous version
ssh production-app-01
docker-compose -f docker-compose.prod.yml stop
sed -i 's/0.3.0/0.2.9/' docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d

# 3. Rollback database migrations (if applied)
cd /opt/dcmms/backend
npm run migrate:down

# 4. Verify rollback
curl http://localhost:3000/api/v1/health
# Should show previous version 0.2.9

# 5. Run smoke tests
k6 run smoke-test.js

# 6. Disable maintenance mode
sudo rm /etc/nginx/sites-enabled/maintenance.conf
sudo systemctl reload nginx

# 7. Monitor for stability
# Watch Grafana for 30 minutes

# 8. Communicate rollback to stakeholders
# Status page, Slack, Email
```

---

## Monitoring Dashboards

### Critical Metrics to Monitor

**Grafana Dashboard: Release 2 Deployment**

1. **API Performance**
   - Request rate (req/s)
   - Latency (p50, p95, p99)
   - Error rate (%)

2. **Database**
   - Connection count
   - Query latency
   - Slow queries count

3. **New Features (Release 2)**
   - Compliance report generation count
   - ML prediction requests
   - Anomaly detection latency

4. **System Resources**
   - CPU usage (%)
   - Memory usage (%)
   - Disk I/O

5. **Business Metrics**
   - Active users
   - Successful logins
   - Failed logins

---

## Communication Plan

### Stakeholder Notification

**Pre-Deployment (48 hours before):**
```
Subject: [dCMMS] Release 2 Deployment - Sunday, [Date] 2:00-6:00 AM UTC

Dear Stakeholders,

We will be deploying dCMMS Release 2 (v0.3.0) on Sunday, [Date], from 2:00-6:00 AM UTC.

Expected Impact: Brief service interruption (5-10 minutes during traffic cutover)
New Features: Compliance reporting automation, ML-powered predictions, Enhanced analytics

Deployment Team: [Names]
Rollback Plan: Available if issues detected

For questions: devops@dcmms.com
```

**Post-Deployment (within 1 hour):**
```
Subject: [dCMMS] Release 2 Deployment Complete

Release 2 (v0.3.0) has been successfully deployed.

Deployment Duration: [X hours Y minutes]
Issues Encountered: [None / List]
Current Status: All systems operational

New features are now live:
- Compliance report automation
- ML-powered anomaly detection
- Enhanced performance monitoring

For support: support@dcmms.com
```

---

## Terraform Infrastructure (Sample)

See: `infrastructure/terraform/main.tf` for full infrastructure as code

---

## Health Check Script

See: `scripts/deployment/health-check.sh` for automated health verification

---

## Success Criteria

**Deployment is considered successful when:**
- ✅ All services deployed and running
- ✅ All health checks passing
- ✅ Smoke tests passing
- ✅ Error rate < 1%
- ✅ API latency p95 < 200ms
- ✅ No data loss or corruption
- ✅ No security vulnerabilities introduced
- ✅ All Release 2 features functional
- ✅ User feedback positive

---

## Post-Deployment Metrics

**Track for 7 days post-deployment:**
1. Error rate trend
2. Performance metrics (latency)
3. Feature adoption (compliance reports, ML predictions)
4. User-reported issues
5. Support ticket volume

**Weekly Report:** Share with Engineering Manager, Product Manager, CTO

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-19 | DevOps Team | Initial Release 2 runbook |

**Next Update:** After deployment retrospective
