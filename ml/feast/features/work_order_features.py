"""
Work Order Feature View
Features derived from maintenance work order history
"""

from datetime import timedelta
from feast import Feature, FeatureView, Field, FileSource
from feast.types import Float32, Int32, String
from entities import asset

# Work order data source
work_order_source = FileSource(
    name="work_order_source",
    path="/tmp/dcmms/feast/data/work_order_features.parquet",
    timestamp_field="event_timestamp",
    created_timestamp_column="created",
)

# Work order features view
work_order_features = FeatureView(
    name="work_order_features",
    entities=[asset],
    ttl=timedelta(days=365),
    schema=[
        # Work order counts by time window
        Field(name="wo_count_7d", dtype=Int32),
        Field(name="wo_count_30d", dtype=Int32),
        Field(name="wo_count_90d", dtype=Int32),
        Field(name="wo_count_365d", dtype=Int32),

        # Corrective work orders
        Field(name="corrective_wo_count_7d", dtype=Int32),
        Field(name="corrective_wo_count_30d", dtype=Int32),
        Field(name="corrective_wo_count_90d", dtype=Int32),

        # Preventive work orders
        Field(name="preventive_wo_count_30d", dtype=Int32),
        Field(name="preventive_wo_count_90d", dtype=Int32),

        # Emergency work orders
        Field(name="emergency_wo_count_30d", dtype=Int32),
        Field(name="emergency_wo_count_90d", dtype=Int32),

        # Work order completion metrics
        Field(name="avg_wo_completion_hours_30d", dtype=Float32),
        Field(name="overdue_wo_count_30d", dtype=Int32),
        Field(name="wo_completion_rate_30d", dtype=Float32),  # Percentage

        # Priority distributions
        Field(name="critical_wo_count_30d", dtype=Int32),
        Field(name="high_priority_wo_count_30d", dtype=Int32),

        # Work order trends
        Field(name="wo_count_trend_30d_vs_90d", dtype=Float32),  # Ratio
        Field(name="corrective_wo_ratio_30d", dtype=Float32),  # Corrective / Total

        # Recurring issues
        Field(name="repeat_failure_count_90d", dtype=Int32),  # Same failure type
        Field(name="days_since_last_wo", dtype=Int32),
        Field(name="days_since_last_corrective_wo", dtype=Int32),
        Field(name="days_since_last_preventive_wo", dtype=Int32),
    ],
    source=work_order_source,
    online=True,
    tags={"team": "ml", "domain": "predictive_maintenance"},
)
