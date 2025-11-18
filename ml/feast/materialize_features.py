#!/usr/bin/env python3
"""
Feast Feature Materialization Script
Syncs features from PostgreSQL/ClickHouse to Feast offline/online stores
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from clickhouse_driver import Client as ClickHouseClient

# Feast imports
from feast import FeatureStore

# Database connection strings
POSTGRES_CONN_STRING = os.getenv(
    "DATABASE_URL",
    "postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms"
)

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "clickhouse_user")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "clickhouse_password_dev")
CLICKHOUSE_DATABASE = os.getenv("CLICKHOUSE_DATABASE", "dcmms_analytics")

# Feast data directory
FEAST_DATA_DIR = Path("/tmp/dcmms/feast/data")
FEAST_DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_postgres_connection():
    """Get PostgreSQL connection"""
    return psycopg2.connect(POSTGRES_CONN_STRING)


def get_clickhouse_client():
    """Get ClickHouse client"""
    return ClickHouseClient(
        host=CLICKHOUSE_HOST,
        user=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DATABASE
    )


def materialize_asset_features(conn):
    """Extract and materialize asset features"""
    print("Materializing asset features...")

    query = """
    SELECT
        a.id AS asset_id,
        a.asset_type,
        a.status AS asset_status,
        EXTRACT(YEAR FROM AGE(NOW(), a.created_at)) * 12 +
            EXTRACT(MONTH FROM AGE(NOW(), a.created_at)) AS asset_age_months,
        a.site_id,

        -- Work order counts
        COUNT(DISTINCT wo.id) AS total_work_orders,
        COUNT(DISTINCT CASE WHEN wo.type = 'corrective' THEN wo.id END) AS total_corrective_work_orders,
        COUNT(DISTINCT CASE WHEN wo.type = 'preventive' THEN wo.id END) AS total_preventive_work_orders,

        -- Days since last maintenance
        COALESCE(
            EXTRACT(DAY FROM NOW() - MAX(wo.completed_at)),
            999
        ) AS days_since_last_maintenance,

        COALESCE(
            EXTRACT(DAY FROM NOW() - MAX(CASE WHEN wo.type = 'corrective' THEN wo.completed_at END)),
            999
        ) AS days_since_last_corrective_wo,

        -- MTTR and MTBF (simplified)
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 3600.0)
            FILTER (WHERE wo.type = 'corrective' AND wo.completed_at IS NOT NULL),
            0
        ) AS mttr_hours,

        0.0 AS mtbf_hours,  -- Placeholder - requires more complex calculation

        -- Health score (from asset_health_scores table)
        COALESCE(
            (SELECT score FROM asset_health_scores ahs
             WHERE ahs.asset_id = a.id
             ORDER BY calculated_at DESC
             LIMIT 1),
            100
        ) AS health_score,

        -- Recent alarms
        (SELECT COUNT(*)
         FROM alerts al
         WHERE al.asset_id = a.id
           AND al.created_at >= NOW() - INTERVAL '30 days'
        ) AS recent_alarms_30d,

        (SELECT COUNT(*)
         FROM alerts al
         WHERE al.asset_id = a.id
           AND al.severity = 'critical'
           AND al.created_at >= NOW() - INTERVAL '30 days'
        ) AS recent_critical_alarms_30d,

        -- Asset metadata
        COALESCE(
            (a.metadata->>'installed_capacity_kw')::float,
            0.0
        ) AS installed_capacity_kw,

        COALESCE(a.metadata->>'manufacturer', 'Unknown') AS manufacturer,
        COALESCE(a.metadata->>'model', 'Unknown') AS model,

        -- Timestamps for Feast
        NOW() AS event_timestamp,
        NOW() AS created

    FROM assets a
    LEFT JOIN work_orders wo ON wo.asset_id = a.id
    WHERE a.deleted_at IS NULL
    GROUP BY a.id
    """

    df = pd.read_sql_query(query, conn)

    # Save to parquet for Feast offline store
    output_path = FEAST_DATA_DIR / "asset_features.parquet"
    df.to_parquet(output_path, index=False)

    print(f"✓ Materialized {len(df)} asset features to {output_path}")
    return df


def materialize_telemetry_features(ch_client):
    """Extract and materialize telemetry features from ClickHouse"""
    print("Materializing telemetry features...")

    query = """
    SELECT
        asset_id,

        -- Power metrics (7-day rolling)
        avg(avg_value) OVER w7d AS rolling_avg_power_7d,
        stddevPop(avg_value) OVER w7d AS rolling_std_power_7d,
        min(min_value) OVER w7d AS rolling_min_power_7d,
        max(max_value) OVER w7d AS rolling_max_power_7d,

        -- Power metrics (30-day rolling)
        avg(avg_value) OVER w30d AS rolling_avg_power_30d,
        stddevPop(avg_value) OVER w30d AS rolling_std_power_30d,

        -- Voltage metrics (simplified - using same aggregates)
        avg(avg_value) OVER w7d AS rolling_avg_voltage_7d,
        stddevPop(avg_value) OVER w7d AS rolling_std_voltage_7d,
        min(min_value) OVER w7d AS rolling_min_voltage_7d,
        max(max_value) OVER w7d AS rolling_max_voltage_7d,

        -- Current metrics
        avg(avg_value) OVER w7d AS rolling_avg_current_7d,
        stddevPop(avg_value) OVER w7d AS rolling_std_current_7d,

        -- Temperature metrics
        avg(avg_value) OVER w7d AS rolling_avg_temperature_7d,
        stddevPop(avg_value) OVER w7d AS rolling_std_temperature_7d,
        max(max_value) OVER w7d AS rolling_max_temperature_7d,

        -- Frequency metrics
        avg(avg_value) OVER w7d AS rolling_avg_frequency_7d,
        stddevPop(avg_value) OVER w7d AS rolling_std_frequency_7d,

        -- Anomaly counts
        sum(anomaly_count) OVER w7d AS anomaly_count_7d,
        sum(anomaly_count) OVER w30d AS anomaly_count_30d,
        sum(anomaly_count) OVER w90d AS anomaly_count_90d,

        -- Performance metrics
        0.75 AS capacity_factor_7d,  -- Placeholder
        0.78 AS capacity_factor_30d,
        0.95 AS availability_7d,
        0.93 AS availability_30d,

        -- Generation metrics
        sum(sum_value) OVER w7d AS total_generation_kwh_7d,
        sum(sum_value) OVER w30d AS total_generation_kwh_30d,
        avg(sum_value) OVER w30d AS avg_daily_generation_kwh,

        -- Timestamps
        time_bucket AS event_timestamp,
        now() AS created

    FROM telemetry_aggregates
    WHERE metric_name = 'power_kw'
      AND time_bucket >= now() - INTERVAL 90 DAY
    WINDOW
        w7d AS (PARTITION BY asset_id ORDER BY time_bucket ROWS BETWEEN 7 PRECEDING AND CURRENT ROW),
        w30d AS (PARTITION BY asset_id ORDER BY time_bucket ROWS BETWEEN 30 PRECEDING AND CURRENT ROW),
        w90d AS (PARTITION BY asset_id ORDER BY time_bucket ROWS BETWEEN 90 PRECEDING AND CURRENT ROW)
    ORDER BY asset_id, time_bucket DESC
    """

    result = ch_client.execute(query)

    # Convert to DataFrame
    columns = [
        "asset_id",
        "rolling_avg_power_7d", "rolling_std_power_7d", "rolling_min_power_7d", "rolling_max_power_7d",
        "rolling_avg_power_30d", "rolling_std_power_30d",
        "rolling_avg_voltage_7d", "rolling_std_voltage_7d", "rolling_min_voltage_7d", "rolling_max_voltage_7d",
        "rolling_avg_current_7d", "rolling_std_current_7d",
        "rolling_avg_temperature_7d", "rolling_std_temperature_7d", "rolling_max_temperature_7d",
        "rolling_avg_frequency_7d", "rolling_std_frequency_7d",
        "anomaly_count_7d", "anomaly_count_30d", "anomaly_count_90d",
        "capacity_factor_7d", "capacity_factor_30d", "availability_7d", "availability_30d",
        "total_generation_kwh_7d", "total_generation_kwh_30d", "avg_daily_generation_kwh",
        "event_timestamp", "created"
    ]

    df = pd.DataFrame(result, columns=columns)

    # Save to parquet
    output_path = FEAST_DATA_DIR / "telemetry_features.parquet"
    df.to_parquet(output_path, index=False)

    print(f"✓ Materialized {len(df)} telemetry features to {output_path}")
    return df


def materialize_work_order_features(conn):
    """Extract and materialize work order features"""
    print("Materializing work order features...")

    query = """
    SELECT
        wo.asset_id,

        -- Work order counts by time window
        COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '7 days') AS wo_count_7d,
        COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '30 days') AS wo_count_30d,
        COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '90 days') AS wo_count_90d,
        COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '365 days') AS wo_count_365d,

        -- Corrective work orders
        COUNT(*) FILTER (WHERE wo.type = 'corrective' AND wo.created_at >= NOW() - INTERVAL '7 days') AS corrective_wo_count_7d,
        COUNT(*) FILTER (WHERE wo.type = 'corrective' AND wo.created_at >= NOW() - INTERVAL '30 days') AS corrective_wo_count_30d,
        COUNT(*) FILTER (WHERE wo.type = 'corrective' AND wo.created_at >= NOW() - INTERVAL '90 days') AS corrective_wo_count_90d,

        -- Preventive work orders
        COUNT(*) FILTER (WHERE wo.type = 'preventive' AND wo.created_at >= NOW() - INTERVAL '30 days') AS preventive_wo_count_30d,
        COUNT(*) FILTER (WHERE wo.type = 'preventive' AND wo.created_at >= NOW() - INTERVAL '90 days') AS preventive_wo_count_90d,

        -- Emergency work orders
        COUNT(*) FILTER (WHERE wo.type = 'emergency' AND wo.created_at >= NOW() - INTERVAL '30 days') AS emergency_wo_count_30d,
        COUNT(*) FILTER (WHERE wo.type = 'emergency' AND wo.created_at >= NOW() - INTERVAL '90 days') AS emergency_wo_count_90d,

        -- Completion metrics
        AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 3600.0)
            FILTER (WHERE wo.completed_at IS NOT NULL AND wo.created_at >= NOW() - INTERVAL '30 days') AS avg_wo_completion_hours_30d,

        COUNT(*) FILTER (WHERE wo.due_date < NOW() AND wo.status != 'completed' AND wo.created_at >= NOW() - INTERVAL '30 days') AS overdue_wo_count_30d,

        COALESCE(
            COUNT(*) FILTER (WHERE wo.status = 'completed' AND wo.created_at >= NOW() - INTERVAL '30 days')::float /
            NULLIF(COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '30 days'), 0) * 100,
            0.0
        ) AS wo_completion_rate_30d,

        -- Priority distributions
        COUNT(*) FILTER (WHERE wo.priority = 'critical' AND wo.created_at >= NOW() - INTERVAL '30 days') AS critical_wo_count_30d,
        COUNT(*) FILTER (WHERE wo.priority = 'high' AND wo.created_at >= NOW() - INTERVAL '30 days') AS high_priority_wo_count_30d,

        -- Trends
        CASE
            WHEN COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '90 days' AND wo.created_at < NOW() - INTERVAL '30 days') > 0
            THEN
                COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '30 days')::float /
                COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '90 days' AND wo.created_at < NOW() - INTERVAL '30 days')
            ELSE 1.0
        END AS wo_count_trend_30d_vs_90d,

        COALESCE(
            COUNT(*) FILTER (WHERE wo.type = 'corrective' AND wo.created_at >= NOW() - INTERVAL '30 days')::float /
            NULLIF(COUNT(*) FILTER (WHERE wo.created_at >= NOW() - INTERVAL '30 days'), 0),
            0.0
        ) AS corrective_wo_ratio_30d,

        -- Recurring issues (placeholder)
        0 AS repeat_failure_count_90d,

        -- Days since last work orders
        COALESCE(EXTRACT(DAY FROM NOW() - MAX(wo.created_at)), 999) AS days_since_last_wo,
        COALESCE(EXTRACT(DAY FROM NOW() - MAX(wo.created_at) FILTER (WHERE wo.type = 'corrective')), 999) AS days_since_last_corrective_wo,
        COALESCE(EXTRACT(DAY FROM NOW() - MAX(wo.created_at) FILTER (WHERE wo.type = 'preventive')), 999) AS days_since_last_preventive_wo,

        -- Timestamps
        NOW() AS event_timestamp,
        NOW() AS created

    FROM work_orders wo
    WHERE wo.deleted_at IS NULL
      AND wo.asset_id IS NOT NULL
    GROUP BY wo.asset_id
    """

    df = pd.read_sql_query(query, conn)

    # Save to parquet
    output_path = FEAST_DATA_DIR / "work_order_features.parquet"
    df.to_parquet(output_path, index=False)

    print(f"✓ Materialized {len(df)} work order features to {output_path}")
    return df


def main():
    """Main materialization function"""
    print("=" * 60)
    print("Feast Feature Materialization")
    print("=" * 60)
    print()

    # Extract features from data sources
    try:
        # PostgreSQL features
        pg_conn = get_postgres_connection()
        asset_df = materialize_asset_features(pg_conn)
        wo_df = materialize_work_order_features(pg_conn)
        pg_conn.close()

        # ClickHouse features
        ch_client = get_clickhouse_client()
        telemetry_df = materialize_telemetry_features(ch_client)

        print()
        print("=" * 60)
        print("Feature Extraction Complete")
        print("=" * 60)
        print(f"Asset features: {len(asset_df)} rows")
        print(f"Telemetry features: {len(telemetry_df)} rows")
        print(f"Work order features: {len(wo_df)} rows")
        print()

        # Apply Feast to materialize to online store
        print("Applying Feast materialization...")
        feast_repo_path = Path(__file__).parent
        store = FeatureStore(repo_path=str(feast_repo_path))

        # Materialize features to online store (Redis)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)

        store.materialize(
            start_date=start_date,
            end_date=end_date
        )

        print("✓ Feast materialization complete!")
        print(f"Features available in online store (Redis)")

        # Feature freshness check
        print()
        print("Feature Views:")
        for fv in store.list_feature_views():
            print(f"  - {fv.name}")

        return 0

    except Exception as e:
        print(f"✗ Error during materialization: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
