# Data Ingestion Architecture for High-Speed, High-Volume Telemetry

**Version:** 1.0
**Date:** November 10, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for Release 1)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Industry Data Volume Benchmarks](#2-industry-data-volume-benchmarks)
3. [Data Ingestion Requirements](#3-data-ingestion-requirements)
4. [Edge Data Collection Architecture](#4-edge-data-collection-architecture)
5. [Stream Processing Pipeline](#5-stream-processing-pipeline)
6. [Time-Series Database Design](#6-time-series-database-design)
7. [Backpressure and Flow Control](#7-backpressure-and-flow-control)
8. [Performance Optimization](#8-performance-optimization)
9. [Monitoring and Observability](#9-monitoring-and-observability)
10. [Operational Procedures](#10-operational-procedures)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. Executive Summary

### 1.1 Purpose

This document specifies the architecture for ingesting, processing, and storing high-speed, high-volume telemetry data from solar farms, wind farms, and battery energy storage systems (BESS). The system must handle real-time SCADA data at scale while maintaining low latency, high availability, and data integrity.

### 1.2 Key Requirements

| Requirement | Pilot (Year 1) | Production (Year 3) |
|-------------|----------------|---------------------|
| Sites | 100 | 2,000 |
| Total Sensors | 10,000 | 200,000 |
| Events per Second (EPS) | 800 | 72,000 |
| Daily Data Volume | 26 GB | 2.4 TB |
| End-to-End Latency | < 5 seconds | < 5 seconds |
| Data Availability | 99.9% | 99.99% |
| Data Retention (Raw) | 90 days | 90 days |
| Data Retention (Aggregated) | 5 years | 5 years |

### 1.3 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           EDGE LAYER                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ SCADA/PLCs → OPC-UA → Edge Gateway → MQTT (TLS) → Message Queue         │
│              Modbus                  ↓                                    │
│              IEC 61850        Local Buffer (10 GB)                        │
│                               Store-and-Forward                           │
└──────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                       INGESTION LAYER                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ MQTT Broker (EMQX) → Kafka (Raw Topics) → Schema Validation             │
│ - mTLS Authentication   - 3 replicas     - Schema Registry (Avro)       │
│ - 10k connections       - 30d retention  - Invalid → DLQ                 │
└──────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   STREAM PROCESSING LAYER                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ Apache Flink (Real-Time Processing)                                      │
│ ├─ Validation Job: Schema, range checks, quality flags                   │
│ ├─ Enrichment Job: Asset metadata, site context, unit conversion         │
│ ├─ Aggregation Job: 1-min, 5-min, 15-min rollups                        │
│ ├─ Anomaly Detection Job: Threshold breaches, outliers                   │
│ └─ Event Generation Job: Alarms, work order triggers                     │
│                                                                           │
│ Output: Kafka Validated Topics + Alarm Topics                            │
└──────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Time-Series DB (TimescaleDB)         Data Lake (S3 + Iceberg)           │
│ ├─ Hypertables (1-day chunks)        ├─ Bronze: Raw events              │
│ ├─ Continuous Aggregates (1m, 5m)    ├─ Silver: Validated + Enriched    │
│ ├─ Compression (after 7 days)        └─ Gold: Aggregated + Business     │
│ └─ Retention Policy (90d raw)                                            │
└──────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      SERVING LAYER                                        │
├──────────────────────────────────────────────────────────────────────────┤
│ REST APIs ← TimescaleDB (< 5s queries)                                   │
│ WebSocket ← Kafka Validated Topics (real-time push)                      │
│ BI/Analytics ← Trino → Iceberg Gold (ad-hoc queries)                     │
│ ML Feature Store ← Feast → Redis (low-latency inference)                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Industry Data Volume Benchmarks

### 2.1 Solar Farm Data Volumes

**Based on industry research (2024):**

| Component | Data Points | Sampling Rate | Data Volume |
|-----------|-------------|---------------|-------------|
| **Inverter (Central)** | 100-200 points | 1-60 seconds | ~5-10 KB/sample |
| **Inverter (String)** | 30-50 points | 1-60 seconds | ~2-3 KB/sample |
| **String Monitoring Box** | 5-10 per string | 1-60 seconds | ~500 bytes/sample |
| **Weather Station** | 10-15 points | 1-60 seconds | ~1 KB/sample |
| **Combiner Box** | 10-20 points | 5-60 seconds | ~1 KB/sample |
| **Tracker Controller** | 5-8 points | 5-60 seconds | ~500 bytes/sample |

**50 MW Solar Farm Typical Configuration:**
- 10 x 5 MW Central Inverters OR 200 x 250 kW String Inverters
- 200-500 String Monitoring Boxes (depending on monitoring density)
- 5-10 Weather Stations
- 50-100 Combiner Boxes
- 100-500 Tracker Controllers (if single-axis tracking)

**Estimated Data Volume (50 MW Solar Farm at 1-second sampling):**
- **Raw data**: ~500-1,000 data points × 1 sample/sec × 24h = **43-86 million samples/day**
- **Storage**: ~2-4 KB average per sample = **86-344 GB/day raw**
- **With 5-minute aggregation**: ~3-6 GB/day aggregated
- **Industry standard**: Real-time data stored for 3 days, 5-minute aggregates for 3 years

### 2.2 Wind Farm Data Volumes

**Based on industry research (2024):**

| Sampling Strategy | Use Case | Data Volume per Turbine |
|-------------------|----------|-------------------------|
| **10-minute SCADA** | Industry standard | ~0.5 MB/day |
| **1-minute SCADA** | Enhanced monitoring | ~5 MB/day |
| **1-second High-Frequency** | Advanced analytics | ~200 MB/day |
| **10 Hz High-Frequency** | Vibration analysis | ~2 GB/day |

**50-Turbine Wind Farm (100 MW, 2 MW turbines):**
- 60-100 SCADA signals per turbine
- Standard 10-minute sampling: **25 MB/day for 50 turbines**
- Enhanced 1-second sampling: **10 GB/day for 50 turbines**
- High-frequency (10 Hz): **100 GB/day for 50 turbines** (not continuous, triggered)

**Industry Practice:**
- Most wind farms use 10-minute SCADA for baseline monitoring
- High-frequency data (1-10 Hz) collected selectively for:
  - Bearing health monitoring
  - Gearbox diagnostics
  - Blade vibration analysis
  - Triggered by anomaly detection

### 2.3 BESS Data Volumes

**Based on industry research (2024):**

| Component | Data Points | Sampling Rate | Notes |
|-----------|-------------|---------------|-------|
| **Battery Management System (BMS)** | 100-500 per rack | 1-10 seconds | Voltage, current, temp per cell |
| **Power Conversion System (PCS)** | 50-100 points | 1 second | Inverter metrics |
| **Environmental Monitoring** | 10-20 points | 10 seconds | HVAC, fire suppression |
| **Grid Interface** | 20-30 points | 100 ms - 1s | Frequency, voltage regulation |

**100 MWh BESS Facility:**
- 20-40 battery racks (2.5-5 MWh each)
- 10-20 PCS units
- **Total data points**: 3,000-10,000 points
- **At 1-second sampling**: ~3,000-10,000 samples/sec = **260-860 million samples/day**
- **Storage**: ~2 KB per sample = **520-1,720 GB/day raw**
- **With downsampling**: 10-50 GB/day aggregated

**IEEE 2686-2024 Requirements:**
- High-frequency data logging for warranty compliance
- Millisecond-level response capability for grid services
- Continuous real-time monitoring of SOC, SOH, thermal management

### 2.4 dCMMS Scaled Projections

**Pilot Deployment (100 Sites):**
- Mix: 60 solar, 30 wind, 10 BESS
- **Total sensors**: ~10,000
- **Events per second**: 800 EPS
- **Daily volume**: 26 GB/day raw, 2-3 GB/day aggregated

**Production Deployment (2,000 Sites):**
- Mix: 1,200 solar, 600 wind, 200 BESS
- **Total sensors**: ~200,000
- **Events per second**: 72,000 EPS
- **Daily volume**: 2.4 TB/day raw, 100-150 GB/day aggregated

**Peak Load Considerations:**
- **Burst capacity**: 3x sustained rate (216k EPS) for 5-minute periods
- **Retry storms**: After connectivity restoration, 10x rate for 1-minute bursts
- **Cold start**: Initial site commissioning can generate 50x backlog

---

## 3. Data Ingestion Requirements

### 3.1 Functional Requirements

**FR-DI-001: Protocol Support**
- Must support MQTT v3.1.1 and v5.0 for edge-to-cloud
- Must support OPC-UA for edge-to-device (UA Server/Client)
- Must support Modbus TCP/RTU via gateway translation
- Should support IEC 61850 for substation integration
- Should support DNP3 for legacy SCADA integration

**FR-DI-002: Data Quality**
- Must validate schema on ingestion (Avro/Protobuf)
- Must detect and flag out-of-range values
- Must preserve quality flags from source (Good, Bad, Uncertain per OPC-UA)
- Must handle missing/null values gracefully
- Must detect duplicate messages (idempotency)
- Must timestamp with ingestion time in addition to source time

**FR-DI-003: Data Enrichment**
- Must enrich telemetry with asset metadata (site, type, location)
- Must convert units to standard SI units
- Must normalize naming conventions across vendors
- Should add geospatial context from asset registry

**FR-DI-004: Data Routing**
- Must route validated data to time-series database
- Must route alarms to notification service
- Must route anomalies to predictive maintenance pipeline
- Must route invalid data to dead-letter queue (DLQ)
- Must publish events to WebSocket for real-time dashboards

### 3.2 Non-Functional Requirements

**NFR-DI-001: Latency**
- P50 latency: < 2 seconds (edge to time-series DB)
- P95 latency: < 5 seconds
- P99 latency: < 10 seconds

**NFR-DI-002: Throughput**
- Pilot: 800 EPS sustained, 2,400 EPS burst (3x)
- Production: 72,000 EPS sustained, 216,000 EPS burst (3x)
- Must support 10x burst for 1 minute (retry storms)

**NFR-DI-003: Availability**
- Pilot: 99.9% uptime (43 minutes/month downtime)
- Production: 99.99% uptime (4.3 minutes/month downtime)
- Zero data loss during planned maintenance (buffering)
- < 1% data loss during unplanned outages (edge buffering)

**NFR-DI-004: Scalability**
- Horizontal scaling of all components (no single point of bottleneck)
- Linear cost scaling with data volume
- Auto-scaling based on queue depth and CPU utilization

**NFR-DI-005: Data Integrity**
- Exactly-once semantics for critical data (alarms, state changes)
- At-least-once semantics for high-volume telemetry (acceptable deduplication)
- Immutable raw data in data lake
- Audit trail for all data transformations

---

## 4. Edge Data Collection Architecture

### 4.1 Edge Gateway Specifications

**Hardware Requirements:**
- **CPU**: 4-8 cores ARM64 or x86_64
- **RAM**: 8-16 GB
- **Storage**: 128-256 GB SSD (for local buffering)
- **Network**: Dual NICs (OT network + IT network)
- **Environmental**: Industrial temperature range (-40°C to +70°C)
- **Certifications**: UL/CE for electrical, ATEX for hazardous locations

**Software Stack:**
```
┌─────────────────────────────────────────┐
│    Application Layer                    │
│  ├─ Protocol Adapters (OPC-UA, Modbus)  │
│  ├─ MQTT Client (with TLS)             │
│  ├─ Local Buffer (10 GB SQLite)        │
│  └─ Edge Analytics (optional)          │
├─────────────────────────────────────────┤
│    Container Runtime (Docker/Podman)    │
├─────────────────────────────────────────┤
│    Linux OS (Ubuntu/Debian/RHEL)       │
└─────────────────────────────────────────┘
```

### 4.2 Edge Data Processing

**Local Aggregation:**
```yaml
aggregation_rules:
  - name: "1-minute rollups"
    window: "1m"
    functions:
      - avg(value)
      - min(value)
      - max(value)
      - stddev(value)
    output: "mqtt://broker/site/{siteId}/aggregated/1m"

  - name: "5-minute rollups"
    window: "5m"
    functions:
      - avg(value)
      - min(value)
      - max(value)
      - count(*)
    output: "mqtt://broker/site/{siteId}/aggregated/5m"
```

**Local Filtering:**
```yaml
filtering_rules:
  - name: "Remove redundant data"
    condition: "value == previous_value && quality == 'Good'"
    action: "suppress"
    max_suppress_duration: "5m"

  - name: "High-priority events"
    condition: "type == 'alarm' || quality == 'Bad'"
    action: "immediate_send"
    bypass_buffer: true
```

**Edge Buffering Strategy:**
- **Normal operation**: Stream directly to MQTT broker
- **Connectivity loss**: Buffer locally up to 10 GB (SQLite WAL mode)
- **Buffer full**: Drop oldest non-critical data, retain alarms and state changes
- **Reconnection**: Prioritized replay (alarms → state changes → telemetry)
- **Rate limiting**: Max 100 msg/sec per gateway on reconnect (prevent overwhelming broker)

### 4.3 OPC-UA to MQTT Bridge

**Configuration Example:**
```yaml
opc_ua:
  server_url: "opc.tcp://192.168.1.100:4840"
  security_policy: "Basic256Sha256"
  certificate_path: "/etc/gateway/certs/client.pem"
  authentication: "username_password"

  subscriptions:
    - node_id: "ns=2;s=Inverter.ActivePower"
      sampling_interval: 1000  # ms
      mqtt_topic: "site/ALPHA-001/inverter/INV-01/power"
      transform: "value / 1000"  # W to kW

    - node_id: "ns=2;s=Inverter.Temperature"
      sampling_interval: 5000
      mqtt_topic: "site/ALPHA-001/inverter/INV-01/temp"
      quality_threshold: "Good"

    - node_id: "ns=2;s=Inverter.Alarm.*"
      subscription_type: "event"
      mqtt_topic: "site/ALPHA-001/alarms"
      priority: "high"
```

### 4.4 Edge Security

**Authentication:**
- mTLS certificates for edge gateway to MQTT broker
- Certificate rotation every 90 days (automated)
- OPC-UA security policies: Basic256Sha256 minimum

**Network Segmentation:**
```
┌─────────────────────┐
│    OT Network       │  (Isolated, no internet)
│  ├─ SCADA/PLCs      │
│  ├─ Local HMI       │
│  └─ Edge Gateway    │
├─────────────────────┤
│    DMZ/Firewall     │  (Stateful inspection)
├─────────────────────┤
│    IT Network       │  (Internet access)
│  └─ MQTT Broker     │
└─────────────────────┘
```

**Firewall Rules:**
- Allow: Edge Gateway → MQTT Broker (8883/tcp, TLS)
- Allow: Edge Gateway → NTP Server (123/udp)
- Allow: Management Console → Edge Gateway (22/tcp, SSH with key auth)
- Deny: All other inbound/outbound traffic

---

## 5. Stream Processing Pipeline

### 5.1 Kafka Topic Design

**Topic Naming Convention:**
```
{environment}.{domain}.{data-type}.{granularity}

Examples:
- prod.telemetry.raw.realtime
- prod.telemetry.validated.1m
- prod.telemetry.aggregated.5m
- prod.alarms.critical.realtime
- prod.alarms.warning.realtime
```

**Topic Configuration:**

| Topic | Partitions | Replication | Retention | Cleanup Policy |
|-------|------------|-------------|-----------|----------------|
| `telemetry.raw` | 32 | 3 | 7 days | delete |
| `telemetry.validated` | 32 | 3 | 30 days | delete |
| `telemetry.aggregated.1m` | 16 | 3 | 90 days | delete |
| `telemetry.aggregated.5m` | 16 | 3 | 1 year | delete |
| `alarms.critical` | 8 | 3 | 90 days | delete |
| `alarms.warning` | 8 | 3 | 30 days | delete |
| `dlq.invalid-schema` | 4 | 3 | 30 days | delete |
| `dlq.processing-error` | 4 | 3 | 30 days | delete |

**Partitioning Strategy:**
- Partition by `siteId` for co-location of site data
- Ensures ordered processing per site
- Allows parallel processing across sites
- Key format: `{siteId}#{assetId}` for even distribution

**Compression:**
- Compression type: `snappy` (good balance of speed and ratio)
- Batch size: 16 KB
- Linger time: 10 ms
- Expected compression ratio: 3-5x for telemetry data

### 5.2 Schema Registry

**Avro Schema Example (Sensor Reading):**
```json
{
  "type": "record",
  "name": "SensorReading",
  "namespace": "com.dcmms.telemetry",
  "fields": [
    {"name": "readingId", "type": "string"},
    {"name": "assetId", "type": "string"},
    {"name": "siteId", "type": "string"},
    {"name": "sensorId", "type": "string"},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "ingestionTimestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "metricName", "type": "string"},
    {"name": "value", "type": "double"},
    {"name": "unit", "type": "string"},
    {"name": "quality", "type": {"type": "enum", "name": "Quality",
                                  "symbols": ["GOOD", "BAD", "UNCERTAIN"]}},
    {"name": "qualityDetail", "type": ["null", "string"], "default": null}
  ]
}
```

**Schema Evolution Rules:**
- Backward compatible changes only (add optional fields)
- Version all schemas (v1, v2, v3)
- Use default values for new fields
- Never remove required fields
- Never change field types

### 5.3 Apache Flink Jobs

**Job 1: Validation and Enrichment**

```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.enableCheckpointing(60000); // 1-minute checkpoints

DataStream<SensorReading> rawStream = env
    .addSource(new FlinkKafkaConsumer<>("telemetry.raw", schema, kafkaProps))
    .uid("raw-source");

// Validation
DataStream<SensorReading> validatedStream = rawStream
    .filter(new ValidationFunction())  // Schema, range checks
    .uid("validation-filter");

// Route invalid to DLQ
rawStream
    .filter(new InvalidDataFilter())
    .addSink(new FlinkKafkaProducer<>("dlq.invalid-schema", schema, kafkaProps))
    .uid("dlq-sink");

// Enrichment
DataStream<EnrichedReading> enrichedStream = validatedStream
    .flatMap(new AsyncDataStream.unorderedWait(
        new AssetMetadataEnrichment(),  // Async lookup to asset registry
        5000,  // Timeout 5s
        TimeUnit.MILLISECONDS,
        100    // Max concurrent requests
    ))
    .uid("enrichment");

// Unit conversion
enrichedStream
    .map(new UnitConversionFunction())
    .addSink(new FlinkKafkaProducer<>("telemetry.validated", schema, kafkaProps))
    .uid("validated-sink");
```

**Job 2: Time-Window Aggregation**

```java
DataStream<EnrichedReading> validatedStream = env
    .addSource(new FlinkKafkaConsumer<>("telemetry.validated", schema, kafkaProps))
    .assignTimestampsAndWatermarks(
        WatermarkStrategy.<EnrichedReading>forBoundedOutOfOrderness(Duration.ofSeconds(10))
            .withTimestampAssigner((reading, ts) -> reading.getTimestamp())
    );

// 1-minute aggregation
DataStream<AggregatedMetric> oneMinAgg = validatedStream
    .keyBy(r -> r.getSiteId() + "#" + r.getAssetId() + "#" + r.getMetricName())
    .window(TumblingEventTimeWindows.of(Time.minutes(1)))
    .aggregate(new MetricAggregator())
    .uid("1m-aggregation");

oneMinAgg
    .addSink(new FlinkKafkaProducer<>("telemetry.aggregated.1m", aggSchema, kafkaProps))
    .addSink(new JdbcSink<>(timescaleDbConfig))  // Write to TimescaleDB
    .uid("1m-sinks");

// 5-minute aggregation
DataStream<AggregatedMetric> fiveMinAgg = validatedStream
    .keyBy(r -> r.getSiteId() + "#" + r.getAssetId() + "#" + r.getMetricName())
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .aggregate(new MetricAggregator())
    .uid("5m-aggregation");

fiveMinAgg
    .addSink(new FlinkKafkaProducer<>("telemetry.aggregated.5m", aggSchema, kafkaProps))
    .addSink(new JdbcSink<>(timescaleDbConfig))
    .uid("5m-sinks");
```

**Job 3: Anomaly Detection and Alerting**

```java
DataStream<EnrichedReading> validatedStream = env
    .addSource(new FlinkKafkaConsumer<>("telemetry.validated", schema, kafkaProps));

// Threshold-based alerts
DataStream<Alert> thresholdAlerts = validatedStream
    .keyBy(r -> r.getAssetId())
    .flatMap(new ThresholdAlertFunction())  // Check against configured thresholds
    .uid("threshold-detection");

// Statistical anomaly detection (z-score)
DataStream<Alert> anomalyAlerts = validatedStream
    .keyBy(r -> r.getAssetId() + "#" + r.getMetricName())
    .flatMapWithState(
        new AnomalyDetectionFunction(),  // Stateful: maintains rolling statistics
        TypeInformation.of(RollingStats.class)
    )
    .uid("anomaly-detection");

// Combine alerts and deduplicate
DataStream<Alert> allAlerts = thresholdAlerts
    .union(anomalyAlerts)
    .keyBy(Alert::getAssetId)
    .window(TumblingProcessingTimeWindows.of(Time.seconds(30)))
    .reduce(new AlertDeduplicator())  // Prevent alert storms
    .uid("alert-dedup");

allAlerts
    .addSink(new FlinkKafkaProducer<>("alarms.critical", alertSchema, kafkaProps))
    .uid("alert-sink");
```

**Flink Configuration:**
```yaml
# Cluster configuration
jobmanager:
  replicas: 2
  memory: "2048m"
  cpu: 2

taskmanager:
  replicas: 6
  memory: "4096m"
  cpu: 4
  numberOfTaskSlots: 4

# Checkpointing
checkpointing:
  interval: 60000  # 1 minute
  mode: "exactly_once"
  timeout: 600000  # 10 minutes
  minPauseBetweenCheckpoints: 30000
  maxConcurrentCheckpoints: 1
  externalized: true
  stateBackend: "rocksdb"

# Restart strategy
restartStrategy:
  type: "failure-rate"
  failureRate:
    maxFailuresPerInterval: 3
    failureRateInterval: "5 minutes"
    delayBetweenAttempts: "30 seconds"

# Backpressure
taskmanager.network.memory.fraction: 0.2
taskmanager.network.memory.max: "1gb"
```

---

## 6. Time-Series Database Design

### 6.1 TimescaleDB Schema

**Hypertable for Raw Sensor Readings:**
```sql
CREATE TABLE sensor_readings (
    reading_id UUID NOT NULL,
    site_id VARCHAR(50) NOT NULL,
    asset_id VARCHAR(100) NOT NULL,
    sensor_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    ingestion_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality VARCHAR(20) NOT NULL,
    quality_detail TEXT,
    PRIMARY KEY (timestamp, site_id, asset_id, sensor_id, metric_name)
);

-- Convert to hypertable with 1-day chunks
SELECT create_hypertable(
    'sensor_readings',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Partitioning by site_id for query performance
SELECT add_dimension(
    'sensor_readings',
    'site_id',
    number_partitions => 16,
    if_not_exists => TRUE
);

-- Indexes for common query patterns
CREATE INDEX idx_sensor_readings_asset_time
    ON sensor_readings (asset_id, timestamp DESC);

CREATE INDEX idx_sensor_readings_metric_time
    ON sensor_readings (metric_name, timestamp DESC);

CREATE INDEX idx_sensor_readings_quality
    ON sensor_readings (quality, timestamp DESC)
    WHERE quality != 'GOOD';
```

**Continuous Aggregate for 1-Minute Rollups:**
```sql
CREATE MATERIALIZED VIEW sensor_readings_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    site_id,
    asset_id,
    sensor_id,
    metric_name,
    unit,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    STDDEV(value) AS stddev_value,
    COUNT(*) AS sample_count,
    SUM(CASE WHEN quality = 'GOOD' THEN 1 ELSE 0 END) AS good_count,
    SUM(CASE WHEN quality = 'BAD' THEN 1 ELSE 0 END) AS bad_count
FROM sensor_readings
GROUP BY bucket, site_id, asset_id, sensor_id, metric_name, unit;

-- Refresh policy: every 1 minute, look back 5 minutes for late data
SELECT add_continuous_aggregate_policy(
    'sensor_readings_1m',
    start_offset => INTERVAL '5 minutes',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute'
);

-- Compression policy for 1m aggregates after 7 days
SELECT add_compression_policy(
    'sensor_readings_1m',
    compress_after => INTERVAL '7 days'
);
```

**Continuous Aggregate for 5-Minute Rollups:**
```sql
CREATE MATERIALIZED VIEW sensor_readings_5m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', timestamp) AS bucket,
    site_id,
    asset_id,
    sensor_id,
    metric_name,
    unit,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    STDDEV(value) AS stddev_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) AS p50_value,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) AS p95_value,
    COUNT(*) AS sample_count,
    SUM(CASE WHEN quality = 'GOOD' THEN 1 ELSE 0 END) AS good_count
FROM sensor_readings
GROUP BY bucket, site_id, asset_id, sensor_id, metric_name, unit;

SELECT add_continuous_aggregate_policy(
    'sensor_readings_5m',
    start_offset => INTERVAL '10 minutes',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes'
);

SELECT add_compression_policy(
    'sensor_readings_5m',
    compress_after => INTERVAL '7 days'
);
```

**Continuous Aggregate for 15-Minute Rollups:**
```sql
CREATE MATERIALIZED VIEW sensor_readings_15m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('15 minutes', timestamp) AS bucket,
    site_id,
    asset_id,
    metric_name,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, site_id, asset_id, metric_name;

SELECT add_continuous_aggregate_policy(
    'sensor_readings_15m',
    start_offset => INTERVAL '30 minutes',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes'
);

SELECT add_compression_policy(
    'sensor_readings_15m',
    compress_after => INTERVAL '30 days'
);
```

### 6.2 Data Retention Policies

**Retention Strategy:**
```sql
-- Drop raw data after 90 days
SELECT add_retention_policy(
    'sensor_readings',
    drop_after => INTERVAL '90 days'
);

-- Keep 1-minute aggregates for 1 year
SELECT add_retention_policy(
    'sensor_readings_1m',
    drop_after => INTERVAL '365 days'
);

-- Keep 5-minute aggregates for 3 years
SELECT add_retention_policy(
    'sensor_readings_5m',
    drop_after => INTERVAL '1095 days'
);

-- Keep 15-minute aggregates for 5 years
SELECT add_retention_policy(
    'sensor_readings_15m',
    drop_after => INTERVAL '1825 days'
);
```

**Storage Estimates:**

| Granularity | Retention | Compressed Size (100k sensors) | Query Performance |
|-------------|-----------|-------------------------------|-------------------|
| Raw (1s) | 90 days | ~500 GB | Fast (indexed) |
| 1-minute | 1 year | ~50 GB | Very fast |
| 5-minute | 3 years | ~30 GB | Very fast |
| 15-minute | 5 years | ~25 GB | Instant |
| **Total** | - | **~605 GB** | - |

### 6.3 Compression Configuration

**Enable Compression on Hypertable:**
```sql
ALTER TABLE sensor_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id,asset_id,metric_name',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Automatically compress chunks older than 7 days
SELECT add_compression_policy(
    'sensor_readings',
    compress_after => INTERVAL '7 days'
);
```

**Compression Benefits:**
- **Compression ratio**: 10-20x for time-series data
- **Storage savings**: Raw 90-day data: 500 GB → 25-50 GB compressed
- **Query performance**: Compressed chunks can be queried directly (transparent decompression)
- **Trade-off**: Insert performance on compressed chunks (not an issue for append-only pattern)

### 6.4 Query Optimization

**Efficient Query Patterns:**

```sql
-- ✅ GOOD: Query uses time range and partition key (site_id)
SELECT
    time_bucket('5 minutes', timestamp) AS bucket,
    AVG(value) AS avg_power
FROM sensor_readings
WHERE
    site_id = 'SITE-ALPHA-001'
    AND metric_name = 'active_power_kw'
    AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY bucket
ORDER BY bucket DESC;

-- ✅ GOOD: Use continuous aggregate for historical queries
SELECT
    bucket AS time,
    avg_value AS avg_power
FROM sensor_readings_5m
WHERE
    site_id = 'SITE-ALPHA-001'
    AND metric_name = 'active_power_kw'
    AND bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket DESC;

-- ❌ BAD: No time range (full table scan)
SELECT * FROM sensor_readings WHERE asset_id = 'INV-01';

-- ❌ BAD: Unbounded GROUP BY without time_bucket
SELECT asset_id, AVG(value) FROM sensor_readings GROUP BY asset_id;
```

**Connection Pooling:**
```yaml
timescaledb:
  max_connections: 200
  connection_pool:
    min_size: 20
    max_size: 100
    idle_timeout: 300s
    statement_timeout: 60s
```

---

## 7. Backpressure and Flow Control

### 7.1 Backpressure Handling Strategy

**Layered Backpressure Management:**

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Edge Gateway Buffering                             │
│ - 10 GB local buffer (SQLite)                               │
│ - Store-and-forward on connectivity loss                    │
│ - Rate limit: 100 msg/sec on reconnect                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: MQTT Broker (EMQX) Buffering                       │
│ - In-memory queue per subscriber: 10k messages              │
│ - Disk queue (overflow): 1 GB per subscriber                │
│ - Drop policy: Drop oldest if full (non-critical topics)    │
│ - Persist policy: Retain alarms until delivered             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Kafka Topic Buffering                              │
│ - Retention: 7-30 days based on topic                       │
│ - Backpressure to producer: Block when broker full          │
│ - Consumer lag monitoring: Alert if lag > 5 minutes         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Flink Job Backpressure                             │
│ - Flink manages backpressure automatically                  │
│ - Checkpoint barriers propagate upstream                    │
│ - Metrics: backpressure time ratio (alert if > 50%)        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: TimescaleDB Connection Pooling                     │
│ - Connection pool: 20-100 connections                       │
│ - Queue depth: 500 pending writes                          │
│ - Timeout: 60s statement timeout                           │
│ - Batch inserts: 1000 rows per batch                       │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Rate Limiting

**MQTT Broker Rate Limits:**
```yaml
emqx:
  rate_limiting:
    # Per-client limits
    max_publish_rate: 1000  # msg/sec per client
    max_subscribe_rate: 100

    # Global limits
    max_connections: 10000
    max_message_size: 256KB

    # Burst handling
    burst_rate: 2000  # Allow 2x burst for 10 seconds
    burst_duration: 10s
```

**Flink Throttling:**
```java
// Rate limiting in Flink source
env.addSource(new RateLimitedKafkaSource<>(
    new FlinkKafkaConsumer<>(topic, schema, props),
    maxRecordsPerSecond = 100000  // Throttle to 100k records/sec
));
```

### 7.3 Circuit Breaker Pattern

**Flink to TimescaleDB Circuit Breaker:**
```java
@Override
public void invoke(SensorReading reading, Context context) {
    try {
        if (circuitBreaker.isOpen()) {
            // Send to backup sink (Kafka DLQ or S3)
            backupSink.invoke(reading, context);
            return;
        }

        // Attempt write to TimescaleDB
        jdbcConnection.executeUpdate(insertStatement, reading);
        circuitBreaker.recordSuccess();

    } catch (SQLException e) {
        circuitBreaker.recordFailure();

        if (circuitBreaker.shouldTrip()) {
            logger.error("Circuit breaker tripped after {} failures",
                         circuitBreaker.getFailureCount());
            circuitBreaker.open();
        }

        // Route to DLQ
        backupSink.invoke(reading, context);
    }
}
```

**Circuit Breaker Configuration:**
```yaml
circuit_breaker:
  failure_threshold: 10  # Trip after 10 consecutive failures
  success_threshold: 5   # Close after 5 consecutive successes
  timeout: 60s          # Half-open state after 60s
  monitoring_window: 10s
```

### 7.4 Monitoring Backpressure

**Key Metrics:**
```yaml
metrics:
  - name: "kafka.consumer.lag"
    type: "gauge"
    threshold: 300000  # Alert if lag > 5 minutes (300k ms)

  - name: "flink.backpressure.ratio"
    type: "gauge"
    threshold: 0.5  # Alert if backpressure > 50%

  - name: "timescaledb.connection.pool.waiting"
    type: "gauge"
    threshold: 50  # Alert if > 50 connections waiting

  - name: "emqx.queue.depth"
    type: "gauge"
    threshold: 5000  # Alert if queue depth > 5k messages
```

---

## 8. Performance Optimization

### 8.1 Write Performance Tuning

**TimescaleDB Write Optimization:**
```sql
-- Increase shared buffers for write-heavy workload
ALTER SYSTEM SET shared_buffers = '8GB';
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';

-- Tune for bulk inserts
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';

-- Disable synchronous commit for non-critical data (trade-off: potential data loss)
ALTER DATABASE dcmms SET synchronous_commit = 'off';

-- Use unlogged tables for temp staging (much faster inserts)
CREATE UNLOGGED TABLE sensor_readings_staging (LIKE sensor_readings);
```

**Batch Insert Pattern:**
```java
// Batch inserts for TimescaleDB
public class BatchedJdbcSink extends RichSinkFunction<SensorReading> {
    private static final int BATCH_SIZE = 1000;
    private static final long BATCH_TIMEOUT_MS = 5000;

    private List<SensorReading> batch;
    private long lastFlushTime;

    @Override
    public void invoke(SensorReading reading, Context context) {
        batch.add(reading);

        if (batch.size() >= BATCH_SIZE ||
            System.currentTimeMillis() - lastFlushTime > BATCH_TIMEOUT_MS) {
            flushBatch();
        }
    }

    private void flushBatch() {
        try (PreparedStatement stmt = connection.prepareStatement(INSERT_SQL)) {
            for (SensorReading reading : batch) {
                stmt.setString(1, reading.getReadingId());
                stmt.setTimestamp(2, reading.getTimestamp());
                // ... set other parameters
                stmt.addBatch();
            }
            stmt.executeBatch();
            connection.commit();
            lastFlushTime = System.currentTimeMillis();
            batch.clear();
        }
    }
}
```

### 8.2 Read Performance Tuning

**Query Optimization:**
```sql
-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sensor_readings
WHERE site_id = 'SITE-001'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Add covering index for common query patterns
CREATE INDEX idx_sensor_readings_covering
ON sensor_readings (site_id, timestamp DESC, metric_name)
INCLUDE (value, quality);

-- Partition pruning verification
SET timescaledb.enable_chunk_append = ON;
SET timescaledb.enable_constraint_exclusion = ON;
```

**Query Result Caching:**
```yaml
redis_cache:
  enabled: true
  ttl:
    dashboard_kpis: 60s      # Cache for 1 minute
    asset_summary: 300s      # Cache for 5 minutes
    historical_trends: 3600s # Cache for 1 hour

  eviction_policy: "LRU"
  max_memory: "4GB"
```

### 8.3 Kafka Performance Tuning

**Producer Configuration:**
```yaml
kafka_producer:
  acks: 1  # Wait for leader acknowledgment (balance between throughput and durability)
  compression_type: "snappy"
  batch_size: 16384  # 16 KB
  linger_ms: 10  # Wait 10ms to batch messages
  buffer_memory: 33554432  # 32 MB
  max_in_flight_requests_per_connection: 5
```

**Consumer Configuration:**
```yaml
kafka_consumer:
  fetch_min_bytes: 1024  # Wait for at least 1 KB
  fetch_max_wait_ms: 500
  max_poll_records: 500
  max_partition_fetch_bytes: 1048576  # 1 MB
  session_timeout_ms: 30000
  heartbeat_interval_ms: 3000
  enable_auto_commit: false  # Manual commit for exactly-once
```

### 8.4 Flink Performance Tuning

**Flink Configuration:**
```yaml
flink:
  parallelism: 16  # Match number of Kafka partitions

  taskmanager:
    memory:
      process_memory: "4096m"
      network_memory_fraction: 0.2
      managed_memory_fraction: 0.4

  state:
    backend: "rocksdb"
    backend_config:
      incremental_checkpoints: true
      block_cache_size: "256m"
      write_buffer_size: "64m"

  network:
    buffer_timeout: 10  # ms
    num_buffers: 2048
```

---

## 9. Monitoring and Observability

### 9.1 Key Performance Indicators (KPIs)

**Data Ingestion KPIs:**

| Metric | Target | Alert Threshold | Critical Threshold |
|--------|--------|-----------------|-------------------|
| **End-to-End Latency (P95)** | < 5s | > 10s | > 30s |
| **Throughput (Events/sec)** | 72,000 | < 60,000 | < 50,000 |
| **Data Loss Rate** | 0% | > 0.01% | > 0.1% |
| **Kafka Consumer Lag** | < 1 min | > 5 min | > 15 min |
| **Flink Backpressure** | < 10% | > 50% | > 80% |
| **TimescaleDB Write Latency** | < 100ms | > 500ms | > 1000ms |
| **Schema Validation Failures** | < 0.1% | > 1% | > 5% |
| **Dead Letter Queue Depth** | 0 | > 1000 | > 10000 |

### 9.2 Monitoring Stack

**Metrics Collection:**
```yaml
prometheus:
  scrape_interval: 15s
  evaluation_interval: 15s

  scrape_configs:
    - job_name: 'kafka'
      static_configs:
        - targets: ['kafka-exporter:9308']

    - job_name: 'flink'
      static_configs:
        - targets: ['flink-jobmanager:9249']

    - job_name: 'timescaledb'
      static_configs:
        - targets: ['postgres-exporter:9187']

    - job_name: 'emqx'
      static_configs:
        - targets: ['emqx:18083']
```

**Dashboards (Grafana):**
1. **Ingestion Overview Dashboard**
   - Real-time throughput (events/sec)
   - End-to-end latency (P50, P95, P99)
   - Data loss rate
   - Component health (green/yellow/red)

2. **Kafka Dashboard**
   - Consumer lag per topic
   - Broker disk usage
   - Partition distribution
   - Replication lag

3. **Flink Dashboard**
   - Job status and uptime
   - Backpressure per operator
   - Checkpoint duration
   - State size

4. **TimescaleDB Dashboard**
   - Write throughput (inserts/sec)
   - Query latency
   - Connection pool utilization
   - Cache hit rate
   - Chunk compression status

### 9.3 Alerting Rules

**Prometheus Alerting Rules:**
```yaml
groups:
  - name: data_ingestion
    interval: 30s
    rules:
      - alert: HighKafkaConsumerLag
        expr: kafka_consumer_lag_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High Kafka consumer lag on {{ $labels.topic }}"
          description: "Consumer lag is {{ $value }}s, exceeding 5 minutes"

      - alert: FlinkJobDown
        expr: flink_jobmanager_job_uptime_seconds < 60
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Flink job {{ $labels.job_name }} is down"

      - alert: HighBackpressure
        expr: flink_taskmanager_job_task_backpressuredTimeMsPerSecond > 500
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High backpressure detected in Flink task"

      - alert: TimescaleDBHighLatency
        expr: histogram_quantile(0.95, rate(pg_stat_statements_mean_time_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TimescaleDB query latency P95 > 1s"

      - alert: DLQDepthHigh
        expr: kafka_topic_partition_current_offset{topic="dlq.*"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dead letter queue has {{ $value }} messages"
```

### 9.4 Distributed Tracing

**OpenTelemetry Integration:**
```java
// Instrument Flink job with OpenTelemetry
Tracer tracer = GlobalOpenTelemetry.getTracer("dcmms-flink");

public void processElement(SensorReading reading, Context ctx) {
    Span span = tracer.spanBuilder("process-sensor-reading")
        .setAttribute("site.id", reading.getSiteId())
        .setAttribute("asset.id", reading.getAssetId())
        .startSpan();

    try (Scope scope = span.makeCurrent()) {
        // Validation
        Span validationSpan = tracer.spanBuilder("validate").startSpan();
        validate(reading);
        validationSpan.end();

        // Enrichment
        Span enrichmentSpan = tracer.spanBuilder("enrich").startSpan();
        EnrichedReading enriched = enrich(reading);
        enrichmentSpan.end();

        // Emit
        ctx.collect(enriched);

    } finally {
        span.end();
    }
}
```

**Trace Visualization (Jaeger/Tempo):**
- End-to-end trace from edge gateway to database
- Identify bottlenecks in processing pipeline
- Track individual message latency
- Detect anomalies in processing time

---

## 10. Operational Procedures

### 10.1 Deployment Procedures

**Zero-Downtime Flink Job Updates:**
```bash
# Step 1: Take savepoint
flink savepoint <job-id> s3://dcmms-flink-savepoints/prod/

# Step 2: Cancel job with savepoint
flink cancel -s <savepoint-path> <job-id>

# Step 3: Deploy new job version from savepoint
flink run -s <savepoint-path> -d flink-job-v2.jar
```

**Kafka Topic Schema Evolution:**
```bash
# Step 1: Register new schema version (must be backward compatible)
kafka-avro-console-producer \
  --broker-list kafka:9092 \
  --topic telemetry.raw \
  --property value.schema='<new-schema-v2>' \
  --property schema.registry.url=http://schema-registry:8081

# Step 2: Deploy updated Flink consumers (support both v1 and v2)
# Step 3: Verify all consumers reading both schema versions
# Step 4: Migrate producers to new schema over 7 days
# Step 5: Deprecate old schema version
```

### 10.2 Scaling Procedures

**Horizontal Scaling:**

**Scale Kafka:**
```bash
# Add new broker
kafka-server-start.sh config/server.properties --broker-id 4

# Reassign partitions
kafka-reassign-partitions.sh --zookeeper zk:2181 \
  --reassignment-json-file reassign.json --execute
```

**Scale Flink:**
```bash
# Increase task manager replicas
kubectl scale deployment flink-taskmanager --replicas=10

# Restart job with higher parallelism
flink run -p 32 -d flink-job.jar
```

**Scale TimescaleDB:**
```bash
# Vertical scaling: Increase CPU/memory
kubectl patch sts timescaledb -p '{"spec":{"template":{"spec":{"containers":[{"name":"timescaledb","resources":{"limits":{"cpu":"8","memory":"32Gi"}}}]}}}}'

# Horizontal scaling: Add read replicas
kubectl apply -f timescaledb-replica.yaml
```

### 10.3 Data Recovery Procedures

**Replay from Kafka (Data Loss Recovery):**
```bash
# Step 1: Identify time range of lost data
# Step 2: Reset consumer group offset to replay from timestamp
kafka-consumer-groups.sh --bootstrap-server kafka:9092 \
  --group flink-consumer-group \
  --topic telemetry.raw \
  --reset-offsets --to-datetime 2025-11-10T10:00:00.000 \
  --execute

# Step 3: Restart Flink job to reprocess
flink run -d flink-job.jar
```

**Restore from Backup (Catastrophic Failure):**
```bash
# Step 1: Restore TimescaleDB from backup
pg_restore -h timescaledb -U dcmms -d dcmms backup_20251110.dump

# Step 2: Verify data integrity
SELECT COUNT(*) FROM sensor_readings WHERE timestamp > NOW() - INTERVAL '7 days';

# Step 3: Resume ingestion pipeline
kubectl scale deployment flink-taskmanager --replicas=6
```

### 10.4 Performance Tuning Procedures

**Identify Slow Queries:**
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze query plan
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT * FROM sensor_readings WHERE ...;
```

**Optimize Kafka Consumer Lag:**
```bash
# Increase consumer parallelism
flink run -p 32 flink-job.jar

# Tune consumer fetch size
--consumer.fetch-min-bytes 1048576  # 1 MB

# Add more task managers
kubectl scale deployment flink-taskmanager --replicas=10
```

---

## 11. Testing Strategy

### 11.1 Load Testing

**Test Scenarios:**

| Test Scenario | Duration | Target EPS | Burst EPS | Expected Behavior |
|---------------|----------|------------|-----------|-------------------|
| **Baseline Load** | 1 hour | 800 | 1,600 | P95 < 5s, 0% data loss |
| **Sustained Load** | 24 hours | 72,000 | 150,000 | P95 < 5s, 0% data loss |
| **Spike Test** | 10 min | 72,000 → 216,000 | - | Graceful backpressure, no crash |
| **Retry Storm** | 5 min | 720,000 | - | Rate limiting engaged, queue stable |

**Load Testing Tool (k6):**
```javascript
import mqtt from 'k6/x/mqtt';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: '5m', target: 100 },  // Ramp-up
        { duration: '1h', target: 100 },  // Sustained
        { duration: '5m', target: 0 },    // Ramp-down
    ],
};

export default function () {
    const client = mqtt.connect('mqtts://mqtt-broker:8883', {
        clientID: `load-test-${__VU}`,
        tlsConfig: { /* mTLS certs */ },
    });

    const payload = JSON.stringify({
        siteId: 'SITE-LOAD-001',
        assetId: `ASSET-${__VU}`,
        timestamp: Date.now(),
        metrics: {
            active_power_kw: Math.random() * 1000,
            temperature_c: 20 + Math.random() * 30,
        },
    });

    const result = client.publish('site/LOAD-001/telemetry', payload, 1);
    check(result, {
        'published successfully': (r) => r.error === undefined,
    });

    client.close();
}
```

### 11.2 Chaos Engineering

**Failure Injection Tests:**

```yaml
chaos_experiments:
  - name: "Kafka broker failure"
    scenario: "Kill 1 Kafka broker"
    expected: "Automatic failover, consumer lag < 1 min"

  - name: "Flink task manager crash"
    scenario: "Kill 2 task managers"
    expected: "Job restart from checkpoint, data loss < 1 min"

  - name: "Network partition"
    scenario: "Isolate edge gateway for 5 minutes"
    expected: "Local buffering, replay on reconnect, 0% data loss"

  - name: "TimescaleDB connection pool exhaustion"
    scenario: "Simulate 200 concurrent connections"
    expected: "Connection queueing, backpressure to Flink, no crash"
```

**Chaos Mesh Example:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kafka-broker-failure
  namespace: dcmms
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - dcmms
    labelSelectors:
      app: kafka
  scheduler:
    cron: '@every 1h'
```

### 11.3 Data Quality Testing

**Validation Tests:**
```python
# Test schema validation
def test_schema_validation():
    invalid_message = {"invalid": "schema"}
    result = publish_to_kafka(topic="telemetry.raw", message=invalid_message)

    # Verify routed to DLQ
    dlq_messages = consume_from_kafka(topic="dlq.invalid-schema", timeout=5)
    assert len(dlq_messages) == 1
    assert dlq_messages[0] == invalid_message

# Test data enrichment
def test_data_enrichment():
    raw_message = {
        "assetId": "INV-01",
        "timestamp": 1699650000000,
        "value": 1500.5,
        "unit": "W"
    }

    enriched = process_message(raw_message)

    # Verify enrichment
    assert enriched["siteId"] == "SITE-ALPHA-001"
    assert enriched["assetType"] == "inverter"
    assert enriched["value"] == 1.5005  # W to kW conversion
    assert enriched["unit"] == "kW"
```

### 11.4 End-to-End Testing

**E2E Test Flow:**
```bash
#!/bin/bash
# E2E test: Publish message → Verify in database

# Step 1: Publish test message
TEST_MESSAGE='{"siteId":"TEST-001","assetId":"ASSET-E2E","timestamp":'$(date +%s000)',"value":42.0}'
mqtt pub -h mqtt-broker -t 'test/e2e' -m "$TEST_MESSAGE"

# Step 2: Wait for processing (P95 latency + buffer)
sleep 10

# Step 3: Query TimescaleDB for test message
RESULT=$(psql -h timescaledb -U dcmms -d dcmms -t -c \
  "SELECT COUNT(*) FROM sensor_readings WHERE asset_id='ASSET-E2E' AND value=42.0")

# Step 4: Verify result
if [ "$RESULT" -eq 1 ]; then
    echo "✅ E2E test PASSED"
    exit 0
else
    echo "❌ E2E test FAILED: Expected 1 row, got $RESULT"
    exit 1
fi
```

---

## 12. Appendix

### 12.1 References

- **Solar SCADA**: GreenPowerMonitor SCADA (1M+ variables), Elum Energy SolarVision
- **Wind SCADA**: IET Review of SCADA for Wind Turbines (10-min standard, 1-10 Hz high-frequency)
- **BESS Monitoring**: IEEE 2686-2024 Standard for BMS
- **Kafka Best Practices**: DoorDash Engineering (billions of events/day, 99.99% delivery)
- **TimescaleDB**: Official documentation on hypertables, continuous aggregates, compression
- **Flink**: Apache Flink documentation on checkpointing, backpressure, exactly-once semantics

### 12.2 Glossary

- **EPS**: Events Per Second
- **BMS**: Battery Management System
- **PCS**: Power Conversion System
- **DLQ**: Dead Letter Queue
- **mTLS**: Mutual TLS (certificate-based authentication)
- **P50/P95/P99**: 50th/95th/99th percentile (latency metrics)
- **WAL**: Write-Ahead Log (PostgreSQL/TimescaleDB)
- **OPC-UA**: Open Platform Communications Unified Architecture
- **MQTT**: Message Queuing Telemetry Transport
- **Hypertable**: TimescaleDB's automatic partitioning for time-series data
- **Continuous Aggregate**: Materialized view that auto-refreshes in TimescaleDB

### 12.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-10 | Data Engineering Team | Initial specification based on industry research |

---

## 13. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | [TBD] | | |
| Data Engineering Lead | [TBD] | | |
| DevOps Lead | [TBD] | | |
| Product Owner | [TBD] | | |
