# Predictive Maintenance E2E Tests

End-to-end tests for the complete predictive maintenance workflow in dCMMS.

## Overview

These tests verify the entire predictive maintenance pipeline from prediction generation to ground truth feedback and performance tracking.

## Test Coverage

### 1. Main E2E Workflow
Tests the complete flow:
```
ML Prediction → WO Creation → Human Approval → Execution → Ground Truth → Performance Tracking
```

**Test Steps:**
1. Generate predictions for test assets
2. Run predictive maintenance job to create work orders
3. Get approval status for created work orders
4. Approve work order (supervisor approval)
5. Complete work order and record ground truth
6. Verify ground truth was recorded
7. Calculate model performance metrics

**Expected Outcomes:**
- Predictions generated with risk levels
- Work orders created for high-risk assets
- Human approval required before scheduling
- Ground truth recorded for model improvement
- Performance metrics calculated (Precision, Recall, F1)

### 2. Rejection Workflow
Tests the rejection and feedback loop:
```
WO Created → Supervisor Rejects → Feedback Stored → ML Team Review
```

**Test Cases:**
- Reject work order with reason (false_alarm, duplicate, low_priority, etc.)
- Store rejection feedback for ML team review
- Prevent duplicate rejection
- Track rejection statistics

**Expected Outcomes:**
- Work order status updated to 'rejected'
- Rejection feedback stored with reason and comments
- Duplicate rejection prevented
- Rejection reasons tracked in approval statistics

### 3. Batch Approval Workflow
Tests batch operations for efficiency:

**Test Cases:**
- Batch approve multiple work orders (up to 50)
- Enforce batch approval limit (max 50)
- Track success/failure for each WO in batch

**Expected Outcomes:**
- Multiple WOs approved in single operation
- Batch limit enforced (400 error for > 50 WOs)
- Clear reporting of approved vs failed WOs

### 4. Deduplication Tests
Tests prevention of duplicate work orders:

**Test Cases:**
- Create first work order for asset
- Attempt to create duplicate WO within 7-day window
- Verify deduplication prevents duplicate creation
- Test deduplication cache cleanup

**Expected Outcomes:**
- First WO created successfully
- Duplicate WO skipped (deduplication counter increments)
- Deduplication cache can be manually cleaned up

### 5. Approval Statistics
Tests tracking and reporting:

**Test Cases:**
- Get overall approval statistics
- Filter statistics by date range
- Track rejection reasons breakdown

**Expected Outcomes:**
- Approval rate calculated correctly
- Statistics filterable by date range
- Rejection reasons aggregated

### 6. Performance Tracking Integration
Tests model performance monitoring:

**Test Cases:**
- Record prediction when inference is made
- Evaluate overdue predictions (7-day window)
- Get accuracy breakdown by risk level (high/medium/low)

**Expected Outcomes:**
- Predictions automatically recorded for tracking
- Overdue predictions evaluated (assume no failure if no ground truth)
- Accuracy metrics available by risk level

### 7. Model Explainability Integration
Tests SHAP explanations:

**Test Cases:**
- Get SHAP explanation for single prediction
- Get feature importance across multiple assets

**Expected Outcomes:**
- SHAP values calculated for top features
- Recommendations provided based on feature contributions
- Feature importance aggregated across assets

### 8. Alert System
Tests performance degradation alerts:

**Test Cases:**
- Get active performance alerts
- Acknowledge alerts

**Expected Outcomes:**
- Performance alerts triggered when F1 drops > 10%
- Alerts can be acknowledged by users
- Alert history maintained

## Running the Tests

### Prerequisites

1. **Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Test Environment:**
   ```bash
   # Set test environment variables
   export NODE_ENV=test
   export MODEL_SERVER_HOST=localhost
   export MODEL_SERVER_PORT=8080
   export SHAP_EXPLAINER_HOST=localhost
   export SHAP_EXPLAINER_PORT=8081
   ```

3. **Start Required Services:**
   ```bash
   # Terminal 1: Start model server
   cd ml/serving
   python model_server.py \
     --model-uri models:/predictive_maintenance/production \
     --port 8080

   # Terminal 2: Start SHAP explainer
   python shap_explainer_service.py \
     --model-uri models:/predictive_maintenance/production \
     --port 8081

   # Terminal 3: Start Feast (optional, will use fallback if not available)
   feast serve
   ```

### Run All E2E Tests

```bash
cd backend
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Run only predictive maintenance tests
npm run test:e2e -- --grep "Predictive Maintenance"

# Run only approval workflow tests
npm run test:e2e -- --grep "Approval Workflow"

# Run only deduplication tests
npm run test:e2e -- --grep "Deduplication"
```

### Run with Coverage

```bash
npm run test:e2e:coverage
```

## Test Output

### Successful Run Example

```
  Predictive Maintenance E2E Tests
    E2E Flow: Prediction → WO Creation → Approval → Execution → Feedback
      ✓ Step 1: Generate predictions for assets
      ✓ Prediction generated: test_asset_e2e_001 - Risk: high (87.5%)
      ✓ Step 2: Run predictive maintenance job to create work orders
      ✓ Predictive WO job completed: 3 WOs created from 5 predictions
        - Critical risk: 1, High risk: 2
      ✓ Step 3: Get approval status for created work order
      ✓ Work order created: wo_test_asset_e2e_001_1234567890 (Status: pending)
      ✓ Step 4a: Approve work order (success path)
      ✓ Work order approved by supervisor_001
      ✓ Step 5: Complete work order and record ground truth (failure occurred)
      ✓ Work order completed: Failure confirmed (mechanical_failure)
      ✓ Step 6: Verify ground truth was recorded
      ✓ Ground truth recorded: 15/20 predictions evaluated
      ✓ Step 7: Calculate model performance metrics
      ✓ Model metrics calculated:
        - Precision: 0.820
        - Recall: 0.780
        - F1 Score: 0.800

    Rejection Workflow
      ✓ Should create a work order for rejection test
      ✓ Created WO for rejection test: wo_rejection_1234567890
      ✓ Should reject work order with feedback
      ✓ Work order rejected: false_alarm
      ✓ Should store rejection feedback for ML team
      ✓ Rejection feedback stored: 5 total feedback items
      ✓ Should not allow duplicate rejection
      ✓ Duplicate rejection prevented

    Batch Approval Workflow
      ✓ Should batch approve multiple work orders
      ✓ Batch approval: 3 approved, 0 failed
      ✓ Should not allow batch approval > 50 work orders
      ✓ Batch approval limit enforced (max 50)

    Deduplication Tests
      ✓ Should create first work order for asset
      ✓ First WO created for asset_dedupe_test
      ✓ Should skip duplicate work order within 7-day window
      ✓ Deduplication working: 2 WOs skipped
      ✓ Should cleanup deduplication cache
      ✓ Deduplication cache cleaned up

    Approval Statistics
      ✓ Should get approval statistics
      ✓ Approval statistics:
        - Total WOs: 10
        - Approved: 7
        - Rejected: 3
        - Approval rate: 70.0%
        - Rejection reasons: { false_alarm: 2, low_priority: 1 }
      ✓ Should filter approval stats by date range
      ✓ Last 7 days stats: 8 WOs

    Performance Tracking Integration
      ✓ Should record prediction when inference is made
      ✓ Prediction recorded: 23 total predictions
      ✓ Should evaluate overdue predictions
      ✓ Overdue evaluation: 5 predictions evaluated
      ✓ Should get accuracy breakdown by risk level
      ✓ Accuracy by risk level:
        - High risk: 0.85
        - Medium risk: 0.72
        - Low risk: 0.91

    Model Explainability Integration
      ✓ Should get SHAP explanation for prediction
      ✓ SHAP explanation generated
        - Top features: 5
        - Recommendation: High alarm count detected (15). Investigate alarm causes.
      ✓ Should get feature importance across multiple assets
      ✓ Feature importance: 10 features

    Alert System
      ✓ Should get active performance alerts
      ✓ No active performance alerts
      ✓ Should acknowledge an alert
      ⚠ No alerts to acknowledge

    End-to-End Integration Summary
      ✓ Should verify complete workflow is functional

      === PREDICTIVE MAINTENANCE E2E WORKFLOW ===

      1. ✓ ML Inference: Predictions generated
      2. ✓ Work Order Creation: Predictive WOs created
      3. ✓ Human Approval: Supervisors review predictions
      4. ✓ Work Order Execution: Maintenance performed
      5. ✓ Ground Truth: Actual outcomes recorded
      6. ✓ Model Performance: Metrics calculated
      7. ✓ SHAP Explanations: Predictions explained
      8. ✓ Model Governance: Compliance and audit

      ===========================================

  36 passing (2.5s)
```

## Test Data

### Test Assets
- `test_asset_e2e_001`: Main test asset
- `asset_dedupe_test`: Deduplication test asset
- `asset_perf_test_001`: Performance tracking test asset
- `asset_002`, `asset_003`: Feature importance test assets

### Test Users
- `test_supervisor` (supervisor_001): Approval tests
- `supervisor_002`: Rejection tests
- `supervisor_003`: Batch approval tests

## Continuous Integration

These tests are run as part of the CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../ml && pip install -r requirements.txt

      - name: Start services
        run: |
          cd ml/serving
          python model_server.py --port 8080 &
          python shap_explainer_service.py --port 8081 &

      - name: Run E2E tests
        run: |
          cd backend
          npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Troubleshooting

### Common Issues

**1. Model server not available**
```
Error: ECONNREFUSED: Model server not available: http://localhost:8080
```
**Solution:** Start the model server before running tests:
```bash
cd ml/serving
python model_server.py --port 8080
```

**2. SHAP explainer not available**
```
Error: SHAP explainer service not available: http://localhost:8081
```
**Solution:** Start the SHAP explainer service:
```bash
cd ml/serving
python shap_explainer_service.py --port 8081
```

**3. Not enough predictions for metrics**
```
Error: Not enough evaluated predictions (5). Minimum required: 20
```
**Solution:** This is expected if the test is run for the first time. Run the predictive maintenance job multiple times to generate more predictions.

**4. Authentication failures**
```
Error: 401 Unauthorized
```
**Solution:** Check that the test user exists and credentials are correct. Reset test database if needed.

## Coverage Goals

- **Line Coverage:** > 80%
- **Branch Coverage:** > 75%
- **Function Coverage:** > 85%

Current coverage: Run `npm run test:e2e:coverage` to see latest coverage report.

## Contributing

When adding new features to the predictive maintenance workflow:

1. Add corresponding E2E tests
2. Update this README with new test cases
3. Ensure all tests pass before submitting PR
4. Maintain coverage goals

## Related Documentation

- [Predictive Maintenance Architecture](../../docs/ARCHITECTURE.md)
- [Model Performance Tracking](../../docs/MODEL_PERFORMANCE.md)
- [Approval Workflow](../../docs/APPROVAL_WORKFLOW.md)
- [Model Governance](../../ml/docs/COMPLIANCE_FRAMEWORK.md)
- [Incident Response](../../ml/docs/INCIDENT_RESPONSE_RUNBOOK.md)
