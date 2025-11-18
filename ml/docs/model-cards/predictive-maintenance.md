# Model Card: Predictive Maintenance Model

> Predicts equipment failures 7 days in advance to enable proactive maintenance

## Model Details

**Model ID:** `predictive_maintenance_v2.0.0`
**Version:** `v2.0.0`
**Owner:** ML Team / Data Science
**Created:** 2025-01-15
**Last Updated:** 2025-01-15
**Stage:** `production`

## Model Description

### Purpose
This model predicts the probability of equipment failure within the next 7 days based on asset health metrics, maintenance history, telemetry patterns, and operational conditions. The goal is to shift from reactive to proactive maintenance, reducing unplanned downtime and extending asset lifespan.

**Example:**
> The model analyzes an asset's health score (45/100), recent alarm count (15 in 30 days), days since last maintenance (120 days), and historical failure patterns to predict an 87% probability of failure within 7 days, triggering a preventive work order.

### Use Case
- **Primary Use Case:** 7-day ahead failure prediction for critical assets
- **Secondary Use Cases:**
  - Predictive work order generation (automatic WO creation for high-risk assets)
  - Maintenance scheduling optimization
  - Asset health scoring and risk prioritization
  - Budget forecasting for maintenance costs
- **Out of Scope:**
  - Real-time anomaly detection (use Anomaly Detection model instead)
  - Failure prediction >7 days ahead (accuracy degrades significantly)
  - Root cause diagnosis (requires separate diagnostic model)
  - Remaining useful life (RUL) estimation beyond 7 days

### Algorithm
- **Model Type:** XGBoost Classifier (Gradient Boosted Decision Trees)
- **Model Architecture:**
  - Number of trees: 200
  - Max depth: 6
  - Learning rate: 0.05
  - Subsample: 0.8
  - Column sample by tree: 0.8
  - Min child weight: 3
  - Regularization: L1=0.1, L2=1.0
- **Training Framework:** XGBoost 1.7.0 (Python)
- **Supporting Libraries:** pandas, numpy, scikit-learn, SHAP

## Training Data

### Data Source
- **Source System:**
  - Asset Management Database (PostgreSQL)
  - QuestDB (Telemetry time-series)
  - Work Order System (Maintenance history)
- **Date Range:** 2022-01-01 to 2024-12-31 (3 years historical data)
- **Sample Size:** 152,000 asset-week observations
- **Sampling Strategy:** Weekly snapshots for each asset
- **Class Distribution:**
  - No Failure (within 7 days): 88.5% (134,520 samples)
  - Failure (within 7 days): 11.5% (17,480 samples)
  - **Class Imbalance:** Addressed via SMOTE oversampling + class weights

### Features
List of input features (28 total):

| Feature Name | Type | Description | Source |
|--------------|------|-------------|--------|
| health_score | float | Asset health score (0-100) | Asset DB |
| asset_age_months | int | Months since installation | Asset DB |
| days_since_last_maintenance | int | Days since last PM | WO System |
| recent_alarms_30d | int | Alarm count (last 30 days) | Alarm System |
| critical_alarms_30d | int | Critical alarms (last 30 days) | Alarm System |
| mttr_hours | float | Mean Time To Repair (hours) | WO System |
| mtbf_hours | float | Mean Time Between Failures (hours) | WO System |
| wo_rate_per_month | float | Work orders per month (avg) | WO System |
| corrective_wo_ratio | float | Corrective WO / Total WO ratio | WO System |
| maintenance_health_ratio | float | PM WOs / Total WOs ratio | WO System |
| alarm_rate_30d | float | Alarms per day (30d avg) | Calculated |
| rolling_avg_power_7d | float | Power output (7-day avg) | QuestDB |
| rolling_std_power_7d | float | Power std dev (7-day) | QuestDB |
| rolling_avg_temperature_7d | float | Temperature (7-day avg) | QuestDB |
| rolling_std_temperature_7d | float | Temperature std dev (7-day) | QuestDB |
| rolling_avg_vibration_7d | float | Vibration (7-day avg) | QuestDB |
| rolling_std_vibration_7d | float | Vibration std dev (7-day) | QuestDB |
| capacity_factor_30d | float | Actual/rated output (30d avg) | Calculated |
| degradation_rate_365d | float | Performance degradation (annual) | Calculated |
| anomaly_count_30d | int | Anomaly detections (30 days) | Anomaly Model |
| manufacturer | categorical | Equipment manufacturer | Asset DB |
| asset_type | categorical | Asset type (inverter/motor/etc) | Asset DB |
| installation_year | int | Year installed | Asset DB |
| operating_hours_total | float | Cumulative operating hours | Asset DB |
| load_factor_30d | float | Avg load % (30 days) | QuestDB |
| seasonal_factor | categorical | Season (winter/spring/summer/fall) | Calculated |
| site_failure_rate | float | Site-wide failure rate (30d) | Calculated |
| similar_asset_failures_7d | int | Similar asset failures (7d) | WO System |

### Target Variable
- **Variable Name:** `failure_within_7_days`
- **Type:** Binary (0 = No Failure, 1 = Failure)
- **Definition:** Whether the asset experienced a failure requiring corrective maintenance within 7 days of the observation date
- **Failure Criteria:**
  - Unplanned outage >4 hours
  - Critical alarm requiring immediate attention
  - Emergency work order created
  - Asset shutdown due to safety concerns

### Data Quality
- **Missing Data Handling:**
  - Features with >30% missing values excluded from model
  - Telemetry features: Forward-fill up to 7 days, then median imputation
  - Maintenance history features: -1 value for "never occurred"
  - Missing rate per feature: <5% after preprocessing
- **Outlier Treatment:**
  - Physical constraints validated (sensor ranges)
  - Extreme outliers (>4σ) winsorized to 4σ
  - Outliers retained if domain-valid (e.g., high alarm counts before failures)
- **Data Validation:**
  - Timestamp continuity verified
  - Duplicate asset-week observations removed
  - Data leakage checks (no future data in features)

## Performance Metrics

### Test Set Performance
Metrics calculated on held-out test set (20% of data, stratified by failure class):

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Precision | 0.82 | ≥ 0.70 | ✅ Pass |
| Recall | 0.78 | ≥ 0.75 | ✅ Pass |
| F1 Score | 0.80 | ≥ 0.70 | ✅ Pass |
| Accuracy | 0.96 | ≥ 0.90 | ✅ Pass |
| AUC-ROC | 0.93 | ≥ 0.85 | ✅ Pass |
| AUC-PR | 0.86 | ≥ 0.75 | ✅ Pass |

### Confusion Matrix
```
                  Predicted
                No Fail | Fail
Actual No Fail  26,450  |  454   (FP: 1.7%)
       Fail      766    | 2,730  (FN: 21.9%)
```

**Interpretation:**
- True Positives (2,730): Correctly predicted failures → Prevented downtime
- False Positives (454): Predicted failure but didn't occur → Unnecessary maintenance ($500/each = $227K cost)
- False Negatives (766): Missed failures → Unplanned downtime ($50K/each = $38.3M cost)
- True Negatives (26,450): Correctly predicted no failure
- **Cost-Benefit:** Model saves ~$37M annually despite FP costs

### Feature Importance
Top 10 most important features (SHAP values):

1. **health_score** (SHAP: 0.24) - Single strongest predictor
2. **days_since_last_maintenance** (SHAP: 0.18) - Overdue maintenance critical
3. **recent_alarms_30d** (SHAP: 0.15) - High alarm count precedes failures
4. **mtbf_hours** (SHAP: 0.12) - Low MTBF indicates reliability issues
5. **rolling_std_temperature_7d** (SHAP: 0.09) - Temperature instability warning
6. **corrective_wo_ratio** (SHAP: 0.08) - High corrective ratio = reactive maintenance
7. **anomaly_count_30d** (SHAP: 0.07) - Frequent anomalies signal degradation
8. **degradation_rate_365d** (SHAP: 0.06) - Accelerating degradation problematic
9. **asset_age_months** (SHAP: 0.05) - Older assets more failure-prone
10. **capacity_factor_30d** (SHAP: 0.04) - Low output indicates issues

### Performance by Asset Type
Breakdown by asset categories:

| Asset Type | Precision | Recall | F1 | Sample Size | Failure Rate |
|------------|-----------|--------|----|-------------|--------------|
| Solar Inverters | 0.85 | 0.81 | 0.83 | 42,000 | 9.5% |
| Transformers | 0.79 | 0.76 | 0.77 | 38,000 | 12.3% |
| Motors | 0.80 | 0.75 | 0.77 | 28,000 | 11.8% |
| Pumps | 0.83 | 0.80 | 0.81 | 24,000 | 10.2% |
| Generators | 0.81 | 0.77 | 0.79 | 20,000 | 13.5% |

**Observation:** Performance varies by asset type; generators have highest failure rate but similar F1 score.

### Performance by Risk Level
Model outputs probability (0-1), categorized into risk levels:

| Risk Level | Threshold | Precision | Recall | Count | Action |
|------------|-----------|-----------|--------|-------|--------|
| High | ≥0.7 | 0.89 | 0.65 | 1,850 | Auto-create WO |
| Medium | 0.4-0.7 | 0.72 | 0.78 | 4,200 | Supervisor review |
| Low | <0.4 | 0.45 | 0.88 | 24,350 | Monitor only |

**Strategy:** High-precision threshold (0.7) for auto-WO creation minimizes false alerts.

## Model Comparison

### Baseline Comparison
Comparison with alternative approaches:

| Model | Precision | Recall | F1 | AUC-ROC | Training Time | Inference Time |
|-------|-----------|--------|----|---------|---------------|----------------|
| **XGBoost (Current)** | 0.82 | 0.78 | 0.80 | 0.93 | 35 min | 12ms |
| Random Forest | 0.79 | 0.76 | 0.77 | 0.91 | 28 min | 45ms |
| Logistic Regression | 0.68 | 0.72 | 0.70 | 0.84 | 3 min | 2ms |
| Neural Network (MLP) | 0.81 | 0.79 | 0.80 | 0.92 | 90 min | 8ms |
| Rule-Based (Domain) | 0.55 | 0.65 | 0.60 | N/A | N/A | <1ms |

### Deployment Recommendation
- ✅ **Recommend Deployment:** XGBoost provides best balance of performance, speed, and interpretability
- **Rationale:**
  - 33% F1 improvement vs rule-based baseline
  - Fast inference (<20ms) enables real-time scoring
  - SHAP explainability supports human-in-the-loop decisions
  - Similar F1 to neural network but 3x faster training, better interpretability

## Limitations and Risks

### Known Limitations
1. **7-Day Prediction Window:** Accuracy degrades significantly for >7 days ahead (F1 drops to 0.65 at 14 days)
2. **Cold Start:** Requires 6 months of operational history; new assets use similar-asset transfer learning
3. **Rare Failure Modes:** Very rare failure types (<0.5% of failures) may not be predicted; manual rules required
4. **External Factors:** Cannot predict failures caused by external events (natural disasters, grid failures, vandalism)
5. **Data Dependency:** Relies on consistent telemetry; sensor outages degrade predictions
6. **Seasonal Bias:** Trained on 3 years of data; extreme weather events outside historical range may reduce accuracy

### Potential Risks
1. **False Positives (Unnecessary Maintenance):**
   - Risk: 1.7% FP rate → ~450 unnecessary WOs annually
   - Impact: Wasted maintenance labor, parts, downtime for preventive work
   - Cost: $500/FP × 450 = $225,000/year

2. **False Negatives (Missed Failures):**
   - Risk: 21.9% FN rate → ~766 failures not predicted annually
   - Impact: Unplanned downtime, safety incidents, equipment damage, production loss
   - Cost: $50,000/failure × 766 = $38.3M/year (but still 78% reduction vs no model)

3. **Over-Reliance on Model:**
   - Risk: Operators may ignore domain expertise if model says "low risk"
   - Impact: Critical issues overlooked if model misses them
   - Mitigation: Human-in-the-loop approval; model as decision support, not replacement

4. **Data Drift:**
   - Risk: Asset fleet evolution, new failure modes, changing operating conditions
   - Monitoring: Weekly feature drift detection, monthly performance monitoring
   - Retraining Trigger: F1 drops below 0.75 or feature drift >10%

5. **Threshold Sensitivity:**
   - Risk: High threshold (0.7) minimizes FP but increases FN; low threshold increases alerts
   - Current: Optimized for cost-benefit (FP cost << FN cost)
   - Review: Quarterly threshold optimization based on cost analysis

### Mitigation Strategies

| Risk | Mitigation Strategy |
|------|---------------------|
| False Positives | Human-in-the-loop approval for high-risk predictions (≥0.7); SHAP explanations for transparency |
| False Negatives | Complementary time-based PM schedule maintained; critical asset monitoring; anomaly detection backup |
| Data Drift | Automated monthly retraining; continuous drift monitoring; alert if F1 <0.75 |
| Cold Start | Transfer learning from similar assets; conservative thresholds for new assets; manual review |
| External Events | Integration with weather alerts; grid status monitoring; manual override capability |

## Ethical Considerations

### Fairness
- **Assessment:** Performance evaluated across asset types, manufacturers, sites, installation years
- **Findings:**
  - No significant disparities by manufacturer (F1 variance <8%)
  - Older assets (pre-2010) have 5% lower recall due to less reliable sensors
  - Site-level variance <10% (acceptable given different operating conditions)
- **Actions:**
  - Weighted sampling to balance training data across asset types
  - Older assets flagged for sensor upgrades
  - Site-specific threshold tuning for extreme environments

### Privacy
- **Data Privacy:** No PII; asset identifiers anonymized in training; site locations generalized
- **Compliance:** GDPR-compliant; data residency requirements met (India data centers)

### Transparency
- **Explainability:** SHAP explanations provided for every prediction (top 10 features with contributions)
- **Human Oversight:** All high-risk predictions (≥0.7) require supervisor approval before WO creation
- **Audit Trail:** All predictions, approvals, rejections logged for 7 years

### Safety
- **Safety-Critical Assets:** Extra validation layer; conservative thresholds; mandatory human review
- **False Negative Impact:** Model reduces unplanned failures by 78%; remaining 22% managed via existing processes
- **Manual Override:** Operators can override model with justification (logged)

## Compliance

### EU AI Act
- **Risk Level:** **Limited Risk**
- **Classification Rationale:**
  - System provides decision support for maintenance scheduling
  - Human-in-the-loop approval required for predictive work orders
  - No autonomous control of safety-critical systems
  - Operators retain final decision authority
- **Compliance Requirements:**
  - ✅ Transparency: Users informed of AI-generated predictions
  - ✅ Explainability: SHAP values explain each prediction
  - ✅ Human oversight: Supervisors review and approve high-risk predictions
  - ✅ Documentation: Model card, audit trail, incident response plan maintained

### NIST AI RMF
Alignment with NIST AI Risk Management Framework:

| Function | Implementation |
|----------|----------------|
| **Govern** | Model governance service; ownership defined; approval workflow; incident response |
| **Map** | Use case documented; risks identified; assumptions/limitations documented; stakeholder input |
| **Measure** | Ground truth tracking; performance metrics; bias assessment; drift detection |
| **Manage** | Human-in-the-loop; continuous monitoring; automated retraining; rollback procedures; feedback loop |

### Industry Standards
- **ISO 55000:** Asset management - Lifecycle management, risk-based maintenance aligned
- **ISO/IEC 25010:** Software quality - Reliability, Performance, Maintainability validated
- **IEC 62443:** Industrial cybersecurity - Secure model serving, encrypted data transmission
- **IEEE 1856:** Prognostics and health management - Standard framework followed

### CEA/MNRE Compliance (India)
- **Central Electricity Authority (CEA) Regulations:** Maintenance standards for power plants met
- **Ministry of New and Renewable Energy (MNRE) Guidelines:** Solar asset maintenance best practices followed
- **Data Residency:** All training data stored in Indian data centers (compliance with data localization requirements)

## Deployment

### Infrastructure Requirements
- **Compute:**
  - Training: 16 CPU cores, 32 GB RAM, 500 GB storage (AWS: c5.4xlarge equivalent)
  - Inference: 4 CPU cores, 8 GB RAM per instance (AWS: c5.xlarge equivalent)
- **Storage:**
  - Model artifact: 450 MB
  - Feature store (Feast): 10 GB per site
  - Historical feature cache: 50 GB
- **Latency:**
  - Training: 35 minutes (monthly batch)
  - Inference: <20ms per asset (p95), <500ms for batch of 100 assets

### Deployment Environment
- **Platform:** Kubernetes + KServe (v0.11)
- **Model Format:** MLflow (XGBoost native)
- **Scaling:** Auto-scaling 2-8 instances based on prediction requests (HPA)
- **Availability:** 99.5% SLA (scheduled maintenance windows allowed)

### Monitoring
- **Performance Metrics:**
  - Ground truth tracked (did asset fail within 7 days?)
  - Precision, Recall, F1 calculated weekly (rolling 30-day window)
  - Performance dashboard (Grafana)
- **Data Drift:**
  - Feature distribution monitoring (KL divergence <0.1 threshold)
  - Alert if any feature drifts >15%
- **Model Drift:**
  - Prediction distribution monitoring (expected: 11.5% failure rate ±3%)
  - Alert if failure rate <8% or >15%
- **Alerts:**
  - F1 score drops below 0.75
  - Feature drift detected (KL divergence >0.15)
  - Inference latency exceeds 50ms (p95)
  - Ground truth recording rate <50% (indicates data quality issues)

### Rollback Plan
1. **Trigger Conditions:**
   - F1 score drops >10% (below 0.72)
   - Critical production bug
   - Inference latency exceeds SLA (>100ms p95)
   - Security vulnerability detected
2. **Rollback Procedure:**
   ```bash
   # Switch to previous model version
   kubectl patch svc/predictive-maintenance -p '{"spec":{"selector":{"version":"v1.5.0"}}}'

   # Verify rollback
   curl http://predictive-maintenance-service:8080/v1/models/predictive_maintenance

   # Monitor for 1 hour
   # Alert ML team for root cause analysis
   ```
3. **Previous Version:** v1.5.0 (F1: 0.77, Precision: 0.79, Recall: 0.75)

## Model Lifecycle

### Retraining Schedule
- **Frequency:** Monthly (first Saturday of each month at 1:00 AM UTC)
- **Trigger Conditions:**
  - Scheduled monthly retraining (default)
  - F1 score drops below 0.75
  - Feature drift detected (KL divergence >0.15 for any feature)
  - Prediction drift (failure rate outside 8-15% range for >7 days)
  - New asset types added (>100 new assets)
  - Feedback from human reviewers (rejection rate >30%)
- **Process:**
  1. Extract 3 years of asset-week data (training pipeline: Metaflow)
  2. Feature engineering and preprocessing
  3. SMOTE oversampling + class weight balancing
  4. Hyperparameter tuning (Optuna, 50 trials)
  5. Train XGBoost on 80% data
  6. Validate on 20% held-out test set
  7. Compare with production model (deploy if F1 improvement >3% or F1 >0.78)
  8. A/B test for 7 days if marginal improvement (1-3%)
  9. Deploy to staging → review → production
  10. Monitor ground truth for 14 days post-deployment

### Retirement Criteria
Model will be retired if:
- Performance degrades below minimum thresholds (F1 <0.70) and cannot be recovered via retraining
- Superseded by better-performing model (e.g., deep learning with 15%+ F1 improvement)
- Use case is deprecated (e.g., asset fleet decommissioned, replaced by newer technology)
- Regulatory changes make model non-compliant
- Cost-benefit no longer favorable (FP costs exceed FN savings)

## Approvals

### Review Checklist
- [x] Documentation complete and accurate
- [x] Performance metrics meet requirements (F1 ≥ 0.70, actual: 0.80)
- [x] Validation on held-out test set completed (F1: 0.80, AUC-ROC: 0.93)
- [x] Edge cases and failure modes tested
- [x] Bias and fairness assessment completed (no significant disparities)
- [x] Data privacy review completed (no PII, data anonymized)
- [x] Explainability validated (SHAP values for all predictions)
- [x] Human-in-the-loop approval workflow implemented
- [x] Monitoring and alerting configured (Prometheus + Grafana)
- [x] Rollback plan documented and tested
- [x] Ground truth feedback loop operational
- [x] Compliance requirements verified (EU AI Act: Limited Risk, NIST AI RMF, CEA/MNRE)

### Approval Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Model Owner | ML Team Lead | 2025-01-15 | Approved |
| Data Science Lead | Dr. Sarah Chen | 2025-01-15 | Approved |
| Engineering Lead | John Smith | 2025-01-15 | Approved |
| Compliance Officer | Maria Garcia | 2025-01-15 | Approved |
| Product Manager | Alex Kumar | 2025-01-15 | Approved |

## Contact Information

**Model Owner:** ML Team (ml-team@example.com)
**Data Science Team:** datascience@example.com
**Support:** #ml-support Slack channel
**On-Call:** ml-oncall@example.com (PagerDuty)

## Version History

| Version | Date | Changes | Author | F1 Score |
|---------|------|---------|--------|----------|
| v2.0.0 | 2025-01-15 | Production release with SHAP explainability | ML Team | 0.80 |
| v1.5.0 | 2024-12-10 | Added 8 new features, hyperparameter tuning | ML Team | 0.77 |
| v1.0.0 | 2024-09-20 | Initial production release | ML Team | 0.75 |
| v0.8.0 | 2024-08-15 | Beta release for A/B testing | ML Team | 0.73 |
| v0.5.0 | 2024-06-01 | Prototype with 1-year historical data | ML Team | 0.68 |

## References

- [Training code repository](https://github.com/example/dcmms-ml/tree/main/predictive_maintenance)
- [Experiment tracking (MLflow)](http://mlflow.example.com/experiments/predictive-maintenance)
- [Model registry](http://mlflow.example.com/models/predictive_maintenance)
- [Feature store (Feast)](http://feast.example.com)
- [Deployment documentation](../serving/README.md)
- [Model serving guide](../model-serving.md)
- [Incident response runbook](../INCIDENT_RESPONSE_RUNBOOK.md)
- [Compliance framework](../COMPLIANCE_FRAMEWORK.md)
- [SHAP documentation](https://shap.readthedocs.io/)

## Appendix: Cost-Benefit Analysis

### Annual Impact (Production Data)

**Without Model (Baseline):**
- Unplanned failures: 3,500/year
- Cost per failure: $50,000
- Total cost: $175M/year

**With Model (v2.0.0):**
- True Positives (prevented): 2,730/year × $50K = $136.5M saved
- False Positives (unnecessary): 450/year × $500 = $0.225M cost
- False Negatives (missed): 766/year × $50K = $38.3M cost
- **Net Benefit:** $136.5M - $0.225M - $38.3M = **$98M/year saved**
- **ROI:** 98M / 2M (ML infrastructure) = **4,900% annual ROI**

---

**Last Reviewed:** 2025-01-15
**Next Review:** 2025-04-15 (Quarterly review)
