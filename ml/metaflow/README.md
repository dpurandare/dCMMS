# Metaflow for dCMMS

This directory contains Metaflow workflows for orchestrating ML pipelines in dCMMS.

## Overview

Metaflow is a human-friendly Python library that helps you build and manage real-life data science projects. It provides:
- **Workflow Orchestration**: Define multi-step data pipelines
- **Versioning**: Automatic versioning of code, data, and parameters
- **Parallel Execution**: Run steps in parallel for faster execution
- **Checkpointing**: Resume flows from any step
- **Integration**: Works seamlessly with MLflow, Feast, and other tools

## Architecture

```
Metaflow Workflow
     ↓
Data Ingestion (PostgreSQL/ClickHouse)
     ↓
Feature Engineering (Feast)
     ↓
Model Training (scikit-learn/XGBoost)
     ↓
Model Logging (MLflow)
     ↓
Model Registration (MLflow Registry)
```

## Setup

### 1. Install Metaflow

```bash
cd /home/user/dCMMS/ml
pip install -r requirements.txt
```

### 2. Configure Metaflow

For local development, Metaflow works out of the box with local storage.

For production, configure AWS/Azure integration:

```bash
# AWS Configuration
export METAFLOW_DATASTORE_SYSROOT_S3=s3://dcmms-metaflow-datastore/
export METAFLOW_DEFAULT_DATASTORE=s3

# Or use configuration file
cat > ~/.metaflowconfig/config.json <<EOF
{
  "METAFLOW_DATASTORE_SYSROOT_S3": "s3://dcmms-metaflow-datastore/",
  "METAFLOW_DEFAULT_DATASTORE": "s3"
}
EOF
```

### 3. Verify Installation

```bash
python -c "import metaflow; print(metaflow.__version__)"
```

## Flows

### Simple Flow (Hello World)

Run the simple example flow:

```bash
cd /home/user/dCMMS/ml/metaflow
python simple_flow.py run
```

With parameters:

```bash
python simple_flow.py run --name "ML Team" --count 5
```

### Predictive Maintenance Flow

Full ML pipeline for predictive maintenance:

```bash
python predictive_maintenance_flow.py run
```

With custom parameters:

```bash
python predictive_maintenance_flow.py run \
  --data-version v1.1 \
  --test-size 0.25 \
  --experiment-name pm_experiment_v2
```

## Flow Structure

### Basic Flow Template

```python
from metaflow import FlowSpec, step, Parameter

class MyFlow(FlowSpec):
    # Parameters (CLI configurable)
    param1 = Parameter('param1', default='value')

    @step
    def start(self):
        """Initialize flow"""
        self.data = load_data()
        self.next(self.process)

    @step
    def process(self):
        """Process data"""
        self.result = process(self.data)
        self.next(self.end)

    @step
    def end(self):
        """Finalize flow"""
        print(f"Result: {self.result}")

if __name__ == '__main__':
    MyFlow()
```

### Flow with Parallel Branches

```python
@step
def start(self):
    self.next(self.process_a, self.process_b)  # Fork

@step
def process_a(self):
    # Process branch A
    self.next(self.join)

@step
def process_b(self):
    # Process branch B
    self.next(self.join)

@step
def join(self, inputs):
    # Merge results from branches
    self.results = [input.result for input in inputs]
    self.next(self.end)
```

### Flow with Foreach (Dynamic Parallelism)

```python
@step
def start(self):
    self.models = ['rf', 'xgb', 'lgbm']
    self.next(self.train_model, foreach='models')

@step
def train_model(self):
    # Train each model in parallel
    self.model_name = self.input  # Current model
    self.trained_model = train(self.model_name)
    self.next(self.join_models)

@step
def join_models(self, inputs):
    # Compare all trained models
    self.all_models = [input.trained_model for input in inputs]
    self.next(self.end)
```

## Running Flows

### Run Flow

```bash
python my_flow.py run
```

### Show Flow

View flow structure:

```bash
python my_flow.py show
```

### Resume Flow

Resume from a specific step:

```bash
python my_flow.py resume <run-id> --origin-run-id <original-run-id>
```

### List Runs

```bash
python my_flow.py list
```

### Inspect Run

```bash
# Show run details
python my_flow.py show <run-id>

# Access run data
python -c "from metaflow import Flow; run = Flow('MyFlow').latest_run; print(run.data.result)"
```

## Integration with MLflow

The predictive maintenance flow demonstrates MLflow integration:

```python
import mlflow

@step
def train_model(self):
    # Set MLflow tracking
    mlflow.set_tracking_uri(self.mlflow_tracking_uri)
    mlflow.set_experiment(self.experiment_name)

    # Start MLflow run
    with mlflow.start_run(run_name="my_model"):
        # Log parameters
        mlflow.log_param("param1", value1)

        # Train model
        model.fit(X_train, y_train)

        # Log metrics
        mlflow.log_metric("accuracy", accuracy)

        # Log model
        mlflow.sklearn.log_model(model, "model")

    self.next(self.end)
```

## Flow Parameters

Parameters make flows configurable:

```python
from metaflow import Parameter

class MyFlow(FlowSpec):
    # String parameter
    model_name = Parameter(
        'model-name',
        default='random_forest',
        help='Model type to train'
    )

    # Float parameter
    learning_rate = Parameter(
        'learning-rate',
        default=0.01,
        type=float,
        help='Learning rate'
    )

    # Integer parameter
    n_estimators = Parameter(
        'n-estimators',
        default=100,
        type=int,
        help='Number of trees'
    )

    # Boolean parameter
    use_gpu = Parameter(
        'use-gpu',
        default=False,
        type=bool,
        help='Use GPU for training'
    )
```

Run with parameters:

```bash
python my_flow.py run \
  --model-name xgboost \
  --learning-rate 0.1 \
  --n-estimators 200 \
  --use-gpu
```

## Scheduling Flows

### With Cron

```bash
# Add to crontab
0 2 * * * cd /home/user/dCMMS/ml/metaflow && python predictive_maintenance_flow.py run
```

### With Airflow (Production)

```python
from airflow import DAG
from airflow.operators.bash_operator import BashOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'start_date': datetime(2025, 1, 1),
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'predictive_maintenance',
    default_args=default_args,
    schedule_interval='0 2 * * *',  # Daily at 2 AM
)

train_model = BashOperator(
    task_id='train_model',
    bash_command='cd /home/user/dCMMS/ml/metaflow && python predictive_maintenance_flow.py run',
    dag=dag,
)
```

### With AWS Step Functions (Production)

```bash
# Deploy to AWS Step Functions
python predictive_maintenance_flow.py --with step-functions create

# Run on Step Functions
python predictive_maintenance_flow.py --with step-functions run
```

## Accessing Flow Data

### From Python

```python
from metaflow import Flow, Run

# Get latest run
flow = Flow('PredictiveMaintenanceFlow')
latest_run = flow.latest_run

# Access data
print(f"Best Model: {latest_run.data.best_model_name}")
print(f"F1 Score: {latest_run.data.best_model_metrics['test_f1']}")

# Get specific run
run = Run('PredictiveMaintenanceFlow/123')
print(run.data.trained_models)
```

### From CLI

```bash
# Show run data
python -c "
from metaflow import Flow
run = Flow('PredictiveMaintenanceFlow').latest_run
print(f'Best Model: {run.data.best_model_name}')
print(f'F1 Score: {run.data.best_model_metrics[\"test_f1\"]:.4f}')
"
```

## Best Practices

1. **Use Parameters for Configuration**
   - Make flows configurable via CLI parameters
   - Document parameters with help text
   - Set sensible defaults

2. **Keep Steps Focused**
   - Each step should do one thing well
   - Avoid overly complex steps
   - Use descriptive step names

3. **Handle Failures Gracefully**
   - Add try/except blocks for external calls
   - Log errors clearly
   - Provide fallback values

4. **Version Your Data**
   - Use data version parameters
   - Track dataset versions in MLflow
   - Document data lineage

5. **Document Your Flows**
   - Add docstrings to flow class and steps
   - Document expected inputs/outputs
   - Include usage examples

6. **Test Locally First**
   - Run flows locally before deploying
   - Use small datasets for testing
   - Validate outputs

7. **Monitor Flow Executions**
   - Log progress messages
   - Track execution time
   - Alert on failures

## Example: Full ML Pipeline

```python
from metaflow import FlowSpec, step, Parameter
import mlflow
import pandas as pd

class FullMLPipeline(FlowSpec):
    """Complete ML pipeline with all stages"""

    @step
    def start(self):
        """Load configuration"""
        self.config = load_config()
        self.next(self.ingest_data)

    @step
    def ingest_data(self):
        """Load data from sources"""
        self.raw_data = load_from_database()
        self.next(self.clean_data)

    @step
    def clean_data(self):
        """Clean and validate data"""
        self.clean_data = clean(self.raw_data)
        self.next(self.engineer_features)

    @step
    def engineer_features(self):
        """Create features"""
        self.features = create_features(self.clean_data)
        self.next(self.split_data)

    @step
    def split_data(self):
        """Train/test split"""
        self.X_train, self.X_test, self.y_train, self.y_test = split(
            self.features
        )
        self.next(self.train_models)

    @step
    def train_models(self):
        """Train multiple models in parallel"""
        self.models = ['rf', 'xgb', 'lgbm']
        self.next(self.train_single_model, foreach='models')

    @step
    def train_single_model(self):
        """Train one model"""
        model_name = self.input
        with mlflow.start_run(run_name=model_name):
            model = train_model(model_name, self.X_train, self.y_train)
            metrics = evaluate(model, self.X_test, self.y_test)
            mlflow.log_metrics(metrics)
            self.model_metrics = metrics
        self.next(self.select_best_model)

    @step
    def select_best_model(self, inputs):
        """Select best model"""
        best = max(inputs, key=lambda x: x.model_metrics['f1'])
        self.best_model = best.input
        self.next(self.register_model)

    @step
    def register_model(self):
        """Register to MLflow"""
        mlflow.register_model(...)
        self.next(self.end)

    @step
    def end(self):
        """Complete"""
        print(f"Best model: {self.best_model}")

if __name__ == '__main__':
    FullMLPipeline()
```

## Troubleshooting

### Flow won't run
- Check Python syntax: `python flow.py --help`
- Verify dependencies: `pip list | grep metaflow`
- Check logs in `~/.metaflow/`

### Out of memory
- Reduce data size for testing
- Use batch processing in steps
- Increase system resources

### Slow execution
- Use `num_parallel` for parallel steps
- Profile code with `@profile` decorator
- Optimize data loading

### Can't access flow data
- Ensure flow completed successfully
- Check run ID is correct
- Verify data was saved to artifacts

## Environment Variables

Add to `.env`:

```bash
# Metaflow Configuration
METAFLOW_DATASTORE_SYSROOT_LOCAL=/tmp/dcmms/metaflow
METAFLOW_DEFAULT_DATASTORE=local
METAFLOW_DEFAULT_METADATA=local

# For production (AWS)
# METAFLOW_DATASTORE_SYSROOT_S3=s3://dcmms-metaflow-datastore/
# METAFLOW_DEFAULT_DATASTORE=s3
# METAFLOW_SERVICE_URL=https://metaflow.dcmms.com
```

## References

- [Metaflow Documentation](https://docs.metaflow.org/)
- [Metaflow GitHub](https://github.com/Netflix/metaflow)
- [Metaflow Tutorials](https://outerbounds.com/docs/tutorials)
- [dCMMS ML Architecture](../../docs/ML_ARCHITECTURE.md)
