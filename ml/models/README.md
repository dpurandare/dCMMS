# Baseline Models for dCMMS Predictive Maintenance

This directory contains scripts for training and evaluating baseline models for predictive maintenance.

## Overview

Baseline models predict asset failures within a 7-day window using historical asset, telemetry, and work order features.

**Models:**
- **Logistic Regression**: Simple linear baseline
- **Random Forest**: Ensemble of decision trees
- **XGBoost**: Gradient boosted decision trees (recommended)

**Training Pipeline:**
1. Load versioned training dataset
2. Train multiple models with hyperparameter tuning
3. Evaluate on test set
4. Compare models and select best
5. Register best model to MLflow model registry
6. Transition to Staging environment

## Quick Start

### 1. Create Training Dataset

```bash
cd /home/user/dCMMS/ml/datasets
python3 create_training_dataset.py --version v1.0
```

### 2. Train Baseline Models

```bash
cd /home/user/dCMMS/ml/models
python3 train_baseline_models.py --dataset-version v1.0
```

This will:
- Load dataset v1.0
- Train 3 baseline models with hyperparameter tuning
- Log all experiments to MLflow
- Register best model to MLflow registry
- Transition to Staging

### 3. View Results in MLflow UI

```bash
# Start MLflow server (if not running)
cd /home/user/dCMMS/ml/mlflow
./start_mlflow_server.sh

# Open browser
http://localhost:5000
```

## Configuration

Edit `model_config.yaml` to customize:

```yaml
# MLflow settings
mlflow_tracking_uri: "http://localhost:5000"
experiment_name: "predictive_maintenance_baseline"

# Hyperparameter tuning
use_hyperparameter_tuning: true
tuning_cv_folds: 3

# Model configurations
models:
  logistic_regression:
    enabled: true
    params:
      class_weight: "balanced"
    param_grid:
      C: [0.01, 0.1, 1.0, 10.0]
      penalty: ["l1", "l2"]

  random_forest:
    enabled: true
    param_grid:
      n_estimators: [100, 200, 300]
      max_depth: [10, 20, null]

  xgboost:
    enabled: true
    param_grid:
      n_estimators: [100, 200, 300]
      max_depth: [3, 5, 7]
      learning_rate: [0.01, 0.1]
```

## Usage

### Train with Custom Configuration

```bash
python3 train_baseline_models.py \
  --config model_config.yaml \
  --dataset-version v1.0
```

### Train without Hyperparameter Tuning

```bash
python3 train_baseline_models.py \
  --dataset-version v1.0 \
  --no-tuning
```

This is much faster for quick experimentation.

### Train Specific Dataset

```bash
python3 train_baseline_models.py \
  --dataset-version v2.0 \
  --dataset-dir /path/to/datasets
```

## Model Comparison

After training, models are compared on test set F1 score:

```
============================================================
Model Comparison
============================================================

Model                Test F1      Test ROC-AUC Test Precision  Test Recall
----------------------------------------------------------------------
🏆 xgboost            0.7234       0.8456       0.6891          0.7612
   random_forest      0.7102       0.8321       0.6754          0.7489
   logistic_regression 0.6543      0.7821       0.6123          0.7012

Best Model: xgboost
  Test F1: 0.7234
  Test ROC-AUC: 0.8456
  Run ID: abc123...
============================================================
```

The best model (highest test F1) is automatically registered to MLflow.

## Model Registry

### Registered Model Stages

Models progress through stages in MLflow registry:

1. **None**: Just registered, not validated
2. **Staging**: Deployed for validation
3. **Production**: Validated and serving predictions
4. **Archived**: Deprecated

### Promote to Production

After validating the Staging model:

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Transition to production
client.transition_model_version_stage(
    name="predictive_maintenance_best",
    version=2,
    stage="Production"
)

# Archive old production model
client.transition_model_version_stage(
    name="predictive_maintenance_best",
    version=1,
    stage="Archived"
)
```

### Load Production Model

```python
import mlflow.pyfunc

# Load production model
model_uri = "models:/predictive_maintenance_best/Production"
model = mlflow.pyfunc.load_model(model_uri)

# Make predictions
predictions = model.predict(X_new)
```

## Hyperparameter Tuning

### Grid Search

Default tuning method using GridSearchCV:

```python
param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [3, 5, 7],
    'learning_rate': [0.01, 0.1, 0.3],
}

grid_search = GridSearchCV(
    model,
    param_grid,
    cv=3,
    scoring='f1',
    n_jobs=-1
)

grid_search.fit(X_train, y_train)
best_model = grid_search.best_estimator_
```

### Optuna (Advanced)

For more efficient hyperparameter optimization, use Optuna:

```python
import optuna
from optuna.integration import OptunaSearchCV

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 50, 300),
        'max_depth': trial.suggest_int('max_depth', 3, 10),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
    }

    model = xgb.XGBClassifier(**params)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    return f1_score(y_test, y_pred)

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=50)

best_params = study.best_params
```

## Evaluation Metrics

Models are evaluated using multiple metrics:

### Classification Metrics

- **Accuracy**: Correct predictions / Total predictions
- **Precision**: True Positives / (True Positives + False Positives)
  - "Of all predicted failures, how many were actual failures?"
- **Recall**: True Positives / (True Positives + False Negatives)
  - "Of all actual failures, how many did we predict?"
- **F1 Score**: Harmonic mean of Precision and Recall
  - **Primary metric** for model selection
- **ROC-AUC**: Area under ROC curve (0.5 = random, 1.0 = perfect)

### Confusion Matrix

```
                  Predicted
                  No Fail  Fail
Actual  No Fail     TN      FP
        Fail        FN      TP
```

- **True Negative (TN)**: Correctly predicted no failure
- **False Positive (FP)**: Incorrectly predicted failure (Type I error)
- **False Negative (FN)**: Missed a failure (Type II error) - CRITICAL!
- **True Positive (TP)**: Correctly predicted failure

### Business Context

For predictive maintenance:

- **High Recall** is critical: We want to catch all failures (minimize FN)
- **Reasonable Precision**: Avoid too many false alarms (minimize FP)
- **F1 Score** balances both concerns

## Feature Importance

Tree-based models (Random Forest, XGBoost) provide feature importance:

```python
import pandas as pd

# Get feature importance
feature_importance = pd.DataFrame({
    'feature': X_train.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

# Top 10 features
print(feature_importance.head(10))
```

Example output:

```
                     feature  importance
0              health_score      0.2341
1   days_since_last_maintenance 0.1823
2       corrective_wo_ratio      0.1456
3      rolling_avg_power_7d      0.0987
4          asset_age_months      0.0876
...
```

## Model Serving

### Batch Predictions

```python
import mlflow.pyfunc
import pandas as pd

# Load production model
model = mlflow.pyfunc.load_model("models:/predictive_maintenance_best/Production")

# Load new data
new_data = pd.read_parquet('new_assets.parquet')

# Make predictions
predictions = model.predict(new_data)
probabilities = model.predict_proba(new_data)[:, 1]

# Save results
results = pd.DataFrame({
    'asset_id': new_data['asset_id'],
    'failure_probability': probabilities,
    'predicted_failure': predictions,
})

results.to_csv('predictions.csv', index=False)
```

### Real-time Serving

Deploy model as REST API using MLflow:

```bash
# Serve model locally
mlflow models serve \
  -m "models:/predictive_maintenance_best/Production" \
  -p 8080 \
  --no-conda

# Make prediction
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "dataframe_split": {
      "columns": ["health_score", "asset_age_months", ...],
      "data": [[75.3, 24, ...]]
    }
  }'
```

## Model Retraining

### Scheduled Retraining

Retrain models weekly/monthly with fresh data:

```bash
# Cron job (weekly on Sunday at 2 AM)
0 2 * * 0 cd /home/user/dCMMS/ml && \
  python3 datasets/create_training_dataset.py --version v1.1 && \
  python3 models/train_baseline_models.py --dataset-version v1.1
```

### Triggered Retraining

Retrain when model performance degrades:

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get production model metrics
runs = client.search_runs(
    experiment_ids=['1'],
    filter_string="tags.mlflow.runName = 'xgboost'",
    order_by=["start_time DESC"],
    max_results=1
)

current_f1 = runs[0].data.metrics['test_f1']

# If F1 drops below threshold, retrain
if current_f1 < 0.65:
    print("Model performance degraded. Triggering retraining...")
    # Trigger training pipeline
```

## Troubleshooting

### Import errors

```
ModuleNotFoundError: No module named 'xgboost'
```

**Solution**: Install dependencies:
```bash
cd /home/user/dCMMS/ml
pip install -r requirements.txt
```

### Dataset not found

```
FileNotFoundError: Dataset version v1.0 not found
```

**Solution**: Create the dataset first:
```bash
cd /home/user/dCMMS/ml/datasets
python3 create_training_dataset.py --version v1.0
```

### MLflow connection error

```
requests.exceptions.ConnectionError
```

**Solution**: Start MLflow server:
```bash
cd /home/user/dCMMS/ml/mlflow
./start_mlflow_server.sh
```

### Poor model performance

```
Test F1: 0.35 (very low)
```

**Possible causes:**
- Insufficient training data
- Class imbalance too severe
- Features not predictive
- Poor hyperparameter tuning

**Solutions:**
- Collect more historical failure data
- Use class weighting or SMOTE
- Engineer better features
- Extend hyperparameter search space

## Best Practices

1. **Version everything**: Datasets, models, code
2. **Track experiments**: Use MLflow for all training runs
3. **Tune hyperparameters**: Don't use default parameters
4. **Monitor performance**: Track model metrics over time
5. **Validate before deployment**: Test on real data before production
6. **Handle class imbalance**: Use class weights or sampling
7. **Feature engineering**: Domain-specific features are critical
8. **Document decisions**: Why was this model chosen?

## References

- [MLflow Model Registry](https://mlflow.org/docs/latest/model-registry.html)
- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [Scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- [Feature Engineering README](../feature_engineering/README.md)
- [Dataset Creation README](../datasets/README.md)
