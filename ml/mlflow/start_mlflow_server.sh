#!/bin/bash

# MLflow Tracking Server Startup Script
# Starts MLflow server with PostgreSQL backend and local artifact store

set -e

echo "========================================"
echo "Starting MLflow Tracking Server"
echo "========================================"

# Load configuration
export MLFLOW_BACKEND_STORE_URI=${MLFLOW_BACKEND_STORE_URI:-"postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms_mlflow"}
export MLFLOW_ARTIFACT_ROOT=${MLFLOW_ARTIFACT_ROOT:-"/tmp/dcmms/mlflow/artifacts"}
export MLFLOW_HOST=${MLFLOW_HOST:-"0.0.0.0"}
export MLFLOW_PORT=${MLFLOW_PORT:-"5000"}

# Create artifact directory if it doesn't exist
mkdir -p "$MLFLOW_ARTIFACT_ROOT"

echo "Configuration:"
echo "  Backend Store: $MLFLOW_BACKEND_STORE_URI"
echo "  Artifact Root: $MLFLOW_ARTIFACT_ROOT"
echo "  Host: $MLFLOW_HOST"
echo "  Port: $MLFLOW_PORT"
echo ""

# Check if database is accessible
echo "Checking database connection..."
if ! psql "$MLFLOW_BACKEND_STORE_URI" -c '\q' 2>/dev/null; then
    echo "Warning: Cannot connect to PostgreSQL. Creating database..."
    createdb dcmms_mlflow -h localhost -U dcmms_user || echo "Database may already exist"
fi

echo ""
echo "Starting MLflow server..."
echo "UI will be available at: http://$MLFLOW_HOST:$MLFLOW_PORT"
echo ""

# Start MLflow server
mlflow server \
    --backend-store-uri "$MLFLOW_BACKEND_STORE_URI" \
    --default-artifact-root "$MLFLOW_ARTIFACT_ROOT" \
    --host "$MLFLOW_HOST" \
    --port "$MLFLOW_PORT"
