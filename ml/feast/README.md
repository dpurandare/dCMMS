# Feast Feature Store for dCMMS

This directory contains the Feast feature store configuration for dCMMS ML infrastructure.

## Overview

Feast is used to manage features for predictive maintenance models:
- **Asset features**: Asset characteristics, maintenance history, health scores
- **Telemetry features**: Rolling aggregates of telemetry metrics (power, voltage, temperature)
- **Work order features**: Work order patterns and trends

## Architecture

```
PostgreSQL/ClickHouse (Data Sources)
         ↓
 Feature Engineering
         ↓
   Offline Store (Parquet files)
         ↓
   Materialization Job
         ↓
   Online Store (Redis)
         ↓
   Feature Server → ML Models
```

## Setup

### 1. Install Dependencies

```bash
cd /home/user/dCMMS/ml
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Feast

Edit `feature_store.yaml` to set your environment:
- Update `registry` path to point to your PostgreSQL database
- Update `online_store` connection string for Redis
- For production, configure S3/Iceberg offline store

### 3. Initialize Feast Repository

```bash
cd /home/user/dCMMS/ml/feast
feast apply
```

This will:
- Register entities (asset, work_order, site)
- Register feature views (asset_features, telemetry_features, work_order_features)
- Create tables in PostgreSQL registry

### 4. Materialize Features

Run the materialization script to extract features from PostgreSQL/ClickHouse and load into Feast:

```bash
python3 materialize_features.py
```

This will:
- Extract asset features from PostgreSQL
- Extract telemetry features from ClickHouse
- Extract work order features from PostgreSQL
- Save to Parquet files (offline store)
- Materialize to Redis (online store)

### 5. Start Feast Feature Server

```bash
feast serve -h 0.0.0.0 -p 6566
```

The feature server provides a REST API for retrieving features.

## Feature Views

### Asset Features (`asset_features`)
Features about asset characteristics and maintenance history:
- `asset_type`, `asset_status`, `asset_age_months`
- `total_work_orders`, `corrective_work_orders`, `preventive_work_orders`
- `days_since_last_maintenance`, `days_since_last_corrective_wo`
- `mttr_hours`, `mtbf_hours` (Mean Time To Repair/Failure)
- `health_score` (0-100)
- `recent_alarms_30d`, `recent_critical_alarms_30d`
- `installed_capacity_kw`, `manufacturer`, `model`

### Telemetry Features (`telemetry_features`)
Aggregated telemetry metrics with rolling windows:
- **Power**: `rolling_avg_power_7d`, `rolling_std_power_7d`, `rolling_min_power_7d`, `rolling_max_power_7d`
- **Voltage**: `rolling_avg_voltage_7d`, `rolling_std_voltage_7d`, `rolling_min_voltage_7d`, `rolling_max_voltage_7d`
- **Current**: `rolling_avg_current_7d`, `rolling_std_current_7d`
- **Temperature**: `rolling_avg_temperature_7d`, `rolling_std_temperature_7d`, `rolling_max_temperature_7d`
- **Frequency**: `rolling_avg_frequency_7d`, `rolling_std_frequency_7d`
- **Anomalies**: `anomaly_count_7d`, `anomaly_count_30d`, `anomaly_count_90d`
- **Performance**: `capacity_factor_7d`, `capacity_factor_30d`, `availability_7d`, `availability_30d`
- **Generation**: `total_generation_kwh_7d`, `total_generation_kwh_30d`, `avg_daily_generation_kwh`

### Work Order Features (`work_order_features`)
Work order patterns and trends:
- **Counts**: `wo_count_7d`, `wo_count_30d`, `wo_count_90d`, `wo_count_365d`
- **Corrective WOs**: `corrective_wo_count_7d`, `corrective_wo_count_30d`, `corrective_wo_count_90d`
- **Preventive WOs**: `preventive_wo_count_30d`, `preventive_wo_count_90d`
- **Emergency WOs**: `emergency_wo_count_30d`, `emergency_wo_count_90d`
- **Completion**: `avg_wo_completion_hours_30d`, `overdue_wo_count_30d`, `wo_completion_rate_30d`
- **Priority**: `critical_wo_count_30d`, `high_priority_wo_count_30d`
- **Trends**: `wo_count_trend_30d_vs_90d`, `corrective_wo_ratio_30d`
- **Recurring**: `repeat_failure_count_90d`, `days_since_last_wo`, `days_since_last_corrective_wo`

## Usage

### Python (via Feast SDK)

```python
from feast import FeatureStore

store = FeatureStore(repo_path="/home/user/dCMMS/ml/feast")

# Get online features for an asset
features = store.get_online_features(
    features=[
        "asset_features:asset_type",
        "asset_features:health_score",
        "telemetry_features:rolling_avg_power_7d",
        "work_order_features:corrective_wo_count_30d",
    ],
    entity_rows=[
        {"asset_id": "asset-123"},
    ]
).to_dict()

print(features)
```

### REST API (via Feature Server)

```bash
curl -X POST http://localhost:6566/get-online-features \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      "asset_features:asset_type",
      "asset_features:health_score",
      "telemetry_features:rolling_avg_power_7d"
    ],
    "entities": {
      "asset_id": ["asset-123", "asset-456"]
    }
  }'
```

### TypeScript (via dCMMS API)

```typescript
// Call dCMMS ML feature endpoint
const response = await fetch('/api/v1/ml/features/assets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN',
  },
  body: JSON.stringify({
    assetIds: ['asset-123', 'asset-456'],
  }),
});

const { features } = await response.json();
```

## Materialization Schedule

Features should be refreshed periodically to keep the online store up-to-date:

**Manual materialization:**
```bash
python3 materialize_features.py
```

**Scheduled materialization (cron):**
```bash
# Add to crontab (every 6 hours)
0 */6 * * * cd /home/user/dCMMS/ml/feast && python3 materialize_features.py
```

**Via dCMMS API (admin only):**
```bash
curl -X POST http://localhost:3000/api/v1/ml/features/materialize \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Monitoring

### Feature Freshness
Check when features were last updated:
```bash
feast feature-views list
```

### Null Rates
Monitor missing feature values:
```python
from feast import FeatureStore

store = FeatureStore(repo_path="/home/user/dCMMS/ml/feast")

# Get feature statistics (requires offline store)
stats = store.get_feature_statistics(
    features=["asset_features:health_score"],
    feature_view="asset_features"
)
```

### Online Store Health
Check Redis connection:
```bash
redis-cli -h localhost -p 6379 ping
redis-cli -h localhost -p 6379 INFO
```

## Production Deployment

For production deployments:

1. **Offline Store**: Use S3 + Iceberg instead of local files
   ```yaml
   offline_store:
     type: iceberg
     warehouse: s3://dcmms-ml-offline-store/warehouse
   ```

2. **Online Store**: Use managed Redis (AWS ElastiCache, Azure Redis, etc.)
   ```yaml
   online_store:
     type: redis
     connection_string: rediss://your-managed-redis.amazonaws.com:6379
   ```

3. **Registry**: Use PostgreSQL or S3-backed registry
   ```yaml
   registry:
     registry_type: sql
     path: postgresql://prod-user:password@prod-db:5432/feast_registry
   ```

4. **Feature Server**: Deploy as a standalone service with autoscaling

5. **Materialization**: Use Airflow/Kubernetes CronJobs for scheduled materialization

## Troubleshooting

### Features not found in online store
- Ensure `feast apply` has been run
- Ensure `materialize_features.py` has been run
- Check Redis connection: `redis-cli ping`

### Stale features
- Check materialization schedule
- Manually trigger: `python3 materialize_features.py`

### High latency
- Monitor Redis performance
- Consider feature caching in application layer
- Scale Redis vertically or horizontally

## References

- [Feast Documentation](https://docs.feast.dev/)
- [Feast GitHub](https://github.com/feast-dev/feast)
- [dCMMS ML Architecture](../../docs/ML_ARCHITECTURE.md)
