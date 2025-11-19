# Feature Engineering Pipeline

> Transform raw telemetry and asset data into ML-ready features for predictive maintenance models

## Overview

The feature engineering pipeline extracts, transforms, and aggregates raw data from QuestDB (telemetry), PostgreSQL (assets, work orders), and external sources (weather) into features optimized for machine learning models.

**Pipeline Architecture:**
```
Raw Data Sources → Feature Engineering → Feature Store → Model Training/Inference
   (QuestDB,          (Python + Pandas)    (Feast)        (MLflow + Metaflow)
    PostgreSQL)
```

## Feature Categories

### 1. Telemetry Features

**Source:** QuestDB time-series database
**Update Frequency:** Real-time (streaming) and batch (hourly aggregates)

#### Raw Telemetry Metrics
- `temperature_c`: Asset temperature (°C)
- `vibration_hz`: Vibration frequency (Hz)
- `power_output_kw`: Current power output (kW)
- `voltage_v`: Operating voltage (V)
- `current_a`: Operating current (A)
- `power_factor`: Power factor (0-1)
- `efficiency_pct`: Operating efficiency (%)

#### Time-Window Aggregations
For each telemetry metric, compute rolling statistics:

| Feature Pattern | Description | Window Sizes |
|----------------|-------------|--------------|
| `{metric}_mean_{window}` | Rolling mean | 1h, 6h, 24h, 7d |
| `{metric}_std_{window}` | Rolling standard deviation | 1h, 6h, 24h, 7d |
| `{metric}_min_{window}` | Rolling minimum | 24h, 7d |
| `{metric}_max_{window}` | Rolling maximum | 24h, 7d |
| `{metric}_range_{window}` | Max - Min | 24h, 7d |

**Example:**
- `temperature_mean_24h`: Average temperature over last 24 hours
- `vibration_std_6h`: Vibration standard deviation over last 6 hours
- `power_output_range_7d`: Power output range (max - min) over last 7 days

#### Advanced Telemetry Features

**Trend Features:**
```python
# Linear regression slope over time window
temperature_trend_24h = slope(temperature, time, window='24h')
vibration_trend_6h = slope(vibration, time, window='6h')
```

**Rate of Change:**
```python
# Rate of change (delta / time_delta)
temperature_roc_1h = (temp_current - temp_1h_ago) / 1
power_output_roc_6h = (power_current - power_6h_ago) / 6
```

**Anomaly Scores:**
```python
# Z-score deviation from historical mean
temperature_zscore = (temp_current - temp_mean_30d) / temp_std_30d
vibration_anomaly_score = isolation_forest_score(vibration_features)
```

**Cross-Metric Features:**
```python
# Ratios and interactions
power_to_temp_ratio = power_output_kw / temperature_c
voltage_current_product = voltage_v * current_a  # Should equal power
efficiency_power_ratio = efficiency_pct / power_output_kw
```

### 2. Asset Features

**Source:** PostgreSQL `assets` table
**Update Frequency:** Batch (daily)

#### Static Asset Features
- `asset_type`: Equipment type (solar_inverter, transformer, motor, etc.)
- `manufacturer`: Equipment manufacturer
- `model`: Equipment model
- `installation_date`: Date installed (used to calculate age)
- `rated_capacity_kw`: Design capacity (kW)
- `location_lat`, `location_lon`: GPS coordinates

#### Derived Asset Features
```python
# Asset age in years
asset_age_years = (current_date - installation_date).days / 365.25

# Time since last maintenance (days)
days_since_last_maintenance = (current_date - last_maintenance_date).days

# Maintenance frequency (maintenance events per year)
maintenance_frequency = maintenance_count / asset_age_years

# Capacity utilization
capacity_utilization = avg_power_output_7d / rated_capacity_kw

# Runtime hours (cumulative operating time)
total_runtime_hours = sum(runtime_hours_daily)
```

### 3. Work Order Features

**Source:** PostgreSQL `work_orders` table
**Update Frequency:** Batch (daily)

#### Work Order History Features
```python
# Work order counts by type (last N days)
corrective_wo_count_30d = count(wo_type='corrective', window='30d')
preventive_wo_count_30d = count(wo_type='preventive', window='30d')
predictive_wo_count_30d = count(wo_type='predictive', window='30d')

# Total work orders (all types)
total_wo_count_90d = count(wo_type='*', window='90d')

# Work order cost
total_cost_30d = sum(wo_cost, window='30d')
avg_cost_per_wo_90d = mean(wo_cost, window='90d')

# Work order severity
critical_wo_count_30d = count(severity='critical', window='30d')
avg_severity_score_30d = mean(severity_score, window='30d')

# Time to resolution
avg_resolution_time_days = mean(resolution_time_hours / 24, window='90d')
```

### 4. Alarm Features

**Source:** PostgreSQL `alarms` table
**Update Frequency:** Real-time (streaming) and batch (hourly)

```python
# Alarm counts by severity
alarm_count_24h = count(alarms, window='24h')
critical_alarm_count_24h = count(severity='critical', window='24h')
warning_alarm_count_24h = count(severity='warning', window='24h')

# Recent alarm activity
recent_alarms_1h = count(alarms, window='1h')
recent_alarms_6h = count(alarms, window='6h')

# Alarm patterns
alarm_frequency_change = alarm_count_24h - alarm_count_24h_previous
alarm_burst_detected = (alarm_count_1h > 5).astype(int)  # Binary flag
```

### 5. Environmental Features

**Source:** Weather API (OpenWeatherMap / NOAA)
**Update Frequency:** Hourly

```python
# Current conditions
ambient_temp_c = current_weather.temperature
humidity_pct = current_weather.humidity
wind_speed_kmh = current_weather.wind_speed
precipitation_mm = current_weather.precipitation

# For solar assets
solar_irradiance_w_m2 = current_weather.solar_irradiance
cloud_cover_pct = current_weather.cloud_cover

# Rolling aggregates
ambient_temp_max_7d = max(ambient_temp_c, window='7d')
humidity_avg_24h = mean(humidity_pct, window='24h')
```

### 6. Health Score Features

**Source:** Calculated from multiple sources
**Update Frequency:** Daily

```python
# Composite health score (0-100)
health_score = weighted_average([
    telemetry_health_score,      # 40% weight
    maintenance_health_score,    # 30% weight
    alarm_health_score,          # 20% weight
    age_health_score             # 10% weight
])

# Health score trend
health_score_change_7d = health_score - health_score_7d_ago
health_score_trend_30d = slope(health_score, time, window='30d')

# Health score volatility
health_score_std_30d = std(health_score, window='30d')
```

## Feature Engineering Pipeline Implementation

### Pipeline Architecture

```
┌─────────────────┐
│  Raw Data       │
│  Extraction     │
│  (QuestDB, PG)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Quality   │
│  Validation     │
│  - Null checks  │
│  - Range checks │
│  - Consistency  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Feature        │
│  Computation    │
│  - Aggregations │
│  - Transforms   │
│  - Derivations  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Feature        │
│  Validation     │
│  - Schema check │
│  - Distribution │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Feature Store  │
│  (Feast)        │
│  - Materialize  │
│  - Serve        │
└─────────────────┘
```

### Python Implementation Structure

**File:** `ml/feature_engineering/pipeline.py`

```python
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta

class FeatureEngineeringPipeline:
    """
    Feature engineering pipeline for predictive maintenance.

    Transforms raw telemetry, asset, and work order data into
    ML-ready features.
    """

    def __init__(self, config: Dict):
        self.config = config
        self.telemetry_windows = config['telemetry_windows']
        self.feature_groups = config['feature_groups']

    def extract_features(
        self,
        asset_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """
        Extract and engineer features for an asset over a time range.

        Args:
            asset_id: Asset identifier
            start_date: Start of feature extraction period
            end_date: End of feature extraction period

        Returns:
            DataFrame with engineered features
        """
        # 1. Extract raw data
        telemetry = self._extract_telemetry(asset_id, start_date, end_date)
        asset_info = self._extract_asset_info(asset_id)
        work_orders = self._extract_work_orders(asset_id, start_date, end_date)
        alarms = self._extract_alarms(asset_id, start_date, end_date)
        weather = self._extract_weather(asset_info['location'], start_date, end_date)

        # 2. Validate data quality
        self._validate_data_quality(telemetry, asset_info, work_orders)

        # 3. Compute features
        features = pd.DataFrame()

        if 'telemetry' in self.feature_groups:
            features = self._compute_telemetry_features(telemetry, features)

        if 'asset' in self.feature_groups:
            features = self._compute_asset_features(asset_info, features)

        if 'work_order' in self.feature_groups:
            features = self._compute_work_order_features(work_orders, features)

        if 'alarm' in self.feature_groups:
            features = self._compute_alarm_features(alarms, features)

        if 'environmental' in self.feature_groups:
            features = self._compute_environmental_features(weather, features)

        if 'health' in self.feature_groups:
            features = self._compute_health_features(features)

        # 4. Validate features
        self._validate_features(features)

        return features

    def _compute_telemetry_features(
        self,
        telemetry: pd.DataFrame,
        features: pd.DataFrame
    ) -> pd.DataFrame:
        """Compute telemetry-based features."""
        metrics = ['temperature_c', 'vibration_hz', 'power_output_kw',
                   'voltage_v', 'current_a', 'efficiency_pct']

        for metric in metrics:
            # Rolling aggregations
            for window in self.telemetry_windows:
                features[f'{metric}_mean_{window}'] = (
                    telemetry[metric].rolling(window).mean()
                )
                features[f'{metric}_std_{window}'] = (
                    telemetry[metric].rolling(window).std()
                )
                features[f'{metric}_min_{window}'] = (
                    telemetry[metric].rolling(window).min()
                )
                features[f'{metric}_max_{window}'] = (
                    telemetry[metric].rolling(window).max()
                )

            # Trend (linear regression slope)
            features[f'{metric}_trend_24h'] = (
                self._compute_trend(telemetry[metric], window='24h')
            )

            # Rate of change
            features[f'{metric}_roc_1h'] = telemetry[metric].diff(periods=1)

            # Z-score
            mean_30d = telemetry[metric].rolling('30d').mean()
            std_30d = telemetry[metric].rolling('30d').std()
            features[f'{metric}_zscore'] = (
                (telemetry[metric] - mean_30d) / std_30d
            )

        # Cross-metric features
        features['power_to_temp_ratio'] = (
            telemetry['power_output_kw'] / telemetry['temperature_c']
        )
        features['voltage_current_product'] = (
            telemetry['voltage_v'] * telemetry['current_a']
        )

        return features

    def _compute_asset_features(
        self,
        asset_info: Dict,
        features: pd.DataFrame
    ) -> pd.DataFrame:
        """Compute asset-based features."""
        # Asset age
        install_date = asset_info['installation_date']
        features['asset_age_years'] = (
            (datetime.now() - install_date).days / 365.25
        )

        # Days since last maintenance
        last_maintenance = asset_info.get('last_maintenance_date')
        if last_maintenance:
            features['days_since_last_maintenance'] = (
                (datetime.now() - last_maintenance).days
            )
        else:
            features['days_since_last_maintenance'] = np.nan

        # Capacity utilization (requires telemetry)
        if 'power_output_mean_7d' in features:
            features['capacity_utilization'] = (
                features['power_output_mean_7d'] / asset_info['rated_capacity_kw']
            )

        # Static features (one-hot encoded later)
        features['asset_type'] = asset_info['asset_type']
        features['manufacturer'] = asset_info['manufacturer']

        return features

    def _compute_work_order_features(
        self,
        work_orders: pd.DataFrame,
        features: pd.DataFrame
    ) -> pd.DataFrame:
        """Compute work order history features."""
        # Count by type
        features['corrective_wo_count_30d'] = self._count_wo_by_type(
            work_orders, 'corrective', window_days=30
        )
        features['preventive_wo_count_30d'] = self._count_wo_by_type(
            work_orders, 'preventive', window_days=30
        )
        features['total_wo_count_90d'] = len(
            work_orders[work_orders['created_at'] > datetime.now() - timedelta(days=90)]
        )

        # Cost features
        recent_wo = work_orders[
            work_orders['created_at'] > datetime.now() - timedelta(days=30)
        ]
        features['total_cost_30d'] = recent_wo['total_cost'].sum()

        # Severity
        features['critical_wo_count_30d'] = self._count_wo_by_severity(
            work_orders, 'critical', window_days=30
        )

        return features

    def _compute_health_features(self, features: pd.DataFrame) -> pd.DataFrame:
        """Compute composite health score."""
        # Telemetry health (normalized deviation from optimal)
        telemetry_health = self._compute_telemetry_health(features)

        # Maintenance health (based on WO history)
        maintenance_health = self._compute_maintenance_health(features)

        # Alarm health (based on alarm frequency)
        alarm_health = self._compute_alarm_health(features)

        # Age health (based on asset age vs expected lifespan)
        age_health = self._compute_age_health(features)

        # Weighted composite
        features['health_score'] = (
            0.4 * telemetry_health +
            0.3 * maintenance_health +
            0.2 * alarm_health +
            0.1 * age_health
        )

        # Health score trend
        features['health_score_change_7d'] = features['health_score'].diff(periods=7)

        return features
```

## Feature Store Integration (Feast)

### Feature Definitions

**File:** `ml/feast/features/predictive_maintenance_features.py`

```python
from feast import Entity, Feature, FeatureView, ValueType
from feast.data_source import FileSource
from datetime import timedelta

# Entity: Asset
asset = Entity(
    name="asset_id",
    value_type=ValueType.STRING,
    description="Unique asset identifier"
)

# Data sources
telemetry_source = FileSource(
    path="gs://dcmms-ml/features/telemetry_features.parquet",
    event_timestamp_column="timestamp"
)

# Feature views
telemetry_features = FeatureView(
    name="telemetry_features",
    entities=["asset_id"],
    ttl=timedelta(days=30),
    features=[
        Feature(name="temperature_mean_24h", dtype=ValueType.DOUBLE),
        Feature(name="temperature_std_24h", dtype=ValueType.DOUBLE),
        Feature(name="vibration_mean_6h", dtype=ValueType.DOUBLE),
        Feature(name="power_output_mean_7d", dtype=ValueType.DOUBLE),
        Feature(name="efficiency_pct_mean_24h", dtype=ValueType.DOUBLE),
        # ... more features
    ],
    online=True,
    batch_source=telemetry_source,
    tags={"category": "telemetry"}
)
```

### Feature Materialization

**Batch Materialization (Daily):**
```bash
#!/bin/bash
# materialize_features.sh

# Materialize features for the last 7 days
feast materialize-incremental $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)

# Verify materialization
feast materialize-incremental --validate
```

**Streaming Materialization (Real-time):**
```python
# stream_features.py
from feast import FeatureStore
from kafka import KafkaConsumer

store = FeatureStore(repo_path="ml/feast/")

consumer = KafkaConsumer('telemetry-events')

for message in consumer:
    features = extract_features(message.value)
    store.push(features)
```

## Data Quality Validation

**File:** `ml/feature_engineering/data_quality.py`

```python
class DataQualityValidator:
    """Validate data quality for feature engineering."""

    def validate_telemetry(self, df: pd.DataFrame) -> Dict[str, bool]:
        """
        Validate telemetry data quality.

        Checks:
        - Missing value rate < 20%
        - Values within physical constraints
        - Timestamp continuity
        """
        checks = {}

        # Check missing values
        missing_rate = df.isnull().mean()
        checks['missing_values'] = all(missing_rate < 0.2)

        # Check physical constraints
        checks['temperature_range'] = all(
            (df['temperature_c'] >= -40) & (df['temperature_c'] <= 120)
        )
        checks['vibration_range'] = all(
            (df['vibration_hz'] >= 0) & (df['vibration_hz'] <= 1000)
        )
        checks['power_positive'] = all(df['power_output_kw'] >= 0)

        # Check timestamp continuity
        time_diffs = df['timestamp'].diff()
        expected_interval = timedelta(minutes=1)
        checks['timestamp_continuity'] = all(
            time_diffs.dropna() <= expected_interval * 1.5
        )

        return checks
```

## Feature Engineering Schedule

| Task | Frequency | Duration | Priority |
|------|-----------|----------|----------|
| Real-time telemetry features | Streaming (1/min) | <1s | High |
| Hourly telemetry aggregates | Hourly | ~5 min | High |
| Daily asset/WO features | Daily (2 AM UTC) | ~30 min | Medium |
| Weekly health scores | Weekly (Sunday) | ~1 hour | Medium |
| Feature store materialization | Daily (3 AM UTC) | ~1 hour | High |

## Feature Monitoring

### Drift Detection

Monitor feature distributions for drift:

```python
# Check feature drift (KL divergence)
from scipy.stats import entropy

current_dist = get_feature_distribution(current_period)
baseline_dist = get_feature_distribution(baseline_period)

kl_divergence = entropy(current_dist, baseline_dist)

if kl_divergence > 0.15:
    alert("Feature drift detected", kl=kl_divergence)
```

### Feature Importance Tracking

Track which features are most predictive over time:

```python
# SHAP feature importance
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

feature_importance = pd.DataFrame({
    'feature': X_test.columns,
    'importance': np.abs(shap_values).mean(axis=0)
}).sort_values('importance', ascending=False)
```

## References

- [Feature Engineering Best Practices](https://docs.feast.dev/getting-started/architecture-and-components/feature-engineering)
- [Time Series Feature Engineering](https://machinelearningmastery.com/basic-feature-engineering-time-series-data-python/)
- [Feast Feature Store Documentation](https://docs.feast.dev/)

---

**Last Updated:** 2025-01-18
**Owner:** ML Team
**Contact:** ml-team@example.com
