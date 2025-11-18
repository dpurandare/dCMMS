# Training Datasets for dCMMS

This directory contains scripts and configurations for creating training datasets for predictive maintenance models.

## Overview

Training datasets are created by:
1. **Extracting** historical data from PostgreSQL and ClickHouse
2. **Engineering** features using feature engineering functions
3. **Generating** failure labels (binary classification)
4. **Splitting** into train/test sets (time-based split)
5. **Validating** data quality
6. **Saving** to versioned Parquet files

## Dataset Structure

```
datasets/
├── v1.0/
│   ├── train.parquet          # Training set (features + target)
│   ├── test.parquet           # Test set (features + target)
│   ├── metadata.json          # Dataset metadata
│   └── feature_names.txt      # List of feature names
├── v1.1/
│   └── ...
├── create_training_dataset.py # Main script
├── dataset_config.yaml        # Configuration
└── README.md                  # This file
```

## Creating a Dataset

### Quick Start

```bash
cd /home/user/dCMMS/ml/datasets

# Create dataset with default configuration
python3 create_training_dataset.py

# Create dataset with custom version
python3 create_training_dataset.py --version v1.1

# Create dataset with custom configuration
python3 create_training_dataset.py --config dataset_config.yaml --version v2.0
```

### Configuration

Edit `dataset_config.yaml` to customize:

```yaml
# Dataset version
dataset_version: "v1.0"

# Data extraction parameters
lookback_days: 365  # Extract 1 year of historical data
prediction_horizon_days: 7  # Predict failures within 7 days

# Train/test split
test_size: 0.2  # 80% train, 20% test

# Database connections
postgresql_uri: "postgresql://postgres:postgres@localhost:5432/dcmms"
clickhouse_uri: "clickhouse://localhost:9000"

# Output directory
output_dir: "/tmp/dcmms/datasets"
```

### Environment Variables

Override configuration with environment variables:

```bash
export DATABASE_URL="postgresql://user:pass@prod-db:5432/dcmms"
export CLICKHOUSE_URL="clickhouse://prod-clickhouse:9000"

python3 create_training_dataset.py
```

## Dataset Creation Process

### Step 1: Data Extraction

Extracts data from multiple sources:

**Assets (PostgreSQL):**
```sql
SELECT
    a.id AS asset_id,
    a.asset_type,
    a.status,
    a.installed_date,
    a.health_score,
    a.recent_alarms_30d,
    ...
FROM assets a
WHERE a.status != 'decommissioned'
```

**Work Orders (PostgreSQL):**
```sql
SELECT
    wo.id AS work_order_id,
    wo.asset_id,
    wo.work_order_type,
    wo.created_at,
    wo.completed_at,
    ...
FROM work_orders wo
WHERE wo.created_at >= (NOW() - INTERVAL '365 days')
```

**Telemetry (ClickHouse):**
```sql
SELECT
    asset_id,
    timestamp,
    power_kw,
    voltage_v,
    temperature_c,
    ...
FROM telemetry
WHERE timestamp >= (NOW() - INTERVAL '90 days')
```

### Step 2: Label Generation

Creates binary classification labels:

- **Target**: `failure_within_7d` (0 or 1)
- **Positive label**: Asset has a corrective or emergency work order within 7 days
- **Negative label**: No corrective work order within 7 days

```python
def generate_labels(asset_ids, work_orders, reference_date, horizon_days=7):
    """
    For each asset:
    - Look forward from reference_date
    - Check if corrective WO occurs within horizon_days
    - Label as 1 if yes, 0 if no
    """
    future_date = reference_date + timedelta(days=horizon_days)

    for asset_id in asset_ids:
        future_wos = work_orders[
            (work_orders['asset_id'] == asset_id) &
            (work_orders['created_at'] >= reference_date) &
            (work_orders['created_at'] < future_date) &
            (work_orders['work_order_type'].isin(['corrective', 'emergency']))
        ]

        has_failure = len(future_wos) > 0
        yield {'asset_id': asset_id, 'failure_within_7d': int(has_failure)}
```

### Step 3: Feature Engineering

Creates features using functions from `ml/feature_engineering/`:

**Asset Features (10):**
- asset_age_months, days_since_last_maintenance, wo_rate_per_month
- corrective_wo_ratio, maintenance_health_ratio, alarm_rate_30d
- has_recent_maintenance, is_overdue_maintenance, has_low_health, has_high_alarms

**Telemetry Features:**
- Rolling stats: power, voltage, temperature (mean, std, min, max)
- Anomaly detection: power_anomaly, voltage_anomaly, temperature_anomaly
- Performance: capacity_factor_7d, power_trend_7d, temperature_trend_7d

### Step 4: Train/Test Split

**Time-based split** to prevent data leakage:

```
Historical Data Timeline:
|--------------- Train (80%) ------------|--- Test (20%) ---|
Jan 2024                             Nov 2024         Dec 2024
```

- **Train set**: Earlier 80% of data (Jan - Oct 2024)
- **Test set**: Later 20% of data (Nov - Dec 2024)
- **Ensures**: Model is evaluated on future data

### Step 5: Data Quality Validation

Runs 6 data quality checks:

1. **Missing values**: Max 30% missing per column
2. **Outliers**: IQR-based detection (1.5x IQR threshold)
3. **Data types**: Numeric, datetime, categorical validation
4. **Value ranges**: Ensure values within expected bounds
5. **Duplicates**: Check for duplicate rows
6. **Class imbalance**: Minimum 5% for minority class

### Step 6: Save Dataset

Saves to versioned Parquet files:

```
/tmp/dcmms/datasets/v1.0/
├── train.parquet          # 800 rows, 30 columns (features + target)
├── test.parquet           # 200 rows, 30 columns
├── metadata.json          # Dataset info
└── feature_names.txt      # Feature list
```

## Loading a Dataset

### Python

```python
import pandas as pd

# Load train set
train_df = pd.read_parquet('/tmp/dcmms/datasets/v1.0/train.parquet')
X_train = train_df.drop(columns=['target'])
y_train = train_df['target']

# Load test set
test_df = pd.read_parquet('/tmp/dcmms/datasets/v1.0/test.parquet')
X_test = test_df.drop(columns=['target'])
y_test = test_df['target']

print(f"Train: {len(X_train)} samples, {len(X_train.columns)} features")
print(f"Test: {len(X_test)} samples")
print(f"Positive rate: {y_train.mean():.2%}")
```

### Load Metadata

```python
import json

with open('/tmp/dcmms/datasets/v1.0/metadata.json', 'r') as f:
    metadata = json.load(f)

print(f"Version: {metadata['dataset_version']}")
print(f"Created: {metadata['created_at']}")
print(f"Features: {metadata['n_features']}")
print(f"Train samples: {metadata['n_train_samples']}")
print(f"Test samples: {metadata['n_test_samples']}")
print(f"Train positive rate: {metadata['train_positive_rate']:.2%}")
```

## Dataset Versions

### v1.0 (Baseline)

- **Features**: 10 asset features + 18 telemetry features
- **Lookback**: 365 days
- **Horizon**: 7 days
- **Split**: 80/20 time-based
- **Samples**: ~1000 assets

### v1.1 (Enhanced Telemetry)

- **Features**: 10 asset + 29 telemetry features
- **Added**: Anomaly counts, capacity factor, trends
- **Lookback**: 365 days
- **Horizon**: 7 days

### v2.0 (Work Order Features)

- **Features**: 10 asset + 29 telemetry + 21 work order features
- **Added**: WO trends, priority distributions, completion metrics
- **Lookback**: 730 days (2 years)
- **Horizon**: 14 days

## Dataset Statistics

After creating a dataset, review statistics:

```bash
python3 -c "
import pandas as pd
import json

# Load dataset
train_df = pd.read_parquet('/tmp/dcmms/datasets/v1.0/train.parquet')

print('Dataset Statistics:')
print(f'  Samples: {len(train_df)}')
print(f'  Features: {len(train_df.columns) - 1}')  # -1 for target
print(f'  Positive rate: {train_df[\"target\"].mean():.2%}')
print()
print('Feature Statistics:')
print(train_df.describe())
print()
print('Missing Values:')
print(train_df.isnull().sum())
"
```

## Data Quality Report

Example data quality report:

```
============================================================
Data Quality Report
============================================================

Status: ✓ PASSED
Checks: 6/6 passed

Dataset Statistics:
  n_rows: 1000
  n_columns: 30
  n_numeric_columns: 28
  memory_usage_mb: 0.24

Warnings (1):
  ⚠ outliers: total_outliers=45, outlier_rate=0.015

============================================================
```

## Troubleshooting

### Database connection error

```
Error: could not connect to server
```

**Solution**: Verify database credentials and connection string:
```bash
psql -h localhost -U postgres -d dcmms -c "SELECT COUNT(*) FROM assets;"
clickhouse-client --query "SELECT COUNT(*) FROM telemetry"
```

### Insufficient data

```
Warning: Only 5 samples extracted
```

**Solution**: Check data availability in database. Adjust `lookback_days` or populate more historical data.

### Class imbalance

```
Warning: Positive rate is only 2%
```

**Solution**: Severe class imbalance detected. Consider:
- Adjust `prediction_horizon_days` (longer horizon = more failures)
- Use SMOTE or class weighting during training
- Collect more failure examples

### Memory errors

```
MemoryError: Unable to allocate array
```

**Solution**: Reduce data size:
- Sample fewer assets
- Reduce `lookback_days`
- Process data in batches

## Best Practices

1. **Version your datasets**: Use semantic versioning (v1.0, v1.1, v2.0)
2. **Document changes**: Keep changelog of dataset modifications
3. **Time-based splits**: Always use time-based splits for time series data
4. **Validate quality**: Review data quality reports before training
5. **Track metadata**: Store dataset creation date, feature versions, etc.
6. **Monitor drift**: Compare feature distributions across versions
7. **Reproducibility**: Fix random seeds, document configurations

## Integration with MLflow

Log dataset version in MLflow experiments:

```python
import mlflow

mlflow.set_experiment("predictive_maintenance")

with mlflow.start_run():
    # Log dataset metadata
    mlflow.log_param("dataset_version", "v1.0")
    mlflow.log_param("n_train_samples", 800)
    mlflow.log_param("n_features", 28)
    mlflow.log_param("train_positive_rate", 0.15)

    # Train model
    model.fit(X_train, y_train)

    # Log model
    mlflow.sklearn.log_model(model, "model")
```

## Next Steps

After creating the dataset:

1. **Review dataset statistics** and data quality report
2. **Train baseline models** using `ml/models/train_baseline_models.py`
3. **Evaluate models** on test set
4. **Register best model** to MLflow model registry
5. **Deploy to staging** for validation

## References

- [Feature Engineering README](../feature_engineering/README.md)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [Feast Feature Store](https://docs.feast.dev/)
- [dCMMS ML Architecture](../../docs/ML_ARCHITECTURE.md)
