# ML Model Compliance Framework

> Compliance guidelines for EU AI Act and NIST AI Risk Management Framework

## Table of Contents

1. [EU AI Act Compliance](#eu-ai-act-compliance)
2. [NIST AI RMF Alignment](#nist-ai-rmf-alignment)
3. [Compliance Checklist](#compliance-checklist)
4. [Audit Procedures](#audit-procedures)

---

## EU AI Act Compliance

### Risk Classification

The EU AI Act classifies AI systems into four risk categories:

| Risk Level | Description | Requirements | dCMMS Classification |
|------------|-------------|--------------|----------------------|
| **Unacceptable** | Systems that pose threat to safety, livelihoods, or fundamental rights | **Prohibited** | N/A |
| **High-Risk** | Systems in critical infrastructure, employment, law enforcement, etc. | Strict requirements | **Limited Risk** (see below) |
| **Limited Risk** | Systems with specific transparency obligations | Transparency requirements | ✅ **Applies** |
| **Minimal Risk** | All other AI systems | No specific requirements | Possibly |

### dCMMS Predictive Maintenance System Classification

**Classification: Limited Risk**

**Rationale:**
- **Not High-Risk** because:
  - Does not directly control critical infrastructure (human approval required)
  - Does not make autonomous decisions affecting safety (supervisors review and approve)
  - Provides decision support, not automated decision-making
  - Human-in-the-loop approval workflow prevents automated action

- **Limited Risk** because:
  - Interacts with users (maintenance supervisors)
  - Provides recommendations that influence maintenance decisions
  - Requires transparency about AI-generated predictions

### Compliance Requirements for Limited Risk AI Systems

#### 1. Transparency Obligations (Article 52)

**Requirement:** Users must be informed they are interacting with an AI system.

**Implementation:**
```typescript
// In UI/API responses
{
  "prediction": 0.85,
  "riskLevel": "high",
  "modelName": "predictive_maintenance",
  "modelVersion": "v2.0.0",
  "aiGenerated": true,  // ✅ Transparency
  "explanation": {
    "topFactors": [
      "High alarm count (15 alarms in 30 days)",
      "Low health score (45/100)",
      "Overdue maintenance (120 days)"
    ],
    "shapValues": {...},
    "humanReviewRequired": true  // ✅ Human oversight
  }
}
```

**Evidence:**
- ✅ All predictions include `aiGenerated: true` flag
- ✅ Model name and version displayed in UI
- ✅ SHAP explanations provided for each prediction
- ✅ "AI-Generated Recommendation" label in work order interface

#### 2. Explainability

**Requirement:** Provide meaningful information about how the AI system works.

**Implementation:**
- SHAP explainability service (`/api/v1/ml/explain`)
- Feature importance visualization
- Waterfall plots showing contribution of each factor
- Model card documentation

**Evidence:**
```bash
# SHAP explanation endpoint
POST /api/v1/ml/explain
{
  "modelName": "predictive_maintenance",
  "assetId": "asset_123",
  "topN": 10
}

# Response includes:
{
  "topFeatures": [
    {
      "feature": "Recent Alarms 30d",
      "value": 15,
      "shapValue": 0.23,  // Contribution to prediction
      "absShap": 0.23
    },
    ...
  ],
  "recommendation": "High alarm count detected (15). Investigate alarm causes."
}
```

#### 3. Human Oversight

**Requirement:** Ensure meaningful human oversight of AI decisions.

**Implementation:**
- Human-in-the-loop approval workflow
- Supervisors review all high-risk predictions before scheduling maintenance
- Rejection feedback loop to improve model

**Evidence:**
- ✅ Approval service: `/api/v1/work-orders/:id/approve`
- ✅ Rejection with reason: `/api/v1/work-orders/:id/reject`
- ✅ Approval statistics tracked: `/api/v1/work-orders/approval-stats`
- ✅ No work order automatically scheduled without human approval

#### 4. Documentation

**Requirement:** Maintain comprehensive technical documentation.

**Implementation:**
- Model card for each model version
- Training data documentation
- Performance metrics documentation
- Limitations and risks documented

**Evidence:**
- ✅ Model card template: `/ml/docs/MODEL_CARD_TEMPLATE.md`
- ✅ Documentation API: `/api/v1/model-governance/:modelId/documentation`
- ✅ Audit trail: `/api/v1/model-governance/:modelId/audit`

### Compliance Monitoring

**Quarterly Review:**
- [ ] Verify transparency requirements met (AI-generated flag present)
- [ ] Review explainability service uptime and usage
- [ ] Audit human approval workflow (no auto-scheduled WOs)
- [ ] Update model documentation
- [ ] Review incident reports for compliance issues

**Annual Audit:**
- [ ] Full compliance assessment by external auditor
- [ ] Review risk classification (confirm still Limited Risk)
- [ ] Update compliance documentation
- [ ] Report to regulatory authorities if required

---

## NIST AI RMF Alignment

The NIST AI Risk Management Framework consists of four functions: Govern, Map, Measure, Manage.

### 1. Govern

**Purpose:** Cultivate a culture of risk management and establish processes.

| Subcategory | Implementation | Evidence |
|-------------|----------------|----------|
| **GOVERN 1.1:** AI risks integrated into overall risk management | Model governance service tracks AI-specific risks | `/api/v1/model-governance/:modelId/incidents` |
| **GOVERN 1.2:** Roles and responsibilities defined | Model ownership documented in model card | Model card: Owner field |
| **GOVERN 1.3:** Workforce diversity and expertise | ML team + domain experts (maintenance, engineering) | Team documentation |
| **GOVERN 1.4:** Organizational AI risk culture | Incident response runbook, post-incident reviews | `/ml/docs/INCIDENT_RESPONSE_RUNBOOK.md` |
| **GOVERN 1.5:** Organizational policies and practices | Model approval workflow, documentation requirements | Approval service |
| **GOVERN 1.6:** Risk management frameworks | NIST AI RMF + EU AI Act compliance | This document |
| **GOVERN 1.7:** Accountability structures | Model owner, approvers, incident owners | Model registration |

**Key Implementation:**
```typescript
// Model registration includes governance metadata
await governanceService.registerModel(
  modelName,
  version,
  description,
  owner  // Accountability
);

// Approval workflow with defined roles
await governanceService.requestApproval(
  modelId,
  requestedBy,
  approvers  // Required approvers defined
);
```

### 2. Map

**Purpose:** Understand context, categorize risks, and assess impacts.

| Subcategory | Implementation | Evidence |
|-------------|----------------|----------|
| **MAP 1.1:** Intended use and context documented | Use case documented in model card | Model card: Purpose, Use Case |
| **MAP 1.2:** Assumptions and constraints documented | Limitations section in model card | Model card: Limitations |
| **MAP 1.3:** Data characteristics documented | Training data section in model card | Model card: Training Data |
| **MAP 2.1:** Potential impacts and harms identified | Risks section in model card | Model card: Risks, Ethical Considerations |
| **MAP 2.2:** Organizational risk tolerances defined | Performance thresholds (F1 > 0.70) | Approval checklist |
| **MAP 3.1:** AI capabilities and limitations understood | Documented in model card | Model card: Limitations, Out of Scope |
| **MAP 4.1:** Potential benefits documented | Business value in model card | Model card: Purpose |
| **MAP 5.1:** Regulatory requirements identified | EU AI Act compliance documented | This document |

**Key Implementation:**
```typescript
// Model documentation includes all MAP requirements
const documentation: ModelDocumentation = {
  modelId,
  useCase: "Predict equipment failures 7 days in advance",  // MAP 1.1
  limitations: [
    "Limited to assets with >6 months history",  // MAP 3.1
    "Does not account for external factors"
  ],
  risks: [
    "False positives: Unnecessary maintenance cost",  // MAP 2.1
    "False negatives: Missed failures, safety risk"
  ],
  trainingDataset: {
    source: "Asset DB + Telemetry",  // MAP 1.3
    dateRange: {...},
    sampleSize: 50000
  },
  performanceMetrics: {...},  // MAP 2.2
  complianceNotes: "EU AI Act - Limited Risk"  // MAP 5.1
};
```

### 3. Measure

**Purpose:** Assess, benchmark, and monitor AI risks.

| Subcategory | Implementation | Evidence |
|-------------|----------------|----------|
| **MEASURE 1.1:** Performance metrics defined | Precision, recall, F1, accuracy | Model performance service |
| **MEASURE 1.2:** Metrics for trustworthiness | Explainability, fairness, robustness | SHAP service, bias assessment |
| **MEASURE 1.3:** Metrics tracked and documented | Performance tracking service | `/api/v1/model-performance/metrics/:modelName` |
| **MEASURE 2.1:** Test sets representative | Held-out test set, validation | Model training documentation |
| **MEASURE 2.2:** Evaluation methods appropriate | Confusion matrix, ROC-AUC | Model card: Performance Metrics |
| **MEASURE 2.3:** Risk measurement practices | Ground truth tracking, incident reporting | Performance service, incident service |
| **MEASURE 3.1:** Validation methods established | Validation on held-out test set | Approval checklist |
| **MEASURE 3.2:** Mechanisms for feedback | Rejection feedback, ground truth recording | Approval service |
| **MEASURE 4.1:** Model monitoring | Performance alerts, data drift detection | Model performance cron job |

**Key Implementation:**
```typescript
// Comprehensive performance tracking
await performanceService.calculateMetrics(
  modelName,
  startDate,
  endDate
);

// Returns:
{
  precision: 0.82,  // MEASURE 1.1
  recall: 0.78,
  f1Score: 0.80,
  accuracy: 0.88,
  truePositives: 156,
  falsePositives: 34,  // MEASURE 2.2
  falseNegatives: 44,
  trueNegatives: 766
}

// Automated monitoring
await performanceService.evaluateOverduePredictions();  // MEASURE 4.1
await performanceService.checkPerformanceDegradation();  // Alerts
```

### 4. Manage

**Purpose:** Mitigate, respond to, and recover from AI risks.

| Subcategory | Implementation | Evidence |
|-------------|----------------|----------|
| **MANAGE 1.1:** Risk mitigation strategies | Human-in-the-loop, rollback plan | Approval service, deployment service |
| **MANAGE 1.2:** Risks managed throughout lifecycle | Development → Staging → Review → Production → Retired | Model governance stages |
| **MANAGE 2.1:** Incident response plan | Incident response runbook | `/ml/docs/INCIDENT_RESPONSE_RUNBOOK.md` |
| **MANAGE 2.2:** Risk escalation processes | Escalation matrix in runbook | Incident response runbook |
| **MANAGE 2.3:** Mechanisms for feedback integration | Rejection feedback loop, model retraining | Approval service, training pipeline |
| **MANAGE 3.1:** Mechanisms for reporting issues | Incident reporting service | `/api/v1/model-governance/:modelId/incidents` |
| **MANAGE 3.2:** Post-incident review | Post-incident review process | Incident response runbook |
| **MANAGE 4.1:** Risk communication | Incident notifications, stakeholder updates | Incident response runbook: Communication |
| **MANAGE 4.2:** Documentation and disclosure | Model cards, audit trails | Governance service |

**Key Implementation:**
```typescript
// Risk mitigation through approval workflow
await approvalService.approveWorkOrder(request);  // MANAGE 1.1

// Incident management
const incident = await governanceService.reportIncident(
  modelId,
  severity,
  type,
  description,
  impact,
  reportedBy
);  // MANAGE 3.1

// Rollback capability
await deploymentService.rollbackModel(
  modelName,
  targetVersion,
  rolledBackBy
);  // MANAGE 2.1

// Post-incident review
await governanceService.updateIncident(
  incidentId,
  'resolved',
  resolution,
  resolvedBy,
  actionsTaken
);  // MANAGE 3.2
```

---

## Compliance Checklist

### Pre-Deployment Checklist

Use this checklist before deploying any model to production:

#### Documentation
- [ ] Model card completed
- [ ] Use case and business value documented
- [ ] Training data characteristics documented
- [ ] Performance metrics documented
- [ ] Limitations and risks identified
- [ ] Ethical considerations addressed
- [ ] Compliance requirements verified

#### Testing & Validation
- [ ] Validation on held-out test set completed
- [ ] Performance metrics meet thresholds (F1 > 0.70)
- [ ] Edge cases tested
- [ ] Bias and fairness assessment completed
- [ ] Data privacy review completed
- [ ] Security review completed

#### Governance
- [ ] Model registered in governance system
- [ ] Owner and approvers identified
- [ ] Approval workflow initiated
- [ ] All checklist items completed with evidence
- [ ] Minimum required approvals obtained

#### Deployment Readiness
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested
- [ ] Incident response runbook updated
- [ ] Human oversight mechanisms in place
- [ ] Explainability service configured

#### Compliance
- [ ] EU AI Act classification verified
- [ ] Transparency requirements met
- [ ] NIST AI RMF alignment verified
- [ ] Regulatory requirements identified and met

### Production Monitoring Checklist

**Daily:**
- [ ] Check performance metrics dashboard
- [ ] Review active alerts
- [ ] Verify model server health

**Weekly:**
- [ ] Review prediction logs for anomalies
- [ ] Check ground truth recording rate
- [ ] Review open incidents

**Monthly:**
- [ ] Calculate and review model metrics
- [ ] Check for data drift
- [ ] Review approval statistics
- [ ] Update model documentation if needed

**Quarterly:**
- [ ] Full compliance review
- [ ] Bias and fairness assessment
- [ ] Update risk assessment
- [ ] Review incident history
- [ ] Audit documentation completeness

**Annually:**
- [ ] Comprehensive external audit
- [ ] Regulatory compliance review
- [ ] Update compliance framework
- [ ] Review and update policies

---

## Audit Procedures

### Internal Audit (Quarterly)

**Scope:** Verify compliance with EU AI Act and NIST AI RMF

**Procedure:**

1. **Documentation Review**
   - Verify model cards are up-to-date
   - Check that all active models have complete documentation
   - Review incident reports and resolutions

2. **Technical Review**
   - Verify transparency mechanisms (AI-generated flags)
   - Test explainability service
   - Verify human approval workflow
   - Check monitoring and alerting

3. **Process Review**
   - Review approval workflow adherence
   - Check incident response timeline
   - Verify rollback procedures tested
   - Review ground truth recording

4. **Compliance Review**
   - Verify EU AI Act classification still accurate
   - Check NIST AI RMF alignment
   - Review regulatory changes
   - Update compliance documentation

**Audit Report Template:**
```markdown
# ML Compliance Audit Report

**Date:** YYYY-MM-DD
**Auditor:** [Name]
**Models Reviewed:** [List]

## Summary
[Executive summary of findings]

## Compliance Status

| Requirement | Status | Evidence | Notes |
|-------------|--------|----------|-------|
| EU AI Act - Transparency | ✅ Compliant | API responses include aiGenerated flag | - |
| EU AI Act - Explainability | ✅ Compliant | SHAP service operational | - |
| EU AI Act - Human Oversight | ✅ Compliant | Approval workflow enforced | - |
| NIST - Govern | ✅ Compliant | Governance service tracks all requirements | - |
| NIST - Map | ⚠️ Needs Attention | Model card for v1.5.0 outdated | Update by YYYY-MM-DD |
| NIST - Measure | ✅ Compliant | Performance tracking operational | - |
| NIST - Manage | ✅ Compliant | Incident response tested | - |

## Findings

### Critical Issues (0)
None identified.

### High Priority (1)
1. Model card for predictive_maintenance v1.5.0 is outdated
   - **Impact:** Moderate
   - **Recommendation:** Update model card within 7 days
   - **Owner:** ML Team Lead

### Medium Priority (2)
[List of medium priority findings]

### Low Priority (3)
[List of low priority findings]

## Action Items

| Item | Priority | Owner | Due Date | Status |
|------|----------|-------|----------|--------|
| Update model card v1.5.0 | High | ML Lead | YYYY-MM-DD | Open |
| Review bias assessment | Medium | ML Eng | YYYY-MM-DD | Open |
| ... | ... | ... | ... | ... |

## Approval
**Auditor:** [Signature]
**ML Team Lead:** [Signature]
**Compliance Officer:** [Signature]
```

### External Audit (Annual)

**Scope:** Independent verification of compliance

**Procedure:**

1. **Preparation:**
   - Gather all model documentation
   - Prepare audit trail exports
   - Compile incident reports
   - Prepare performance metrics reports

2. **Auditor Review:**
   - Provide access to governance API
   - Demonstrate explainability service
   - Show human approval workflow
   - Present monitoring dashboards

3. **Remediation:**
   - Address findings within agreed timeframe
   - Update documentation as needed
   - Implement process improvements

4. **Certification:**
   - Obtain compliance certification if applicable
   - Update stakeholders
   - Archive audit report

---

## Regulatory Updates

**Process for Monitoring Regulatory Changes:**

1. **Monthly Review:**
   - Check EU AI Act updates
   - Review NIST AI RMF revisions
   - Monitor industry standards

2. **Impact Assessment:**
   - Evaluate impact on dCMMS system
   - Update risk classification if needed
   - Identify new requirements

3. **Implementation:**
   - Update compliance framework
   - Modify systems as needed
   - Update documentation

4. **Notification:**
   - Inform stakeholders of changes
   - Update training materials
   - Communicate to external auditors

---

## Contact Information

**Compliance Officer:** [Name, Email]
**ML Team Lead:** [Name, Email]
**Legal Counsel:** [Name, Email]

**External Resources:**
- EU AI Act Official Text: [URL]
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework
- Industry Guidelines: [URLs]

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | YYYY-MM-DD | Initial compliance framework | ML Team |

---

**Document Review Schedule:** Quarterly
**Next Review Date:** YYYY-MM-DD
**Owner:** Compliance Officer + ML Team Lead
