"""
MLflow Configuration for dCMMS
Sets up tracking server, model registry, and experiment tracking
"""

import os
from pathlib import Path

# MLflow tracking server configuration
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")

# Backend store (PostgreSQL for metadata)
BACKEND_STORE_URI = os.getenv(
    "MLFLOW_BACKEND_STORE_URI",
    "postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms_mlflow"
)

# Artifact store (S3 for production, local for dev)
ARTIFACT_ROOT = os.getenv("MLFLOW_ARTIFACT_ROOT", "/tmp/dcmms/mlflow/artifacts")

# Default experiment name
DEFAULT_EXPERIMENT_NAME = "predictive_maintenance"

# Model registry settings
MODEL_REGISTRY_STAGES = ["None", "Staging", "Production", "Archived"]

# Autologging configuration
AUTOLOG_SETTINGS = {
    "log_models": True,
    "log_input_examples": True,
    "log_model_signatures": True,
    "disable": False,
}

# Ensure artifact root exists
Path(ARTIFACT_ROOT).mkdir(parents=True, exist_ok=True)


def get_mlflow_config():
    """Get MLflow configuration dictionary"""
    return {
        "tracking_uri": MLFLOW_TRACKING_URI,
        "backend_store_uri": BACKEND_STORE_URI,
        "artifact_root": ARTIFACT_ROOT,
        "default_experiment": DEFAULT_EXPERIMENT_NAME,
        "autolog_settings": AUTOLOG_SETTINGS,
    }


def print_mlflow_config():
    """Print current MLflow configuration"""
    config = get_mlflow_config()
    print("=" * 60)
    print("MLflow Configuration")
    print("=" * 60)
    for key, value in config.items():
        print(f"{key}: {value}")
    print("=" * 60)


if __name__ == "__main__":
    print_mlflow_config()
