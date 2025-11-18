# dCMMS Telemetry Pipeline

Real-time telemetry data ingestion and processing pipeline for IoT sensor data.

## Architecture

```
IoT Devices/Sensors
        ↓
   MQTT (EMQX) ←─────────┐
        ↓                │
   Kafka Topics          │ (Bridge)
   - raw_telemetry       │
   - validated_telemetry │
   - alarms              │
        ↓                │
   Flink Processing ─────┘
   (Validation, Enrichment, Deduplication)
        ↓
   QuestDB (Time-Series Storage)
        ↓
   Query API
   (REST endpoints for data retrieval)
```

## Components

### 1. **Kafka** (Message Broker)
- **Version:** 3.6+ (KRaft mode - no Zookeeper)
- **Purpose:** Message queue for telemetry events
- **Topics:**
  - `raw_telemetry`: Raw sensor data from MQTT/REST API
  - `validated_telemetry`: Processed and validated data
  - `alarms`: Anomaly/alarm events
- **Retention:** 7 days (local), 90 days (production)
- **Partitions:** 8 per topic (configurable)

### 2. **Schema Registry** (Schema Management)
- **Version:** Confluent 7.5.0
- **Purpose:** Avro schema versioning and validation
- **Port:** 8081
- **Compatibility:** Backward compatible

### 3. **EMQX** (MQTT Broker)
- **Version:** 5.3.2
- **Purpose:** Receive sensor data via MQTT protocol
- **Port:** 1883 (MQTT), 18083 (Dashboard)
- **Topics:** `telemetry/{site_id}/{asset_id}/{sensor_type}`
- **Authentication:** Username/password
- **QoS:** 1 (at least once delivery)

### 4. **QuestDB** (Time-Series Database)
- **Version:** 7.3.5
- **Purpose:** High-performance storage for sensor readings
- **Ports:**
  - 9000: Web console
  - 8812: PostgreSQL wire protocol
  - 9009: InfluxDB line protocol
- **Partitioning:** By DAY
- **Retention:** 90 days (auto-delete old data)

### 5. **Apache Flink** (Stream Processing)
- **Version:** 1.18
- **Purpose:** Real-time data processing
- **Processing:**
  - Deserialize Avro messages
  - Validate schema
  - Enrich with asset metadata
  - Filter invalid records
  - Deduplicate within 1-minute window
- **Checkpointing:** Every 1 minute
- **Port:** 8082 (Web UI)

### 6. **Kafka UI** (Monitoring)
- **Port:** 8080
- **Purpose:** Monitor Kafka topics, consumer groups, messages

## Quick Start

### Prerequisites

- Docker & Docker Compose installed
- At least 4GB RAM available
- Ports 1883, 8080, 8081, 8082, 9000, 9092, 18083 available

### 1. Start Infrastructure

```bash
cd telemetry
docker-compose up -d
```

**Services will start in this order:**
1. Kafka (30-60 seconds)
2. Schema Registry (depends on Kafka)
3. QuestDB, EMQX, Flink (parallel)
4. Kafka UI (last)

### 2. Initialize Kafka Topics

```bash
chmod +x scripts/init-kafka-topics.sh
./scripts/init-kafka-topics.sh
```

### 3. Initialize QuestDB Tables

```bash
chmod +x scripts/init-questdb.sh
./scripts/init-questdb.sh
```

### 4. Verify Services

```bash
# Check all services are healthy
docker-compose ps

# Check logs
docker-compose logs -f
```

## Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Kafka UI** | http://localhost:8080 | No auth |
| **QuestDB Console** | http://localhost:9000 | No auth |
| **EMQX Dashboard** | http://localhost:18083 | admin / dcmms123 |
| **Flink Web UI** | http://localhost:8082 | No auth |
| **Schema Registry** | http://localhost:8081 | No auth |

## Usage

### Publish Telemetry via MQTT

```bash
# Install MQTT client
pip install paho-mqtt

# Python example
import paho.mqtt.client as mqtt
import json
import time

client = mqtt.Client()
client.username_pw_set("sensor01", "password")
client.connect("localhost", 1883)

# Publish temperature reading
payload = {
    "event_id": "evt-001",
    "timestamp": int(time.time() * 1000),
    "site_id": "site-001",
    "asset_id": "asset-001",
    "sensor_type": "TEMPERATURE",
    "sensor_id": "temp-001",
    "value": 72.5,
    "unit": "celsius",
    "quality_flag": "GOOD"
}

client.publish("telemetry/site-001/asset-001/TEMPERATURE", json.dumps(payload))
client.disconnect()
```

### Publish via REST API

```bash
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '[
    {
      "timestamp": 1638360000000,
      "site_id": "site-001",
      "asset_id": "asset-001",
      "sensor_type": "TEMPERATURE",
      "sensor_id": "temp-001",
      "value": 72.5,
      "unit": "celsius"
    }
  ]'
```

### Query Telemetry Data

```bash
# Via REST API
curl "http://localhost:3000/api/v1/telemetry?asset_id=asset-001&start_time=2023-12-01T00:00:00Z&end_time=2023-12-02T00:00:00Z"

# Via QuestDB SQL
curl -G http://localhost:9000/exec --data-urlencode "query=SELECT * FROM sensor_readings WHERE asset_id='asset-001' ORDER BY timestamp DESC LIMIT 100;"
```

### Monitor Pipeline

**Kafka UI:**
- View topics and messages
- Monitor consumer lag
- Inspect message schemas

**Flink UI:**
- View running jobs
- Check job metrics
- Monitor checkpoints

**QuestDB Console:**
- Run SQL queries
- View table statistics
- Monitor ingestion rate

## Avro Schema

The telemetry events use Avro schema for serialization:

**Schema File:** `schemas/telemetry-event.avsc`

**Key Fields:**
- `event_id`: Unique event identifier
- `timestamp`: Event timestamp (milliseconds since epoch)
- `site_id`, `asset_id`, `sensor_id`: Identifiers
- `sensor_type`: Enum (TEMPERATURE, VOLTAGE, CURRENT, etc.)
- `value`: Measured value (double)
- `unit`: Unit of measurement (string)
- `quality_flag`: Data quality (GOOD, BAD, UNCERTAIN, etc.)

## Performance Targets

| Metric | Target |
|--------|--------|
| **Ingestion Rate** | 10,000 events/second |
| **End-to-End Latency** | < 5 seconds (local) |
| **Query Response Time** | < 500ms (1-day query) |
| **Storage Retention** | 90 days |
| **Data Loss** | 0% (at-least-once delivery) |

## Monitoring & Alerts

### Kafka Metrics

- Consumer lag (should be < 1000 messages)
- Topic throughput (messages/sec)
- Disk usage

### Flink Metrics

- Processing latency
- Checkpoint duration
- Task failures

### QuestDB Metrics

- Write throughput (rows/sec)
- Query latency
- Disk usage

## Troubleshooting

### Kafka Not Starting

```bash
# Check logs
docker logs dcmms-kafka

# Verify ports not in use
lsof -i :9092

# Reset Kafka data (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### EMQX Connection Failed

```bash
# Check EMQX status
docker exec dcmms-emqx emqx_ctl status

# View logs
docker logs dcmms-emqx

# Test MQTT connection
mosquitto_pub -h localhost -p 1883 -t test -m "hello" -u sensor01 -P password
```

### QuestDB Table Not Found

```bash
# Re-run initialization
./scripts/init-questdb.sh

# Check tables
curl -G http://localhost:9000/exec --data-urlencode "query=SHOW TABLES;"
```

### Flink Job Not Running

```bash
# Check Flink logs
docker logs dcmms-flink-jobmanager
docker logs dcmms-flink-taskmanager

# Restart Flink
docker-compose restart flink-jobmanager flink-taskmanager

# Access Flink UI
open http://localhost:8082
```

## Development

### Running Tests

```bash
# Start test environment
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Run integration tests
npm test

# Stop test environment
docker-compose down
```

### Adding New Sensor Types

1. Update Avro schema: `schemas/telemetry-event.avsc`
2. Add new enum value to `SensorType`
3. Register new schema version in Schema Registry
4. Update Flink job validation logic
5. Update frontend sensor type mappings

## Security

### Production Recommendations

- **Kafka:** Enable SASL/SSL authentication
- **EMQX:** Use TLS for MQTT, client certificates
- **Schema Registry:** Enable authentication
- **QuestDB:** Enable authentication and TLS
- **Flink:** Enable Kerberos or JWT authentication
- **API Keys:** Rotate regularly, use secrets manager

### Network Security

- Place all services in private network
- Use VPN or SSH tunnels for remote access
- Implement rate limiting on ingestion APIs
- Monitor for anomalous traffic patterns

## Backup & Recovery

### Kafka

- **Backup:** Topics are replicated (production)
- **Recovery:** Configure replication factor ≥ 2

### QuestDB

- **Backup:** Daily snapshots of `/var/lib/questdb`
- **Recovery:** Restore from snapshot, replay Kafka topics

### Schema Registry

- **Backup:** Export schemas via REST API
- **Recovery:** Re-register schemas

## Scaling

### Horizontal Scaling

- **Kafka:** Add more brokers, increase partitions
- **Flink:** Increase task manager replicas
- **EMQX:** Add EMQX cluster nodes
- **QuestDB:** Add read replicas (enterprise)

### Vertical Scaling

- Increase memory/CPU for Flink
- Increase Kafka heap size
- Optimize QuestDB buffer sizes

## References

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [QuestDB Documentation](https://questdb.io/docs/)
- [EMQX Documentation](https://www.emqx.io/docs/)
- [Flink Documentation](https://flink.apache.org/docs/)
- [Avro Specification](https://avro.apache.org/docs/current/spec.html)

---

**Sprint:** 6 (Telemetry Pipeline Foundation)
**Last Updated:** December 2025
