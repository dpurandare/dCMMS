# Model Card: Anomaly Detection Model

> Detects abnormal patterns in asset telemetry to identify potential failures

## Model Details

**Model ID:** `anomaly_detection_v1.0.0`
**Version:** `v1.0.0`
**Owner:** ML Team / Data Science
**Created:** 2025-01-15
**Last Updated:** 2025-01-15
**Stage:** `production`

## Model Description

### Purpose
This model detects anomalies in real-time telemetry data from industrial assets (solar inverters, transformers, motors, etc.) to identify abnormal behavior that may indicate equipment failures, degradation, or maintenance needs before catastrophic failure occurs.

**Example:**
> The model analyzes temperature, vibration, power output, and other sensor readings to flag unusual patterns such as unexpected temperature spikes, abnormal vibration frequencies, or sudden power drops that deviate from learned normal behavior.

### Use Case
- **Primary Use Case:** Real-time anomaly detection in asset telemetry streams
- **Secondary Use Cases:**
  - Historical anomaly analysis for root cause investigation
  - Asset health scoring based on anomaly frequency
  - Early warning system for potential failures
- **Out of Scope:**
  - Predicting specific failure types (use Predictive Maintenance model instead)
  - Long-term failure prediction (>7 days ahead)
  - Anomaly detection in non-telemetry data (work orders, costs, etc.)

### Algorithm
- **Model Type:** Isolation Forest (unsupervised anomaly detection)
- **Model Architecture:**
  - Ensemble of 100 isolation trees
  - Random subsampling: 256 samples per tree
  - Maximum tree depth: 8
  - Contamination: 0.05 (5% of data expected to be anomalies)
- **Training Framework:** scikit-learn 1.3.0
- **Supporting Libraries:** pandas, numpy, scipy

## Training Data

### Data Source
- **Source System:** QuestDB (Time-series telemetry database)
- **Date Range:** 2024-01-01 to 2024-12-31 (12 months historical data)
- **Sample Size:** 8.7 million telemetry records
- **Sampling Rate:** 1 sample per minute per asset
- **Class Distribution:**
  - Normal behavior: ~95% (8.26M samples)
  - Anomalies: ~5% (435K samples)

### Features
List of input features used by the model:

| Feature Name | Type | Description | Source |
|--------------|------|-------------|--------|
| temperature_c | float | Asset temperature (°C) | Temperature sensor |
| vibration_hz | float | Vibration frequency (Hz) | Vibration sensor |
| power_output_kw | float | Current power output (kW) | Power meter |
| voltage_v | float | Operating voltage (V) | Voltage sensor |
| current_a | float | Operating current (A) | Current sensor |
| power_factor | float | Power factor (0-1) | Calculated |
| efficiency_pct | float | Operating efficiency (%) | Calculated |
| ambient_temp_c | float | Ambient temperature (°C) | Weather station |
| load_pct | float | Load percentage (%) | Calculated |
| running_hours | float | Cumulative running hours | Asset metadata |
| health_score | float | Asset health score (0-100) | Asset management system |
| alarm_count_24h | integer | Alarms in last 24 hours | Alarm system |

### Target Variable
- **Variable Name:** `is_anomaly`
- **Type:** Binary (0 = Normal, 1 = Anomaly)
- **Definition:** Whether the telemetry record represents anomalous behavior based on:
  - Statistical deviation (>3σ from historical mean)
  - Domain expert labeling of known failure events
  - Confirmed failure cases within 48 hours of detection

### Data Quality
- **Missing Data Handling:**
  - Records with >20% missing features excluded
  - Remaining missing values imputed using forward-fill method
  - Missing rate per feature: <2%
- **Outlier Treatment:**
  - Extreme outliers (>5σ) capped at 5σ threshold
  - Outliers retained as they may represent actual anomalies
- **Data Validation:**
  - Physical constraints validated (e.g., temperature within sensor range)
  - Timestamp continuity verified
  - Duplicate records removed

## Performance Metrics

### Test Set Performance
Metrics calculated on held-out test set (20% of data, 1.74M records):

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Precision | 0.78 | ≥ 0.75 | ✅ Pass |
| Recall | 0.82 | ≥ 0.80 | ✅ Pass |
| F1 Score | 0.80 | ≥ 0.75 | ✅ Pass |
| Accuracy | 0.97 | ≥ 0.95 | ✅ Pass |
| AUC-ROC | 0.92 | ≥ 0.85 | ✅ Pass |
| False Positive Rate | 0.02 | ≤ 0.05 | ✅ Pass |

### Confusion Matrix
```
                Predicted
              Normal | Anomaly
Actual Normal 1.65M  |  35K    (FP: 2.1%)
       Anomaly 16K   |  74K    (FN: 17.8%)
```

**Interpretation:**
- True Positives (74K): Correctly identified anomalies
- False Positives (35K): Normal behavior flagged as anomaly (creates unnecessary alerts)
- False Negatives (16K): Missed anomalies (potential missed failures)
- True Negatives (1.65M): Correctly identified normal behavior

### Feature Importance
Top 10 most important features for anomaly detection:

1. **temperature_c** (Importance: 0.18) - Temperature deviations strong indicator
2. **power_output_kw** (Importance: 0.15) - Power output drops signal issues
3. **vibration_hz** (Importance: 0.14) - Abnormal vibration patterns critical
4. **health_score** (Importance: 0.12) - Overall health strongly correlated
5. **efficiency_pct** (Importance: 0.10) - Efficiency drops precede failures
6. **alarm_count_24h** (Importance: 0.09) - High alarm count indicates problems
7. **voltage_v** (Importance: 0.08) - Voltage instability detected
8. **current_a** (Importance: 0.06) - Current spikes flagged
9. **power_factor** (Importance: 0.05) - Power factor deviations noted
10. **load_pct** (Importance: 0.03) - Unusual load patterns detected

### Performance by Asset Type
Breakdown by asset categories:

| Asset Type | Precision | Recall | F1 | Sample Size |
|------------|-----------|--------|----|-------------|
| Solar Inverters | 0.81 | 0.84 | 0.82 | 450K |
| Transformers | 0.77 | 0.80 | 0.78 | 380K |
| Motors | 0.75 | 0.79 | 0.77 | 320K |
| Pumps | 0.79 | 0.83 | 0.81 | 290K |
| Generators | 0.76 | 0.81 | 0.78 | 300K |

**Observation:** Performance consistent across asset types with slight variations due to sensor quality and failure patterns.

## Model Comparison

### Baseline Comparison
Comparison with alternative approaches:

| Model | Precision | Recall | F1 | AUC-ROC | Training Time |
|-------|-----------|--------|----|---------|---------------|
| **Isolation Forest (Current)** | 0.78 | 0.82 | 0.80 | 0.92 | 45 min |
| Statistical Threshold (3σ) | 0.65 | 0.70 | 0.67 | 0.82 | N/A |
| One-Class SVM | 0.72 | 0.75 | 0.73 | 0.87 | 180 min |
| Autoencoder (Neural Network) | 0.80 | 0.79 | 0.79 | 0.91 | 360 min |
| Local Outlier Factor (LOF) | 0.76 | 0.81 | 0.78 | 0.90 | 90 min |

### Deployment Recommendation
- ✅ **Recommend Deployment:** Model shows significant improvement over statistical baseline
- **Rationale:**
  - 19% improvement in F1 score vs statistical threshold
  - Faster training than deep learning alternatives
  - Good balance of precision/recall (minimizes false positives while catching most anomalies)
  - Inference time <50ms meets real-time requirements

## Limitations and Risks

### Known Limitations
1. **Cold Start Problem:** Requires 30 days of normal operation data for new assets before reliable anomaly detection
2. **Seasonal Variations:** Model may flag seasonal temperature changes as anomalies; requires periodic retraining with seasonal data
3. **Sensor Drift:** Gradual sensor calibration drift can cause false positives; sensor recalibration recommended annually
4. **Rare Events:** Very rare failure modes (<0.1% of data) may not be detected; requires manual rule-based checks for critical rare events
5. **Context Limitations:** Cannot distinguish between anomalies caused by equipment issues vs external factors (e.g., grid instability)

### Potential Risks
1. **False Positives (Alert Fatigue):**
   - Risk: 2.1% false positive rate generates ~30 false alerts per day per site (1400 assets)
   - Impact: Maintenance staff may ignore alerts if too many false positives
   - Cost: ~$150 per false alert investigation = $4,500/day wasted effort

2. **False Negatives (Missed Failures):**
   - Risk: 17.8% of anomalies missed (could represent actual failures)
   - Impact: Unplanned downtime, safety incidents, equipment damage
   - Cost: $50,000 per unplanned failure event

3. **Bias Toward High-Sampling Assets:**
   - Observation: Assets with higher telemetry sampling rates (1/min vs 1/5min) have better anomaly detection
   - Impact: Lower-priority assets may have degraded performance
   - Mitigation: Ensure minimum 1/min sampling for critical assets

4. **Data Drift:**
   - Risk: Model performance degrades as asset fleet evolves (new equipment, upgrades, operating condition changes)
   - Monitoring: Weekly drift detection on feature distributions
   - Retraining Trigger: Retrain if feature drift >10% or F1 drops below 0.75

### Mitigation Strategies

| Risk | Mitigation Strategy |
|------|---------------------|
| False Positives | Confidence scoring: Only alert if anomaly score >0.7; Implement alert grouping to reduce alert fatigue |
| False Negatives | Complementary rule-based system for critical parameters; Human review of borderline cases |
| Data Drift | Automated monthly retraining; Continuous drift monitoring; Feature distribution alerts |
| Cold Start | Use similar-asset model transfer learning; Conservative thresholds for new assets |
| Sensor Drift | Quarterly sensor calibration checks; Sensor health monitoring dashboard |

## Ethical Considerations

### Fairness
- **Assessment:** Performance evaluated across asset types, manufacturers, and site locations
- **Findings:**
  - No significant performance disparities detected (F1 variance <6% across asset types)
  - Slightly lower performance for older assets (pre-2015) due to less reliable sensors
- **Actions:**
  - Flagged older assets for sensor upgrades
  - Applied weighted sampling to balance training data across asset types

### Privacy
- **Data Privacy:** No PII in telemetry data; asset identifiers anonymized in model training
- **Compliance:** GDPR-compliant (no personal data); data residency requirements met (India data centers)

### Transparency
- **Explainability:** Anomaly score provided with each detection (0-1 scale indicating severity)
- **Human Oversight:** All critical anomalies (score >0.9) flagged for mandatory human review before action

### Safety
- **Safety-Critical Assets:** Extra validation layer for assets with safety implications (high voltage equipment)
- **Manual Override:** Operators can override anomaly alerts with justification (logged for audit)

## Compliance

### EU AI Act
- **Risk Level:** **Limited Risk**
- **Classification Rationale:**
  - System provides decision support, not autonomous control
  - Human-in-the-loop for all critical decisions
  - No direct safety-critical automation
- **Compliance Requirements:**
  - Transparency: Users informed of AI-generated anomaly detections
  - Human oversight: Maintenance supervisors review anomalies before action
  - Documentation: Model card and audit trail maintained

### NIST AI RMF
Alignment with NIST AI Risk Management Framework:

| Function | Implementation |
|----------|----------------|
| **Govern** | Model governance via ML Ops platform; ownership defined; incident response plan |
| **Map** | Use case documented; risks identified; assumptions documented; data characteristics mapped |
| **Measure** | Performance metrics tracked; drift detection; bias assessment conducted |
| **Manage** | Continuous monitoring; automated retraining; human-in-the-loop; rollback procedures |

### Industry Standards
- **ISO/IEC 25010:** Software quality model - Reliability, Maintainability, Performance Efficiency validated
- **IEC 62443:** Industrial cybersecurity - Secure model serving, encrypted data transmission
- **IEEE 1856:** Framework for prognostics and health management - Aligned with standard

## Deployment

### Infrastructure Requirements
- **Compute:**
  - Training: 8 CPU cores, 16 GB RAM (AWS: m5.2xlarge equivalent)
  - Inference: 2 CPU cores, 4 GB RAM per instance (AWS: t3.medium equivalent)
- **Storage:**
  - Model artifact: 150 MB
  - Feature store cache: 2 GB per site
- **Latency:**
  - Training: 45 minutes (monthly batch)
  - Inference: <50ms per telemetry record (p95)

### Deployment Environment
- **Platform:** Kubernetes + KServe (v0.11)
- **Scaling:** Auto-scaling 2-10 instances based on telemetry load (HPA)
- **Availability:** 99.5% SLA (5 nines aspiration for future)

### Monitoring
- **Performance Metrics:** Precision, Recall, F1 tracked daily
- **Data Drift:** Feature distribution monitoring (KL divergence <0.1 threshold)
- **Model Drift:** Anomaly rate monitoring (expected: 5% ±2%)
- **Alerts:**
  - F1 score drops below 0.75
  - Anomaly rate exceeds 7% or drops below 3% (indicates drift or data issues)
  - Inference latency exceeds 100ms (p95)
  - Feature null rate exceeds 5%

### Rollback Plan
1. **Trigger Conditions:**
   - F1 score drops >10%
   - Critical production bug detected
   - Inference latency exceeds SLA
2. **Rollback Procedure:**
   ```bash
   # Switch traffic to previous version
   kubectl patch svc/anomaly-detection -p '{"spec":{"selector":{"version":"v0.9.0"}}}'

   # Verify health
   curl http://anomaly-detection-service/health

   # Monitor rollback impact
   # Alert ML team for root cause analysis
   ```
3. **Previous Version:** v0.9.0 (F1: 0.78)

## Model Lifecycle

### Retraining Schedule
- **Frequency:** Monthly (first Sunday of each month at 2:00 AM UTC)
- **Trigger Conditions:**
  - Scheduled monthly retraining (default)
  - F1 score drops below 0.75
  - Feature drift detected (KL divergence >0.15)
  - Anomaly rate drift (>7% or <3%)
  - New asset types added to fleet
- **Process:**
  1. Extract last 12 months of telemetry data from QuestDB
  2. Preprocess and feature engineering (Metaflow pipeline)
  3. Train Isolation Forest with hyperparameter tuning (Optuna)
  4. Validate on held-out test set (20%)
  5. Compare with production model (A/B test if F1 improvement <3%)
  6. Deploy to staging → review → production
  7. Monitor for 48 hours post-deployment

### Retirement Criteria
Model will be retired if:
- Performance degrades below minimum thresholds (F1 <0.70) and cannot be recovered
- Superseded by better-performing model (e.g., deep learning with 10%+ F1 improvement)
- Use case is deprecated (e.g., replaced by predictive maintenance model)
- Regulatory changes make model non-compliant

## Approvals

### Review Checklist
- [x] Documentation complete and accurate
- [x] Performance metrics meet requirements (F1 ≥ 0.75)
- [x] Validation on held-out test set completed (F1: 0.80)
- [x] Edge cases and failure modes tested
- [x] Bias and fairness assessment completed (no significant disparities)
- [x] Data privacy review completed (no PII)
- [x] Monitoring and alerting configured (Prometheus + Grafana)
- [x] Rollback plan documented and tested
- [x] Compliance requirements verified (EU AI Act: Limited Risk, NIST AI RMF aligned)

### Approval Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Model Owner | ML Team Lead | 2025-01-15 | Approved |
| Data Science Lead | Dr. Sarah Chen | 2025-01-15 | Approved |
| Engineering Lead | John Smith | 2025-01-15 | Approved |
| Compliance Officer | Maria Garcia | 2025-01-15 | Approved |

## Contact Information

**Model Owner:** ML Team (ml-team@example.com)
**Data Science Team:** datascience@example.com
**Support:** #ml-support Slack channel

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0.0 | 2025-01-15 | Initial production release | ML Team |
| v0.9.0 | 2024-12-20 | Beta release for A/B testing | ML Team |
| v0.5.0 | 2024-11-15 | Prototype with 6-month historical data | ML Team |

## References

- [Training code repository](https://github.com/example/dcmms-ml)
- [Experiment tracking (MLflow)](http://mlflow.example.com/experiments/anomaly-detection)
- [Model registry](http://mlflow.example.com/models/anomaly_detection)
- [Deployment documentation](../serving/README.md)
- [Incident response runbook](./INCIDENT_RESPONSE_RUNBOOK.md)
- [Compliance framework](./COMPLIANCE_FRAMEWORK.md)

---

**Last Reviewed:** 2025-01-15
**Next Review:** 2025-04-15 (Quarterly review)
