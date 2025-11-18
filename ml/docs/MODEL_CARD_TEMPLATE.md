# Model Card: [Model Name]

> Template for documenting ML models in the dCMMS platform

## Model Details

**Model ID:** `[model_name]_[version]`
**Version:** `[e.g., v2.0.0]`
**Owner:** `[Team/Individual responsible]`
**Created:** `[YYYY-MM-DD]`
**Last Updated:** `[YYYY-MM-DD]`
**Stage:** `[development | staging | review | production | retired]`

## Model Description

### Purpose
Describe the business problem this model solves and its intended use case.

**Example:**
> This model predicts equipment failures 7 days in advance for critical manufacturing assets, enabling proactive maintenance scheduling and reducing unplanned downtime.

### Use Case
- **Primary Use Case:** [e.g., Predictive maintenance for critical assets]
- **Secondary Use Cases:** [if applicable]
- **Out of Scope:** [What the model should NOT be used for]

### Algorithm
- **Model Type:** [e.g., XGBoost, Random Forest, Neural Network]
- **Model Architecture:** [Brief description]
- **Training Framework:** [e.g., scikit-learn, XGBoost, TensorFlow]

## Training Data

### Data Source
- **Source System:** [e.g., Asset Management Database, Telemetry System]
- **Date Range:** [Start Date] to [End Date]
- **Sample Size:** [Number of samples]
- **Class Distribution:**
  - Failure: [N samples, X%]
  - No Failure: [N samples, X%]

### Features
List all input features used by the model:

| Feature Name | Type | Description | Source |
|--------------|------|-------------|--------|
| health_score | float | Asset health score (0-100) | Asset DB |
| asset_age_months | int | Age since installation | Asset DB |
| days_since_last_maintenance | int | Days since last PM | WO System |
| recent_alarms_30d | int | Alarm count in last 30 days | Alarm System |
| ... | ... | ... | ... |

### Target Variable
- **Variable Name:** `failure_within_7_days`
- **Type:** Binary (0 = No Failure, 1 = Failure)
- **Definition:** Whether the asset experienced a failure requiring corrective maintenance within 7 days of the prediction date

### Data Quality
- **Missing Data Handling:** [How missing values are handled]
- **Outlier Treatment:** [How outliers are handled]
- **Data Validation:** [Validation rules applied]

## Performance Metrics

### Test Set Performance
Metrics calculated on held-out test set (20% of data):

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Precision | 0.XX | ≥ 0.70 | ✅ / ❌ |
| Recall | 0.XX | ≥ 0.75 | ✅ / ❌ |
| F1 Score | 0.XX | ≥ 0.70 | ✅ / ❌ |
| Accuracy | 0.XX | ≥ 0.85 | ✅ / ❌ |
| AUC-ROC | 0.XX | ≥ 0.80 | ✅ / ❌ |

### Confusion Matrix
```
                Predicted
              No Fail | Fail
Actual No Fail   TN   |  FP
       Fail      FN   |  TP
```

### Feature Importance
Top 10 most important features:

1. [Feature Name] (Importance: 0.XX)
2. [Feature Name] (Importance: 0.XX)
3. ...

### Performance by Asset Type
If applicable, breakdown performance by asset categories:

| Asset Type | Precision | Recall | F1 | Sample Size |
|------------|-----------|--------|----|-------------|
| Pumps | 0.XX | 0.XX | 0.XX | N |
| Motors | 0.XX | 0.XX | 0.XX | N |
| ... | ... | ... | ... | ... |

## Model Comparison

### Baseline Comparison
How does this model compare to previous versions or baseline approaches?

| Model | Precision | Recall | F1 | Improvement |
|-------|-----------|--------|----|-------------|
| Current (v2.0.0) | 0.XX | 0.XX | 0.XX | - |
| Previous (v1.5.0) | 0.XX | 0.XX | 0.XX | +X.X% |
| Rule-Based Baseline | 0.XX | 0.XX | 0.XX | +X.X% |

### Deployment Recommendation
- ✅ **Recommend Deployment:** Model shows significant improvement over baseline
- ❌ **Do Not Deploy:** Performance degradation detected
- ⚠️ **Deploy with Caution:** [Specific concerns]

## Limitations and Risks

### Known Limitations
1. **Data Limitation:** [e.g., Limited to assets with >6 months of operational history]
2. **Temporal Limitation:** [e.g., Performance may degrade for assets with irregular maintenance patterns]
3. **Feature Limitation:** [e.g., Does not account for external factors like weather]
4. ...

### Potential Risks
1. **False Positives:** Model may generate unnecessary maintenance work orders (Cost: $XXX per false alarm)
2. **False Negatives:** Model may miss critical failures (Risk: Unplanned downtime, safety incidents)
3. **Bias:** [Any identified biases in predictions across asset types, locations, etc.]
4. **Data Drift:** Performance may degrade if asset population or operating conditions change significantly

### Mitigation Strategies
For each risk, document mitigation approach:

| Risk | Mitigation Strategy |
|------|---------------------|
| False Positives | Human-in-the-loop approval workflow; supervisors review predictions before scheduling |
| False Negatives | Maintain existing time-based PM schedule as backup; continuous monitoring |
| Data Drift | Daily monitoring of prediction distribution; monthly model retraining |
| ... | ... |

## Ethical Considerations

### Fairness
- **Assessment:** [How fairness was evaluated]
- **Findings:** [Any disparities in performance across groups]
- **Actions:** [Steps taken to address fairness concerns]

### Privacy
- **Data Privacy:** [How PII is handled]
- **Compliance:** [GDPR, CCPA, etc.]

### Transparency
- **Explainability:** SHAP values provided for each prediction
- **Human Oversight:** All high-risk predictions require supervisor approval

## Compliance

### EU AI Act
- **Risk Level:** [Minimal | Limited | High | Unacceptable]
- **Classification Rationale:** [Why this classification?]
- **Compliance Requirements:** [List of applicable requirements]

### NIST AI RMF
Alignment with NIST AI Risk Management Framework:

| Function | Implementation |
|----------|----------------|
| Govern | Model governance service tracks approvals, documentation, incidents |
| Map | Use case and risk assessment documented |
| Measure | Performance metrics tracked; bias assessment conducted |
| Manage | Human-in-the-loop; monitoring and alerting; incident response plan |

### Industry Standards
- **ISO/IEC 25010:** Software quality model alignment
- **IEC 62443:** Industrial cybersecurity (if applicable)
- **Other:** [Industry-specific standards]

## Deployment

### Infrastructure Requirements
- **Compute:** [CPU/GPU requirements]
- **Memory:** [RAM requirements]
- **Storage:** [Disk space requirements]
- **Latency:** [Expected inference latency]

### Deployment Environment
- **Platform:** [e.g., Kubernetes, KServe]
- **Scaling:** [Auto-scaling configuration]
- **Availability:** [SLA requirements]

### Monitoring
- **Performance Metrics:** Precision, Recall, F1 tracked daily
- **Data Drift:** Feature distribution monitoring
- **Model Drift:** Prediction distribution monitoring
- **Alerts:**
  - F1 score drop > 10%
  - Precision drop > 15%
  - Recall drop > 15%

### Rollback Plan
1. **Trigger Conditions:** [When to rollback]
2. **Rollback Procedure:** [Step-by-step process]
3. **Previous Version:** [Which version to rollback to]

## Model Lifecycle

### Retraining Schedule
- **Frequency:** [e.g., Monthly]
- **Trigger Conditions:** [e.g., F1 drop > 10%, data drift detected]
- **Process:** [Brief description of retraining workflow]

### Retirement Criteria
Model will be retired if:
- Performance degrades below minimum thresholds
- Superseded by better-performing model
- Use case is deprecated
- Regulatory changes make model non-compliant

## Approvals

### Review Checklist
- [ ] Documentation complete and accurate
- [ ] Performance metrics meet requirements
- [ ] Validation on held-out test set completed
- [ ] Edge cases and failure modes tested
- [ ] Bias and fairness assessment completed
- [ ] Data privacy review completed
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented
- [ ] Compliance requirements verified

### Approval Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Model Owner | [Name] | [Date] | [Approved/Rejected] |
| Data Science Lead | [Name] | [Date] | [Approved/Rejected] |
| Engineering Lead | [Name] | [Date] | [Approved/Rejected] |
| Compliance Officer | [Name] | [Date] | [Approved/Rejected] |

## Contact Information

**Model Owner:** [Name, Email]
**Data Science Team:** [Email]
**Support:** [Email/Slack Channel]

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v2.0.0 | YYYY-MM-DD | [Summary of changes] | [Author] |
| v1.5.0 | YYYY-MM-DD | [Summary of changes] | [Author] |
| v1.0.0 | YYYY-MM-DD | Initial release | [Author] |

## References

- [Link to training code repository]
- [Link to experiment tracking (MLflow)]
- [Link to model registry]
- [Link to deployment documentation]
- [Link to incident response runbook]
