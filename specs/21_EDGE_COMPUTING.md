# Edge Computing Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Edge Gateway Architecture](#2-edge-gateway-architecture)
3. [Local Data Processing](#3-local-data-processing)
4. [Edge Analytics](#4-edge-analytics)
5. [Data Aggregation](#5-data-aggregation)
6. [Edge ML Inference](#6-edge-ml-inference)
7. [Offline Operation](#7-offline-operation)
8. [Edge Device Management](#8-edge-device-management)

---

## 1. Overview

### 1.1 Purpose

Define edge computing architecture for dCMMS to enable local data processing, real-time analytics, and reduced cloud bandwidth requirements at renewable energy sites.

### 1.2 Use Cases

```yaml
edge_use_cases:
  real_time_monitoring:
    description: "Monitor equipment health with <1s latency"
    benefits:
      - "Immediate fault detection"
      - "Reduced response time"
      - "Local alarming independent of cloud connectivity"

  data_aggregation:
    description: "Reduce 10 TB/day raw telemetry to 240 GB/day aggregated"
    benefits:
      - "90% bandwidth reduction"
      - "Lower cloud storage costs"
      - "Retain local high-resolution data for troubleshooting"

  local_analytics:
    description: "Run analytics and ML models at edge"
    benefits:
      - "Real-time insights without cloud round-trip"
      - "Privacy-sensitive processing"
      - "Operational continuity during cloud outages"

  control_automation:
    description: "Automated responses to equipment faults"
    benefits:
      - "Sub-second reaction time"
      - "Reduced generation loss"
      - "Safety interlocks without cloud dependency"
```

---

## 2. Edge Gateway Architecture

### 2.1 Hardware Requirements

```yaml
edge_gateway_specs:
  compute:
    cpu: "ARM Cortex-A72 quad-core 1.5 GHz or x86-64 equivalent"
    ram: "8 GB minimum, 16 GB recommended"
    storage: "128 GB SSD minimum (local buffering)"
    gpu: "Optional: NVIDIA Jetson Nano for ML inference"

  networking:
    ethernet: "Gigabit Ethernet (primary)"
    cellular: "4G LTE modem (backup)"
    wifi: "802.11ac (optional, local maintenance)"
    can_bus: "For industrial equipment communication"

  io:
    serial: "4x RS-485 ports for Modbus devices"
    digital_io: "16 digital inputs, 8 relay outputs"
    analog: "8 analog inputs (4-20mA, 0-10V)"

  environmental:
    operating_temp: "-20°C to +60°C"
    humidity: "5% to 95% non-condensing"
    ingress_protection: "IP65 (outdoor enclosure)"
    power: "24V DC, 50W typical"

  certifications:
    - "UL 508"
    - "CE"
    - "FCC Class A"
```

### 2.2 Software Stack

```yaml
software_stack:
  operating_system:
    name: "Ubuntu Server 22.04 LTS (ARM64)"
    rationale: "Long-term support, wide hardware compatibility"

  container_runtime:
    name: "Docker"
    version: "24.x"
    rationale: "Easy deployment and updates"

  orchestration:
    name: "K3s (lightweight Kubernetes)"
    version: "1.27+"
    rationale: "Production-grade orchestration for edge"

  edge_runtime:
    name: "Azure IoT Edge / AWS IoT Greengrass / KubeEdge"
    features:
      - "Container deployment"
      - "Module management"
      - "OTA updates"
      - "Offline operation"

  data_pipeline:
    ingestion: "MQTT Broker (EMQX Lite)"
    streaming: "Apache Kafka Lite / Redis Streams"
    storage: "SQLite (local buffer)"
    timeseries: "TimescaleDB Edge (optional)"

  ml_runtime:
    framework: "TensorFlow Lite / ONNX Runtime"
    hardware_acceleration: "CUDA (if GPU present)"
```

---

## 3. Local Data Processing

### 3.1 Edge Data Pipeline

```yaml
data_flow:
  step_1_acquisition:
    source: "SCADA, inverters, meters, sensors"
    protocol: "Modbus TCP/RTU, DNP3, IEC 61850, OPC UA"
    frequency: "1-10 Hz depending on equipment"

  step_2_ingestion:
    component: "MQTT Broker"
    topics:
      - "site/{siteId}/scada/{assetId}/telemetry"
      - "site/{siteId}/scada/{assetId}/alarms"
    qos: 1
    persistence: "10 GB buffer (1 day at 100 KB/s)"

  step_3_processing:
    operations:
      - "Data validation (range checks, quality flags)"
      - "Unit conversion (kW to MW, etc.)"
      - "Timestamp synchronization (NTP)"
      - "Duplicate removal"
      - "Missing data interpolation"

  step_4_storage:
    local_database: "SQLite"
    retention: "7 days high-resolution (1s samples)"
    schema:
      - "raw_telemetry (full resolution)"
      - "aggregated_1m (1-minute averages)"
      - "aggregated_15m (15-minute averages)"

  step_5_cloud_sync:
    method: "MQTT over TLS, HTTPS REST API"
    data_sent:
      - "Aggregated data (1-min, 15-min)"
      - "Alarms and events"
      - "Daily summary statistics"
    compression: "gzip (5:1 ratio typical)"
    retry: "Exponential backoff, max 24 hours"
```

### 3.2 Data Processing Module

```python
# Edge data processor
import paho.mqtt.client as mqtt
import sqlite3
from datetime import datetime, timedelta
import json

class EdgeDataProcessor:
    def __init__(self):
        self.db = sqlite3.connect('/data/edge.db')
        self.mqtt_client = mqtt.Client()
        self.mqtt_client.on_message = self.on_message
        self.mqtt_client.connect('localhost', 1883)
        self.mqtt_client.subscribe('site/+/scada/+/telemetry')

    def on_message(self, client, userdata, msg):
        topic_parts = msg.topic.split('/')
        site_id = topic_parts[1]
        asset_id = topic_parts[3]

        data = json.loads(msg.payload)

        # Validate
        if not self.validate(data):
            return

        # Store raw data
        self.store_raw(site_id, asset_id, data)

        # Check for alarms
        alarms = self.check_alarms(asset_id, data)
        if alarms:
            self.publish_alarms(site_id, asset_id, alarms)

        # Trigger local control if needed
        if self.requires_local_action(data):
            self.execute_local_control(asset_id, data)

    def validate(self, data):
        # Range checks
        if 'active_power' in data:
            if not (-10 <= data['active_power'] <= 100):  # MW
                return False

        if 'dc_voltage' in data:
            if not (0 <= data['dc_voltage'] <= 1500):  # Volts
                return False

        # Quality flag
        if data.get('quality', 'good') == 'bad':
            return False

        return True

    def store_raw(self, site_id, asset_id, data):
        cursor = self.db.cursor()
        cursor.execute('''
            INSERT INTO raw_telemetry (site_id, asset_id, timestamp, data)
            VALUES (?, ?, ?, ?)
        ''', (site_id, asset_id, datetime.now().isoformat(), json.dumps(data)))
        self.db.commit()

    def check_alarms(self, asset_id, data):
        alarms = []

        # Over-temperature alarm
        if data.get('temperature', 0) > 75:
            alarms.append({
                'type': 'over_temperature',
                'severity': 'high',
                'value': data['temperature'],
                'threshold': 75
            })

        # Low irradiation with high temperature (dust/soiling indicator)
        if data.get('irradiation', 1000) < 200 and data.get('temperature', 0) > 50:
            alarms.append({
                'type': 'possible_soiling',
                'severity': 'medium',
                'irradiation': data['irradiation'],
                'temperature': data['temperature']
            })

        return alarms

    def execute_local_control(self, asset_id, data):
        # Example: Curtail inverter if over-temperature
        if data.get('temperature', 0) > 80:
            self.send_modbus_command(asset_id, 'curtail_power', 0.5)  # 50%
```

---

## 4. Edge Analytics

### 4.1 Real-Time Analytics

```yaml
edge_analytics:
  performance_ratio:
    calculation: "(actual_generation / expected_generation) * 100"
    inputs: ["active_power", "irradiation", "temperature"]
    frequency: "1 minute"
    output: "pr_realtime"

  equipment_health:
    inputs: ["temperature", "vibration", "current_imbalance", "error_codes"]
    model: "Rule-based expert system"
    output: "health_score (0-100)"

  fault_detection:
    algorithms:
      - "String current imbalance detection"
      - "IV curve analysis"
      - "Tracker position deviation"
    response: "Local alarm + cloud notification"

  energy_forecasting:
    inputs: ["weather_forecast", "historical_generation", "time_of_day"]
    model: "LSTM neural network (TF Lite)"
    horizon: "Next 4 hours"
    update_frequency: "15 minutes"
```

### 4.2 Analytics Engine

```python
class EdgeAnalyticsEngine:
    def calculate_performance_ratio(self, telemetry, weather):
        # Expected generation based on irradiation
        expected = (
            telemetry['rated_power'] *
            (weather['irradiation'] / 1000) *
            self.temp_derating_factor(weather['ambient_temp'])
        )

        actual = telemetry['active_power']

        pr = (actual / expected) * 100 if expected > 0 else 0

        # Store
        self.db.execute('''
            INSERT INTO pr_realtime (timestamp, asset_id, pr, expected, actual)
            VALUES (?, ?, ?, ?, ?)
        ''', (datetime.now(), telemetry['asset_id'], pr, expected, actual))

        # Alert if PR < 80%
        if pr < 80:
            self.publish_alarm({
                'type': 'low_pr',
                'severity': 'medium',
                'pr': pr,
                'expected': expected,
                'actual': actual
            })

        return pr

    def detect_string_fault(self, inverter_data):
        # Analyze string currents for imbalance
        currents = [
            inverter_data[f'string_{i}_current']
            for i in range(1, inverter_data['num_strings'] + 1)
        ]

        avg_current = sum(currents) / len(currents)

        faulted_strings = []
        for i, current in enumerate(currents, 1):
            deviation = abs(current - avg_current) / avg_current
            if deviation > 0.2:  # 20% deviation
                faulted_strings.append({
                    'string_number': i,
                    'current': current,
                    'avg_current': avg_current,
                    'deviation': deviation
                })

        if faulted_strings:
            self.publish_alarm({
                'type': 'string_fault',
                'severity': 'high',
                'asset_id': inverter_data['asset_id'],
                'faulted_strings': faulted_strings
            })

        return faulted_strings
```

---

## 5. Data Aggregation

### 5.1 Aggregation Strategy

```yaml
aggregation_levels:
  level_1_raw:
    resolution: "1 second"
    retention: "7 days (edge only)"
    storage: "SQLite"
    size: "~100 GB/day for 10k data points"

  level_2_1min:
    resolution: "1 minute"
    aggregation: "min, max, avg, stddev"
    retention: "30 days (edge), 1 year (cloud)"
    storage: "SQLite (edge), TimescaleDB (cloud)"
    size: "~1.4 GB/day"
    reduction: "99% vs raw"

  level_3_15min:
    resolution: "15 minutes"
    aggregation: "min, max, avg, sum, count"
    retention: "Indefinite"
    storage: "TimescaleDB (cloud)"
    size: "~100 MB/day"
    reduction: "99.9% vs raw"

  level_4_daily:
    resolution: "1 day"
    aggregation: "sum (energy), avg (metrics), max (peaks)"
    retention: "Indefinite"
    storage: "PostgreSQL (cloud)"
    size: "~10 MB/day"
```

### 5.2 Aggregation Jobs

```python
import schedule
import time

class DataAggregator:
    def __init__(self):
        self.db = sqlite3.connect('/data/edge.db')

        # Schedule aggregation jobs
        schedule.every(1).minutes.do(self.aggregate_1min)
        schedule.every(15).minutes.do(self.aggregate_15min)
        schedule.every().day.at("00:05").do(self.aggregate_daily)

    def aggregate_1min(self):
        cursor = self.db.cursor()

        # Aggregate last minute of data
        end_time = datetime.now()
        start_time = end_time - timedelta(minutes=1)

        cursor.execute('''
            INSERT INTO aggregated_1m (timestamp, asset_id, metric, min, max, avg, stddev, count)
            SELECT
                datetime(timestamp, 'start of minute') as bucket,
                asset_id,
                metric,
                MIN(value) as min,
                MAX(value) as max,
                AVG(value) as avg,
                STDEV(value) as stddev,
                COUNT(*) as count
            FROM raw_telemetry
            WHERE timestamp >= ? AND timestamp < ?
            GROUP BY bucket, asset_id, metric
        ''', (start_time.isoformat(), end_time.isoformat()))

        self.db.commit()

        # Send to cloud
        self.sync_to_cloud('aggregated_1m', start_time, end_time)

    def sync_to_cloud(self, table, start_time, end_time):
        cursor = self.db.cursor()
        rows = cursor.execute(f'''
            SELECT * FROM {table}
            WHERE timestamp >= ? AND timestamp < ?
            AND synced = 0
        ''', (start_time.isoformat(), end_time.isoformat())).fetchall()

        if rows:
            # Send via MQTT or HTTP
            payload = json.dumps([dict(row) for row in rows])
            self.mqtt_client.publish(f'site/{site_id}/telemetry/aggregated', payload)

            # Mark as synced
            cursor.execute(f'''
                UPDATE {table}
                SET synced = 1
                WHERE timestamp >= ? AND timestamp < ?
            ''', (start_time.isoformat(), end_time.isoformat()))

            self.db.commit()

    def run(self):
        while True:
            schedule.run_pending()
            time.sleep(1)
```

---

## 6. Edge ML Inference

### 6.1 ML Models at Edge

```yaml
edge_ml_models:
  fault_detection:
    model_type: "Random Forest Classifier"
    format: "ONNX"
    inputs: ["temperature", "current", "voltage", "power", "error_codes"]
    output: "fault_probability (0-1)"
    update_frequency: "Monthly (from cloud)"

  anomaly_detection:
    model_type: "Isolation Forest"
    format: "ONNX"
    inputs: ["telemetry_vector (50 features)"]
    output: "anomaly_score (-1 to 1)"
    training: "Unsupervised, retrained weekly"

  generation_forecast:
    model_type: "LSTM"
    format: "TensorFlow Lite"
    inputs: ["historical_generation (48h)", "weather_forecast (24h)"]
    output: "generation_forecast (next 4h)"
    latency: "< 100ms"
```

### 6.2 ML Inference Engine

```python
import onnxruntime as ort
import numpy as np

class EdgeMLInference:
    def __init__(self):
        self.fault_model = ort.InferenceSession('/models/fault_detection.onnx')
        self.anomaly_model = ort.InferenceSession('/models/anomaly_detection.onnx')

    def predict_fault(self, telemetry):
        # Prepare input features
        features = np.array([[
            telemetry['temperature'],
            telemetry['dc_current'],
            telemetry['dc_voltage'],
            telemetry['active_power'],
            telemetry['error_code_count']
        ]], dtype=np.float32)

        # Run inference
        input_name = self.fault_model.get_inputs()[0].name
        output_name = self.fault_model.get_outputs()[0].name
        result = self.fault_model.run([output_name], {input_name: features})

        fault_probability = result[0][0]

        # Alert if high probability
        if fault_probability > 0.7:
            self.publish_alarm({
                'type': 'predicted_fault',
                'severity': 'medium',
                'probability': fault_probability,
                'asset_id': telemetry['asset_id']
            })

        return fault_probability

    def detect_anomaly(self, telemetry_vector):
        features = np.array([telemetry_vector], dtype=np.float32)

        input_name = self.anomaly_model.get_inputs()[0].name
        output_name = self.anomaly_model.get_outputs()[0].name
        result = self.anomaly_model.run([output_name], {input_name: features})

        anomaly_score = result[0][0]

        if anomaly_score < -0.5:  # Anomaly detected
            self.publish_alarm({
                'type': 'anomaly_detected',
                'severity': 'low',
                'score': anomaly_score
            })

        return anomaly_score
```

---

## 7. Offline Operation

### 7.1 Offline Capabilities

```yaml
offline_functionality:
  data_collection:
    description: "Continue collecting telemetry during cloud outage"
    buffer_size: "10 GB (up to 24 hours)"
    storage: "SQLite with automatic purging"

  local_analytics:
    description: "Run all analytics locally"
    functions:
      - "Performance ratio calculation"
      - "Fault detection"
      - "Alarm generation"
      - "ML inference"

  local_alarming:
    description: "Generate and display alarms locally"
    outputs:
      - "Local HMI display"
      - "Email (if local SMTP)"
      - "SMS (if cellular modem)"
      - "Digital outputs (relay closures)"

  control_actions:
    description: "Execute automated control responses"
    examples:
      - "Inverter curtailment on over-temperature"
      - "String isolation on fault detection"
      - "Emergency shutdown on safety alarm"
```

### 7.2 Sync Manager

```python
class OfflineSyncManager:
    def __init__(self):
        self.online = self.check_connectivity()
        self.pending_data = []

    def check_connectivity(self):
        try:
            response = requests.get('https://api.dcmms.example.com/health', timeout=5)
            return response.status_code == 200
        except:
            return False

    def queue_for_sync(self, data):
        if self.online:
            self.send_immediate(data)
        else:
            self.pending_data.append(data)
            self.store_pending()

    def store_pending(self):
        with open('/data/pending_sync.json', 'w') as f:
            json.dump(self.pending_data, f)

    def retry_pending(self):
        if not self.online:
            return

        # Send pending data in batches
        batch_size = 100
        for i in range(0, len(self.pending_data), batch_size):
            batch = self.pending_data[i:i+batch_size]

            try:
                response = requests.post(
                    'https://api.dcmms.example.com/v1/telemetry/batch',
                    json=batch,
                    timeout=30
                )

                if response.status_code == 200:
                    # Remove successfully sent data
                    self.pending_data = self.pending_data[i+batch_size:]
                else:
                    break  # Stop on error

            except Exception as e:
                logger.error(f'Sync failed: {e}')
                break

        self.store_pending()

    def monitor_connectivity(self):
        while True:
            previous_state = self.online
            self.online = self.check_connectivity()

            if not previous_state and self.online:
                logger.info('Connectivity restored. Syncing pending data...')
                self.retry_pending()

            time.sleep(60)  # Check every minute
```

---

## 8. Edge Device Management

### 8.1 Remote Management

```yaml
remote_management:
  device_discovery:
    protocol: "mDNS, SSDP"
    registration: "Automatic on first boot"

  configuration:
    method: "Configuration files, environment variables"
    storage: "/config/edge-config.yaml"
    templating: "Jinja2 for site-specific configs"

  software_updates:
    method: "OTA (Over-The-Air)"
    mechanisms:
      - "Docker image updates"
      - "APT package updates"
      - "Firmware updates (via vendor tools)"
    rollback: "Automatic on health check failure"

  monitoring:
    metrics_collected:
      - "CPU, memory, disk usage"
      - "Network traffic"
      - "Container status"
      - "Data pipeline health"
    reporting: "Every 5 minutes to cloud"

  remote_access:
    method: "Reverse SSH tunnel / VPN"
    authentication: "SSH key + 2FA"
    audit: "All sessions logged"
```

### 8.2 Device Health Monitoring

```python
class EdgeDeviceMonitor:
    def collect_metrics(self):
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'device_id': self.device_id,

            'system': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'uptime_seconds': time.time() - psutil.boot_time(),
                'temperature': self.read_cpu_temp()
            },

            'network': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv,
                'connectivity': self.check_connectivity()
            },

            'application': {
                'mqtt_broker_status': self.check_mqtt(),
                'database_size_mb': self.get_db_size(),
                'pending_sync_count': len(self.sync_manager.pending_data),
                'last_telemetry_received': self.get_last_telemetry_time()
            }
        }

        return metrics

    def health_check(self):
        metrics = self.collect_metrics()

        issues = []

        # Check CPU
        if metrics['system']['cpu_percent'] > 90:
            issues.append({'severity': 'high', 'message': 'CPU usage > 90%'})

        # Check memory
        if metrics['system']['memory_percent'] > 85:
            issues.append({'severity': 'high', 'message': 'Memory usage > 85%'})

        # Check disk
        if metrics['system']['disk_percent'] > 90:
            issues.append({'severity': 'critical', 'message': 'Disk usage > 90%'})

        # Check connectivity
        if not metrics['network']['connectivity']:
            issues.append({'severity': 'medium', 'message': 'Cloud connectivity lost'})

        # Check data freshness
        if metrics['application']['last_telemetry_received'] > 300:  # 5 minutes
            issues.append({'severity': 'high', 'message': 'No telemetry received for 5 minutes'})

        return {
            'status': 'healthy' if len(issues) == 0 else 'degraded',
            'issues': issues,
            'metrics': metrics
        }
```

---

## Summary

This specification provides comprehensive edge computing capabilities for dCMMS:

1. **Edge Gateway Architecture** with hardware specs, software stack (K3s, Docker, MQTT)
2. **Local Data Processing** with MQTT ingestion, SQLite buffering, validation
3. **Edge Analytics** for real-time PR calculation, fault detection, equipment health
4. **Data Aggregation** reducing 10 TB/day raw to 240 GB/day (99% reduction)
5. **Edge ML Inference** with TensorFlow Lite, ONNX models for fault prediction
6. **Offline Operation** with 24-hour local buffering, automated sync when online
7. **Edge Device Management** with OTA updates, remote monitoring, health checks

**Lines:** ~900
**Status:** Complete
**All P1 Specifications:** Complete!
