# MLflow Model Registry for dCMMS

This directory contains the MLflow setup for experiment tracking and model registry for dCMMS ML infrastructure.

## Overview

MLflow provides:
- **Experiment Tracking**: Log parameters, metrics, and artifacts
- **Model Registry**: Version control and lifecycle management for ML models
- **Model Serving**: Deploy models to staging/production
- **Model Lineage**: Track datasets, code versions, and model dependencies

## Architecture

```
ML Training Code
     ↓
 MLflow Tracking
     ↓
Experiment Logs → PostgreSQL (metadata)
Model Artifacts → Local/S3 (models)
     ↓
Model Registry
     ↓
Staging → Production
     ↓
Model Serving API
```

## Setup

### 1. Create MLflow Database

```bash
# Create PostgreSQL database for MLflow metadata
createdb dcmms_mlflow -h localhost -U dcmms_user

# Or via SQL
psql -h localhost -U dcmms_user -c "CREATE DATABASE dcmms_mlflow;"
```

### 2. Start MLflow Tracking Server

```bash
cd /home/user/dCMMS/ml/mlflow
./start_mlflow_server.sh
```

Or manually:
```bash
mlflow server \
  --backend-store-uri postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms_mlflow \
  --default-artifact-root /tmp/dcmms/mlflow/artifacts \
  --host 0.0.0.0 \
  --port 5000
```

The MLflow UI will be available at: http://localhost:5000

### 3. Verify Installation

```bash
# Check MLflow server is running
curl http://localhost:5000/health

# List experiments
mlflow experiments list --tracking-uri http://localhost:5000
```

## Usage

### Experiment Tracking

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier

# Set tracking URI
mlflow.set_tracking_uri("http://localhost:5000")

# Create experiment
mlflow.set_experiment("predictive_maintenance")

# Start run
with mlflow.start_run(run_name="rf_baseline"):
    # Log parameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)

    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)

    # Log metrics
    accuracy = model.score(X_test, y_test)
    mlflow.log_metric("accuracy", accuracy)

    # Log model
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        registered_model_name="predictive_maintenance_rf"
    )
```

### Model Registration

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model
model_uri = f"runs:/{run_id}/model"
result = mlflow.register_model(model_uri, "predictive_maintenance_rf")

# Get latest version
latest_version = result.version

# Transition to staging
client.transition_model_version_stage(
    name="predictive_maintenance_rf",
    version=latest_version,
    stage="Staging"
)

# After validation, promote to production
client.transition_model_version_stage(
    name="predictive_maintenance_rf",
    version=latest_version,
    stage="Production",
    archive_existing_versions=True  # Archive old production models
)
```

### Load Model from Registry

```python
import mlflow.pyfunc

# Load latest production model
model = mlflow.pyfunc.load_model(
    model_uri="models:/predictive_maintenance_rf/Production"
)

# Make predictions
predictions = model.predict(features_df)
```

## Model Stages

MLflow supports 4 model stages:

1. **None**: Newly registered models
2. **Staging**: Models under validation/testing
3. **Production**: Models deployed to production
4. **Archived**: Deprecated models

## Example Training Script

Run the example training script:

```bash
cd /home/user/dCMMS/ml/mlflow
python3 example_model_training.py
```

This will:
- Generate synthetic training data
- Train a Random Forest model
- Log parameters, metrics, and model to MLflow
- Register model in model registry
- Save feature importances as artifact

## Model Approval Workflow

### 1. Training Phase
```python
with mlflow.start_run():
    # Train model
    model.fit(X_train, y_train)

    # Log to MLflow
    mlflow.sklearn.log_model(
        model,
        "model",
        registered_model_name="predictive_maintenance_rf"
    )
```

### 2. Staging Phase
```python
client = MlflowClient()

# Transition to staging
client.transition_model_version_stage(
    name="predictive_maintenance_rf",
    version=1,
    stage="Staging"
)

# Add notes
client.update_model_version(
    name="predictive_maintenance_rf",
    version=1,
    description="Random Forest baseline model. F1 score: 0.85"
)
```

### 3. Validation Phase
```python
# Load staging model
staging_model = mlflow.pyfunc.load_model(
    "models:/predictive_maintenance_rf/Staging"
)

# Run validation tests
validation_metrics = validate_model(staging_model, validation_data)

# Log validation results as tags
client.set_model_version_tag(
    name="predictive_maintenance_rf",
    version=1,
    key="validation_f1",
    value=str(validation_metrics["f1"])
)
```

### 4. Production Promotion
```python
# If validation passed, promote to production
if validation_metrics["f1"] > 0.80:
    client.transition_model_version_stage(
        name="predictive_maintenance_rf",
        version=1,
        stage="Production",
        archive_existing_versions=True
    )
```

## MLflow UI

### Experiments View
- View all experiments and runs
- Compare runs side-by-side
- Visualize metrics over time
- Download artifacts

### Models View
- See all registered models
- View model versions and stages
- Compare model performance
- Download models

### Run Details
- Parameters logged
- Metrics logged
- Artifacts (model files, plots, data)
- Tags and notes
- Code version (Git commit)

## Integration with dCMMS Backend

### API Endpoints (Future)

```typescript
// Get latest production model info
GET /api/v1/ml/models/predictive_maintenance_rf/production

// Trigger model training
POST /api/v1/ml/models/train
{
  "modelName": "predictive_maintenance_rf",
  "datasetVersion": "v1.0",
  "hyperparameters": {...}
}

// Promote model to production
POST /api/v1/ml/models/predictive_maintenance_rf/versions/1/promote
{
  "stage": "Production"
}
```

## Production Deployment

For production deployments:

1. **Backend Store**: Use managed PostgreSQL
   ```bash
   mlflow server \
     --backend-store-uri postgresql://prod-user:password@prod-db.rds.amazonaws.com:5432/mlflow
   ```

2. **Artifact Store**: Use S3
   ```bash
   mlflow server \
     --default-artifact-root s3://dcmms-mlflow-artifacts/
   ```

3. **Authentication**: Enable MLflow authentication
   ```bash
   mlflow server \
     --app-name basic-auth \
     --username admin \
     --password <secure-password>
   ```

4. **SSL/TLS**: Use reverse proxy (nginx) with SSL

5. **High Availability**: Run multiple MLflow servers behind load balancer

## Environment Variables

Add to `.env`:

```bash
# MLflow Configuration
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_BACKEND_STORE_URI=postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms_mlflow
MLFLOW_ARTIFACT_ROOT=/tmp/dcmms/mlflow/artifacts

# For production
# MLFLOW_TRACKING_URI=https://mlflow.dcmms.com
# MLFLOW_BACKEND_STORE_URI=postgresql://prod-user:password@prod-db:5432/mlflow
# MLFLOW_ARTIFACT_ROOT=s3://dcmms-mlflow-artifacts/
```

## Best Practices

1. **Naming Conventions**
   - Experiments: `predictive_maintenance`, `anomaly_detection`
   - Models: `predictive_maintenance_rf`, `predictive_maintenance_xgb`
   - Runs: `rf_baseline_v1`, `xgb_tuned_optuna`

2. **Tagging**
   - Add tags for: `model_type`, `use_case`, `data_version`, `training_date`
   - Use tags for filtering and organization

3. **Versioning**
   - Tag runs with Git commit hash
   - Track dataset versions
   - Document model lineage

4. **Artifact Management**
   - Log feature importances
   - Log confusion matrices
   - Log training/validation plots
   - Log model explanations (SHAP values)

5. **Model Registry**
   - Use descriptive model descriptions
   - Add validation metrics as tags
   - Document model limitations

## Troubleshooting

### MLflow server won't start
- Check PostgreSQL is running: `psql $MLFLOW_BACKEND_STORE_URI -c '\q'`
- Check port 5000 is not in use: `lsof -i :5000`
- Check logs for errors

### Cannot connect to tracking server
- Verify `MLFLOW_TRACKING_URI` is set correctly
- Check firewall rules
- Test with: `curl http://localhost:5000/health`

### Model not found in registry
- Ensure model is registered: `mlflow.register_model(...)`
- Check model name spelling
- Verify model stage

### Slow artifact uploads
- Use S3 for production
- Consider artifact compression
- Monitor network bandwidth

## References

- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [MLflow GitHub](https://github.com/mlflow/mlflow)
- [Model Registry Guide](https://mlflow.org/docs/latest/model-registry.html)
- [dCMMS ML Architecture](../../docs/ML_ARCHITECTURE.md)
