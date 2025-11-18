#!/usr/bin/env python3
"""
Baseline Model Training for Predictive Maintenance

Trains multiple baseline models, performs hyperparameter tuning, and registers best model to MLflow.
"""

import os
import sys
import argparse
import yaml
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import GridSearchCV
import xgboost as xgb
import lightgbm as lgb

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from datasets.load_dataset import load_dataset, print_dataset_info


class BaselineModelTrainer:
    """Train and evaluate baseline models"""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize model trainer

        Args:
            config_path: Path to configuration YAML file
        """
        self.config = self._load_config(config_path)
        self.mlflow_tracking_uri = self.config.get('mlflow_tracking_uri', 'http://localhost:5000')
        self.experiment_name = self.config.get('experiment_name', 'predictive_maintenance')
        self.random_state = self.config.get('random_state', 42)

        # Configure MLflow
        mlflow.set_tracking_uri(self.mlflow_tracking_uri)
        mlflow.set_experiment(self.experiment_name)

        self.trained_models = []

    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load configuration from YAML file"""
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)

        # Default configuration
        return {
            'mlflow_tracking_uri': 'http://localhost:5000',
            'experiment_name': 'predictive_maintenance_baseline',
            'random_state': 42,
            'use_hyperparameter_tuning': True,
            'tuning_cv_folds': 3,
            'models': {
                'logistic_regression': {
                    'enabled': True,
                    'params': {'max_iter': 1000, 'class_weight': 'balanced'},
                    'param_grid': {
                        'C': [0.01, 0.1, 1.0, 10.0],
                        'penalty': ['l1', 'l2'],
                        'solver': ['liblinear'],
                    }
                },
                'random_forest': {
                    'enabled': True,
                    'params': {'class_weight': 'balanced', 'n_jobs': -1},
                    'param_grid': {
                        'n_estimators': [100, 200],
                        'max_depth': [10, 20, None],
                        'min_samples_split': [2, 5],
                    }
                },
                'xgboost': {
                    'enabled': True,
                    'params': {'use_label_encoder': False, 'eval_metric': 'logloss'},
                    'param_grid': {
                        'n_estimators': [100, 200],
                        'max_depth': [3, 5, 7],
                        'learning_rate': [0.01, 0.1],
                        'scale_pos_weight': [1, 5, 10],
                    }
                },
            }
        }

    def train_logistic_regression(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        tune_hyperparameters: bool = True
    ) -> Dict:
        """Train logistic regression model"""
        print("\n" + "=" * 70)
        print("Training: Logistic Regression")
        print("=" * 70)

        model_config = self.config['models']['logistic_regression']

        with mlflow.start_run(run_name="logistic_regression") as run:
            if tune_hyperparameters and 'param_grid' in model_config:
                print("Performing hyperparameter tuning...")
                base_model = LogisticRegression(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )

                grid_search = GridSearchCV(
                    base_model,
                    model_config['param_grid'],
                    cv=self.config.get('tuning_cv_folds', 3),
                    scoring='f1',
                    n_jobs=-1,
                    verbose=1
                )

                grid_search.fit(X_train, y_train)
                model = grid_search.best_estimator_
                best_params = grid_search.best_params_

                print(f"Best parameters: {best_params}")
                mlflow.log_params({f"best_{k}": v for k, v in best_params.items()})
            else:
                print("Training with default parameters...")
                model = LogisticRegression(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )
                model.fit(X_train, y_train)

            # Evaluate
            metrics = self._evaluate_model(model, X_train, y_train, X_test, y_test)

            # Log to MLflow
            mlflow.log_params(model_config.get('params', {}))
            mlflow.log_metrics(metrics)

            # Log model
            from mlflow.models.signature import infer_signature
            signature = infer_signature(X_train, model.predict(X_train))

            mlflow.sklearn.log_model(
                model,
                artifact_path="model",
                signature=signature,
                input_example=X_train.head(5),
            )

            result = {
                'name': 'logistic_regression',
                'model': model,
                'metrics': metrics,
                'run_id': run.info.run_id,
            }

            self.trained_models.append(result)
            self._print_metrics(metrics)

            return result

    def train_random_forest(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        tune_hyperparameters: bool = True
    ) -> Dict:
        """Train random forest model"""
        print("\n" + "=" * 70)
        print("Training: Random Forest")
        print("=" * 70)

        model_config = self.config['models']['random_forest']

        with mlflow.start_run(run_name="random_forest") as run:
            if tune_hyperparameters and 'param_grid' in model_config:
                print("Performing hyperparameter tuning...")
                base_model = RandomForestClassifier(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )

                grid_search = GridSearchCV(
                    base_model,
                    model_config['param_grid'],
                    cv=self.config.get('tuning_cv_folds', 3),
                    scoring='f1',
                    n_jobs=-1,
                    verbose=1
                )

                grid_search.fit(X_train, y_train)
                model = grid_search.best_estimator_
                best_params = grid_search.best_params_

                print(f"Best parameters: {best_params}")
                mlflow.log_params({f"best_{k}": v for k, v in best_params.items()})
            else:
                print("Training with default parameters...")
                model = RandomForestClassifier(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )
                model.fit(X_train, y_train)

            # Evaluate
            metrics = self._evaluate_model(model, X_train, y_train, X_test, y_test)

            # Feature importance
            feature_importance = pd.DataFrame({
                'feature': X_train.columns,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)

            print("\nTop 10 Features:")
            print(feature_importance.head(10).to_string(index=False))

            # Log to MLflow
            mlflow.log_params(model_config.get('params', {}))
            mlflow.log_metrics(metrics)

            # Log feature importance
            feature_importance.to_csv('/tmp/feature_importance.csv', index=False)
            mlflow.log_artifact('/tmp/feature_importance.csv')

            # Log model
            from mlflow.models.signature import infer_signature
            signature = infer_signature(X_train, model.predict(X_train))

            mlflow.sklearn.log_model(
                model,
                artifact_path="model",
                signature=signature,
                input_example=X_train.head(5),
            )

            result = {
                'name': 'random_forest',
                'model': model,
                'metrics': metrics,
                'run_id': run.info.run_id,
                'feature_importance': feature_importance,
            }

            self.trained_models.append(result)
            self._print_metrics(metrics)

            return result

    def train_xgboost(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        tune_hyperparameters: bool = True
    ) -> Dict:
        """Train XGBoost model"""
        print("\n" + "=" * 70)
        print("Training: XGBoost")
        print("=" * 70)

        model_config = self.config['models']['xgboost']

        with mlflow.start_run(run_name="xgboost") as run:
            if tune_hyperparameters and 'param_grid' in model_config:
                print("Performing hyperparameter tuning...")
                base_model = xgb.XGBClassifier(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )

                grid_search = GridSearchCV(
                    base_model,
                    model_config['param_grid'],
                    cv=self.config.get('tuning_cv_folds', 3),
                    scoring='f1',
                    n_jobs=-1,
                    verbose=1
                )

                grid_search.fit(X_train, y_train)
                model = grid_search.best_estimator_
                best_params = grid_search.best_params_

                print(f"Best parameters: {best_params}")
                mlflow.log_params({f"best_{k}": v for k, v in best_params.items()})
            else:
                print("Training with default parameters...")
                model = xgb.XGBClassifier(
                    random_state=self.random_state,
                    **model_config.get('params', {})
                )
                model.fit(X_train, y_train)

            # Evaluate
            metrics = self._evaluate_model(model, X_train, y_train, X_test, y_test)

            # Feature importance
            feature_importance = pd.DataFrame({
                'feature': X_train.columns,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)

            print("\nTop 10 Features:")
            print(feature_importance.head(10).to_string(index=False))

            # Log to MLflow
            mlflow.log_params(model_config.get('params', {}))
            mlflow.log_metrics(metrics)

            # Log feature importance
            feature_importance.to_csv('/tmp/feature_importance.csv', index=False)
            mlflow.log_artifact('/tmp/feature_importance.csv')

            # Log model
            from mlflow.models.signature import infer_signature
            signature = infer_signature(X_train, model.predict(X_train))

            mlflow.xgboost.log_model(
                model,
                artifact_path="model",
                signature=signature,
                input_example=X_train.head(5),
            )

            result = {
                'name': 'xgboost',
                'model': model,
                'metrics': metrics,
                'run_id': run.info.run_id,
                'feature_importance': feature_importance,
            }

            self.trained_models.append(result)
            self._print_metrics(metrics)

            return result

    def _evaluate_model(
        self,
        model,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict:
        """Evaluate model on train and test sets"""
        # Predictions
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)

        # Probabilities (for ROC-AUC)
        if hasattr(model, 'predict_proba'):
            y_pred_proba_test = model.predict_proba(X_test)[:, 1]
        else:
            y_pred_proba_test = model.decision_function(X_test)

        # Metrics
        metrics = {
            'train_accuracy': accuracy_score(y_train, y_pred_train),
            'train_precision': precision_score(y_train, y_pred_train, zero_division=0),
            'train_recall': recall_score(y_train, y_pred_train, zero_division=0),
            'train_f1': f1_score(y_train, y_pred_train, zero_division=0),
            'test_accuracy': accuracy_score(y_test, y_pred_test),
            'test_precision': precision_score(y_test, y_pred_test, zero_division=0),
            'test_recall': recall_score(y_test, y_pred_test, zero_division=0),
            'test_f1': f1_score(y_test, y_pred_test, zero_division=0),
            'test_roc_auc': roc_auc_score(y_test, y_pred_proba_test),
        }

        return metrics

    def _print_metrics(self, metrics: Dict):
        """Print model metrics"""
        print("\nModel Performance:")
        print("-" * 70)
        print(f"  Train Accuracy:  {metrics['train_accuracy']:.4f}")
        print(f"  Train Precision: {metrics['train_precision']:.4f}")
        print(f"  Train Recall:    {metrics['train_recall']:.4f}")
        print(f"  Train F1:        {metrics['train_f1']:.4f}")
        print()
        print(f"  Test Accuracy:   {metrics['test_accuracy']:.4f}")
        print(f"  Test Precision:  {metrics['test_precision']:.4f}")
        print(f"  Test Recall:     {metrics['test_recall']:.4f}")
        print(f"  Test F1:         {metrics['test_f1']:.4f}")
        print(f"  Test ROC-AUC:    {metrics['test_roc_auc']:.4f}")
        print("-" * 70)

    def compare_models(self) -> Dict:
        """Compare all trained models and select best"""
        print("\n" + "=" * 70)
        print("Model Comparison")
        print("=" * 70)

        if not self.trained_models:
            print("No models trained yet!")
            return None

        # Sort by test F1 score
        sorted_models = sorted(
            self.trained_models,
            key=lambda m: m['metrics']['test_f1'],
            reverse=True
        )

        # Print comparison table
        print(f"\n{'Model':<20} {'Test F1':<12} {'Test ROC-AUC':<12} {'Test Precision':<15} {'Test Recall':<12}")
        print("-" * 70)

        for i, model_info in enumerate(sorted_models):
            name = model_info['name']
            f1 = model_info['metrics']['test_f1']
            roc_auc = model_info['metrics']['test_roc_auc']
            precision = model_info['metrics']['test_precision']
            recall = model_info['metrics']['test_recall']

            marker = "🏆" if i == 0 else "  "
            print(f"{marker} {name:<18} {f1:<12.4f} {roc_auc:<12.4f} {precision:<15.4f} {recall:<12.4f}")

        best_model = sorted_models[0]

        print()
        print(f"Best Model: {best_model['name']}")
        print(f"  Test F1: {best_model['metrics']['test_f1']:.4f}")
        print(f"  Test ROC-AUC: {best_model['metrics']['test_roc_auc']:.4f}")
        print(f"  Run ID: {best_model['run_id']}")
        print()

        return best_model

    def register_best_model(self, best_model: Dict, registered_model_name: str = "predictive_maintenance_best"):
        """Register best model to MLflow model registry"""
        print("\n" + "=" * 70)
        print("Model Registration")
        print("=" * 70)

        model_uri = f"runs:/{best_model['run_id']}/model"

        # Register model
        result = mlflow.register_model(
            model_uri=model_uri,
            name=registered_model_name
        )

        print(f"✓ Registered model: {registered_model_name}")
        print(f"  Version: {result.version}")
        print(f"  Model URI: {model_uri}")
        print()

        # Transition to staging
        from mlflow.tracking import MlflowClient
        client = MlflowClient()

        client.transition_model_version_stage(
            name=registered_model_name,
            version=result.version,
            stage="Staging"
        )

        print(f"✓ Transitioned to Staging")
        print()

        # Add description
        client.update_model_version(
            name=registered_model_name,
            version=result.version,
            description=f"Baseline {best_model['name']} model with Test F1={best_model['metrics']['test_f1']:.4f}"
        )

        return result

    def train_all(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ):
        """Train all enabled models"""
        print("\n" + "=" * 70)
        print("Baseline Model Training")
        print("=" * 70)
        print(f"Experiment: {self.experiment_name}")
        print(f"MLflow Tracking URI: {self.mlflow_tracking_uri}")
        print()

        tune_hyperparameters = self.config.get('use_hyperparameter_tuning', True)

        # Train Logistic Regression
        if self.config['models']['logistic_regression'].get('enabled', True):
            self.train_logistic_regression(X_train, y_train, X_test, y_test, tune_hyperparameters)

        # Train Random Forest
        if self.config['models']['random_forest'].get('enabled', True):
            self.train_random_forest(X_train, y_train, X_test, y_test, tune_hyperparameters)

        # Train XGBoost
        if self.config['models']['xgboost'].get('enabled', True):
            self.train_xgboost(X_train, y_train, X_test, y_test, tune_hyperparameters)

        # Compare and select best
        best_model = self.compare_models()

        # Register best model
        if best_model:
            self.register_best_model(best_model)

        print("\n" + "=" * 70)
        print("Training Complete!")
        print("=" * 70)
        print(f"Trained {len(self.trained_models)} models")
        print(f"Best model: {best_model['name']}")
        print(f"Test F1: {best_model['metrics']['test_f1']:.4f}")
        print()
        print("Next steps:")
        print("1. Review models in MLflow UI: http://localhost:5000")
        print("2. Validate staging model on real data")
        print("3. Promote to production if validation passes")
        print()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Train baseline models for predictive maintenance')
    parser.add_argument(
        '--config',
        type=str,
        help='Path to configuration YAML file'
    )
    parser.add_argument(
        '--dataset-version',
        type=str,
        default='v1.0',
        help='Dataset version to use (default: v1.0)'
    )
    parser.add_argument(
        '--dataset-dir',
        type=str,
        default='/tmp/dcmms/datasets',
        help='Dataset directory (default: /tmp/dcmms/datasets)'
    )
    parser.add_argument(
        '--no-tuning',
        action='store_true',
        help='Disable hyperparameter tuning'
    )

    args = parser.parse_args()

    # Load dataset
    print("=" * 70)
    print("Loading Dataset")
    print("=" * 70)
    print(f"Version: {args.dataset_version}")
    print(f"Directory: {args.dataset_dir}")
    print()

    X_train, X_test, y_train, y_test, metadata = load_dataset(
        dataset_version=args.dataset_version,
        dataset_dir=args.dataset_dir
    )

    print_dataset_info(X_train, X_test, y_train, y_test, metadata)

    # Train models
    trainer = BaselineModelTrainer(config_path=args.config)

    if args.no_tuning:
        trainer.config['use_hyperparameter_tuning'] = False

    # Log dataset version to MLflow
    mlflow.set_experiment(trainer.experiment_name)
    mlflow.log_param("dataset_version", args.dataset_version)

    trainer.train_all(X_train, y_train, X_test, y_test)


if __name__ == '__main__':
    main()
