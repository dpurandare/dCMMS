#!/usr/bin/env python3
"""
Hyperparameter Tuning with Optuna

Uses Bayesian optimization to find optimal hyperparameters for ML models.
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Optional

import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
import mlflow.xgboost
import optuna
from optuna.integration.mlflow import MLflowCallback
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
import xgboost as xgb

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from datasets.load_dataset import load_dataset


class OptunaHyperparameterTuner:
    """Hyperparameter tuning with Optuna"""

    def __init__(
        self,
        mlflow_tracking_uri: str = 'http://localhost:5000',
        experiment_name: str = 'predictive_maintenance_tuning',
        n_trials: int = 50,
        cv_folds: int = 5,
        random_state: int = 42
    ):
        """
        Initialize tuner

        Args:
            mlflow_tracking_uri: MLflow tracking server URI
            experiment_name: MLflow experiment name
            n_trials: Number of Optuna trials
            cv_folds: Number of cross-validation folds
            random_state: Random seed
        """
        self.mlflow_tracking_uri = mlflow_tracking_uri
        self.experiment_name = experiment_name
        self.n_trials = n_trials
        self.cv_folds = cv_folds
        self.random_state = random_state

        # Configure MLflow
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        mlflow.set_experiment(experiment_name)

        self.best_params = {}
        self.best_models = {}

    def objective_xgboost(
        self,
        trial: optuna.Trial,
        X_train: pd.DataFrame,
        y_train: pd.Series
    ) -> float:
        """
        Objective function for XGBoost hyperparameter tuning

        Args:
            trial: Optuna trial
            X_train: Training features
            y_train: Training labels

        Returns:
            F1 score (to maximize)
        """
        # Suggest hyperparameters
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 100, 500),
            'max_depth': trial.suggest_int('max_depth', 3, 10),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'gamma': trial.suggest_float('gamma', 0.0, 1.0),
            'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1.0, 10.0),
            'random_state': self.random_state,
            'use_label_encoder': False,
            'eval_metric': 'logloss',
        }

        # Create model
        model = xgb.XGBClassifier(**params)

        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=self.cv_folds)

        # Calculate F1 score with CV
        cv_scores = cross_val_score(
            model,
            X_train,
            y_train,
            cv=tscv,
            scoring='f1',
            n_jobs=-1
        )

        return np.mean(cv_scores)

    def objective_random_forest(
        self,
        trial: optuna.Trial,
        X_train: pd.DataFrame,
        y_train: pd.Series
    ) -> float:
        """
        Objective function for Random Forest hyperparameter tuning

        Args:
            trial: Optuna trial
            X_train: Training features
            y_train: Training labels

        Returns:
            F1 score (to maximize)
        """
        # Suggest hyperparameters
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 100, 300),
            'max_depth': trial.suggest_int('max_depth', 5, 30),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 4),
            'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', None]),
            'class_weight': 'balanced',
            'random_state': self.random_state,
            'n_jobs': -1,
        }

        # Create model
        model = RandomForestClassifier(**params)

        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=self.cv_folds)

        # Calculate F1 score with CV
        cv_scores = cross_val_score(
            model,
            X_train,
            y_train,
            cv=tscv,
            scoring='f1',
            n_jobs=-1
        )

        return np.mean(cv_scores)

    def tune_xgboost(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict:
        """
        Tune XGBoost hyperparameters

        Args:
            X_train: Training features
            y_train: Training labels
            X_test: Test features
            y_test: Test labels

        Returns:
            Dict with best params, best model, and metrics
        """
        print("\n" + "=" * 70)
        print("Tuning XGBoost Hyperparameters")
        print("=" * 70)
        print(f"Trials: {self.n_trials}")
        print(f"CV folds: {self.cv_folds}")
        print()

        # Create Optuna study
        study = optuna.create_study(
            direction='maximize',
            study_name='xgboost_tuning',
            sampler=optuna.samplers.TPESampler(seed=self.random_state)
        )

        # Optimize
        study.optimize(
            lambda trial: self.objective_xgboost(trial, X_train, y_train),
            n_trials=self.n_trials,
            show_progress_bar=True
        )

        # Best parameters
        best_params = study.best_params
        best_params.update({
            'random_state': self.random_state,
            'use_label_encoder': False,
            'eval_metric': 'logloss',
        })

        print("\nBest Parameters:")
        for param, value in best_params.items():
            print(f"  {param}: {value}")

        print(f"\nBest CV F1 Score: {study.best_value:.4f}")

        # Train final model with best parameters
        print("\nTraining final model with best parameters...")
        model = xgb.XGBClassifier(**best_params)
        model.fit(X_train, y_train)

        # Evaluate on test set
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]

        metrics = {
            'test_f1': f1_score(y_test, y_pred),
            'test_precision': precision_score(y_test, y_pred),
            'test_recall': recall_score(y_test, y_pred),
            'test_roc_auc': roc_auc_score(y_test, y_pred_proba),
            'cv_f1_mean': study.best_value,
        }

        print("\nTest Set Performance:")
        print(f"  F1 Score: {metrics['test_f1']:.4f}")
        print(f"  Precision: {metrics['test_precision']:.4f}")
        print(f"  Recall: {metrics['test_recall']:.4f}")
        print(f"  ROC-AUC: {metrics['test_roc_auc']:.4f}")

        # Log to MLflow
        with mlflow.start_run(run_name="xgboost_tuned"):
            # Log parameters
            mlflow.log_params(best_params)
            mlflow.log_param('n_trials', self.n_trials)
            mlflow.log_param('cv_folds', self.cv_folds)

            # Log metrics
            mlflow.log_metrics(metrics)

            # Log model
            from mlflow.models.signature import infer_signature
            signature = infer_signature(X_train, model.predict(X_train))

            mlflow.xgboost.log_model(
                model,
                artifact_path="model",
                signature=signature,
                input_example=X_train.head(5),
            )

            # Log optimization history
            import matplotlib.pyplot as plt

            fig = optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.tight_layout()
            plt.savefig('/tmp/xgboost_optimization_history.png')
            mlflow.log_artifact('/tmp/xgboost_optimization_history.png')

            # Log parameter importances
            fig = optuna.visualization.matplotlib.plot_param_importances(study)
            plt.tight_layout()
            plt.savefig('/tmp/xgboost_param_importances.png')
            mlflow.log_artifact('/tmp/xgboost_param_importances.png')

        self.best_params['xgboost'] = best_params
        self.best_models['xgboost'] = model

        return {
            'model_name': 'xgboost',
            'best_params': best_params,
            'model': model,
            'metrics': metrics,
            'study': study,
        }

    def tune_random_forest(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict:
        """
        Tune Random Forest hyperparameters

        Args:
            X_train: Training features
            y_train: Training labels
            X_test: Test features
            y_test: Test labels

        Returns:
            Dict with best params, best model, and metrics
        """
        print("\n" + "=" * 70)
        print("Tuning Random Forest Hyperparameters")
        print("=" * 70)
        print(f"Trials: {self.n_trials}")
        print(f"CV folds: {self.cv_folds}")
        print()

        # Create Optuna study
        study = optuna.create_study(
            direction='maximize',
            study_name='random_forest_tuning',
            sampler=optuna.samplers.TPESampler(seed=self.random_state)
        )

        # Optimize
        study.optimize(
            lambda trial: self.objective_random_forest(trial, X_train, y_train),
            n_trials=self.n_trials,
            show_progress_bar=True
        )

        # Best parameters
        best_params = study.best_params
        best_params.update({
            'class_weight': 'balanced',
            'random_state': self.random_state,
            'n_jobs': -1,
        })

        print("\nBest Parameters:")
        for param, value in best_params.items():
            print(f"  {param}: {value}")

        print(f"\nBest CV F1 Score: {study.best_value:.4f}")

        # Train final model with best parameters
        print("\nTraining final model with best parameters...")
        model = RandomForestClassifier(**best_params)
        model.fit(X_train, y_train)

        # Evaluate on test set
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]

        metrics = {
            'test_f1': f1_score(y_test, y_pred),
            'test_precision': precision_score(y_test, y_pred),
            'test_recall': recall_score(y_test, y_pred),
            'test_roc_auc': roc_auc_score(y_test, y_pred_proba),
            'cv_f1_mean': study.best_value,
        }

        print("\nTest Set Performance:")
        print(f"  F1 Score: {metrics['test_f1']:.4f}")
        print(f"  Precision: {metrics['test_precision']:.4f}")
        print(f"  Recall: {metrics['test_recall']:.4f}")
        print(f"  ROC-AUC: {metrics['test_roc_auc']:.4f}")

        # Log to MLflow
        with mlflow.start_run(run_name="random_forest_tuned"):
            # Log parameters
            mlflow.log_params(best_params)
            mlflow.log_param('n_trials', self.n_trials)
            mlflow.log_param('cv_folds', self.cv_folds)

            # Log metrics
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

            # Log optimization history
            import matplotlib.pyplot as plt

            fig = optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.tight_layout()
            plt.savefig('/tmp/rf_optimization_history.png')
            mlflow.log_artifact('/tmp/rf_optimization_history.png')

            # Log parameter importances
            fig = optuna.visualization.matplotlib.plot_param_importances(study)
            plt.tight_layout()
            plt.savefig('/tmp/rf_param_importances.png')
            mlflow.log_artifact('/tmp/rf_param_importances.png')

        self.best_params['random_forest'] = best_params
        self.best_models['random_forest'] = model

        return {
            'model_name': 'random_forest',
            'best_params': best_params,
            'model': model,
            'metrics': metrics,
            'study': study,
        }

    def compare_and_select_best(
        self,
        results: list,
        baseline_f1: Optional[float] = None
    ) -> Dict:
        """
        Compare tuned models and select best

        Args:
            results: List of tuning results
            baseline_f1: Baseline F1 score for comparison

        Returns:
            Best model result
        """
        print("\n" + "=" * 70)
        print("Model Comparison")
        print("=" * 70)

        # Sort by test F1
        sorted_results = sorted(results, key=lambda r: r['metrics']['test_f1'], reverse=True)

        # Print comparison
        print(f"\n{'Model':<20} {'CV F1':<12} {'Test F1':<12} {'Test Precision':<15} {'Test Recall':<12}")
        print("-" * 70)

        for i, result in enumerate(sorted_results):
            name = result['model_name']
            cv_f1 = result['metrics']['cv_f1_mean']
            test_f1 = result['metrics']['test_f1']
            precision = result['metrics']['test_precision']
            recall = result['metrics']['test_recall']

            marker = "🏆" if i == 0 else "  "
            print(f"{marker} {name:<18} {cv_f1:<12.4f} {test_f1:<12.4f} {precision:<15.4f} {recall:<12.4f}")

        best = sorted_results[0]

        print(f"\nBest Model: {best['model_name']}")
        print(f"  CV F1: {best['metrics']['cv_f1_mean']:.4f}")
        print(f"  Test F1: {best['metrics']['test_f1']:.4f}")

        if baseline_f1:
            improvement = (best['metrics']['test_f1'] - baseline_f1) / baseline_f1 * 100
            print(f"  Improvement over baseline: {improvement:+.1f}%")

            if improvement > 10:
                print("  ✓ Target achieved: >10% improvement!")
            else:
                print(f"  ⚠ Target not achieved (need >10% improvement)")

        return best


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Hyperparameter tuning with Optuna')
    parser.add_argument(
        '--dataset-version',
        type=str,
        default='v1.0',
        help='Dataset version (default: v1.0)'
    )
    parser.add_argument(
        '--n-trials',
        type=int,
        default=50,
        help='Number of Optuna trials (default: 50)'
    )
    parser.add_argument(
        '--cv-folds',
        type=int,
        default=5,
        help='Number of CV folds (default: 5)'
    )
    parser.add_argument(
        '--baseline-f1',
        type=float,
        help='Baseline F1 score for comparison'
    )

    args = parser.parse_args()

    # Load dataset
    print("=" * 70)
    print("Loading Dataset")
    print("=" * 70)
    print(f"Version: {args.dataset_version}")
    print()

    X_train, X_test, y_train, y_test, metadata = load_dataset(
        dataset_version=args.dataset_version
    )

    print(f"Train samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Features: {len(X_train.columns)}")
    print()

    # Create tuner
    tuner = OptunaHyperparameterTuner(
        n_trials=args.n_trials,
        cv_folds=args.cv_folds
    )

    # Tune models
    results = []

    # Tune XGBoost
    xgb_result = tuner.tune_xgboost(X_train, y_train, X_test, y_test)
    results.append(xgb_result)

    # Tune Random Forest
    rf_result = tuner.tune_random_forest(X_train, y_train, X_test, y_test)
    results.append(rf_result)

    # Compare and select best
    best = tuner.compare_and_select_best(results, baseline_f1=args.baseline_f1)

    print("\n" + "=" * 70)
    print("Hyperparameter Tuning Complete!")
    print("=" * 70)
    print(f"Best model: {best['model_name']}")
    print(f"Test F1: {best['metrics']['test_f1']:.4f}")
    print()
    print("Next steps:")
    print("1. Review tuning results in MLflow UI")
    print("2. Validate model on hold-out set")
    print("3. Register model to MLflow registry")
    print()


if __name__ == '__main__':
    main()
