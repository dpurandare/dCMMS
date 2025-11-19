# dCMMS Demo Environment Setup Guide

**Purpose:** Instructions for setting up and maintaining the dCMMS demo environment
**Environment:** https://demo.dcmms.com
**Target Release:** Release 2 (v0.3.0)
**Last Updated:** 2025-11-19

---

## Overview

The dCMMS demo environment is a fully functional instance pre-loaded with representative data for product demonstrations, customer trials, and training purposes.

**Key Requirements:**
- Realistic data representing typical 150 MW solar plant
- Stable performance (API p95 <200ms)
- Pre-seeded scenarios (anomalies, work orders, reports)
- Automatic data refresh (weekly)
- Separate from production (isolated infrastructure)

---

## Infrastructure Architecture

### AWS Resources

**Compute:**
- **Application Servers:** 2x t3.medium EC2 instances (ECS Fargate)
- **Backend:** Node.js Fastify API
- **Frontend:** Next.js static site (served from S3 + CloudFront)

**Database:**
- **PostgreSQL:** db.t3.medium RDS instance (30 GB)
- **QuestDB:** t3.small EC2 instance (time-series telemetry)
- **Redis:** cache.t3.micro ElastiCache (session + caching)

**Networking:**
- **VPC:** demo-dcmms-vpc (10.1.0.0/16)
- **Subnets:** Public (10.1.1.0/24), Private (10.1.2.0/24)
- **Load Balancer:** Application Load Balancer (ALB)
- **DNS:** demo.dcmms.com → ALB

**Storage:**
- **S3 Buckets:**
  - `dcmms-demo-uploads` (attachments, photos)
  - `dcmms-demo-reports` (generated PDFs)
  - `dcmms-demo-backups` (database backups)

### Terraform Configuration

All infrastructure is managed via Terraform:

```bash
# Initialize Terraform
cd infrastructure/terraform/demo
terraform init

# Plan deployment
terraform plan -var="environment=demo"

# Apply changes
terraform apply -var="environment=demo"
```

**Key Terraform Files:**
- `main.tf` - Core infrastructure
- `demo-data.tf` - Demo data seeding configuration
- `variables.tf` - Environment variables
- `outputs.tf` - Resource outputs (URLs, ARNs)

---

## Initial Setup

### 1. Infrastructure Provisioning (1 hour)

```bash
# Clone repository
git clone https://github.com/your-org/dCMMS.git
cd dCMMS

# Provision infrastructure
cd infrastructure/terraform/demo
terraform init
terraform apply -var="environment=demo"

# Note outputs (database endpoint, ALB DNS, etc.)
terraform output
```

### 2. Database Setup (30 minutes)

```bash
# Connect to demo RDS instance
export DB_HOST=$(terraform output -raw db_endpoint)
export DB_NAME=dcmms_demo
export DB_USER=dcmms_admin
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id demo/db-password --query SecretString --output text)

# Run migrations
cd ../../backend
npm install
npm run migrate:up -- --env demo

# Verify migrations
npm run migrate:status -- --env demo
```

Expected output:
```
✅ Migration 001_initial_schema.sql - Applied
✅ Migration 002_rbac.sql - Applied
...
✅ Migration 017_add_compliance_enhancements.sql - Applied
Total: 17 migrations applied
```

### 3. Demo Data Seeding (1 hour)

```bash
# Run demo data seed script
npm run seed:demo

# This creates:
# - 3 sites (Rajasthan 150MW, Gujarat 80MW, Maharashtra 120MW)
# - 150 assets (inverters, transformers, meters)
# - 20 users (admin, managers, supervisors, field techs)
# - 500 work orders (various statuses)
# - 90 days of telemetry data
# - 8 compliance reports
```

**Seed Script Output:**
```
🌱 Seeding demo data...
  ✅ Sites: 3 created
  ✅ Assets: 150 created
  ✅ Users: 20 created
  ✅ Work Orders: 500 created
  ✅ Telemetry: 90 days seeded (6.5M records)
  ✅ Compliance Reports: 8 created
  ✅ Anomalies: 3 pre-seeded
  ⏱️  Time: 52 seconds
  ✅ Demo data seeding complete!
```

### 4. ML Model Training (2 hours)

```bash
# Navigate to ML directory
cd ../ml-services

# Install dependencies
pip install -r requirements.txt

# Train anomaly detection model
python scripts/train_anomaly_model.py --env demo

# Train predictive maintenance model
python scripts/train_pdm_model.py --env demo

# Train energy forecasting model
python scripts/train_forecast_model.py --env demo

# Verify models registered in MLflow
python scripts/verify_models.py
```

Expected output:
```
✅ Anomaly Detection Model
   - Accuracy: 94.2%
   - Precision: 92.8%
   - Recall: 91.5%
   - Model URI: models:/anomaly-detection/production

✅ Predictive Maintenance Model
   - MAE: 4.2 days
   - R²: 0.87
   - Model URI: models:/pdm-rul/production

✅ Energy Forecast Model
   - MAE: 3.1%
   - R²: 0.96
   - Model URI: models:/energy-forecast/production
```

### 5. Frontend Deployment (30 minutes)

```bash
# Build frontend
cd ../frontend
npm install
npm run build -- --env demo

# Deploy to S3 + CloudFront
aws s3 sync out/ s3://dcmms-demo-frontend/
aws cloudfront create-invalidation --distribution-id E1DEMO123 --paths "/*"

# Verify deployment
curl https://demo.dcmms.com
```

### 6. Backend Deployment (30 minutes)

```bash
# Build and push Docker image
cd ../backend
docker build -t dcmms-backend:demo .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [ECR-REPO]
docker tag dcmms-backend:demo [ECR-REPO]/dcmms-backend:demo
docker push [ECR-REPO]/dcmms-backend:demo

# Update ECS service
aws ecs update-service --cluster dcmms-demo --service backend --force-new-deployment

# Wait for deployment to complete (2-3 minutes)
aws ecs wait services-stable --cluster dcmms-demo --services backend

# Verify health
curl https://demo.dcmms.com/api/v1/health
```

Expected output:
```json
{
  "status": "healthy",
  "version": "0.3.0",
  "environment": "demo",
  "database": "connected",
  "redis": "connected",
  "uptime": 120
}
```

### 7. Post-Deployment Verification (15 minutes)

Run comprehensive health check:

```bash
cd scripts/deployment
./health-check.sh demo
```

Expected output:
```
=========================================
dCMMS Health Check - demo
Base URL: https://demo.dcmms.com
=========================================

[1/10] Checking API health endpoint...
✅ PASS: API health endpoint responding (version: 0.3.0)

[2/10] Checking database connectivity...
✅ PASS: Database connected

[3/10] Checking authentication...
✅ PASS: Authentication endpoint responding

[4/10] Checking work orders API...
✅ PASS: Work orders API responding

[5/10] Checking frontend...
✅ PASS: Frontend loading

[6/10] Checking SSL certificate...
✅ PASS: SSL certificate valid (87 days remaining)

[7/10] Checking Docker containers...
✅ PASS: 4 dCMMS containers running

[8/10] Checking disk space...
✅ PASS: Disk usage: 42%

[9/10] Checking memory usage...
✅ PASS: Memory usage: 56%

[10/10] Checking Release 2 features...
✅ PASS: Release 2 compliance API responding

=========================================
Health Check Summary
=========================================
✅ Passed: 10
⚠️  Warnings: 0
❌ Failed: 0
=========================================
✅ Overall Status: HEALTHY
```

---

## Demo Data Details

### Sites

| Site Name | Location | Capacity | Assets | Coordinates |
|-----------|----------|----------|--------|-------------|
| Rajasthan Solar Park | Jodhpur, Rajasthan | 150 MW | 45 inverters, 15 transformers | 26.2389°N, 73.0243°E |
| Gujarat Wind-Solar Hybrid | Kutch, Gujarat | 80 MW | 30 inverters, 10 transformers, 20 wind turbines | 23.7337°N, 68.7297°E |
| Maharashtra Solar Park | Solapur, Maharashtra | 120 MW | 40 inverters, 12 transformers | 17.6599°N, 75.9064°E |

### Users

| Role | Email | Password | Assigned Site | Notes |
|------|-------|----------|---------------|-------|
| Admin | demo-admin@dcmms.com | DemoAdmin2025! | All | Full system access |
| O&M Manager | demo-manager@dcmms.com | DemoMgr2025! | All | Reports, analytics |
| Supervisor (Rajasthan) | demo-supervisor@dcmms.com | DemoSuper2025! | Rajasthan | Primary demo user |
| Supervisor (Gujarat) | demo-supervisor-guj@dcmms.com | DemoSuper2025! | Gujarat | - |
| Field Tech 1 | demo-tech@dcmms.com | DemoTech2025! | Rajasthan | Mobile app demo |
| Field Tech 2 | demo-tech2@dcmms.com | DemoTech2025! | Rajasthan | - |
| Compliance Officer | demo-compliance@dcmms.com | DemoComp2025! | All | Compliance reports only |

**Note:** All passwords expire in 90 days and will auto-reset to defaults.

### Pre-seeded Anomalies

For demo consistency, these anomalies are always present:

**Anomaly 1: High Severity**
- Asset: INV-045 (Inverter at Rajasthan site)
- Issue: DC voltage irregularity
- Detected: Daily at 09:45 UTC
- Confidence: 94%
- Anomaly Score: 0.87

**Anomaly 2: Medium Severity**
- Asset: TRX-12 (Transformer at Rajasthan site)
- Issue: Temperature spike
- Detected: Daily at 08:20 UTC
- Confidence: 89%
- Anomaly Score: 0.79

**Anomaly 3: Low Severity**
- Asset: INV-023 (Inverter at Gujarat site)
- Issue: Efficiency drop
- Detected: Previous day at 14:35 UTC
- Confidence: 82%
- Anomaly Score: 0.76

**Implementation:** These anomalies are regenerated daily by a cron job to ensure they always appear fresh in demos.

### Work Orders

Work order distribution:
- **Open:** 23 (15%)
- **Assigned:** 15 (10%)
- **In Progress:** 12 (8%)
- **Pending Review:** 8 (5%)
- **Completed:** 442 (62%)

Priority distribution:
- **Critical:** 5
- **High:** 45
- **Medium:** 180
- **Low:** 270

### Compliance Reports

Pre-generated reports available:
- Q1 2024 - CEA Report (Rajasthan)
- Q2 2024 - MNRE Report (Rajasthan)
- Q3 2024 - CEA Report (Rajasthan)
- Q4 2024 - MNRE Report (Rajasthan)
- Q1 2025 - CEA Report (All sites)
- Q2 2025 - MNRE Report (All sites)
- Q3 2025 - CEA Report (Draft)
- Q4 2025 - MNRE Report (Draft)

---

## Telemetry Simulation

### Real-time Telemetry Generator

The demo environment includes a telemetry simulator that generates realistic real-time data:

```bash
# Start telemetry simulator (runs in background)
cd backend/scripts
node telemetry-simulator.js --env demo

# This generates:
# - Inverter metrics every 1 minute (DC voltage, AC power, temperature, efficiency)
# - Transformer metrics every 5 minutes (voltage, current, temperature, load)
# - Weather station data every 10 minutes (irradiance, temperature, wind)
# - Meter readings every 15 minutes (energy, power factor)
```

**Telemetry Characteristics:**
- **Volume:** ~200 events/minute (~288K events/day)
- **Patterns:** Realistic solar generation curves (sunrise, peak, sunset)
- **Anomalies:** Injected anomalies for INV-045, TRX-12, INV-023
- **Noise:** ±2% random variation for realism

**Telemetry Storage:**
- **Recent (< 7 days):** QuestDB (high-frequency queries)
- **Historical (7-90 days):** PostgreSQL time-series partitions
- **Archive (> 90 days):** S3 (cost optimization)

---

## Automated Maintenance

### Daily Tasks (Cron: 2:00 AM UTC)

**Script:** `scripts/demo-maintenance/daily.sh`

```bash
#!/bin/bash
# Daily demo maintenance tasks

# 1. Refresh anomalies (ensure consistent demo experience)
npm run demo:refresh-anomalies

# 2. Clean up old work orders (keep last 500)
npm run demo:cleanup-work-orders

# 3. Generate new demo work orders (add 5-10 new WOs)
npm run demo:generate-work-orders

# 4. Update telemetry (ensure recent data exists)
npm run demo:refresh-telemetry

# 5. Backup database
npm run demo:backup-db

# 6. Health check
./health-check.sh demo | mail -s "Demo Health Check" devops@dcmms.com
```

**Cron Configuration:**
```cron
# /etc/cron.d/dcmms-demo
0 2 * * * /opt/dcmms/scripts/demo-maintenance/daily.sh
```

### Weekly Tasks (Cron: Sunday 3:00 AM UTC)

**Script:** `scripts/demo-maintenance/weekly.sh`

```bash
#!/bin/bash
# Weekly demo maintenance tasks

# 1. Full data refresh (reset to baseline state)
npm run demo:full-reset

# 2. Re-train ML models with fresh data
cd ml-services
python scripts/train_all_models.py --env demo

# 3. Update compliance reports (generate new draft reports)
npm run demo:generate-compliance-reports

# 4. Security scan
npm run security:scan -- --env demo

# 5. Performance benchmark
cd tests/performance
k6 run final-validation-test.js --env demo

# 6. Email weekly report
./generate-weekly-report.sh | mail -s "Demo Weekly Report" devops@dcmms.com
```

### Monthly Tasks (First Sunday 4:00 AM UTC)

**Script:** `scripts/demo-maintenance/monthly.sh`

```bash
#!/bin/bash
# Monthly demo maintenance tasks

# 1. Rotate demo user passwords
npm run demo:rotate-passwords

# 2. Update SSL certificate (if needed)
./check-ssl-renewal.sh

# 3. Infrastructure audit
terraform plan -var="environment=demo" | mail -s "Demo Infrastructure Audit" devops@dcmms.com

# 4. Cost analysis
aws ce get-cost-and-usage --time-period Start=2025-10-01,End=2025-10-31 \
  --filter file://demo-filter.json --granularity MONTHLY \
  --metrics "BlendedCost" | jq '.ResultsByTime[0].Total.BlendedCost'

# 5. Update documentation
./update-demo-docs.sh
```

---

## Monitoring & Alerts

### CloudWatch Alarms

**Critical Alarms (PagerDuty notification):**
1. **API Error Rate > 5%** (5 minutes)
2. **Database CPU > 90%** (5 minutes)
3. **ALB 5xx errors > 10** (5 minutes)
4. **ECS Service Unhealthy** (2 minutes)

**Warning Alarms (Slack notification):**
1. **API p95 Latency > 500ms** (10 minutes)
2. **Database Connections > 80%** (15 minutes)
3. **Disk Usage > 80%** (30 minutes)
4. **Memory Usage > 85%** (15 minutes)

### Metrics Dashboard

Grafana dashboard available at: https://monitoring.dcmms.com/d/demo

**Key Metrics Tracked:**
- API request rate (requests/sec)
- API latency (p50, p95, p99)
- Error rate (%)
- Database query performance
- Telemetry ingestion rate
- Active user sessions
- Demo usage statistics

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- **Automated RDS snapshots:** Daily at 3:00 AM UTC (retained 7 days)
- **Manual snapshots:** Before major changes
- **Backup to S3:** Daily full dump to `dcmms-demo-backups`

**Configuration Backups:**
- **Terraform state:** Stored in S3 with versioning
- **Environment variables:** Stored in AWS Secrets Manager
- **Application configs:** Version controlled in Git

### Recovery Procedures

**Scenario 1: Database Corruption**

```bash
# 1. Identify latest good snapshot
aws rds describe-db-snapshots --db-instance-identifier dcmms-demo \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' --output table

# 2. Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier dcmms-demo-restored \
  --db-snapshot-identifier dcmms-demo-2025-11-19-03-00

# 3. Update application to point to restored database
terraform apply -var="db_endpoint=dcmms-demo-restored.xxx.rds.amazonaws.com"

# 4. Verify data integrity
npm run demo:verify-data

# 5. Update DNS (if needed)
```

**RTO (Recovery Time Objective):** 30 minutes
**RPO (Recovery Point Objective):** 24 hours

**Scenario 2: Complete Infrastructure Failure**

```bash
# 1. Re-provision infrastructure
cd infrastructure/terraform/demo
terraform destroy -var="environment=demo"  # If needed
terraform apply -var="environment=demo"

# 2. Restore database from S3 backup
aws s3 cp s3://dcmms-demo-backups/latest.sql.gz /tmp/
gunzip /tmp/latest.sql.gz
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /tmp/latest.sql

# 3. Re-deploy application
./deploy-demo.sh

# 4. Re-seed demo data
npm run seed:demo

# 5. Verify environment
./health-check.sh demo
```

**RTO:** 2 hours
**RPO:** 24 hours

---

## Cost Optimization

### Monthly Cost Breakdown (Estimated)

| Resource | Type | Monthly Cost |
|----------|------|--------------|
| EC2 Instances (ECS) | 2x t3.medium | $60 |
| RDS PostgreSQL | db.t3.medium | $85 |
| ElastiCache Redis | cache.t3.micro | $15 |
| QuestDB EC2 | t3.small | $30 |
| Application Load Balancer | ALB | $22 |
| S3 Storage | 50 GB | $2 |
| CloudFront | Data transfer | $5 |
| Data Transfer | Outbound | $10 |
| **Total** | | **~$229/month** |

### Cost Optimization Strategies

1. **Auto-scaling:** Scale down during non-business hours
   ```bash
   # Cron: Scale down at 8 PM ET (low usage)
   aws ecs update-service --cluster dcmms-demo --service backend --desired-count 1

   # Cron: Scale up at 8 AM ET (business hours)
   aws ecs update-service --cluster dcmms-demo --service backend --desired-count 2
   ```

2. **Reserved Instances:** Save 30-40% by purchasing 1-year reserved instances for RDS and EC2

3. **S3 Lifecycle Policies:** Move old reports to S3 Glacier after 90 days

4. **Scheduled Shutdown:** Shut down demo environment on weekends (if not in use)
   ```bash
   # Friday 6 PM: Stop demo environment
   terraform apply -var="demo_enabled=false"

   # Monday 6 AM: Start demo environment
   terraform apply -var="demo_enabled=true"
   ```
   **Potential Savings:** 30% (~$70/month)

---

## Security Considerations

### Access Control

**AWS IAM:**
- **Admin Access:** DevOps team only (MFA required)
- **ReadOnly Access:** Product, sales teams
- **No Access:** Developers (use development environment instead)

**Application Access:**
- **Demo users:** Passwords rotate every 90 days
- **Session timeout:** 30 minutes (longer than production for demo convenience)
- **API rate limiting:** 1000 requests/hour per IP (prevent abuse)

### Data Privacy

**No Real Customer Data:**
- All demo data is synthetic/fictional
- No PII (Personally Identifiable Information)
- Email domains use `@dcmms.com` or `@example.com`

**Regular Security Scans:**
```bash
# Run weekly security scan
npm run security:scan -- --env demo

# Expected: 0 critical, 0 high vulnerabilities
```

### Network Security

- **VPC:** Isolated network (10.1.0.0/16)
- **Security Groups:** Restrict inbound to HTTPS (443) only
- **WAF:** Enabled with OWASP Top 10 rules
- **DDoS Protection:** AWS Shield Standard

---

## Troubleshooting

### Issue: Demo environment slow

**Symptoms:** API latency >1s, dashboard taking 5+ seconds to load

**Diagnosis:**
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics --namespace AWS/RDS \
  --metric-name CPUUtilization --dimensions Name=DBInstanceIdentifier,Value=dcmms-demo \
  --start-time 2025-11-19T00:00:00Z --end-time 2025-11-19T23:59:59Z \
  --period 3600 --statistics Average

# Check active database connections
psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution:**
1. Check if telemetry simulator is overloading system (kill and restart with lower rate)
2. Clear Redis cache: `redis-cli -h $REDIS_HOST FLUSHALL`
3. Restart ECS services: `aws ecs update-service --cluster dcmms-demo --service backend --force-new-deployment`
4. If persistent, scale up RDS instance temporarily

### Issue: Anomalies not appearing in demo

**Symptoms:** Anomaly widget shows "No anomalies detected"

**Diagnosis:**
```bash
# Check when anomalies were last generated
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT id, asset_id, detected_at FROM anomalies ORDER BY detected_at DESC LIMIT 5;"
```

**Resolution:**
```bash
# Manually trigger anomaly generation
npm run demo:refresh-anomalies

# Verify anomalies created
npm run demo:verify-anomalies
```

### Issue: ML predictions failing

**Symptoms:** 500 error when accessing ML prediction endpoints

**Diagnosis:**
```bash
# Check ML service logs
aws logs tail /aws/ecs/dcmms-demo-ml-service --follow

# Check MLflow model registry
python scripts/verify_models.py
```

**Resolution:**
```bash
# Re-deploy ML service
cd ml-services
docker build -t dcmms-ml:demo .
docker push [ECR-REPO]/dcmms-ml:demo
aws ecs update-service --cluster dcmms-demo --service ml-service --force-new-deployment

# If models missing, re-train
python scripts/train_all_models.py --env demo
```

---

## Contact & Support

**Demo Environment Issues:**
- **DevOps On-Call:** devops-oncall@dcmms.com
- **Slack:** #demo-environment
- **PagerDuty:** Demo Environment service

**Demo Content/Script Questions:**
- **Product Team:** product@dcmms.com
- **Slack:** #product-demos

**Sales Demo Requests:**
- **Sales Enablement:** sales-enablement@dcmms.com
- **Slack:** #sales

---

## Appendix: Demo Environment Checklist

### Pre-Demo Checklist (T-1 Day)

- [ ] Run health check script (`./health-check.sh demo`)
- [ ] Verify all 3 pre-seeded anomalies exist
- [ ] Test login with all demo credentials
- [ ] Generate a test compliance report (CEA Q4)
- [ ] Check that telemetry data is recent (< 5 minutes old)
- [ ] Verify ML predictions are working (run test prediction)
- [ ] Confirm SSL certificate is valid (>30 days)
- [ ] Review CloudWatch alarms (no active alarms)
- [ ] Check demo environment cost (should be ~$7-8/day)

### Post-Demo Checklist

- [ ] Reset demo environment (if heavily modified during demo)
- [ ] Check for any errors in logs
- [ ] Verify auto-scaling is enabled
- [ ] Document any issues encountered
- [ ] Share feedback with Product team (what worked, what didn't)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Next Review:** 2026-02-19
