#!/usr/bin/env python3
"""
MLflow Model Server

Local model serving compatible with KServe InferenceService.
Serves models from MLflow with health checks, metrics, and auto-reloading.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

import mlflow
import mlflow.pyfunc
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from functools import wraps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
PREDICTION_COUNTER = Counter(
    'model_predictions_total',
    'Total number of predictions',
    ['model_name', 'model_version']
)

PREDICTION_LATENCY = Histogram(
    'model_prediction_latency_seconds',
    'Prediction latency in seconds',
    ['model_name', 'model_version']
)

PREDICTION_ERRORS = Counter(
    'model_prediction_errors_total',
    'Total number of prediction errors',
    ['model_name', 'model_version', 'error_type']
)

MODEL_LOADED = Gauge(
    'model_loaded',
    'Whether model is loaded (1) or not (0)',
    ['model_name', 'model_version']
)


class ModelServer:
    """MLflow model server with health checks and metrics"""

    def __init__(
        self,
        model_uri: Optional[str] = None,
        model_name: str = "default_model",
        model_version: str = "1",
        mlflow_tracking_uri: str = "http://localhost:5000"
    ):
        """
        Initialize model server

        Args:
            model_uri: MLflow model URI (e.g., "runs:/abc123/model" or "models:/model_name/Production")
            model_name: Model name for metrics
            model_version: Model version for metrics
            mlflow_tracking_uri: MLflow tracking server URI
        """
        self.model_uri = model_uri
        self.model_name = model_name
        self.model_version = model_version
        self.mlflow_tracking_uri = mlflow_tracking_uri

        self.model = None
        self.model_metadata = {}
        self.loaded_at = None

        # Configure MLflow
        mlflow.set_tracking_uri(mlflow_tracking_uri)

        # Load model if URI provided
        if model_uri:
            self.load_model(model_uri)

    def load_model(self, model_uri: str):
        """
        Load model from MLflow

        Args:
            model_uri: MLflow model URI
        """
        logger.info(f"Loading model from: {model_uri}")

        try:
            # Load model
            self.model = mlflow.pyfunc.load_model(model_uri)

            # Get model metadata
            self.model_metadata = {
                'model_uri': model_uri,
                'model_name': self.model_name,
                'model_version': self.model_version,
                'loaded_at': datetime.now().isoformat(),
            }

            self.loaded_at = datetime.now()

            # Update metrics
            MODEL_LOADED.labels(
                model_name=self.model_name,
                model_version=self.model_version
            ).set(1)

            logger.info(f"Model loaded successfully: {self.model_name} v{self.model_version}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            MODEL_LOADED.labels(
                model_name=self.model_name,
                model_version=self.model_version
            ).set(0)
            raise

    def predict(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Make predictions

        Args:
            data: Input features as DataFrame

        Returns:
            Dictionary with predictions and metadata
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        start_time = time.time()

        try:
            # Make predictions
            predictions = self.model.predict(data)

            # Get probabilities if available
            if hasattr(self.model._model_impl.python_model, 'predict_proba'):
                probabilities = self.model._model_impl.python_model.predict_proba(data)
            else:
                probabilities = None

            # Prepare response
            response = {
                'predictions': predictions.tolist() if isinstance(predictions, np.ndarray) else predictions,
                'model_name': self.model_name,
                'model_version': self.model_version,
                'timestamp': datetime.now().isoformat(),
            }

            if probabilities is not None:
                response['probabilities'] = probabilities.tolist()

            # Update metrics
            latency = time.time() - start_time

            PREDICTION_COUNTER.labels(
                model_name=self.model_name,
                model_version=self.model_version
            ).inc(len(data))

            PREDICTION_LATENCY.labels(
                model_name=self.model_name,
                model_version=self.model_version
            ).observe(latency)

            logger.info(f"Predictions: {len(data)} samples in {latency:.3f}s")

            return response

        except Exception as e:
            logger.error(f"Prediction error: {e}")

            PREDICTION_ERRORS.labels(
                model_name=self.model_name,
                model_version=self.model_version,
                error_type=type(e).__name__
            ).inc()

            raise

    def health_check(self) -> Dict[str, Any]:
        """
        Health check endpoint

        Returns:
            Health status dictionary
        """
        if self.model is None:
            return {
                'status': 'unhealthy',
                'reason': 'Model not loaded',
                'timestamp': datetime.now().isoformat(),
            }

        # Check if model is still accessible
        try:
            # Simple smoke test
            test_data = pd.DataFrame([[0] * 10])  # Dummy data
            _ = self.model.predict(test_data)

            return {
                'status': 'healthy',
                'model_name': self.model_name,
                'model_version': self.model_version,
                'loaded_at': self.loaded_at.isoformat() if self.loaded_at else None,
                'uptime_seconds': (datetime.now() - self.loaded_at).total_seconds() if self.loaded_at else 0,
                'timestamp': datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Health check failed: {e}")

            return {
                'status': 'unhealthy',
                'reason': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    def ready_check(self) -> bool:
        """
        Readiness check

        Returns:
            True if model is loaded and ready
        """
        return self.model is not None


# Flask application
app = Flask(__name__)
model_server = None


@app.route('/v1/models/<model_name>:predict', methods=['POST'])
def predict(model_name):
    """
    KServe-compatible prediction endpoint

    POST /v1/models/<model_name>:predict
    Body: {"instances": [[1.0, 2.0, ...], ...]} or {"inputs": {"column1": [...], ...}}
    """
    try:
        data = request.get_json()

        if data is None:
            return jsonify({'error': 'No JSON data provided'}), 400

        # Parse input
        if 'instances' in data:
            # KServe format: array of arrays
            df = pd.DataFrame(data['instances'])
        elif 'inputs' in data:
            # Alternative format: dictionary of columns
            df = pd.DataFrame(data['inputs'])
        else:
            return jsonify({'error': 'Invalid input format. Use "instances" or "inputs"'}), 400

        # Make predictions
        result = model_server.predict(df)

        # KServe-compatible response
        response = {
            'predictions': result['predictions'],
            'model_name': model_name,
            'model_version': result.get('model_version'),
        }

        if 'probabilities' in result:
            response['probabilities'] = result['probabilities']

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Prediction endpoint error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/v1/models/<model_name>', methods=['GET'])
def model_metadata(model_name):
    """Get model metadata"""
    if model_server is None or model_server.model is None:
        return jsonify({'error': 'Model not loaded'}), 503

    return jsonify({
        'name': model_server.model_name,
        'version': model_server.model_version,
        'platform': 'mlflow',
        'inputs': 'dynamic',
        'outputs': 'dynamic',
        'ready': model_server.ready_check(),
    }), 200


@app.route('/health', methods=['GET'])
def health():
    """Liveness probe"""
    return jsonify({'status': 'alive'}), 200


@app.route('/ready', methods=['GET'])
def ready():
    """Readiness probe"""
    if model_server is None or not model_server.ready_check():
        return jsonify({'status': 'not ready'}), 503

    return jsonify({'status': 'ready'}), 200


@app.route('/health/live', methods=['GET'])
def health_live():
    """Kubernetes liveness probe"""
    health_status = model_server.health_check() if model_server else {'status': 'unhealthy'}

    if health_status['status'] == 'healthy':
        return jsonify(health_status), 200
    else:
        return jsonify(health_status), 503


@app.route('/health/ready', methods=['GET'])
def health_ready():
    """Kubernetes readiness probe"""
    if model_server and model_server.ready_check():
        return jsonify({'status': 'ready'}), 200
    else:
        return jsonify({'status': 'not ready'}), 503


@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200, {'Content-Type': 'text/plain; charset=utf-8'}


def create_app(model_uri: str, model_name: str = "default_model", model_version: str = "1"):
    """
    Create Flask app with model server

    Args:
        model_uri: MLflow model URI
        model_name: Model name
        model_version: Model version

    Returns:
        Flask app
    """
    global model_server

    model_server = ModelServer(
        model_uri=model_uri,
        model_name=model_name,
        model_version=model_version
    )

    return app


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='MLflow Model Server (KServe-compatible)')
    parser.add_argument('--model-uri', type=str, required=True, help='MLflow model URI')
    parser.add_argument('--model-name', type=str, default='default_model', help='Model name')
    parser.add_argument('--model-version', type=str, default='1', help='Model version')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host')
    parser.add_argument('--port', type=int, default=8080, help='Port')

    args = parser.parse_args()

    # Create app
    app = create_app(
        model_uri=args.model_uri,
        model_name=args.model_name,
        model_version=args.model_version
    )

    # Run server
    logger.info(f"Starting model server on {args.host}:{args.port}")
    logger.info(f"Model: {args.model_name} v{args.model_version}")
    logger.info(f"Model URI: {args.model_uri}")

    app.run(host=args.host, port=args.port, threaded=True)


if __name__ == '__main__':
    main()
