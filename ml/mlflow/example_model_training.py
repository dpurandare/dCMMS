#!/usr/bin/env python3
"""
Example: Training and Logging a Model with MLflow
Demonstrates experiment tracking, parameter logging, and model registration
"""

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from mlflow_config import MLFLOW_TRACKING_URI, DEFAULT_EXPERIMENT_NAME


def train_example_model():
    """Train an example predictive maintenance model"""

    # Set MLflow tracking URI
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

    # Create or set experiment
    mlflow.set_experiment(DEFAULT_EXPERIMENT_NAME)

    # Generate synthetic training data
    print("Generating synthetic training data...")
    np.random.seed(42)
    n_samples = 1000

    # Features
    X = pd.DataFrame({
        'asset_age_months': np.random.randint(1, 120, n_samples),
        'days_since_last_maintenance': np.random.randint(0, 365, n_samples),
        'total_work_orders': np.random.randint(0, 50, n_samples),
        'corrective_wo_count_30d': np.random.randint(0, 10, n_samples),
        'health_score': np.random.uniform(0, 100, n_samples),
        'rolling_avg_power_7d': np.random.uniform(50, 150, n_samples),
        'anomaly_count_30d': np.random.randint(0, 20, n_samples),
    })

    # Labels (failure within 7 days)
    y = ((X['health_score'] < 50) |
         (X['corrective_wo_count_30d'] > 5) |
         (X['anomaly_count_30d'] > 10)).astype(int)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Class distribution: {np.bincount(y_train)}")

    # Start MLflow run
    with mlflow.start_run(run_name="random_forest_baseline") as run:
        print(f"\nMLflow Run ID: {run.info.run_id}")

        # Hyperparameters
        params = {
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "random_state": 42,
            "class_weight": "balanced",
        }

        # Log parameters
        mlflow.log_params(params)

        # Train model
        print("Training Random Forest model...")
        model = RandomForestClassifier(**params)
        model.fit(X_train, y_train)

        # Predictions
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)

        # Metrics
        metrics = {
            "train_accuracy": accuracy_score(y_train, y_pred_train),
            "train_precision": precision_score(y_train, y_pred_train, zero_division=0),
            "train_recall": recall_score(y_train, y_pred_train, zero_division=0),
            "train_f1": f1_score(y_train, y_pred_train, zero_division=0),
            "test_accuracy": accuracy_score(y_test, y_pred_test),
            "test_precision": precision_score(y_test, y_pred_test, zero_division=0),
            "test_recall": recall_score(y_test, y_pred_test, zero_division=0),
            "test_f1": f1_score(y_test, y_pred_test, zero_division=0),
        }

        # Log metrics
        mlflow.log_metrics(metrics)

        print("\nMetrics:")
        for key, value in metrics.items():
            print(f"  {key}: {value:.4f}")

        # Log feature importances
        feature_importances = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)

        print("\nFeature Importances:")
        print(feature_importances.to_string(index=False))

        # Save feature importances as artifact
        feature_importances.to_csv("/tmp/feature_importances.csv", index=False)
        mlflow.log_artifact("/tmp/feature_importances.csv")

        # Log model with signature
        from mlflow.models.signature import infer_signature
        signature = infer_signature(X_train, y_pred_train)

        mlflow.sklearn.log_model(
            model,
            artifact_path="model",
            signature=signature,
            input_example=X_train.head(5),
            registered_model_name="predictive_maintenance_rf",
        )

        print(f"\nModel logged to MLflow")
        print(f"Model URI: runs:/{run.info.run_id}/model")
        print(f"Registered model: predictive_maintenance_rf")

        # Tag the run
        mlflow.set_tags({
            "model_type": "random_forest",
            "use_case": "predictive_maintenance",
            "data_version": "v1.0",
            "training_date": pd.Timestamp.now().strftime("%Y-%m-%d"),
        })

        return run.info.run_id, metrics["test_f1"]


def promote_model_to_production(model_name: str, version: int):
    """Promote a model version to production stage"""

    client = mlflow.MlflowClient()

    # Transition to production
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage="Production",
        archive_existing_versions=True  # Archive old production versions
    )

    print(f"Model {model_name} version {version} promoted to Production")


if __name__ == "__main__":
    print("=" * 60)
    print("MLflow Example: Model Training and Registration")
    print("=" * 60)
    print()

    # Train model
    run_id, f1_score_val = train_example_model()

    print()
    print("=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print(f"1. View experiment in MLflow UI: {MLFLOW_TRACKING_URI}")
    print(f"2. Promote model to production:")
    print(f"   python -c 'from example_model_training import promote_model_to_production; promote_model_to_production(\"predictive_maintenance_rf\", 1)'")
    print()
