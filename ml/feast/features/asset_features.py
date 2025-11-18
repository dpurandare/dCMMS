"""
Asset Feature View
Features related to asset characteristics and maintenance history
"""

from datetime import timedelta
from feast import Feature, FeatureView, Field, FileSource
from feast.types import Float32, Float64, Int32, Int64, String, UnixTimestamp
from entities import asset

# Data source - PostgreSQL table via file export
# In production, replace with proper PostgreSQL source or batch export to Parquet
asset_source = FileSource(
    name="asset_source",
    path="/tmp/dcmms/feast/data/asset_features.parquet",
    timestamp_field="event_timestamp",
    created_timestamp_column="created",
)

# Asset features view
asset_features = FeatureView(
    name="asset_features",
    entities=[asset],
    ttl=timedelta(days=365),  # Features valid for 1 year
    schema=[
        Field(name="asset_type", dtype=String),
        Field(name="asset_status", dtype=String),
        Field(name="asset_age_months", dtype=Int32),
        Field(name="site_id", dtype=String),
        Field(name="total_work_orders", dtype=Int32),
        Field(name="total_corrective_work_orders", dtype=Int32),
        Field(name="total_preventive_work_orders", dtype=Int32),
        Field(name="days_since_last_maintenance", dtype=Int32),
        Field(name="days_since_last_corrective_wo", dtype=Int32),
        Field(name="mttr_hours", dtype=Float32),  # Mean Time To Repair
        Field(name="mtbf_hours", dtype=Float32),  # Mean Time Between Failures
        Field(name="health_score", dtype=Float32),  # Asset health score (0-100)
        Field(name="recent_alarms_30d", dtype=Int32),
        Field(name="recent_critical_alarms_30d", dtype=Int32),
        Field(name="installed_capacity_kw", dtype=Float64),
        Field(name="manufacturer", dtype=String),
        Field(name="model", dtype=String),
    ],
    source=asset_source,
    online=True,  # Materialize to online store (Redis)
    tags={"team": "ml", "domain": "predictive_maintenance"},
)
