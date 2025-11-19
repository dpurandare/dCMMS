"""
Telemetry Feature View
Aggregated telemetry metrics for predictive maintenance
"""

from datetime import timedelta
from feast import Feature, FeatureView, Field, FileSource
from feast.types import Float32, Float64, Int32, String
from entities import asset

# Telemetry data source - pre-aggregated from ClickHouse
telemetry_source = FileSource(
    name="telemetry_source",
    path="/tmp/dcmms/feast/data/telemetry_features.parquet",
    timestamp_field="event_timestamp",
    created_timestamp_column="created",
)

# Telemetry features view
telemetry_features = FeatureView(
    name="telemetry_features",
    entities=[asset],
    ttl=timedelta(days=90),  # Telemetry features valid for 90 days
    schema=[
        # Power metrics (rolling windows)
        Field(name="rolling_avg_power_7d", dtype=Float32),
        Field(name="rolling_std_power_7d", dtype=Float32),
        Field(name="rolling_min_power_7d", dtype=Float32),
        Field(name="rolling_max_power_7d", dtype=Float32),
        Field(name="rolling_avg_power_30d", dtype=Float32),
        Field(name="rolling_std_power_30d", dtype=Float32),

        # Voltage metrics
        Field(name="rolling_avg_voltage_7d", dtype=Float32),
        Field(name="rolling_std_voltage_7d", dtype=Float32),
        Field(name="rolling_min_voltage_7d", dtype=Float32),
        Field(name="rolling_max_voltage_7d", dtype=Float32),

        # Current metrics
        Field(name="rolling_avg_current_7d", dtype=Float32),
        Field(name="rolling_std_current_7d", dtype=Float32),

        # Temperature metrics
        Field(name="rolling_avg_temperature_7d", dtype=Float32),
        Field(name="rolling_std_temperature_7d", dtype=Float32),
        Field(name="rolling_max_temperature_7d", dtype=Float32),

        # Frequency metrics (for grid-connected assets)
        Field(name="rolling_avg_frequency_7d", dtype=Float32),
        Field(name="rolling_std_frequency_7d", dtype=Float32),

        # Anomaly counts
        Field(name="anomaly_count_7d", dtype=Int32),
        Field(name="anomaly_count_30d", dtype=Int32),
        Field(name="anomaly_count_90d", dtype=Int32),

        # Performance metrics
        Field(name="capacity_factor_7d", dtype=Float32),  # Actual / Rated capacity
        Field(name="capacity_factor_30d", dtype=Float32),
        Field(name="availability_7d", dtype=Float32),  # Uptime percentage
        Field(name="availability_30d", dtype=Float32),

        # Generation metrics (for renewable assets)
        Field(name="total_generation_kwh_7d", dtype=Float64),
        Field(name="total_generation_kwh_30d", dtype=Float64),
        Field(name="avg_daily_generation_kwh", dtype=Float32),
    ],
    source=telemetry_source,
    online=True,
    tags={"team": "ml", "domain": "predictive_maintenance", "source": "clickhouse"},
)
