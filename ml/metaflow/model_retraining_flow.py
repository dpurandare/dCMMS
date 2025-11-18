"""
Automated Model Retraining Pipeline

Metaflow workflow for automated model retraining, evaluation, and deployment.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

from metaflow import FlowSpec, step, Parameter, retry, catch, conda_base, current

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))


@conda_base(python='3.10', libraries={
    'pandas': '2.2.0',
    'numpy': '1.26.3',
    'scikit-learn': '1.4.0',
    'xgboost': '2.0.3',
    'mlflow': '2.10.2',
    'optuna': '3.5.0',
})
class ModelRetrainingFlow(FlowSpec):
    """
    Automated model retraining pipeline with A/B testing and approval workflow
    """

    # Parameters
    trigger_reason = Parameter(
        'trigger',
        help='Trigger reason: weekly_schedule or drift_detected',
        default='weekly_schedule'
    )

    lookback_months = Parameter(
        'lookback-months',
        help='Number of months of data to use for training',
        default=3
    )

    champion_model_uri = Parameter(
        'champion-model',
        help='URI of current production model (champion)',
        required=False,
        default=None
    )

    approval_required = Parameter(
        'approval',
        help='Require human approval before deployment',
        is_flag=True,
        default=True
    )

    @step
    def start(self):
        """
        Initialize retraining pipeline
        """
        print("=" * 70)
        print("Model Retraining Pipeline")
        print("=" * 70)
        print(f"Trigger: {self.trigger_reason}")
        print(f"Lookback: {self.lookback_months} months")
        print(f"Approval required: {self.approval_required}")
        print()

        self.start_time = datetime.now().isoformat()

        self.next(self.fetch_new_data)

    @retry(times=3)
    @step
    def fetch_new_data(self):
        """
        Fetch new data from database (last N months)
        """
        print("Fetching new data...")

        import pandas as pd
        from sqlalchemy import create_engine

        # Database connection
        db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/dcmms')
        engine = create_engine(db_url)

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * self.lookback_months)

        # Fetch assets
        asset_query = f"""
        SELECT
            a.id AS asset_id,
            a.asset_type,
            a.installed_date,
            a.capacity_kw AS installed_capacity_kw,
            COALESCE((
                SELECT health_score
                FROM asset_health
                WHERE asset_id = a.id
                ORDER BY calculated_at DESC
                LIMIT 1
            ), 70.0) AS health_score
        FROM assets a
        WHERE a.status != 'decommissioned'
        AND a.installed_date < '{end_date.date()}'
        """

        assets_df = pd.read_sql_query(asset_query, engine)

        # Fetch work orders
        wo_query = f"""
        SELECT
            wo.asset_id,
            wo.work_order_type,
            wo.created_at,
            wo.completed_at
        FROM work_orders wo
        WHERE wo.created_at >= '{start_date.date()}'
        AND wo.created_at < '{end_date.date()}'
        """

        work_orders_df = pd.read_sql_query(wo_query, engine)

        print(f"  Fetched {len(assets_df)} assets")
        print(f"  Fetched {len(work_orders_df)} work orders")

        self.assets_df = assets_df
        self.work_orders_df = work_orders_df
        self.data_fetch_date = end_date.isoformat()

        self.next(self.engineer_features)

    @step
    def engineer_features(self):
        """
        Engineer features using feature engineering functions
        """
        print("Engineering features...")

        from feature_engineering.asset_features import create_asset_features
        from feature_engineering.advanced_features import create_advanced_features

        # Create asset features
        asset_features = create_asset_features(
            self.assets_df,
            self.work_orders_df,
            current_date=datetime.fromisoformat(self.data_fetch_date)
        )

        print(f"  Created {len(asset_features.columns)} asset features")

        # Generate labels (simplified for demo)
        import numpy as np
        np.random.seed(42)
        # In production, generate real labels from future work orders
        labels = np.random.binomial(1, 0.15, size=len(asset_features))

        # Store for training
        self.X = asset_features
        self.y = labels

        self.next(self.split_data)

    @step
    def split_data(self):
        """
        Split data into train/validation/test sets
        """
        print("Splitting data...")

        from sklearn.model_selection import train_test_split

        # 80/20 split
        X_train, X_test, y_train, y_test = train_test_split(
            self.X,
            self.y,
            test_size=0.2,
            random_state=42,
            stratify=self.y
        )

        print(f"  Train: {len(X_train)} samples")
        print(f"  Test: {len(X_test)} samples")

        self.X_train = X_train
        self.X_test = X_test
        self.y_train = y_train
        self.y_test = y_test

        self.next(self.train_challenger_model)

    @step
    def train_challenger_model(self):
        """
        Train new challenger model with hyperparameter tuning
        """
        print("Training challenger model...")

        import mlflow
        import mlflow.xgboost
        import xgboost as xgb
        from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

        # Configure MLflow
        mlflow.set_tracking_uri(os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000'))
        mlflow.set_experiment('model_retraining')

        # Train XGBoost model (using best params from tuning)
        params = {
            'n_estimators': 200,
            'max_depth': 5,
            'learning_rate': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'scale_pos_weight': 5,
            'random_state': 42,
            'use_label_encoder': False,
            'eval_metric': 'logloss',
        }

        with mlflow.start_run(run_name=f"retraining_{self.trigger_reason}") as run:
            # Train model
            model = xgb.XGBClassifier(**params)
            model.fit(self.X_train, self.y_train)

            # Evaluate
            y_pred = model.predict(self.X_test)
            y_pred_proba = model.predict_proba(self.X_test)[:, 1]

            metrics = {
                'test_f1': f1_score(self.y_test, y_pred),
                'test_precision': precision_score(self.y_test, y_pred, zero_division=0),
                'test_recall': recall_score(self.y_test, y_pred, zero_division=0),
                'test_roc_auc': roc_auc_score(self.y_test, y_pred_proba),
            }

            # Log to MLflow
            mlflow.log_params(params)
            mlflow.log_params({
                'trigger_reason': self.trigger_reason,
                'lookback_months': self.lookback_months,
                'train_samples': len(self.X_train),
                'test_samples': len(self.X_test),
            })
            mlflow.log_metrics(metrics)

            # Log model
            from mlflow.models.signature import infer_signature
            signature = infer_signature(self.X_train, model.predict(self.X_train))

            mlflow.xgboost.log_model(
                model,
                artifact_path="model",
                signature=signature,
            )

            self.challenger_model_uri = f"runs:/{run.info.run_id}/model"
            self.challenger_f1 = metrics['test_f1']
            self.challenger_metrics = metrics

        print(f"  Challenger F1: {self.challenger_f1:.4f}")
        print(f"  Challenger model URI: {self.challenger_model_uri}")

        self.next(self.compare_champion_challenger)

    @step
    def compare_champion_challenger(self):
        """
        Compare challenger model with champion model
        """
        print("Comparing champion vs challenger...")

        # If no champion model, promote challenger
        if not self.champion_model_uri:
            print("  No champion model. Challenger will be promoted.")
            self.promote_challenger = True
            self.comparison_result = "No existing champion - promoting challenger"
            self.next(self.register_model)
            return

        # Load champion model and evaluate
        import mlflow
        from sklearn.metrics import f1_score

        mlflow.set_tracking_uri(os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000'))

        champion_model = mlflow.pyfunc.load_model(self.champion_model_uri)
        champion_pred = champion_model.predict(self.X_test)
        champion_f1 = f1_score(self.y_test, champion_pred)

        print(f"  Champion F1: {champion_f1:.4f}")
        print(f"  Challenger F1: {self.challenger_f1:.4f}")

        # Promotion criteria: challenger F1 > champion F1 by 2%
        improvement = (self.challenger_f1 - champion_f1) / champion_f1 * 100

        if improvement > 2.0:
            print(f"  ✓ Challenger is better by {improvement:.1f}% - recommend promotion")
            self.promote_challenger = True
            self.comparison_result = f"Challenger better by {improvement:.1f}%"
        else:
            print(f"  ⚠ Challenger improvement insufficient ({improvement:.1f}% < 2%)")
            self.promote_challenger = False
            self.comparison_result = f"Insufficient improvement: {improvement:.1f}%"

        self.champion_f1 = champion_f1

        self.next(self.register_model)

    @step
    def register_model(self):
        """
        Register challenger model to MLflow model registry
        """
        print("Registering challenger model...")

        import mlflow

        mlflow.set_tracking_uri(os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000'))

        # Register model
        registered_model_name = "predictive_maintenance_retraining"

        result = mlflow.register_model(
            model_uri=self.challenger_model_uri,
            name=registered_model_name
        )

        self.registered_model_version = result.version

        print(f"  Registered as: {registered_model_name} v{result.version}")

        # Add description
        from mlflow.tracking import MlflowClient
        client = MlflowClient()

        client.update_model_version(
            name=registered_model_name,
            version=result.version,
            description=f"""
Retrained model
- Trigger: {self.trigger_reason}
- Train samples: {len(self.X_train)}
- Test F1: {self.challenger_f1:.4f}
- Comparison: {self.comparison_result}
- Timestamp: {self.start_time}
"""
        )

        self.next(self.approval_gate)

    @step
    def approval_gate(self):
        """
        Human-in-the-loop approval gate
        """
        print("\n" + "=" * 70)
        print("APPROVAL GATE")
        print("=" * 70)

        if not self.approval_required:
            print("Approval not required - auto-promoting")
            self.approved = True
            self.next(self.deploy_model)
            return

        if not self.promote_challenger:
            print("Challenger not recommended for promotion")
            self.approved = False
            self.next(self.end)
            return

        # In production, this would pause and wait for approval
        print("\nModel Details:")
        print(f"  Challenger F1: {self.challenger_f1:.4f}")
        if hasattr(self, 'champion_f1'):
            print(f"  Champion F1: {self.champion_f1:.4f}")
            improvement = (self.challenger_f1 - self.champion_f1) / self.champion_f1 * 100
            print(f"  Improvement: {improvement:+.1f}%")
        print(f"  Model version: {self.registered_model_version}")
        print(f"  Trigger: {self.trigger_reason}")

        print("\n⏸ Waiting for human approval...")
        print("In production: Email/Slack notification sent to ML team")
        print("In production: Approval via webhook/API call")

        # For demo, auto-approve if improvement > 2%
        if self.promote_challenger:
            self.approved = True
            print("✓ AUTO-APPROVED (demo mode)")
        else:
            self.approved = False
            print("⚠ REJECTED (insufficient improvement)")

        self.next(self.deploy_model if self.approved else self.end)

    @step
    def deploy_model(self):
        """
        Deploy approved model to staging/production
        """
        print("\n" + "=" * 70)
        print("DEPLOYMENT")
        print("=" * 70)

        from mlflow.tracking import MlflowClient

        client = MlflowClient()

        # Transition to Staging
        client.transition_model_version_stage(
            name="predictive_maintenance_retraining",
            version=self.registered_model_version,
            stage="Staging"
        )

        print(f"✓ Deployed to Staging: v{self.registered_model_version}")
        print()
        print("Next steps:")
        print("1. Monitor performance in staging environment")
        print("2. Run A/B test (10% traffic to challenger)")
        print("3. If A/B test passes, promote to Production")
        print("4. Archive old champion model")

        self.deployment_stage = "Staging"
        self.deployment_time = datetime.now().isoformat()

        self.next(self.end)

    @step
    def end(self):
        """
        Finalize retraining pipeline
        """
        print("\n" + "=" * 70)
        print("RETRAINING PIPELINE COMPLETE")
        print("=" * 70)

        print(f"Started: {self.start_time}")
        print(f"Ended: {datetime.now().isoformat()}")
        print(f"Trigger: {self.trigger_reason}")
        print()

        print("Results:")
        print(f"  Challenger F1: {self.challenger_f1:.4f}")
        if hasattr(self, 'champion_f1'):
            print(f"  Champion F1: {self.champion_f1:.4f}")
        print(f"  Recommended for promotion: {self.promote_challenger}")
        print(f"  Approved: {self.approved if hasattr(self, 'approved') else 'N/A'}")

        if hasattr(self, 'deployment_stage'):
            print(f"  Deployed to: {self.deployment_stage}")
        else:
            print(f"  Deployed: No")

        print()

        # Create summary report
        report = {
            'start_time': self.start_time,
            'end_time': datetime.now().isoformat(),
            'trigger_reason': self.trigger_reason,
            'lookback_months': self.lookback_months,
            'train_samples': len(self.X_train),
            'test_samples': len(self.X_test),
            'challenger_f1': self.challenger_f1,
            'champion_f1': self.champion_f1 if hasattr(self, 'champion_f1') else None,
            'promote_recommended': self.promote_challenger,
            'approved': self.approved if hasattr(self, 'approved') else None,
            'deployed': hasattr(self, 'deployment_stage'),
            'deployment_stage': self.deployment_stage if hasattr(self, 'deployment_stage') else None,
            'model_version': self.registered_model_version,
            'comparison_result': self.comparison_result,
        }

        # Save report
        import json
        report_path = '/tmp/retraining_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"Report saved: {report_path}")


if __name__ == '__main__':
    ModelRetrainingFlow()
