# dCMMS Telemetry Pipeline - Quick Start Guide

Get the telemetry pipeline up and running in 10 minutes.

## Prerequisites

- Docker & Docker Compose installed
- Python 3.8+ (for MQTT publisher example)
- At least 4GB RAM available

## Step 1: Start Infrastructure (2 minutes)

```bash
cd telemetry

# Start all services
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

**Expected Output:**
```
NAME                         STATUS
dcmms-kafka                  Up (healthy)
dcmms-schema-registry        Up (healthy)
dcmms-kafka-ui               Up
dcmms-questdb                Up (healthy)
dcmms-emqx                   Up (healthy)
dcmms-flink-jobmanager       Up
dcmms-flink-taskmanager      Up
```

## Step 2: Initialize Kafka Topics (1 minute)

```bash
# Make scripts executable (first time only)
chmod +x scripts/init-kafka-topics.sh scripts/init-questdb.sh

# Create Kafka topics
./scripts/init-kafka-topics.sh
```

**Expected Output:**
```
✓ Kafka is ready
Creating topic: raw_telemetry
Creating topic: validated_telemetry
Creating topic: alarms
✓ Kafka topics initialized successfully!
```

## Step 3: Initialize QuestDB Tables (1 minute)

```bash
# Create QuestDB tables
./scripts/init-questdb.sh
```

**Expected Output:**
```
✓ QuestDB is ready
✓ Created sensor_readings table
✓ Inserted sample data
✓ QuestDB initialized successfully!
```

## Step 4: Publish Test Data via MQTT (2 minutes)

```bash
# Install MQTT client library
pip install paho-mqtt

# Run the MQTT publisher
python examples/mqtt-publisher.py
```

**Expected Output:**
```
✓ Connected to MQTT broker at localhost:1883
Publishing telemetry for 4 sensors...
Site: site-001, Asset: asset-001

--- Iteration 1 (14:23:45) ---
✓ temp-001: 72.5 celsius (Quality: GOOD)
✓ volt-001: 230.2 volts (Quality: GOOD)
✓ curr-001: 15.3 amperes (Quality: GOOD)
✓ power-001: 3.8 kilowatts (Quality: GOOD)
```

**Press Ctrl+C to stop**

## Step 5: Query Data from QuestDB (1 minute)

### Option A: Via Web Console

1. Open http://localhost:9000 in your browser
2. Run this SQL query:

```sql
SELECT * FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 100;
```

### Option B: Via Command Line

```bash
curl -G http://localhost:9000/exec \
  --data-urlencode "query=SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 10;" \
  | jq '.'
```

## Step 6: Query via REST API (1 minute)

### Start the dCMMS Backend

```bash
cd ../backend

# Install dependencies (first time only)
npm install

# Start backend
npm run dev
```

### Query Telemetry Data

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dcmms.local","password":"admin123"}' \
  | jq -r '.token')

# Query telemetry data
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/telemetry?asset_id=asset-001&limit=10" \
  | jq '.'
```

**Expected Output:**
```json
{
  "data": [
    {
      "timestamp": "2025-12-20T14:23:45.123Z",
      "value": 72.5,
      "unit": "celsius",
      "sensor_id": "temp-001",
      "quality_flag": "GOOD"
    }
  ],
  "count": 10,
  "aggregation": "raw"
}
```

## Step 7: Monitor the Pipeline (2 minutes)

### Kafka UI

1. Open http://localhost:8080
2. Navigate to "Topics"
3. Click on "raw_telemetry"
4. View messages in real-time

### EMQX Dashboard

1. Open http://localhost:18083
2. Login: `admin` / `dcmms123`
3. Navigate to "Clients" to see connected publishers
4. Navigate to "Topics" to see message flow

### Flink Web UI

1. Open http://localhost:8082
2. View running jobs
3. Check job metrics and checkpoints

### QuestDB Console

1. Open http://localhost:9000
2. Run queries to explore data
3. View table statistics

## Common Commands

### Check Service Status

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f dcmms-kafka
docker logs -f dcmms-questdb
docker logs -f dcmms-emqx
```

### Stop All Services

```bash
docker-compose down
```

### Reset Everything (WARNING: Deletes all data)

```bash
docker-compose down -v
docker-compose up -d
./scripts/init-kafka-topics.sh
./scripts/init-questdb.sh
```

## Testing the API

### Publish Telemetry via REST API

```bash
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "timestamp": '$(date +%s000)',
      "site_id": "site-001",
      "asset_id": "asset-001",
      "sensor_type": "TEMPERATURE",
      "sensor_id": "temp-002",
      "value": 75.3,
      "unit": "celsius"
    }
  ]'
```

### Query with Filters

```bash
# Get temperature readings
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/telemetry?asset_id=asset-001&sensor_type=TEMPERATURE&limit=20" \
  | jq '.'

# Get data with time range
START=$(date -u -d "1 hour ago" +%s000)
END=$(date -u +%s000)

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/telemetry?asset_id=asset-001&start_time=$START&end_time=$END" \
  | jq '.'
```

### Get Statistics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/telemetry/stats?asset_id=asset-001" \
  | jq '.'
```

## Troubleshooting

### Kafka Won't Start

```bash
# Check if port is in use
lsof -i :9092

# Reset Kafka data
docker-compose down -v
docker-compose up -d kafka
```

### QuestDB Connection Error

```bash
# Verify QuestDB is running
curl http://localhost:9000/

# Check logs
docker logs dcmms-questdb
```

### MQTT Connection Refused

```bash
# Check EMQX status
docker exec dcmms-emqx emqx_ctl status

# Verify credentials
# Default: admin / dcmms123
```

### No Data in QuestDB

1. Check if Kafka topic has messages:
   - Open http://localhost:8080
   - Navigate to "raw_telemetry" topic
   - Check message count

2. Check if MQTT publisher is running:
   - Should see "✓ Published" messages

3. Verify QuestDB table exists:
   ```bash
   curl -G http://localhost:9000/exec \
     --data-urlencode "query=SHOW TABLES;"
   ```

## Next Steps

- **Frontend Integration**: Display telemetry data in asset detail pages
- **Alerting**: Set up threshold alerts for anomalous readings
- **Dashboards**: Create real-time monitoring dashboards
- **Flink Jobs**: Implement stream processing for data enrichment
- **Historical Analysis**: Build analytics for predictive maintenance

## Performance Tips

- **Kafka**: Increase partitions for higher throughput
- **QuestDB**: Add indexes on frequently queried columns
- **EMQX**: Enable clustering for high availability
- **Flink**: Scale task managers for parallel processing

---

**Sprint:** 6 (Telemetry Pipeline Foundation)
**Status:** Infrastructure Ready ✅
**Last Updated:** December 2025
