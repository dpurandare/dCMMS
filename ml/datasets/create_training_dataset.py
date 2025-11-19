#!/usr/bin/env python3
"""
Training Dataset Creation for Predictive Maintenance

Extracts historical data, creates features, generates labels, and splits into train/test sets.
"""

import os
import sys
import argparse
import yaml
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Tuple, Optional

import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from clickhouse_driver import Client

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from feature_engineering.asset_features import create_asset_features
from feature_engineering.telemetry_features import create_telemetry_features
from feature_engineering.data_quality import run_data_quality_checks, print_data_quality_report


class TrainingDatasetBuilder:
    """Build training dataset from historical data"""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize dataset builder

        Args:
            config_path: Path to configuration YAML file
        """
        self.config = self._load_config(config_path)
        self.dataset_version = self.config.get('dataset_version', 'v1.0')
        self.output_dir = Path(self.config.get('output_dir', '/tmp/dcmms/datasets'))
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Database connections
        self.pg_engine = create_engine(self.config['postgresql_uri'])
        self.ch_client = Client.from_url(self.config['clickhouse_uri'])

    def _load_config(self, config_path: Optional[str]) -> Dict:
        """Load configuration from YAML file"""
        if config_path and Path(config_path).exists():
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)

        # Default configuration
        return {
            'dataset_version': 'v1.0',
            'lookback_days': 365,
            'prediction_horizon_days': 7,
            'test_size': 0.2,
            'min_samples_per_asset': 10,
            'random_state': 42,
            'postgresql_uri': os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/dcmms'),
            'clickhouse_uri': os.getenv('CLICKHOUSE_URL', 'clickhouse://localhost:9000'),
            'output_dir': '/tmp/dcmms/datasets',
        }

    def extract_asset_data(self, end_date: datetime) -> pd.DataFrame:
        """
        Extract asset data from PostgreSQL

        Args:
            end_date: End date for data extraction

        Returns:
            DataFrame with asset data
        """
        print("Extracting asset data from PostgreSQL...")

        query = """
        SELECT
            a.id AS asset_id,
            a.asset_type,
            a.status,
            a.installed_date,
            a.site_id,
            a.manufacturer,
            a.model,
            a.serial_number,
            a.capacity_kw AS installed_capacity_kw,
            COALESCE(
                (SELECT health_score FROM asset_health
                 WHERE asset_id = a.id
                 ORDER BY calculated_at DESC LIMIT 1),
                70.0
            ) AS health_score,
            COALESCE(
                (SELECT COUNT(*) FROM alarms
                 WHERE asset_id = a.id
                 AND created_at >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) AS recent_alarms_30d,
            COALESCE(
                (SELECT COUNT(*) FROM alarms
                 WHERE asset_id = a.id
                 AND severity = 'critical'
                 AND created_at >= CURRENT_DATE - INTERVAL '30 days'),
                0
            ) AS recent_critical_alarms_30d
        FROM assets a
        WHERE a.status != 'decommissioned'
        AND a.installed_date IS NOT NULL
        AND a.installed_date < %(end_date)s
        ORDER BY a.id
        """

        df = pd.read_sql_query(query, self.pg_engine, params={'end_date': end_date})
        print(f"  ✓ Extracted {len(df)} assets")

        return df

    def extract_work_orders(self, end_date: datetime, lookback_days: int) -> pd.DataFrame:
        """
        Extract work order data from PostgreSQL

        Args:
            end_date: End date for data extraction
            lookback_days: Number of days to look back

        Returns:
            DataFrame with work order data
        """
        print(f"Extracting work orders (last {lookback_days} days)...")

        start_date = end_date - timedelta(days=lookback_days)

        query = """
        SELECT
            wo.id AS work_order_id,
            wo.asset_id,
            wo.work_order_type,
            wo.priority,
            wo.status,
            wo.created_at,
            wo.scheduled_start,
            wo.actual_start,
            wo.completed_at,
            wo.description,
            EXTRACT(EPOCH FROM (wo.completed_at - wo.actual_start)) / 3600.0 AS duration_hours
        FROM work_orders wo
        WHERE wo.created_at >= %(start_date)s
        AND wo.created_at < %(end_date)s
        ORDER BY wo.created_at
        """

        df = pd.read_sql_query(
            query,
            self.pg_engine,
            params={'start_date': start_date, 'end_date': end_date}
        )
        print(f"  ✓ Extracted {len(df)} work orders")

        return df

    def extract_telemetry(
        self,
        asset_ids: list,
        end_date: datetime,
        lookback_days: int
    ) -> pd.DataFrame:
        """
        Extract telemetry data from ClickHouse

        Args:
            asset_ids: List of asset IDs
            end_date: End date for data extraction
            lookback_days: Number of days to look back

        Returns:
            DataFrame with telemetry data
        """
        print(f"Extracting telemetry (last {lookback_days} days)...")

        start_date = end_date - timedelta(days=lookback_days)

        query = """
        SELECT
            asset_id,
            timestamp,
            power_kw,
            voltage_v,
            current_a,
            temperature_c,
            frequency_hz,
            is_anomaly
        FROM telemetry
        WHERE asset_id IN %(asset_ids)s
        AND timestamp >= %(start_date)s
        AND timestamp < %(end_date)s
        ORDER BY asset_id, timestamp
        """

        # ClickHouse query
        df = self.ch_client.query_dataframe(
            query,
            params={
                'asset_ids': asset_ids,
                'start_date': start_date,
                'end_date': end_date
            }
        )

        print(f"  ✓ Extracted {len(df)} telemetry records")

        return df

    def generate_labels(
        self,
        asset_ids: list,
        work_orders_df: pd.DataFrame,
        reference_date: datetime,
        horizon_days: int = 7
    ) -> pd.DataFrame:
        """
        Generate failure labels for assets

        Labels are binary: 1 if asset has a corrective work order within horizon_days, 0 otherwise.

        Args:
            asset_ids: List of asset IDs
            work_orders_df: Work orders DataFrame
            reference_date: Reference date for label generation
            horizon_days: Prediction horizon in days

        Returns:
            DataFrame with asset_id and failure_within_Nd label
        """
        print(f"Generating labels (failure within {horizon_days} days)...")

        future_date = reference_date + timedelta(days=horizon_days)

        labels = []
        for asset_id in asset_ids:
            # Check if asset has corrective work order in the next horizon_days
            future_wos = work_orders_df[
                (work_orders_df['asset_id'] == asset_id) &
                (work_orders_df['created_at'] >= reference_date) &
                (work_orders_df['created_at'] < future_date) &
                (work_orders_df['work_order_type'].isin(['corrective', 'emergency']))
            ]

            has_failure = len(future_wos) > 0

            labels.append({
                'asset_id': asset_id,
                f'failure_within_{horizon_days}d': int(has_failure),
                'reference_date': reference_date,
            })

        labels_df = pd.DataFrame(labels)
        positive_rate = labels_df[f'failure_within_{horizon_days}d'].mean()

        print(f"  ✓ Generated labels for {len(labels_df)} assets")
        print(f"  Positive rate: {positive_rate:.2%}")

        return labels_df

    def create_features(
        self,
        asset_df: pd.DataFrame,
        work_orders_df: pd.DataFrame,
        telemetry_df: pd.DataFrame,
        reference_date: datetime
    ) -> pd.DataFrame:
        """
        Create features using feature engineering functions

        Args:
            asset_df: Asset data
            work_orders_df: Work order data
            telemetry_df: Telemetry data
            reference_date: Reference date for feature calculation

        Returns:
            DataFrame with features
        """
        print("Creating features...")

        # Asset features
        print("  - Asset features...")
        asset_features = create_asset_features(
            asset_df,
            work_orders_df,
            current_date=reference_date
        )

        # Telemetry features (per asset)
        print("  - Telemetry features...")
        telemetry_features_list = []

        for asset_id in asset_df['asset_id'].unique():
            asset_telemetry = telemetry_df[telemetry_df['asset_id'] == asset_id].copy()

            if len(asset_telemetry) < 10:  # Need minimum data points
                # Create empty features for this asset
                empty_features = pd.DataFrame({
                    'asset_id': [asset_id],
                    'event_timestamp': [reference_date],
                })
                telemetry_features_list.append(empty_features)
                continue

            # Get rated capacity for this asset
            rated_capacity = asset_df.loc[
                asset_df['asset_id'] == asset_id,
                'installed_capacity_kw'
            ].iloc[0] if 'installed_capacity_kw' in asset_df.columns else 100.0

            try:
                features = create_telemetry_features(
                    asset_telemetry,
                    rolling_windows={'power': 7, 'voltage': 7, 'temperature': 7},
                    anomaly_method='zscore',
                    anomaly_threshold=3.0,
                    rated_capacity_kw=rated_capacity
                )
                features['event_timestamp'] = reference_date
                telemetry_features_list.append(features)
            except Exception as e:
                print(f"    Warning: Failed to create telemetry features for {asset_id}: {e}")
                # Create empty features
                empty_features = pd.DataFrame({
                    'asset_id': [asset_id],
                    'event_timestamp': [reference_date],
                })
                telemetry_features_list.append(empty_features)

        telemetry_features = pd.concat(telemetry_features_list, ignore_index=True)

        # Merge features
        print("  - Merging features...")
        final_features = asset_features.merge(
            telemetry_features,
            on='asset_id',
            how='left'
        )

        # Fill missing telemetry features with 0
        telemetry_cols = [col for col in telemetry_features.columns if col not in ['asset_id', 'event_timestamp']]
        final_features[telemetry_cols] = final_features[telemetry_cols].fillna(0)

        print(f"  ✓ Created {len(final_features.columns)} features for {len(final_features)} assets")

        return final_features

    def split_train_test(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Split dataset into train and test sets

        Uses time-based split to prevent data leakage.

        Args:
            X: Features
            y: Labels
            test_size: Fraction for test set
            random_state: Random seed

        Returns:
            X_train, X_test, y_train, y_test
        """
        print(f"Splitting dataset (test_size={test_size})...")

        # Time-based split (assumes X has event_timestamp or reference_date)
        if 'event_timestamp' in X.columns:
            X_sorted = X.sort_values('event_timestamp')
            y_sorted = y.loc[X_sorted.index]

            split_idx = int(len(X_sorted) * (1 - test_size))

            X_train = X_sorted.iloc[:split_idx].copy()
            X_test = X_sorted.iloc[split_idx:].copy()
            y_train = y_sorted.iloc[:split_idx].copy()
            y_test = y_sorted.iloc[split_idx:].copy()

            print(f"  Time-based split:")
            print(f"    Train: {X_train['event_timestamp'].min()} to {X_train['event_timestamp'].max()}")
            print(f"    Test: {X_test['event_timestamp'].min()} to {X_test['event_timestamp'].max()}")
        else:
            # Random split
            from sklearn.model_selection import train_test_split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=test_size,
                random_state=random_state,
                stratify=y
            )

        print(f"  ✓ Train: {len(X_train)} samples ({1-test_size:.0%})")
        print(f"  ✓ Test: {len(X_test)} samples ({test_size:.0%})")
        print(f"  Train positive rate: {y_train.mean():.2%}")
        print(f"  Test positive rate: {y_test.mean():.2%}")

        return X_train, X_test, y_train, y_test

    def save_dataset(
        self,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        metadata: Dict
    ):
        """
        Save dataset to Parquet files

        Args:
            X_train: Training features
            X_test: Test features
            y_train: Training labels
            y_test: Test labels
            metadata: Dataset metadata
        """
        print("Saving dataset...")

        # Create version directory
        version_dir = self.output_dir / self.dataset_version
        version_dir.mkdir(parents=True, exist_ok=True)

        # Save train/test splits
        train_df = X_train.copy()
        train_df['target'] = y_train.values
        train_df.to_parquet(version_dir / 'train.parquet', index=False)

        test_df = X_test.copy()
        test_df['target'] = y_test.values
        test_df.to_parquet(version_dir / 'test.parquet', index=False)

        # Save metadata
        import json
        metadata_path = version_dir / 'metadata.json'
        with open(metadata_path, 'w') as f:
            # Convert datetime to string for JSON serialization
            metadata_serializable = {
                k: v.isoformat() if isinstance(v, datetime) else v
                for k, v in metadata.items()
            }
            json.dump(metadata_serializable, f, indent=2)

        # Save feature names
        feature_names_path = version_dir / 'feature_names.txt'
        with open(feature_names_path, 'w') as f:
            for col in X_train.columns:
                f.write(f"{col}\n")

        print(f"  ✓ Saved to: {version_dir}")
        print(f"    - train.parquet ({len(train_df)} samples)")
        print(f"    - test.parquet ({len(test_df)} samples)")
        print(f"    - metadata.json")
        print(f"    - feature_names.txt ({len(X_train.columns)} features)")

    def build(self):
        """Build complete training dataset"""
        print("=" * 70)
        print("Training Dataset Creation")
        print("=" * 70)
        print(f"Version: {self.dataset_version}")
        print(f"Lookback: {self.config['lookback_days']} days")
        print(f"Horizon: {self.config['prediction_horizon_days']} days")
        print(f"Test size: {self.config['test_size']}")
        print()

        # Reference date (end of historical data)
        end_date = datetime.now() - timedelta(days=self.config['prediction_horizon_days'])

        # Step 1: Extract data
        print("Step 1: Data Extraction")
        print("-" * 70)
        asset_df = self.extract_asset_data(end_date)
        work_orders_df = self.extract_work_orders(end_date, self.config['lookback_days'])

        # Extract telemetry for sampled assets (to reduce data size)
        asset_ids = asset_df['asset_id'].tolist()[:100]  # Sample first 100 assets
        telemetry_df = self.extract_telemetry(asset_ids, end_date, lookback_days=90)

        print()

        # Step 2: Generate labels
        print("Step 2: Label Generation")
        print("-" * 70)
        labels_df = self.generate_labels(
            asset_ids,
            work_orders_df,
            end_date,
            horizon_days=self.config['prediction_horizon_days']
        )
        print()

        # Step 3: Feature engineering
        print("Step 3: Feature Engineering")
        print("-" * 70)
        features_df = self.create_features(
            asset_df[asset_df['asset_id'].isin(asset_ids)],
            work_orders_df,
            telemetry_df,
            reference_date=end_date
        )
        print()

        # Step 4: Merge features and labels
        print("Step 4: Merge Features and Labels")
        print("-" * 70)
        dataset = features_df.merge(labels_df, on='asset_id', how='inner')
        print(f"  ✓ Merged dataset: {len(dataset)} samples, {len(dataset.columns)} columns")
        print()

        # Step 5: Data quality validation
        print("Step 5: Data Quality Validation")
        print("-" * 70)
        X = dataset.drop(columns=[f"failure_within_{self.config['prediction_horizon_days']}d", 'reference_date'])
        y = dataset[f"failure_within_{self.config['prediction_horizon_days']}d"]

        quality_report = run_data_quality_checks(
            X,
            target=y,
            config={
                'max_missing_rate': 0.3,
                'outlier_method': 'iqr',
                'outlier_threshold': 1.5,
                'min_class_ratio': 0.05,
            }
        )
        print_data_quality_report(quality_report)
        print()

        if not quality_report.passed:
            print("⚠ Warning: Data quality checks failed. Review issues before training.")
            print()

        # Step 6: Train/test split
        print("Step 6: Train/Test Split")
        print("-" * 70)
        X_train, X_test, y_train, y_test = self.split_train_test(
            X,
            y,
            test_size=self.config['test_size'],
            random_state=self.config['random_state']
        )
        print()

        # Step 7: Save dataset
        print("Step 7: Save Dataset")
        print("-" * 70)

        metadata = {
            'dataset_version': self.dataset_version,
            'created_at': datetime.now(),
            'lookback_days': self.config['lookback_days'],
            'prediction_horizon_days': self.config['prediction_horizon_days'],
            'reference_date': end_date,
            'n_train_samples': len(X_train),
            'n_test_samples': len(X_test),
            'n_features': len(X_train.columns),
            'feature_names': list(X_train.columns),
            'train_positive_rate': float(y_train.mean()),
            'test_positive_rate': float(y_test.mean()),
            'test_size': self.config['test_size'],
            'random_state': self.config['random_state'],
            'data_quality_passed': quality_report.passed,
        }

        self.save_dataset(X_train, X_test, y_train, y_test, metadata)
        print()

        print("=" * 70)
        print("Dataset Creation Complete!")
        print("=" * 70)
        print(f"Version: {self.dataset_version}")
        print(f"Location: {self.output_dir / self.dataset_version}")
        print(f"Train samples: {len(X_train)}")
        print(f"Test samples: {len(X_test)}")
        print(f"Features: {len(X_train.columns)}")
        print()

        return {
            'X_train': X_train,
            'X_test': X_test,
            'y_train': y_train,
            'y_test': y_test,
            'metadata': metadata,
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Create training dataset for predictive maintenance')
    parser.add_argument(
        '--config',
        type=str,
        help='Path to configuration YAML file'
    )
    parser.add_argument(
        '--version',
        type=str,
        default='v1.0',
        help='Dataset version (default: v1.0)'
    )

    args = parser.parse_args()

    # Build dataset
    builder = TrainingDatasetBuilder(config_path=args.config)
    if args.version:
        builder.dataset_version = args.version

    result = builder.build()

    print("Next steps:")
    print("1. Review dataset in output directory")
    print("2. Validate data quality report")
    print("3. Train baseline models with: python train_baseline_models.py")
    print()


if __name__ == '__main__':
    main()
