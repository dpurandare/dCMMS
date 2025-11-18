#!/usr/bin/env python3
"""
Metaflow: Predictive Maintenance Training Pipeline
End-to-end ML pipeline: data ingestion → feature engineering → model training → evaluation
"""

from metaflow import FlowSpec, step, Parameter, conda_base
import mlflow
import mlflow.sklearn
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score


@conda_base(
    libraries={
        'pandas': '2.2.0',
        'numpy': '1.26.3',
        'scikit-learn': '1.4.0',
        'mlflow': '2.10.2',
    }
)
class PredictiveMaintenanceFlow(FlowSpec):
    """
    Predictive Maintenance ML Pipeline

    Steps:
    1. Data Ingestion - Load data from PostgreSQL/ClickHouse
    2. Feature Engineering - Create features using Feast
    3. Train/Test Split - Split data for training
    4. Model Training - Train multiple models
    5. Model Evaluation - Evaluate and compare models
    6. Model Registration - Register best model to MLflow
    """

    # Flow parameters (configurable via CLI)
    data_version = Parameter(
        'data-version',
        default='v1.0',
        help='Dataset version to use for training'
    )

    test_size = Parameter(
        'test-size',
        default=0.2,
        type=float,
        help='Test set size (0.0 to 1.0)'
    )

    random_state = Parameter(
        'random-state',
        default=42,
        type=int,
        help='Random seed for reproducibility'
    )

    mlflow_tracking_uri = Parameter(
        'mlflow-tracking-uri',
        default='http://localhost:5000',
        help='MLflow tracking server URI'
    )

    experiment_name = Parameter(
        'experiment-name',
        default='predictive_maintenance',
        help='MLflow experiment name'
    )

    @step
    def start(self):
        """
        Initialize flow and set MLflow tracking
        """
        print("=" * 60)
        print("Predictive Maintenance Training Pipeline")
        print("=" * 60)
        print(f"Data Version: {self.data_version}")
        print(f"Test Size: {self.test_size}")
        print(f"Random State: {self.random_state}")
        print()

        # Configure MLflow
        mlflow.set_tracking_uri(self.mlflow_tracking_uri)
        mlflow.set_experiment(self.experiment_name)

        self.next(self.load_data)

    @step
    def load_data(self):
        """
        Load training data from data sources
        In production, this would connect to PostgreSQL/ClickHouse
        For now, generate synthetic data
        """
        print("Step 1: Data Ingestion")
        print("-" * 60)

        # Generate synthetic dataset
        np.random.seed(self.random_state)
        n_samples = 1000

        # Features
        self.X = pd.DataFrame({
            'asset_age_months': np.random.randint(1, 120, n_samples),
            'days_since_last_maintenance': np.random.randint(0, 365, n_samples),
            'total_work_orders': np.random.randint(0, 50, n_samples),
            'corrective_wo_count_30d': np.random.randint(0, 10, n_samples),
            'health_score': np.random.uniform(0, 100, n_samples),
            'rolling_avg_power_7d': np.random.uniform(50, 150, n_samples),
            'anomaly_count_30d': np.random.randint(0, 20, n_samples),
            'mttr_hours': np.random.uniform(0, 48, n_samples),
            'mtbf_hours': np.random.uniform(100, 1000, n_samples),
            'recent_alarms_30d': np.random.randint(0, 15, n_samples),
        })

        # Labels (failure within 7 days)
        self.y = ((self.X['health_score'] < 50) |
                  (self.X['corrective_wo_count_30d'] > 5) |
                  (self.X['anomaly_count_30d'] > 10)).astype(int)

        print(f"✓ Loaded {len(self.X)} samples")
        print(f"  Features: {list(self.X.columns)}")
        print(f"  Class distribution: {np.bincount(self.y)}")
        print(f"  Positive rate: {self.y.mean():.2%}")
        print()

        self.next(self.feature_engineering)

    @step
    def feature_engineering(self):
        """
        Feature engineering and transformations
        In production, this would use Feast feature store
        """
        print("Step 2: Feature Engineering")
        print("-" * 60)

        # Create derived features
        self.X['wo_rate'] = self.X['total_work_orders'] / (self.X['asset_age_months'] + 1)
        self.X['maintenance_health_ratio'] = (
            self.X['days_since_last_maintenance'] / (self.X['health_score'] + 1)
        )
        self.X['alarm_anomaly_ratio'] = (
            self.X['recent_alarms_30d'] / (self.X['anomaly_count_30d'] + 1)
        )

        # Log feature statistics
        self.feature_stats = {
            'n_features': len(self.X.columns),
            'feature_names': list(self.X.columns),
            'missing_values': self.X.isnull().sum().to_dict(),
        }

        print(f"✓ Engineered {len(self.X.columns)} features")
        print(f"  Original: 10 features")
        print(f"  Derived: 3 features")
        print()

        self.next(self.split_data)

    @step
    def split_data(self):
        """
        Split data into train and test sets
        """
        print("Step 3: Train/Test Split")
        print("-" * 60)

        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            self.X,
            self.y,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=self.y
        )

        print(f"✓ Split data:")
        print(f"  Train: {len(self.X_train)} samples ({1-self.test_size:.0%})")
        print(f"  Test: {len(self.X_test)} samples ({self.test_size:.0%})")
        print(f"  Train positive rate: {self.y_train.mean():.2%}")
        print(f"  Test positive rate: {self.y_test.mean():.2%}")
        print()

        self.next(self.train_models)

    @step
    def train_models(self):
        """
        Train multiple models and log to MLflow
        """
        print("Step 4: Model Training")
        print("-" * 60)

        models_config = [
            {
                'name': 'random_forest_baseline',
                'model': RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    min_samples_split=5,
                    random_state=self.random_state,
                    class_weight='balanced'
                ),
                'params': {
                    'n_estimators': 100,
                    'max_depth': 10,
                    'min_samples_split': 5,
                }
            },
            {
                'name': 'random_forest_deep',
                'model': RandomForestClassifier(
                    n_estimators=200,
                    max_depth=20,
                    min_samples_split=2,
                    random_state=self.random_state,
                    class_weight='balanced'
                ),
                'params': {
                    'n_estimators': 200,
                    'max_depth': 20,
                    'min_samples_split': 2,
                }
            },
        ]

        self.trained_models = []

        for config in models_config:
            print(f"\nTraining: {config['name']}")

            with mlflow.start_run(run_name=config['name'], nested=True) as run:
                # Log parameters
                mlflow.log_params(config['params'])
                mlflow.log_param('data_version', self.data_version)
                mlflow.log_param('test_size', self.test_size)

                # Train model
                model = config['model']
                model.fit(self.X_train, self.y_train)

                # Predictions
                y_pred_train = model.predict(self.X_train)
                y_pred_test = model.predict(self.X_test)
                y_pred_proba_test = model.predict_proba(self.X_test)[:, 1]

                # Metrics
                metrics = {
                    'train_accuracy': accuracy_score(self.y_train, y_pred_train),
                    'train_f1': f1_score(self.y_train, y_pred_train, zero_division=0),
                    'test_accuracy': accuracy_score(self.y_test, y_pred_test),
                    'test_precision': precision_score(self.y_test, y_pred_test, zero_division=0),
                    'test_recall': recall_score(self.y_test, y_pred_test, zero_division=0),
                    'test_f1': f1_score(self.y_test, y_pred_test, zero_division=0),
                    'test_roc_auc': roc_auc_score(self.y_test, y_pred_proba_test),
                }

                # Log metrics
                mlflow.log_metrics(metrics)

                # Log model
                from mlflow.models.signature import infer_signature
                signature = infer_signature(self.X_train, y_pred_train)

                mlflow.sklearn.log_model(
                    model,
                    artifact_path="model",
                    signature=signature,
                    input_example=self.X_train.head(5),
                )

                # Store model info
                self.trained_models.append({
                    'name': config['name'],
                    'run_id': run.info.run_id,
                    'metrics': metrics,
                    'model': model,
                })

                print(f"  ✓ Test F1: {metrics['test_f1']:.4f}")
                print(f"    Test ROC-AUC: {metrics['test_roc_auc']:.4f}")

        print()
        print(f"✓ Trained {len(self.trained_models)} models")
        print()

        self.next(self.evaluate_models)

    @step
    def evaluate_models(self):
        """
        Evaluate and compare all trained models
        """
        print("Step 5: Model Evaluation")
        print("-" * 60)

        # Find best model
        best_model = max(self.trained_models, key=lambda m: m['metrics']['test_f1'])

        self.best_model_name = best_model['name']
        self.best_model_run_id = best_model['run_id']
        self.best_model_metrics = best_model['metrics']

        print("Model Comparison:")
        print()
        print(f"{'Model':<30} {'Test F1':<12} {'Test ROC-AUC':<12}")
        print("-" * 60)
        for model_info in self.trained_models:
            name = model_info['name']
            f1 = model_info['metrics']['test_f1']
            roc_auc = model_info['metrics']['test_roc_auc']
            marker = "🏆" if name == self.best_model_name else "  "
            print(f"{marker} {name:<28} {f1:<12.4f} {roc_auc:<12.4f}")

        print()
        print(f"✓ Best Model: {self.best_model_name}")
        print(f"  Run ID: {self.best_model_run_id}")
        print(f"  Test F1: {self.best_model_metrics['test_f1']:.4f}")
        print(f"  Test ROC-AUC: {self.best_model_metrics['test_roc_auc']:.4f}")
        print()

        self.next(self.register_model)

    @step
    def register_model(self):
        """
        Register best model to MLflow model registry
        """
        print("Step 6: Model Registration")
        print("-" * 60)

        model_uri = f"runs:/{self.best_model_run_id}/model"
        registered_model_name = "predictive_maintenance_best"

        # Register model
        result = mlflow.register_model(
            model_uri=model_uri,
            name=registered_model_name
        )

        self.registered_model_version = result.version

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

        self.next(self.end)

    @step
    def end(self):
        """
        End of pipeline - summary
        """
        print("=" * 60)
        print("Pipeline Complete!")
        print("=" * 60)
        print()
        print(f"Best Model: {self.best_model_name}")
        print(f"Test F1 Score: {self.best_model_metrics['test_f1']:.4f}")
        print(f"Registered Version: {self.registered_model_version}")
        print()
        print("Next Steps:")
        print("1. Review model in MLflow UI")
        print("2. Validate model on staging data")
        print("3. Promote to production if validation passes")
        print()


if __name__ == '__main__':
    PredictiveMaintenanceFlow()
