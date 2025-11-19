#!/usr/bin/env python3
"""
SHAP Explainer Service

Provides SHAP-based explanations for model predictions.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import pandas as pd
import numpy as np
import mlflow
import mlflow.pyfunc
import shap
from flask import Flask, request, jsonify

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SHAPExplainerService:
    """SHAP explainer service for model explanations"""

    def __init__(
        self,
        model_uri: str,
        model_name: str = "default_model",
        cache_explainer: bool = True
    ):
        """
        Initialize SHAP explainer service

        Args:
            model_uri: MLflow model URI
            model_name: Model name
            cache_explainer: Whether to cache the SHAP explainer
        """
        self.model_uri = model_uri
        self.model_name = model_name
        self.cache_explainer = cache_explainer

        self.model = None
        self.explainer = None
        self.feature_names = None
        self.base_value = None

        # Load model and create explainer
        self._load_model_and_explainer()

    def _load_model_and_explainer(self):
        """Load model and create SHAP explainer"""
        logger.info(f"Loading model from: {self.model_uri}")

        try:
            # Load model
            self.model = mlflow.pyfunc.load_model(self.model_uri)

            # Get the underlying sklearn/xgboost model
            underlying_model = self.model._model_impl.python_model

            # Create TreeExplainer for tree-based models
            logger.info("Creating SHAP TreeExplainer...")
            self.explainer = shap.TreeExplainer(underlying_model)

            # Get feature names (if available)
            if hasattr(underlying_model, 'feature_names_in_'):
                self.feature_names = list(underlying_model.feature_names_in_)
            else:
                # Default feature names
                self.feature_names = [f"feature_{i}" for i in range(underlying_model.n_features_in_)]

            # Calculate base value (expected value)
            self.base_value = self.explainer.expected_value

            # For binary classification, use positive class expected value
            if isinstance(self.base_value, np.ndarray):
                self.base_value = self.base_value[1]

            logger.info(f"SHAP explainer created successfully")
            logger.info(f"  Features: {len(self.feature_names)}")
            logger.info(f"  Base value: {self.base_value}")

        except Exception as e:
            logger.error(f"Failed to load model or create explainer: {e}")
            raise

    def explain_prediction(
        self,
        features: pd.DataFrame,
        top_n: int = 10
    ) -> Dict:
        """
        Explain prediction using SHAP values

        Args:
            features: Input features (single row or multiple rows)
            top_n: Number of top features to return

        Returns:
            Dictionary with SHAP values and explanation
        """
        start_time = time.time()

        try:
            # Calculate SHAP values
            shap_values = self.explainer.shap_values(features)

            # For binary classification, use positive class
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

            # Get prediction
            prediction = self.model.predict(features)[0]
            prediction_proba = self.model._model_impl.python_model.predict_proba(features)[0][1]

            # Format SHAP values
            if len(features) == 1:
                # Single prediction
                shap_values_single = shap_values[0]

                # Get feature contributions
                feature_contributions = [
                    {
                        'feature': self.feature_names[i],
                        'value': float(features.iloc[0, i]),
                        'shap_value': float(shap_values_single[i]),
                        'abs_shap': abs(float(shap_values_single[i])),
                    }
                    for i in range(len(self.feature_names))
                ]

                # Sort by absolute SHAP value
                feature_contributions.sort(key=lambda x: x['abs_shap'], reverse=True)

                # Top N features
                top_features = feature_contributions[:top_n]

                latency = time.time() - start_time

                return {
                    'prediction': int(prediction),
                    'probability': float(prediction_proba),
                    'base_value': float(self.base_value),
                    'top_features': top_features,
                    'all_features': feature_contributions,
                    'model_name': self.model_name,
                    'timestamp': datetime.now().isoformat(),
                    'latency_ms': int(latency * 1000),
                }
            else:
                # Multiple predictions (return summary)
                mean_abs_shap = np.abs(shap_values).mean(axis=0)

                feature_importance = [
                    {
                        'feature': self.feature_names[i],
                        'mean_abs_shap': float(mean_abs_shap[i]),
                    }
                    for i in range(len(self.feature_names))
                ]

                feature_importance.sort(key=lambda x: x['mean_abs_shap'], reverse=True)

                latency = time.time() - start_time

                return {
                    'num_samples': len(features),
                    'top_features': feature_importance[:top_n],
                    'model_name': self.model_name,
                    'timestamp': datetime.now().isoformat(),
                    'latency_ms': int(latency * 1000),
                }

        except Exception as e:
            logger.error(f"Explanation failed: {e}")
            raise

    def get_waterfall_data(
        self,
        features: pd.DataFrame
    ) -> Dict:
        """
        Get waterfall plot data for visualization

        Args:
            features: Input features (single row)

        Returns:
            Waterfall data for plotting
        """
        if len(features) != 1:
            raise ValueError("Waterfall plot requires exactly one sample")

        # Calculate SHAP values
        shap_values = self.explainer.shap_values(features)

        # For binary classification, use positive class
        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        shap_values_single = shap_values[0]

        # Create waterfall data
        waterfall_data = {
            'base_value': float(self.base_value),
            'features': [],
        }

        # Add features sorted by absolute SHAP value
        feature_data = [
            {
                'feature': self.feature_names[i],
                'value': float(features.iloc[0, i]),
                'shap_value': float(shap_values_single[i]),
            }
            for i in range(len(self.feature_names))
        ]

        # Sort by absolute SHAP value
        feature_data.sort(key=lambda x: abs(x['shap_value']), reverse=True)

        waterfall_data['features'] = feature_data

        # Calculate final prediction
        waterfall_data['final_value'] = float(
            self.base_value + sum(f['shap_value'] for f in feature_data)
        )

        return waterfall_data


# Flask application for SHAP explainer service
app = Flask(__name__)
explainer_service = None


@app.route('/explain', methods=['POST'])
def explain():
    """
    Explain prediction

    POST /explain
    Body: {"features": [[1.0, 2.0, ...]], "top_n": 10}
    """
    try:
        data = request.get_json()

        if data is None:
            return jsonify({'error': 'No JSON data provided'}), 400

        # Parse features
        if 'features' in data:
            features_array = data['features']
            features_df = pd.DataFrame(features_array, columns=explainer_service.feature_names)
        else:
            return jsonify({'error': 'Missing "features" in request'}), 400

        top_n = data.get('top_n', 10)

        # Explain
        explanation = explainer_service.explain_prediction(features_df, top_n=top_n)

        return jsonify(explanation), 200

    except Exception as e:
        logger.error(f"Explanation error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/waterfall', methods=['POST'])
def waterfall():
    """
    Get waterfall plot data

    POST /waterfall
    Body: {"features": [[1.0, 2.0, ...]]}
    """
    try:
        data = request.get_json()

        if data is None:
            return jsonify({'error': 'No JSON data provided'}), 400

        # Parse features
        if 'features' in data:
            features_array = data['features']

            if not isinstance(features_array, list) or len(features_array) != 1:
                return jsonify({'error': 'Waterfall requires exactly one sample'}), 400

            features_df = pd.DataFrame(features_array, columns=explainer_service.feature_names)
        else:
            return jsonify({'error': 'Missing "features" in request'}), 400

        # Get waterfall data
        waterfall_data = explainer_service.get_waterfall_data(features_df)

        return jsonify(waterfall_data), 200

    except Exception as e:
        logger.error(f"Waterfall error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    if explainer_service is None or explainer_service.explainer is None:
        return jsonify({'status': 'unhealthy'}), 503

    return jsonify({'status': 'healthy'}), 200


def create_app(model_uri: str, model_name: str = "default_model"):
    """
    Create Flask app with SHAP explainer

    Args:
        model_uri: MLflow model URI
        model_name: Model name

    Returns:
        Flask app
    """
    global explainer_service

    explainer_service = SHAPExplainerService(
        model_uri=model_uri,
        model_name=model_name,
    )

    return app


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='SHAP Explainer Service')
    parser.add_argument('--model-uri', type=str, required=True, help='MLflow model URI')
    parser.add_argument('--model-name', type=str, default='default_model', help='Model name')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host')
    parser.add_argument('--port', type=int, default=8081, help='Port (default: 8081)')

    args = parser.parse_args()

    # Create app
    app = create_app(
        model_uri=args.model_uri,
        model_name=args.model_name
    )

    # Run server
    logger.info(f"Starting SHAP explainer service on {args.host}:{args.port}")
    logger.info(f"Model: {args.model_name}")
    logger.info(f"Model URI: {args.model_uri}")

    app.run(host=args.host, port=args.port, threaded=True)


if __name__ == '__main__':
    main()
