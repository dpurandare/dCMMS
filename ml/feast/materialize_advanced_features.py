#!/usr/bin/env python3
"""
Materialize Advanced Features to Feast

Extracts data, creates advanced features, and materializes to Feast feature store.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy import create_engine
from clickhouse_driver import Client

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from feature_engineering.advanced_features import create_advanced_features


# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/dcmms')
CLICKHOUSE_URL = os.getenv('CLICKHOUSE_URL', 'clickhouse://localhost:9000')
FEAST_DATA_DIR = Path('/tmp/dcmms/feast')
FEAST_DATA_DIR.mkdir(parents=True, exist_ok=True)


def extract_telemetry_with_metadata(
    pg_engine,
    ch_client,
    lookback_days: int = 90
) -> pd.DataFrame:
    """
    Extract telemetry data with asset metadata

    Args:
        pg_engine: PostgreSQL engine
        ch_client: ClickHouse client
        lookback_days: Days to look back

    Returns:
        DataFrame with telemetry + asset metadata
    """
    print(f"Extracting telemetry data (last {lookback_days} days)...")

    # Get asset metadata from PostgreSQL
    asset_query = """
    SELECT
        a.id AS asset_id,
        a.installed_date,
        a.capacity_kw AS installed_capacity_kw,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.installed_date)) * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.installed_date)) AS asset_age_months,
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
        ) AS recent_alarms_30d
    FROM assets a
    WHERE a.status != 'decommissioned'
    """

    assets_df = pd.read_sql_query(asset_query, pg_engine)
    print(f"  ✓ Loaded {len(assets_df)} assets")

    # Get work order metrics
    wo_query = """
    SELECT
        wo.asset_id,
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.actual_start)) / 3600.0) AS mttr_hours,
        COUNT(*) FILTER (WHERE wo.created_at >= CURRENT_DATE - INTERVAL '30 days') AS recent_wo_count_30d,
        COUNT(*) FILTER (WHERE wo.created_at >= CURRENT_DATE - INTERVAL '30 days') / 30.0 AS wo_rate_per_month
    FROM work_orders wo
    WHERE wo.completed_at IS NOT NULL
    AND wo.asset_id IN (SELECT id FROM assets WHERE status != 'decommissioned')
    GROUP BY wo.asset_id
    """

    wo_df = pd.read_sql_query(wo_query, pg_engine)
    print(f"  ✓ Loaded work order metrics for {len(wo_df)} assets")

    # Get days since last maintenance
    last_maint_query = """
    SELECT
        wo.asset_id,
        MAX(wo.completed_at) AS last_maintenance_date,
        EXTRACT(DAY FROM (CURRENT_DATE - MAX(wo.completed_at))) AS days_since_last_maintenance
    FROM work_orders wo
    WHERE wo.work_order_type IN ('preventive', 'corrective')
    AND wo.completed_at IS NOT NULL
    GROUP BY wo.asset_id
    """

    last_maint_df = pd.read_sql_query(last_maint_query, pg_engine)

    # Merge asset data
    assets_enriched = assets_df.merge(wo_df, on='asset_id', how='left')
    assets_enriched = assets_enriched.merge(last_maint_df, on='asset_id', how='left')

    # Fill missing values
    assets_enriched['mttr_hours'] = assets_enriched['mttr_hours'].fillna(10.0)
    assets_enriched['wo_rate_per_month'] = assets_enriched['wo_rate_per_month'].fillna(0.0)
    assets_enriched['days_since_last_maintenance'] = assets_enriched['days_since_last_maintenance'].fillna(180.0)

    # Get telemetry from ClickHouse
    start_date = datetime.now() - timedelta(days=lookback_days)

    telemetry_query = """
    SELECT
        asset_id,
        timestamp,
        power_kw,
        voltage_v,
        current_a,
        temperature_c,
        frequency_hz
    FROM telemetry
    WHERE timestamp >= %(start_date)s
    ORDER BY asset_id, timestamp
    """

    telemetry_df = ch_client.query_dataframe(
        telemetry_query,
        params={'start_date': start_date}
    )

    print(f"  ✓ Loaded {len(telemetry_df)} telemetry records")

    # Merge telemetry with asset metadata
    merged = telemetry_df.merge(
        assets_enriched,
        on='asset_id',
        how='left'
    )

    return merged


def materialize_advanced_telemetry_features():
    """Materialize advanced telemetry features to Feast"""
    print("=" * 70)
    print("Advanced Feature Materialization")
    print("=" * 70)

    # Connect to databases
    pg_engine = create_engine(DATABASE_URL)
    ch_client = Client.from_url(CLICKHOUSE_URL)

    # Extract data
    df = extract_telemetry_with_metadata(pg_engine, ch_client, lookback_days=90)

    # Create advanced features
    print("\nCreating advanced features...")
    advanced_df = create_advanced_features(
        df,
        telemetry_cols=['power_kw', 'voltage_v', 'temperature_c'],
        lag_windows=[1, 7, 30],
        rolling_windows=[7, 14, 30],
        trend_windows=[7, 14, 30],
        include_interactions=True
    )

    # Prepare for Feast (take latest snapshot per asset)
    print("\nPreparing for Feast...")

    # Group by asset_id and take the most recent timestamp
    advanced_df['event_timestamp'] = pd.to_datetime(advanced_df['timestamp'])

    feast_df = advanced_df.sort_values('event_timestamp').groupby('asset_id').tail(1)

    # Select relevant columns (remove intermediate columns)
    feature_cols = [col for col in feast_df.columns if any([
        col.startswith('power_kw_lag'),
        col.startswith('voltage_v_lag'),
        col.startswith('temperature_c_lag'),
        col.startswith('power_kw_rolling'),
        col.startswith('voltage_v_rolling'),
        col.startswith('temperature_c_rolling'),
        col.startswith('power_kw_trend'),
        col.startswith('temperature_c_trend'),
        col == 'capacity_factor_30d',
        col == 'degradation_rate_365d',
        col == 'alarm_frequency',
        col.endswith('_x_alarm_frequency'),
        col.endswith('_x_wo_rate_per_month'),
        col.endswith('_x_days_since_last_maintenance'),
    ])]

    feast_output = feast_df[['asset_id', 'event_timestamp'] + feature_cols].copy()

    # Fill NaN with 0 for Feast compatibility
    feast_output = feast_output.fillna(0)

    # Save to Parquet
    output_path = FEAST_DATA_DIR / 'advanced_telemetry_features.parquet'
    feast_output.to_parquet(output_path, index=False)

    print(f"  ✓ Saved to: {output_path}")
    print(f"  Assets: {len(feast_output)}")
    print(f"  Features: {len(feature_cols)}")
    print(f"  File size: {output_path.stat().st_size / 1024:.1f} KB")

    # Materialize to online store
    print("\nMaterializing to online store (Redis)...")

    try:
        from feast import FeatureStore
        import subprocess

        # Change to feast repo directory
        feast_repo = Path(__file__).parent
        os.chdir(feast_repo)

        # Apply feature views
        subprocess.run(['feast', 'apply'], check=True)

        # Materialize
        store = FeatureStore(repo_path=str(feast_repo))

        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)

        store.materialize(
            start_date=start_date,
            end_date=end_date
        )

        print("  ✓ Materialized to Redis")

    except Exception as e:
        print(f"  ⚠ Warning: Could not materialize to online store: {e}")
        print("  Offline features saved to Parquet. Run 'feast materialize' manually.")

    print("\n" + "=" * 70)
    print("Materialization Complete!")
    print("=" * 70)
    print(f"Features available in: {output_path}")
    print(f"Total features: {len(feature_cols)}")
    print("\nFeature list:")
    for i, feat in enumerate(sorted(feature_cols), 1):
        print(f"  {i:2d}. {feat}")
    print()


if __name__ == '__main__':
    materialize_advanced_telemetry_features()
