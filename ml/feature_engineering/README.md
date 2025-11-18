# Feature Engineering for dCMMS

Production feature engineering functions for predictive maintenance models.

## Overview

This directory contains feature engineering code that transforms raw asset, telemetry, and work order data into ML-ready features. Features are designed to be used with the Feast feature store and consumed by predictive maintenance models.

## Modules

### `asset_features.py`

Asset-level features derived from asset metadata, maintenance history, and health metrics.

**Functions:**
- `calculate_asset_age()`: Calculate asset age in months
- `calculate_days_since_last_maintenance()`: Days since last maintenance event
- `calculate_mttr()`: Mean Time To Repair in hours
- `calculate_mtbf()`: Mean Time Between Failures in hours
- `calculate_work_order_rate()`: Work orders per month
- `calculate_corrective_wo_ratio()`: Ratio of corrective to total work orders
- `calculate_maintenance_health_ratio()`: Maintenance urgency indicator
- `create_asset_features()`: Main orchestration function

**Engineered Features (10 total):**
- `asset_age_months`: Age in months since installation
- `days_since_last_maintenance`: Recency of maintenance
- `wo_rate_per_month`: Work order frequency
- `corrective_wo_ratio`: Ratio of corrective WOs (0.0 to 1.0)
- `maintenance_health_ratio`: Days since maintenance / health score
- `alarm_rate_30d`: Recent alarms per day
- `has_recent_maintenance`: Binary flag (< 30 days)
- `is_overdue_maintenance`: Binary flag (> 180 days)
- `has_low_health`: Binary flag (health < 50)
- `has_high_alarms`: Binary flag (> 10 alarms in 30d)

**Usage:**
```python
from ml.feature_engineering.asset_features import create_asset_features

# Create features from asset DataFrame
features_df = create_asset_features(
    asset_df,
    work_orders_df,
    current_date=pd.Timestamp('2025-01-15')
)
```

### `telemetry_features.py`

Time series features from telemetry data with rolling aggregations and anomaly detection.

**Functions:**
- `calculate_rolling_stats()`: Rolling mean, std, min, max, median, quantiles
- `detect_anomalies_zscore()`: Z-score based anomaly detection
- `detect_anomalies_iqr()`: IQR-based outlier detection
- `calculate_capacity_factor()`: Actual vs rated capacity ratio
- `calculate_availability()`: Uptime percentage
- `calculate_trend()`: Linear regression slope for trending
- `create_telemetry_features()`: Main orchestration function

**Engineered Features:**
- **Power**: rolling_avg_power_7d, rolling_std_power_7d, rolling_min_power_7d, rolling_max_power_7d
- **Voltage**: rolling_avg_voltage_7d, rolling_std_voltage_7d
- **Temperature**: rolling_avg_temperature_7d, rolling_std_temperature_7d, rolling_max_temperature_7d
- **Anomalies**: power_anomaly, voltage_anomaly, temperature_anomaly (binary)
- **Anomaly Counts**: anomaly_count_7d (rolling sum)
- **Performance**: capacity_factor_7d (0.0 to 1.0+)
- **Trends**: power_trend_7d, temperature_trend_7d (slope)
- **Volatility**: power_cv_7d (coefficient of variation)

**Usage:**
```python
from ml.feature_engineering.telemetry_features import create_telemetry_features

# Create features from telemetry DataFrame
features_df = create_telemetry_features(
    telemetry_df,
    rolling_windows={'power': 7, 'voltage': 7, 'temperature': 7},
    anomaly_method='zscore',
    anomaly_threshold=3.0,
    rated_capacity_kw=100.0
)
```

### `data_quality.py`

Comprehensive data quality validation framework.

**Check Functions:**
- `check_missing_values()`: Validates missing rate below threshold (default 10%)
- `check_outliers()`: Detects outliers using IQR or z-score method
- `check_data_types()`: Validates expected data types (numeric, datetime, categorical)
- `check_value_ranges()`: Ensures values within specified bounds
- `check_duplicates()`: Identifies duplicate rows
- `check_class_imbalance()`: Checks for severe class imbalance (default min ratio 0.1)

**Main Function:**
```python
from ml.feature_engineering.data_quality import run_data_quality_checks, print_data_quality_report

report = run_data_quality_checks(
    df,
    target=y,
    config={
        'max_missing_rate': 0.1,
        'outlier_method': 'iqr',
        'outlier_threshold': 1.5,
        'expected_types': {
            'asset_age_months': 'numeric',
            'health_score': 'numeric',
        },
        'value_ranges': {
            'health_score': (0, 100),
            'asset_age_months': (0, None),
        },
        'min_class_ratio': 0.1,
    }
)

print_data_quality_report(report)
```

**Output:**
```
============================================================
Data Quality Report
============================================================

Status: ✓ PASSED
Checks: 6/6 passed

Dataset Statistics:
  n_rows: 1000
  n_columns: 13
  n_numeric_columns: 10
  memory_usage_mb: 0.12

Warnings (1):
  ⚠ outliers: total_outliers=23, outlier_rate=0.023

============================================================
```

## Feature Engineering Pipeline

### Step 1: Data Extraction

Extract raw data from PostgreSQL and ClickHouse:

```python
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://user:pass@localhost:5432/dcmms')

# Extract asset data
asset_df = pd.read_sql_query("""
    SELECT
        id AS asset_id,
        asset_type,
        status,
        installed_date,
        health_score,
        ...
    FROM assets
    WHERE status != 'decommissioned'
""", engine)

# Extract work orders
work_orders_df = pd.read_sql_query("""
    SELECT
        asset_id,
        work_order_type,
        created_at,
        completed_at,
        priority,
        ...
    FROM work_orders
    WHERE created_at >= NOW() - INTERVAL '2 years'
""", engine)

# Extract telemetry (from ClickHouse)
telemetry_df = pd.read_sql_query("""
    SELECT
        asset_id,
        timestamp,
        power_kw,
        voltage_v,
        temperature_c,
        ...
    FROM telemetry
    WHERE timestamp >= NOW() - INTERVAL '90 days'
""", engine)
```

### Step 2: Feature Engineering

Create features using the engineering functions:

```python
from ml.feature_engineering.asset_features import create_asset_features
from ml.feature_engineering.telemetry_features import create_telemetry_features

# Asset features
asset_features = create_asset_features(
    asset_df,
    work_orders_df,
    current_date=pd.Timestamp.now()
)

# Telemetry features (per asset)
telemetry_features_list = []
for asset_id in asset_df['asset_id'].unique():
    asset_telemetry = telemetry_df[telemetry_df['asset_id'] == asset_id]
    if len(asset_telemetry) > 0:
        features = create_telemetry_features(
            asset_telemetry,
            rolling_windows={'power': 7, 'voltage': 7, 'temperature': 7},
            rated_capacity_kw=asset_df.loc[asset_df['asset_id'] == asset_id, 'capacity_kw'].iloc[0]
        )
        telemetry_features_list.append(features)

telemetry_features = pd.concat(telemetry_features_list)

# Merge features
final_features = asset_features.merge(
    telemetry_features,
    on='asset_id',
    how='left'
)
```

### Step 3: Data Quality Validation

Validate data quality before training:

```python
from ml.feature_engineering.data_quality import run_data_quality_checks, print_data_quality_report

report = run_data_quality_checks(
    final_features,
    target=labels,
    config={
        'max_missing_rate': 0.1,
        'outlier_method': 'iqr',
        'outlier_threshold': 1.5,
        'min_class_ratio': 0.05,
    }
)

print_data_quality_report(report)

if not report.passed:
    print("Data quality checks failed!")
    for issue in report.issues:
        print(f"  - {issue['check']}: {issue}")
    # Handle failures (clean data, drop features, etc.)
```

### Step 4: Save to Feature Store

Materialize features to Feast:

```python
from feast import FeatureStore

# Save features to Parquet (offline store)
final_features.to_parquet('/tmp/dcmms/feast/asset_features.parquet')

# Materialize to online store (Redis)
store = FeatureStore(repo_path="/home/user/dCMMS/ml/feast")
store.materialize(
    start_date=pd.Timestamp.now() - pd.Timedelta(days=90),
    end_date=pd.Timestamp.now()
)

print("Features materialized to Feast!")
```

## Integration with Feast

Features are registered in Feast feature views:

**`ml/feast/features/asset_features.py`:**
```python
asset_features = FeatureView(
    name="asset_features",
    entities=[asset],
    schema=[
        Field(name="asset_age_months", dtype=Int64),
        Field(name="days_since_last_maintenance", dtype=Int64),
        Field(name="wo_rate_per_month", dtype=Float32),
        Field(name="health_score", dtype=Float32),
        # ... more fields
    ],
    source=FileSource(
        path="/tmp/dcmms/feast/asset_features.parquet",
        timestamp_field="event_timestamp",
    ),
    online=True,
    ttl=timedelta(days=365),
)
```

## Feature Versioning

Features are versioned using semantic versioning (v1, v2, v3):

- **v1.0**: Initial asset features (10 features)
- **v1.1**: Added telemetry rolling aggregates (18 features)
- **v2.0**: Added work order trend features (8 features)

Version tracking:
```python
FEATURE_VERSION = "v1.1"

# Log version in MLflow
mlflow.log_param("feature_version", FEATURE_VERSION)

# Include in dataset metadata
metadata = {
    "feature_version": FEATURE_VERSION,
    "created_at": pd.Timestamp.now().isoformat(),
    "n_features": len(final_features.columns),
    "feature_names": list(final_features.columns),
}
```

## Testing

### Unit Tests

Create unit tests for feature functions:

```python
# tests/test_asset_features.py
import pytest
import pandas as pd
from ml.feature_engineering.asset_features import calculate_asset_age

def test_calculate_asset_age():
    df = pd.DataFrame({
        'installed_date': [pd.Timestamp('2020-01-01')],
    })
    current_date = pd.Timestamp('2021-01-01')

    result = calculate_asset_age(df, current_date)

    assert result[0] == 12  # 12 months
```

### Integration Tests

Test full feature engineering pipeline:

```python
# tests/test_feature_pipeline.py
def test_create_asset_features():
    # Create sample data
    asset_df = create_sample_asset_df()
    work_orders_df = create_sample_work_orders_df()

    # Run feature engineering
    features = create_asset_features(asset_df, work_orders_df)

    # Validate output
    assert len(features) == len(asset_df)
    assert 'asset_age_months' in features.columns
    assert features['asset_age_months'].notna().all()
```

## Best Practices

1. **Handle Missing Data**: All feature functions handle missing values gracefully (fill with 0, median, or NaN)
2. **Type Hints**: All functions include type hints for inputs and outputs
3. **Docstrings**: Comprehensive docstrings with Args, Returns, and Examples
4. **Validation**: Input validation for edge cases (empty DataFrames, missing columns)
5. **Performance**: Use vectorized pandas operations, avoid loops
6. **Reproducibility**: Use fixed random seeds, log feature versions
7. **Documentation**: Feature metadata dictionaries with descriptions, types, ranges

## Troubleshooting

### Missing columns error
```
KeyError: 'power_kw'
```
**Solution**: Ensure telemetry DataFrame has required columns. Check schema in data extraction query.

### Unexpected NaN values
**Solution**: Use data quality checks to identify missing values. Fill or drop as needed.

### Outlier warnings
**Solution**: Review outlier detection thresholds. Consider capping extreme values or using robust scaling.

### Feature drift
**Solution**: Monitor feature distributions over time. Retrain feature engineering functions if data patterns change.

## References

- [Feast Feature Store](https://docs.feast.dev/)
- [Feature Engineering for Machine Learning](https://www.oreilly.com/library/view/feature-engineering-for/9781491953235/)
- [dCMMS ML Architecture](../../docs/ML_ARCHITECTURE.md)
