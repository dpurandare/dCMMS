# AI/ML Implementation Specification

**Version:** 1.0
**Priority:** P2 (Release 2)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [ML Use Cases](#2-ml-use-cases)
3. [Feature Engineering](#3-feature-engineering)
4. [Model Training Pipeline](#4-model-training-pipeline)
5. [Model Registry](#5-model-registry)
6. [Inference Serving](#6-inference-serving)
7. [Model Monitoring](#7-model-monitoring)
8. [MLOps Workflow](#8-mlops-workflow)

---

## 1. Overview

### 1.1 Purpose

Implement machine learning capabilities in dCMMS for predictive maintenance, fault detection, generation forecasting, and anomaly detection in renewable energy operations.

### 1.2 ML Stack

```yaml
ml_platform:
  orchestration:
    tool: "Kubeflow / MLflow"
    purpose: "End-to-end ML lifecycle management"

  feature_store:
    tool: "Feast / Tecton"
    storage: "PostgreSQL (online), S3 (offline)"
    purpose: "Centralized feature management"

  model_training:
    frameworks: ["TensorFlow", "PyTorch", "Scikit-learn", "XGBoost"]
    compute: "Kubernetes with GPU nodes (NVIDIA T4)"
    tracking: "MLflow"

  model_registry:
    tool: "MLflow Model Registry"
    storage: "S3"
    versioning: "Semantic versioning (v1.0.0)"

  inference_serving:
    tool: "TorchServe / TensorFlow Serving / Seldon Core"
    deployment: "Kubernetes with auto-scaling"
    monitoring: "Prometheus + Grafana"

  experiment_tracking:
    tool: "MLflow / Weights & Biases"
    metrics: "Accuracy, precision, recall, F1, RMSE, MAE"
    artifacts: "Models, plots, confusion matrices"
```

---

## 2. ML Use Cases

### 2.1 Predictive Maintenance

```yaml
use_case: predictive_maintenance
objective: "Predict equipment failures 7-30 days in advance"

models:
  inverter_fault_prediction:
    target: "Failure within next 30 days (binary classification)"
    features:
      - "Temperature trends (7-day rolling avg)"
      - "Current imbalance (string-level)"
      - "Error code frequency"
      - "Efficiency degradation rate"
      - "Operating hours"
      - "Environmental factors (humidity, dust)"
    algorithm: "Random Forest / XGBoost"
    performance_target: "Precision >85%, Recall >75%"

  remaining_useful_life:
    target: "Days until failure (regression)"
    features:
      - "Vibration analysis (FFT features)"
      - "Thermal imaging deltas"
      - "Performance degradation curve"
      - "Maintenance history"
    algorithm: "LSTM / Gradient Boosting"
    performance_target: "MAE <7 days"
```

### 2.2 Fault Detection

```yaml
use_case: fault_detection
objective: "Detect equipment faults in real-time (<1 minute)"

models:
  string_fault_detector:
    target: "Faulty string identification (multi-class)"
    features:
      - "String current deviation from mean"
      - "String voltage"
      - "IV curve shape parameters"
      - "Temperature"
    algorithm: "Isolation Forest / One-Class SVM"
    performance_target: "F1 >90%"

  soiling_detection:
    target: "Soiling level (0-100% scale)"
    features:
      - "Performance ratio trend"
      - "Irradiation vs generation gap"
      - "Module temperature delta"
      - "Days since last cleaning"
    algorithm: "Random Forest Regression"
    performance_target: "RMSE <10%"
```

### 2.3 Generation Forecasting

```yaml
use_case: generation_forecasting
objective: "Forecast generation for next 24-48 hours"

models:
  solar_generation_forecast:
    target: "Hourly generation (MW) for next 48 hours"
    features:
      - "Weather forecast (irradiation, temperature, clouds)"
      - "Historical generation patterns"
      - "Seasonal trends"
      - "Day of week, time of day"
      - "Equipment availability"
    algorithm: "LSTM / Transformer"
    performance_target: "RMSE <15% of capacity"

  wind_generation_forecast:
    target: "15-minute generation (MW) for next 24 hours"
    features:
      - "Wind speed and direction forecast"
      - "Power curve"
      - "Turbulence intensity"
      - "Temperature, air density"
    algorithm: "Gradient Boosting / LSTM"
    performance_target: "MAE <10% of capacity"
```

### 2.4 Anomaly Detection

```yaml
use_case: anomaly_detection
objective: "Detect unusual behavior patterns"

models:
  equipment_anomaly:
    target: "Anomaly score (0-1)"
    features:
      - "Telemetry vector (50+ metrics)"
      - "Temporal patterns"
      - "Cross-equipment correlations"
    algorithm: "Autoencoder / Isolation Forest"
    performance_target: "Precision >80%, Recall >70%"
```

---

## 3. Feature Engineering

### 3.1 Feature Store Architecture

```yaml
feature_store:
  online_store:
    storage: "Redis"
    purpose: "Low-latency feature serving for inference"
    ttl: "24 hours"
    features: "Pre-computed aggregations, real-time features"

  offline_store:
    storage: "S3 + Parquet"
    purpose: "Historical features for training"
    retention: "2 years"
    partitioning: "By date and site_id"

  registry:
    storage: "PostgreSQL"
    metadata:
      - "Feature name, description"
      - "Data type, value range"
      - "Source tables"
      - "Transformation logic"
      - "Owner, created date"
```

### 3.2 Feature Definitions

```python
# Feature definitions using Feast
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64, String
from datetime import timedelta

# Entity definition
asset = Entity(
    name="asset",
    join_keys=["asset_id"],
    description="Asset/equipment entity"
)

# Feature view for inverter metrics
inverter_metrics = FeatureView(
    name="inverter_metrics",
    entities=[asset],
    ttl=timedelta(days=1),
    schema=[
        Field(name="temperature_7d_avg", dtype=Float32),
        Field(name="temperature_7d_max", dtype=Float32),
        Field(name="current_imbalance_pct", dtype=Float32),
        Field(name="efficiency_pct", dtype=Float32),
        Field(name="error_code_count_7d", dtype=Int64),
        Field(name="operating_hours", dtype=Int64),
        Field(name="last_maintenance_days", dtype=Int64)
    ],
    source=FileSource(
        path="s3://dcmms-features/inverter_metrics.parquet",
        timestamp_field="event_timestamp"
    )
)

# Feature view for environmental data
environmental_features = FeatureView(
    name="environmental",
    entities=[asset],
    ttl=timedelta(hours=1),
    schema=[
        Field(name="irradiation_1h_avg", dtype=Float32),
        Field(name="ambient_temp", dtype=Float32),
        Field(name="humidity_pct", dtype=Float32),
        Field(name="wind_speed_mps", dtype=Float32)
    ],
    source=FileSource(
        path="s3://dcmms-features/environmental.parquet",
        timestamp_field="event_timestamp"
    )
)
```

### 3.3 Feature Engineering Pipeline

```python
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

class FeatureEngineer:
    """
    Feature engineering for renewable energy ML models
    """

    def create_inverter_features(self, telemetry_df):
        """
        Create features from inverter telemetry data
        """
        features = pd.DataFrame()

        # Rolling statistics (7-day window)
        features['temperature_7d_avg'] = telemetry_df.groupby('asset_id')['temperature'].transform(
            lambda x: x.rolling(window=7*24*60, min_periods=1).mean()
        )

        features['temperature_7d_max'] = telemetry_df.groupby('asset_id')['temperature'].transform(
            lambda x: x.rolling(window=7*24*60).max()
        )

        features['temperature_7d_std'] = telemetry_df.groupby('asset_id')['temperature'].transform(
            lambda x: x.rolling(window=7*24*60).std()
        )

        # Current imbalance (string-level analysis)
        string_currents = [f'string_{i}_current' for i in range(1, 25)]
        features['current_imbalance_pct'] = telemetry_df[string_currents].apply(
            lambda row: (row.max() - row.min()) / row.mean() * 100,
            axis=1
        )

        # Efficiency calculation
        features['efficiency_pct'] = (
            telemetry_df['ac_power'] / (telemetry_df['dc_power'] + 1e-6) * 100
        ).clip(0, 100)

        # Efficiency degradation (compared to 30-day baseline)
        features['efficiency_degradation'] = telemetry_df.groupby('asset_id')['efficiency_pct'].transform(
            lambda x: x.rolling(window=30*24*60).mean() - x
        )

        # Error code frequency
        features['error_code_count_7d'] = telemetry_df.groupby('asset_id')['error_code'].transform(
            lambda x: (x != 0).rolling(window=7*24*60).sum()
        )

        # Operating hours
        features['operating_hours'] = telemetry_df.groupby('asset_id')['status'].transform(
            lambda x: (x == 'operational').cumsum()
        )

        # Time since last maintenance
        features['last_maintenance_days'] = self._calculate_days_since_maintenance(telemetry_df)

        return features

    def create_temporal_features(self, df):
        """
        Create time-based features
        """
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)

        # Cyclical encoding for hour
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)

        # Cyclical encoding for month
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

        return df

    def create_lag_features(self, df, columns, lags=[1, 3, 7, 14]):
        """
        Create lag features for time series
        """
        for col in columns:
            for lag in lags:
                df[f'{col}_lag_{lag}d'] = df.groupby('asset_id')[col].shift(lag * 24 * 60)

        return df
```

---

## 4. Model Training Pipeline

### 4.1 Training Architecture

```yaml
training_pipeline:
  orchestration: "Kubeflow Pipelines"

  steps:
    1_data_extraction:
      source: "TimescaleDB, S3"
      output: "Raw data (Parquet)"

    2_feature_engineering:
      input: "Raw data"
      transformations: "Feature calculations, aggregations"
      output: "Feature dataset (Parquet)"

    3_train_test_split:
      strategy: "Temporal split (80% train, 20% test)"
      validation: "K-fold cross-validation (k=5)"

    4_model_training:
      hyperparameter_tuning: "Optuna / Ray Tune"
      compute: "GPU nodes (NVIDIA T4)"

    5_model_evaluation:
      metrics: "Accuracy, precision, recall, F1, ROC-AUC"
      visualizations: "Confusion matrix, feature importance, learning curves"

    6_model_registration:
      registry: "MLflow"
      versioning: "Semantic versioning"
      staging: "Staging → Production promotion"
```

### 4.2 Training Script Example

```python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import optuna

class InverterFaultPredictor:
    """
    Train model to predict inverter faults
    """

    def __init__(self, experiment_name="inverter_fault_prediction"):
        mlflow.set_experiment(experiment_name)
        self.model = None

    def load_training_data(self):
        """
        Load features from feature store
        """
        from feast import FeatureStore

        store = FeatureStore(repo_path=".")

        # Get training data from feature store
        entity_df = pd.read_parquet("s3://dcmms-ml/training_entities.parquet")

        training_df = store.get_historical_features(
            entity_df=entity_df,
            features=[
                "inverter_metrics:temperature_7d_avg",
                "inverter_metrics:current_imbalance_pct",
                "inverter_metrics:efficiency_pct",
                "inverter_metrics:error_code_count_7d",
                "environmental:irradiation_1h_avg"
            ]
        ).to_df()

        # Load labels (faults in next 30 days)
        labels = pd.read_parquet("s3://dcmms-ml/fault_labels.parquet")

        # Merge
        df = training_df.merge(labels, on=['asset_id', 'event_timestamp'])

        return df

    def train(self, df, hyperparam_tuning=True):
        """
        Train fault prediction model
        """
        X = df.drop(['asset_id', 'event_timestamp', 'fault_within_30d'], axis=1)
        y = df['fault_within_30d']

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, stratify=y, random_state=42
        )

        if hyperparam_tuning:
            best_params = self.hyperparameter_tuning(X_train, y_train)
        else:
            best_params = {
                'n_estimators': 200,
                'max_depth': 15,
                'min_samples_split': 10,
                'class_weight': 'balanced'
            }

        # Start MLflow run
        with mlflow.start_run():
            # Train model
            self.model = RandomForestClassifier(**best_params, random_state=42)
            self.model.fit(X_train, y_train)

            # Evaluate
            y_pred = self.model.predict(X_test)
            y_pred_proba = self.model.predict_proba(X_test)[:, 1]

            # Log parameters
            mlflow.log_params(best_params)

            # Log metrics
            metrics = self.calculate_metrics(y_test, y_pred, y_pred_proba)
            mlflow.log_metrics(metrics)

            # Log model
            mlflow.sklearn.log_model(self.model, "model")

            # Log feature importance
            feature_importance = pd.DataFrame({
                'feature': X.columns,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)

            mlflow.log_artifact(self.plot_feature_importance(feature_importance))
            mlflow.log_artifact(self.plot_confusion_matrix(y_test, y_pred))

            # Cross-validation score
            cv_scores = cross_val_score(self.model, X_train, y_train, cv=5, scoring='f1')
            mlflow.log_metric("cv_f1_mean", cv_scores.mean())
            mlflow.log_metric("cv_f1_std", cv_scores.std())

            print(f"Test F1 Score: {metrics['f1_score']:.4f}")
            print(f"Cross-validation F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

            return self.model

    def hyperparameter_tuning(self, X_train, y_train):
        """
        Hyperparameter tuning with Optuna
        """
        def objective(trial):
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'max_depth': trial.suggest_int('max_depth', 5, 30),
                'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
                'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
                'class_weight': 'balanced'
            }

            model = RandomForestClassifier(**params, random_state=42)
            score = cross_val_score(model, X_train, y_train, cv=5, scoring='f1').mean()

            return score

        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=50)

        print(f"Best F1 Score: {study.best_value:.4f}")
        print(f"Best Parameters: {study.best_params}")

        return study.best_params

    def calculate_metrics(self, y_true, y_pred, y_pred_proba):
        """
        Calculate evaluation metrics
        """
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

        return {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred),
            'recall': recall_score(y_true, y_pred),
            'f1_score': f1_score(y_true, y_pred),
            'roc_auc': roc_auc_score(y_true, y_pred_proba)
        }
```

---

## 5. Model Registry

### 5.1 Model Versioning

```yaml
model_registry:
  tool: "MLflow Model Registry"

  model_stages:
    - None: "Newly trained model"
    - Staging: "Under evaluation"
    - Production: "Deployed for inference"
    - Archived: "Deprecated"

  promotion_criteria:
    staging_to_production:
      - "F1 score > current production model"
      - "Approved by ML engineer"
      - "Passed A/B test (if applicable)"
      - "Inference latency < 100ms"

  metadata:
    - "Model name and version"
    - "Training date"
    - "Performance metrics"
    - "Feature list"
    - "Hyperparameters"
    - "Training dataset version"
    - "Owner"
```

### 5.2 Model Management

```python
import mlflow
from mlflow.tracking import MlflowClient

class ModelManager:
    """
    Manage models in MLflow registry
    """

    def __init__(self):
        self.client = MlflowClient()

    def register_model(self, run_id, model_name):
        """
        Register a trained model
        """
        model_uri = f"runs:/{run_id}/model"

        # Register model
        model_version = mlflow.register_model(model_uri, model_name)

        print(f"Registered {model_name} version {model_version.version}")

        return model_version

    def promote_to_staging(self, model_name, version):
        """
        Promote model to staging
        """
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Staging"
        )

        print(f"Promoted {model_name} v{version} to Staging")

    def promote_to_production(self, model_name, version):
        """
        Promote model to production after validation
        """
        # Get current production model
        current_prod = self.get_production_model(model_name)

        # Transition new model to production
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Production"
        )

        # Archive old production model
        if current_prod:
            self.client.transition_model_version_stage(
                name=model_name,
                version=current_prod.version,
                stage="Archived"
            )

        print(f"Promoted {model_name} v{version} to Production")

    def get_production_model(self, model_name):
        """
        Get current production model
        """
        versions = self.client.get_latest_versions(model_name, stages=["Production"])
        return versions[0] if versions else None

    def compare_models(self, model_name, version1, version2):
        """
        Compare two model versions
        """
        v1 = self.client.get_model_version(model_name, version1)
        v2 = self.client.get_model_version(model_name, version2)

        # Get metrics for both versions
        v1_metrics = self.client.get_run(v1.run_id).data.metrics
        v2_metrics = self.client.get_run(v2.run_id).data.metrics

        comparison = pd.DataFrame({
            f'v{version1}': v1_metrics,
            f'v{version2}': v2_metrics
        })

        print(comparison)

        return comparison
```

---

## 6. Inference Serving

### 6.1 Model Deployment

```yaml
inference_serving:
  platform: "Seldon Core / TorchServe"
  deployment_type: "Kubernetes"

  serving_config:
    replicas:
      min: 2
      max: 10
    auto_scaling:
      metric: "requests_per_second"
      target: 100
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2000m"
        memory: "4Gi"

  endpoints:
    - path: "/v1/models/inverter_fault/predict"
      method: "POST"
      latency_target: "< 100ms p95"
```

### 6.2 Inference Service

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mlflow
import pandas as pd

app = FastAPI(title="dCMMS ML Inference API")

# Load model from registry
model_name = "inverter_fault_prediction"
model = mlflow.pyfunc.load_model(f"models:/{model_name}/Production")

class PredictionRequest(BaseModel):
    asset_id: str
    features: dict

class PredictionResponse(BaseModel):
    asset_id: str
    fault_probability: float
    risk_level: str
    confidence: float

@app.post("/v1/models/inverter_fault/predict", response_model=PredictionResponse)
async def predict_fault(request: PredictionRequest):
    """
    Predict inverter fault probability
    """
    try:
        # Get real-time features from feature store
        features = get_features(request.asset_id)

        # Create feature vector
        feature_df = pd.DataFrame([features])

        # Predict
        prediction_proba = model.predict_proba(feature_df)[0]
        fault_probability = float(prediction_proba[1])  # Probability of fault

        # Determine risk level
        if fault_probability > 0.7:
            risk_level = "high"
        elif fault_probability > 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Calculate confidence (based on prediction probability)
        confidence = max(prediction_proba)

        return PredictionResponse(
            asset_id=request.asset_id,
            fault_probability=fault_probability,
            risk_level=risk_level,
            confidence=confidence
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/models/inverter_fault/batch_predict")
async def batch_predict(asset_ids: list[str]):
    """
    Batch prediction for multiple assets
    """
    predictions = []

    for asset_id in asset_ids:
        features = get_features(asset_id)
        feature_df = pd.DataFrame([features])

        prediction_proba = model.predict_proba(feature_df)[0]
        fault_probability = float(prediction_proba[1])

        predictions.append({
            'asset_id': asset_id,
            'fault_probability': fault_probability
        })

    return predictions

def get_features(asset_id):
    """
    Get features from online feature store (Redis)
    """
    from feast import FeatureStore

    store = FeatureStore(repo_path=".")

    entity_df = pd.DataFrame({
        'asset_id': [asset_id],
        'event_timestamp': [pd.Timestamp.now()]
    })

    features = store.get_online_features(
        entity_rows=entity_df.to_dict('records'),
        features=[
            "inverter_metrics:temperature_7d_avg",
            "inverter_metrics:current_imbalance_pct",
            "inverter_metrics:efficiency_pct",
            "inverter_metrics:error_code_count_7d",
            "environmental:irradiation_1h_avg"
        ]
    ).to_dict()

    return features
```

---

## 7. Model Monitoring

### 7.1 Monitoring Metrics

```yaml
monitoring:
  performance_metrics:
    - prediction_latency
    - throughput_rps
    - error_rate

  model_metrics:
    - prediction_distribution
    - confidence_scores
    - feature_drift
    - concept_drift
    - data_quality

  alerts:
    - condition: "prediction_latency_p95 > 200ms"
      severity: "warning"
    - condition: "error_rate > 5%"
      severity: "critical"
    - condition: "feature_drift_score > 0.3"
      severity: "warning"
      action: "Retrain model"
```

### 7.2 Drift Detection

```python
from scipy.stats import ks_2samp
import numpy as np

class DriftDetector:
    """
    Detect feature drift and concept drift
    """

    def __init__(self, reference_data):
        self.reference_data = reference_data

    def detect_feature_drift(self, current_data, threshold=0.05):
        """
        Detect feature drift using Kolmogorov-Smirnov test
        """
        drift_results = {}

        for column in self.reference_data.columns:
            if column in current_data.columns:
                # KS test
                statistic, pvalue = ks_2samp(
                    self.reference_data[column],
                    current_data[column]
                )

                drift_results[column] = {
                    'statistic': statistic,
                    'pvalue': pvalue,
                    'drift_detected': pvalue < threshold
                }

        # Overall drift score
        drift_score = np.mean([r['statistic'] for r in drift_results.values()])

        return {
            'drift_score': drift_score,
            'features': drift_results
        }

    def detect_concept_drift(self, predictions, actuals, window_size=100):
        """
        Detect concept drift using accuracy degradation
        """
        from sklearn.metrics import accuracy_score

        # Calculate accuracy over sliding windows
        accuracies = []

        for i in range(0, len(predictions) - window_size, window_size):
            window_preds = predictions[i:i+window_size]
            window_actuals = actuals[i:i+window_size]

            accuracy = accuracy_score(window_actuals, window_preds)
            accuracies.append(accuracy)

        # Detect trend
        if len(accuracies) >= 3:
            recent_accuracy = np.mean(accuracies[-3:])
            baseline_accuracy = np.mean(accuracies[:3])

            drift_magnitude = baseline_accuracy - recent_accuracy

            return {
                'concept_drift_detected': drift_magnitude > 0.1,
                'drift_magnitude': drift_magnitude,
                'recent_accuracy': recent_accuracy,
                'baseline_accuracy': baseline_accuracy
            }

        return {'concept_drift_detected': False}
```

---

## 8. MLOps Workflow

### 8.1 Continuous Training

```yaml
continuous_training:
  schedule: "Weekly (Sunday 2 AM)"

  workflow:
    1_data_validation:
      checks:
        - "Data completeness > 95%"
        - "No schema changes"
        - "Feature distributions within expected range"

    2_feature_refresh:
      action: "Recompute features from last week's data"

    3_model_training:
      action: "Train model with updated data"

    4_model_evaluation:
      action: "Compare against production model"
      metrics: ["F1", "Precision", "Recall"]

    5_staging_deployment:
      condition: "New model F1 > production F1"
      action: "Deploy to staging environment"

    6_ab_testing:
      duration: "24 hours"
      traffic_split: "90% production, 10% staging"

    7_production_promotion:
      condition: "Staging model performance >= production"
      approval: "Manual approval by ML engineer"
```

### 8.2 CI/CD Pipeline

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Model CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'ml/**'

jobs:
  train_and_deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install -r ml/requirements.txt

      - name: Run unit tests
        run: |
          pytest ml/tests/

      - name: Train model
        run: |
          python ml/train.py --experiment inverter_fault_prediction

      - name: Evaluate model
        run: |
          python ml/evaluate.py --model_name inverter_fault_prediction

      - name: Deploy to staging
        if: success()
        run: |
          python ml/deploy.py --environment staging --model_name inverter_fault_prediction

      - name: Integration tests
        run: |
          pytest ml/tests/integration/

      - name: Promote to production
        if: success()
        run: |
          python ml/deploy.py --environment production --model_name inverter_fault_prediction
```

---

## Summary

This specification provides comprehensive AI/ML implementation for dCMMS:

1. **ML Use Cases** for predictive maintenance, fault detection, generation forecasting, anomaly detection
2. **Feature Engineering** with feature store (Feast), online/offline stores, feature definitions
3. **Model Training Pipeline** with Kubeflow, hyperparameter tuning (Optuna), cross-validation
4. **Model Registry** with MLflow, versioning, staging/production promotion
5. **Inference Serving** with FastAPI, Seldon Core, batch and real-time prediction
6. **Model Monitoring** with drift detection (feature drift, concept drift), performance tracking
7. **MLOps Workflow** with continuous training, CI/CD pipeline, A/B testing

**Lines:** ~950
**Status:** Complete
**Next:** Cost Management (Spec 23)
