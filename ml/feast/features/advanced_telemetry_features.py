"""
Advanced Telemetry Feature View with Time-Series Features

Includes lag features, rolling statistics, trends, and domain-specific features.
"""

from datetime import timedelta
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64, String

# Import asset entity
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from entities import asset

# Data source
advanced_telemetry_source = FileSource(
    path="/tmp/dcmms/feast/advanced_telemetry_features.parquet",
    timestamp_field="event_timestamp",
)

# Advanced Telemetry Feature View
advanced_telemetry_features = FeatureView(
    name="advanced_telemetry_features",
    entities=[asset],
    ttl=timedelta(days=90),
    schema=[
        # Lag features (power)
        Field(name="power_kw_lag_1d", dtype=Float32),
        Field(name="power_kw_lag_7d", dtype=Float32),
        Field(name="power_kw_lag_30d", dtype=Float32),

        # Lag features (voltage)
        Field(name="voltage_v_lag_1d", dtype=Float32),
        Field(name="voltage_v_lag_7d", dtype=Float32),

        # Lag features (temperature)
        Field(name="temperature_c_lag_1d", dtype=Float32),
        Field(name="temperature_c_lag_7d", dtype=Float32),

        # Rolling statistics - Power (7-day)
        Field(name="power_kw_rolling_mean_7d", dtype=Float32),
        Field(name="power_kw_rolling_std_7d", dtype=Float32),
        Field(name="power_kw_rolling_min_7d", dtype=Float32),
        Field(name="power_kw_rolling_max_7d", dtype=Float32),

        # Rolling statistics - Power (14-day)
        Field(name="power_kw_rolling_mean_14d", dtype=Float32),
        Field(name="power_kw_rolling_std_14d", dtype=Float32),

        # Rolling statistics - Power (30-day)
        Field(name="power_kw_rolling_mean_30d", dtype=Float32),
        Field(name="power_kw_rolling_std_30d", dtype=Float32),
        Field(name="power_kw_rolling_min_30d", dtype=Float32),
        Field(name="power_kw_rolling_max_30d", dtype=Float32),

        # Rolling statistics - Voltage (7-day)
        Field(name="voltage_v_rolling_mean_7d", dtype=Float32),
        Field(name="voltage_v_rolling_std_7d", dtype=Float32),

        # Rolling statistics - Temperature (7-day)
        Field(name="temperature_c_rolling_mean_7d", dtype=Float32),
        Field(name="temperature_c_rolling_std_7d", dtype=Float32),
        Field(name="temperature_c_rolling_max_7d", dtype=Float32),

        # Rolling statistics - Temperature (14-day)
        Field(name="temperature_c_rolling_mean_14d", dtype=Float32),
        Field(name="temperature_c_rolling_max_14d", dtype=Float32),

        # Trend features
        Field(name="power_kw_trend_7d", dtype=Float32),
        Field(name="power_kw_trend_14d", dtype=Float32),
        Field(name="power_kw_trend_30d", dtype=Float32),
        Field(name="temperature_c_trend_7d", dtype=Float32),
        Field(name="temperature_c_trend_14d", dtype=Float32),

        # Domain-specific features
        Field(name="capacity_factor_30d", dtype=Float32),
        Field(name="degradation_rate_365d", dtype=Float32),
        Field(name="alarm_frequency", dtype=Float32),

        # Feature interactions
        Field(name="asset_age_months_x_alarm_frequency", dtype=Float32),
        Field(name="mttr_hours_x_wo_rate_per_month", dtype=Float32),
        Field(name="health_score_x_days_since_last_maintenance", dtype=Float32),
    ],
    source=advanced_telemetry_source,
    online=True,
    tags={"version": "v2.0", "type": "advanced_telemetry"},
)
