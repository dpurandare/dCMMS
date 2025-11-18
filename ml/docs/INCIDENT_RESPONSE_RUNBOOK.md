# ML Model Incident Response Runbook

> Step-by-step guide for responding to ML model incidents in production

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Escalation Matrix](#escalation-matrix)
3. [Response Procedures](#response-procedures)
4. [Post-Incident Review](#post-incident-review)

---

## Incident Classification

### Severity Levels

| Severity | Definition | Response Time | Example |
|----------|------------|---------------|---------|
| **Critical** | Service outage, safety risk, or major business impact | 15 minutes | Model predicts all assets as high-risk; critical failure missed |
| **High** | Significant performance degradation affecting business | 1 hour | F1 score drops > 20%; multiple false positives causing wasted maintenance |
| **Medium** | Moderate performance degradation | 4 hours | F1 score drops 10-20%; minor prediction errors |
| **Low** | Minor issues with minimal impact | 24 hours | Documentation outdated; minor data quality issues |

### Incident Types

1. **Prediction Error**
   - Model makes systematically incorrect predictions
   - Failure to predict critical asset failure
   - Excessive false positives/negatives

2. **Performance Degradation**
   - F1 score drops > 10%
   - Precision drops > 15%
   - Recall drops > 15%
   - Inference latency exceeds SLA

3. **Bias/Fairness**
   - Disparate performance across asset types
   - Systematic bias in predictions

4. **Security**
   - Unauthorized access to model
   - Model adversarial attack
   - Data leakage

5. **Compliance**
   - Regulatory violation
   - Privacy breach
   - Audit failure

6. **Infrastructure**
   - Model server downtime
   - Feature store unavailable
   - Deployment failure

---

## Escalation Matrix

### Contact Information

| Role | Name | Email | Phone | Escalation Time |
|------|------|-------|-------|-----------------|
| **On-Call ML Engineer** | [Name] | ml-oncall@example.com | XXX-XXX-XXXX | Immediate |
| **ML Team Lead** | [Name] | ml-lead@example.com | XXX-XXX-XXXX | 30 min |
| **Engineering Manager** | [Name] | eng-manager@example.com | XXX-XXX-XXXX | 1 hour |
| **VP Engineering** | [Name] | vp-eng@example.com | XXX-XXX-XXXX | 2 hours |
| **Compliance Officer** | [Name] | compliance@example.com | XXX-XXX-XXXX | As needed |

### Escalation Path

```
Incident Detected
     ↓
On-Call ML Engineer (Immediate)
     ↓
[If not resolved in 30 min or Severity >= High]
     ↓
ML Team Lead (30 min)
     ↓
[If not resolved in 1 hour or Severity = Critical]
     ↓
Engineering Manager (1 hour)
     ↓
[If business impact continues]
     ↓
VP Engineering (2 hours)
```

---

## Response Procedures

### Step 1: Incident Detection and Triage

**Who:** Automated monitoring, users, or team members

**Actions:**
1. **Detect Incident**
   - Via automated alerts (PagerDuty, email, Slack)
   - Via user report
   - Via monitoring dashboard

2. **Create Incident Report**
   ```bash
   # Via API
   POST /api/v1/model-governance/{modelId}/incidents
   {
     "severity": "high",
     "type": "performance_degradation",
     "description": "F1 score dropped from 0.82 to 0.65",
     "impact": "Increased false positives causing wasted maintenance resources",
     "reportedBy": "monitoring_system"
   }
   ```

3. **Initial Assessment**
   - Verify the incident is real (not a false alarm)
   - Determine severity level
   - Identify affected models and systems
   - Estimate business impact

4. **Notify On-Call**
   - Page on-call ML engineer
   - Post in #ml-incidents Slack channel
   - Update incident status to "investigating"

### Step 2: Immediate Containment

**Who:** On-Call ML Engineer
**Goal:** Stop or minimize damage ASAP

**Critical Incidents (15 min response):**

1. **If model is making dangerous predictions:**
   ```bash
   # Immediately disable model
   kubectl scale deployment/predictive-maintenance-model --replicas=0

   # OR route traffic to previous version
   kubectl patch svc/model-service -p '{"spec":{"selector":{"version":"v1.5.0"}}}'
   ```

2. **If safety risk identified:**
   - Halt all automated work order creation
   - Notify supervisors to review all pending predictive WOs
   - Send emergency alert to maintenance team

3. **If data breach suspected:**
   - Isolate affected systems
   - Preserve logs
   - Notify security team and compliance officer immediately

**High Severity (1 hour response):**

1. **If performance degradation:**
   - Check recent deployments (last 24 hours)
   - Review model performance metrics dashboard
   - Check for data drift (feature distributions)
   - Verify feature store availability

2. **If excessive false positives:**
   - Increase prediction threshold temporarily
   - Add human-in-the-loop approval for all predictions
   - Disable auto-scheduling of work orders

3. **Temporary Mitigation:**
   ```bash
   # Rollback to previous model version
   POST /api/v1/ml/models/predictive_maintenance/rollback
   {
     "targetVersion": "v1.5.0",
     "rolledBackBy": "oncall_engineer"
   }
   ```

### Step 3: Investigation

**Who:** On-Call ML Engineer + ML Team Lead
**Goal:** Identify root cause

**Investigation Checklist:**

- [ ] **Recent Changes**
  - Model deployment in last 7 days?
  - Feature store updates?
  - Infrastructure changes?
  - Data pipeline changes?

- [ ] **Model Performance**
  - Check metrics dashboard: `/api/v1/model-performance/metrics/predictive_maintenance`
  - Compare current vs historical performance
  - Check accuracy by risk level
  - Review confusion matrix

- [ ] **Data Quality**
  - Check feature distributions (data drift)
  - Verify feature store connectivity
  - Check for missing/null features
  - Validate data freshness

- [ ] **Infrastructure**
  - Check model server logs: `kubectl logs -l app=model-server`
  - Verify resource utilization (CPU, memory)
  - Check inference latency metrics
  - Verify Feast feature store availability

- [ ] **Ground Truth**
  - Review recent predictions vs actual outcomes
  - Check for pattern in false positives/negatives
  - Identify affected asset types

**Investigation Tools:**

```bash
# Get model metrics
curl -X GET /api/v1/model-performance/metrics/predictive_maintenance

# Get recent predictions
curl -X GET /api/v1/ml/predictions/logs?limit=100

# Get active performance alerts
curl -X GET /api/v1/model-performance/alerts

# Check model server health
curl -X GET http://model-server:8080/health

# View Kubernetes pods
kubectl get pods -l app=model-server
kubectl logs -l app=model-server --tail=500

# Check feature store
curl -X GET http://feast-server:6566/health
```

### Step 4: Resolution

**Who:** ML Team Lead + Engineers
**Goal:** Fix the root cause

**Common Resolution Paths:**

#### Path A: Model Rollback
```bash
# If new model version is causing issues
POST /api/v1/ml/models/predictive_maintenance/rollback
{
  "targetVersion": "v1.5.0",
  "reason": "Performance degradation in v2.0.0",
  "rolledBackBy": "ml_team_lead"
}

# Verify rollback success
GET /api/v1/ml/models/predictive_maintenance/status
```

#### Path B: Feature Store Issue
```bash
# Check Feast feature availability
feast feature-views list

# Materialize features if stale
feast materialize-incremental $(date -u +"%Y-%m-%dT%H:%M:%S")

# Verify feature retrieval
feast online-features get \
  --feature-service asset_features \
  --entity asset_id=asset_123
```

#### Path C: Data Drift
```python
# Retrain model with recent data
cd ml/training
python train_model.py \
  --start-date 2024-01-01 \
  --end-date 2024-06-01 \
  --model-name predictive_maintenance \
  --version v2.1.0

# Deploy to staging for validation
# After validation, promote to production
```

#### Path D: Threshold Adjustment
```bash
# If precision too low, increase threshold
# Update prediction threshold in model config
kubectl edit configmap model-config

# Restart model server
kubectl rollout restart deployment/model-server
```

### Step 5: Communication

**Who:** Incident Commander (ML Team Lead or Manager)
**Goal:** Keep stakeholders informed

**Communication Templates:**

**Initial Notification (within 1 hour):**
```
Subject: [INCIDENT] Predictive Maintenance Model - [Severity]

Incident ID: incident_123
Model: predictive_maintenance v2.0.0
Severity: HIGH
Status: Investigating

Summary:
F1 score dropped from 0.82 to 0.65, causing increased false positives.

Impact:
- ~30% of maintenance work orders may be unnecessary
- Estimated cost: $10K/day in wasted maintenance resources

Actions Taken:
- Increased human approval threshold
- Disabled auto-scheduling
- Investigating root cause

Expected Resolution: 2-4 hours

Updates will be provided every 30 minutes.
```

**Resolution Notification:**
```
Subject: [RESOLVED] Predictive Maintenance Model - [Severity]

Incident ID: incident_123
Resolution Time: 3 hours 15 minutes

Root Cause:
Data drift due to new asset types added to fleet without model retraining.

Resolution:
- Rolled back to v1.5.0
- Scheduled model retraining with updated dataset
- Implemented additional monitoring for data drift

Preventive Measures:
- Enhanced data drift detection
- Automated model retraining trigger
- New asset type onboarding checklist

Incident closed.
```

### Step 6: Post-Incident Review

**Who:** Full ML Team + Stakeholders
**When:** Within 48 hours of resolution

**Post-Incident Review Template:**

```markdown
# Post-Incident Review: [Incident ID]

## Incident Summary
- **Date:** YYYY-MM-DD
- **Duration:** X hours Y minutes
- **Severity:** [Critical/High/Medium/Low]
- **Model:** predictive_maintenance v2.0.0

## Timeline
| Time | Event |
|------|-------|
| 09:00 | Incident detected via automated alert |
| 09:15 | On-call engineer paged |
| 09:30 | Incident severity escalated to HIGH |
| 10:00 | Root cause identified: data drift |
| 10:30 | Rollback to v1.5.0 initiated |
| 11:00 | Rollback verified, service restored |
| 12:15 | Incident closed |

## Root Cause Analysis

### What Happened?
[Detailed description of the incident]

### Why Did It Happen?
[5 Whys analysis]

1. Why did F1 score drop?
   → Because model was making incorrect predictions on new asset types

2. Why was it making incorrect predictions?
   → Because new asset types were not in training data

3. Why were new assets not in training data?
   → Because model was not retrained after new asset types were added

4. Why was model not retrained?
   → Because there was no automated trigger for retraining when new asset types are added

5. Why was there no automated trigger?
   → Because asset type onboarding process didn't include ML model considerations

### What Went Well?
- Automated monitoring detected issue quickly
- Rollback procedure worked smoothly
- Communication was clear and timely

### What Could Be Improved?
- Data drift detection should have caught this earlier
- Need automated retraining triggers
- Asset onboarding checklist should include ML review

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Implement data drift detection for asset type distribution | ML Engineer | YYYY-MM-DD | In Progress |
| Create automated retraining trigger | ML Lead | YYYY-MM-DD | Not Started |
| Update asset onboarding checklist | Engineering | YYYY-MM-DD | Not Started |
| Add alerting for new asset types | DevOps | YYYY-MM-DD | Not Started |
| Document incident response improvements | ML Lead | YYYY-MM-DD | Not Started |

## Metrics

- **Detection Time:** 5 minutes (automated alert)
- **Response Time:** 15 minutes (engineer paged)
- **Time to Containment:** 1.5 hours (rollback completed)
- **Total Resolution Time:** 3 hours 15 minutes
- **Business Impact:** $10K estimated cost in wasted maintenance

## Lessons Learned

1. **Technical:** Data drift detection needs to include categorical features (asset type)
2. **Process:** Asset onboarding should include ML model impact assessment
3. **Monitoring:** Add alerts for significant changes in feature distributions

## Approvals

- **Reviewed By:** [ML Team Lead]
- **Approved By:** [Engineering Manager]
- **Date:** YYYY-MM-DD
```

---

## Monitoring and Prevention

### Automated Alerts

**Performance Degradation:**
- F1 score drop > 10%: WARNING
- F1 score drop > 20%: CRITICAL
- Precision drop > 15%: WARNING
- Recall drop > 15%: WARNING

**Data Quality:**
- Feature null rate > 5%: WARNING
- Feature drift detected: WARNING
- Feature store unavailable: CRITICAL

**Infrastructure:**
- Model server down: CRITICAL
- Inference latency > 2s: WARNING
- Error rate > 1%: WARNING

### Regular Audits

- **Weekly:** Review performance metrics dashboard
- **Monthly:** Conduct bias and fairness assessment
- **Quarterly:** Full model audit (documentation, compliance, performance)
- **Annually:** Comprehensive risk assessment and compliance review

### Runbook Maintenance

- **Owner:** ML Team Lead
- **Review Frequency:** Quarterly
- **Update Trigger:** After each major incident
- **Version Control:** Git repository: `/docs/runbooks/`

---

## Appendix

### Quick Reference Commands

```bash
# Check model health
curl -X GET /api/v1/ml/models/predictive_maintenance/status

# Get performance metrics
curl -X GET /api/v1/model-performance/metrics/predictive_maintenance

# Get active alerts
curl -X GET /api/v1/model-performance/alerts

# Rollback model
POST /api/v1/ml/models/predictive_maintenance/rollback

# Report incident
POST /api/v1/model-governance/{modelId}/incidents

# Check model server logs
kubectl logs -l app=model-server --tail=100

# Scale down model (emergency)
kubectl scale deployment/model-server --replicas=0

# Check feature store
feast feature-views list
```

### Runbook Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | YYYY-MM-DD | Initial version | ML Team |
