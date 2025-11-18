# Load Testing Suite (DCMMS-062)

Comprehensive load testing for the dCMMS telemetry pipeline.

## Performance Targets

| Environment | Throughput | Latency (P99) | Success Rate | Kafka Lag | Flink Backpressure |
|-------------|------------|---------------|--------------|-----------|-------------------|
| Local (Dev) | 10,000 events/sec | <5s | >95% | <10s | <10% |
| Production | 72,000 events/sec | <3s | >99% | <10s | <10% |

## Test Tools

### 1. k6 (HTTP Load Testing)
- **Purpose**: Stress test REST API endpoint
- **Target**: `/api/v1/telemetry`
- **File**: `k6-load-test.js`

### 2. Python Load Test (Kafka Direct)
- **Purpose**: Bypass REST API, test Kafka ingestion directly
- **File**: `load_test.py`
- **Advantage**: Higher throughput (no HTTP overhead)

### 3. MQTT Publisher (IoT Simulation)
- **Purpose**: Simulate real IoT devices publishing via MQTT
- **File**: `../examples/mqtt-publisher.py`

## Running Load Tests

### Prerequisites

```bash
# 1. Start infrastructure
cd /path/to/telemetry
docker-compose up -d

# 2. Wait for services to be ready
docker-compose ps  # All services should be "healthy"

# 3. Initialize schema
./scripts/init-kafka-topics.sh
./scripts/init-questdb.sh

# 4. (Optional) Scale Flink TaskManagers for higher throughput
docker-compose up --scale flink-taskmanager=4
```

### k6 HTTP Load Test

```bash
# Install k6
# macOS: brew install k6
# Linux: https://k6.io/docs/get-started/installation/

# Set environment variables
export API_URL=http://localhost:3000
export AUTH_TOKEN="your-jwt-token-here"
export TEST_RUN_ID=$(date +%Y%m%d-%H%M%S)

# Run standard load test (10K events/sec)
k6 run --vus 100 --duration 60s k6-load-test.js

# Run production simulation (72K events/sec estimate)
k6 run --vus 720 --duration 300s k6-load-test.js

# Run with custom stages (ramp-up test)
k6 run \
  --stage 1m:50 \
  --stage 3m:100 \
  --stage 5m:100 \
  --stage 1m:0 \
  k6-load-test.js

# Run with HTML report
k6 run --out html=report.html k6-load-test.js

# Run with InfluxDB + Grafana (advanced)
k6 run --out influxdb=http://localhost:8086/k6 k6-load-test.js
```

### Python Kafka Load Test

```bash
# Install dependencies
pip install kafka-python psycopg2-binary click

# Run standard test
python load_test.py --events 100000 --rate 10000 --duration 60

# Run with verification
python load_test.py --events 50000 --rate 5000 --duration 30 --verify

# Run stress test
python load_test.py --events 500000 --rate 50000 --duration 60 --workers 8
```

### MQTT Simulation

```bash
# Single publisher
python ../examples/mqtt-publisher.py

# Multiple publishers (simulating 100 devices)
for i in {1..100}; do
  python ../examples/mqtt-publisher.py &
done

# Monitor with: ps aux | grep mqtt-publisher
# Stop all: pkill -f mqtt-publisher
```

## Test Scenarios

### Scenario 1: Baseline Performance Test
**Goal**: Establish baseline performance metrics

```bash
# 1. Clear existing data
psql -h localhost -p 8812 -U admin -d qdb -c "DELETE FROM sensor_readings;"

# 2. Run test
k6 run --vus 50 --duration 120s k6-load-test.js > baseline-results.txt

# 3. Verify metrics
# - Check Flink Web UI: http://localhost:8082
# - Check QuestDB: http://localhost:9000
# - Check Kafka UI: http://localhost:8080
```

**Expected Results**:
- Throughput: 5,000-7,000 events/sec
- Latency P99: <3 seconds
- Success rate: >98%
- No errors or crashes

### Scenario 2: Sustained Load Test
**Goal**: Verify system stability under sustained load

```bash
# Run for 30 minutes at 10K events/sec
k6 run --vus 100 --duration 30m k6-load-test.js
```

**Monitor**:
- Memory usage (should be stable, no leaks)
- Disk usage (should grow linearly)
- CPU usage (should be <80%)
- Kafka lag (should be <10 seconds)

### Scenario 3: Spike Test
**Goal**: Test system behavior during sudden traffic spikes

```bash
# Uncomment spike scenario in k6-load-test.js, then:
k6 run k6-load-test.js
```

**Monitor**:
- Flink backpressure
- Kafka consumer lag
- QuestDB write latency
- System recovery time after spike

### Scenario 4: Soak Test
**Goal**: Detect memory leaks and performance degradation over time

```bash
# Run for 24 hours at moderate load
k6 run --vus 50 --duration 24h k6-load-test.js
```

**Monitor**:
- Memory trends (JVM heap, Docker containers)
- Disk I/O patterns
- Checkpoint duration trends
- Query performance degradation

### Scenario 5: Failover Test
**Goal**: Test resilience and recovery

```bash
# 1. Start load test
k6 run --vus 100 --duration 600s k6-load-test.js &

# 2. Simulate failures (in separate terminal)
# Kill Flink TaskManager
docker kill dcmms-flink-taskmanager

# Wait 30 seconds, observe recovery

# Kill Kafka (more severe)
docker kill dcmms-kafka

# Restart after 60 seconds
docker-compose up -d kafka

# 3. Verify data integrity
python verify_data_integrity.py
```

## Metrics Collection

### Real-time Monitoring

```bash
# Monitor Flink job
cd ../flink-jobs
./monitor_performance.sh

# Monitor Kafka lag
docker exec dcmms-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group flink-telemetry-processor \
  --describe

# Monitor QuestDB ingestion rate
psql -h localhost -p 8812 -U admin -d qdb <<EOF
SELECT
  to_hour(timestamp) as hour,
  count(*) as row_count,
  count(*) / 3600 as rows_per_sec
FROM sensor_readings
WHERE timestamp > dateadd('h', -1, now())
GROUP BY hour
ORDER BY hour DESC;
EOF
```

### Post-Test Analysis

```bash
# Generate test report
python generate_load_test_report.py \
  --start-time "2025-01-15 10:00:00" \
  --end-time "2025-01-15 11:00:00" \
  --output report.html
```

## Data Verification

After load tests, verify data integrity:

```bash
#!/bin/bash
# verify_data_integrity.sh

echo "Verifying data integrity..."

# Count events in Kafka (approximate)
KAFKA_COUNT=$(docker exec dcmms-kafka kafka-run-class \
  kafka.tools.GetOffsetShell \
  --broker-list localhost:9092 \
  --topic raw_telemetry \
  --time -1 | awk -F: '{sum += $3} END {print sum}')

echo "Kafka raw_telemetry: $KAFKA_COUNT events"

# Count events in QuestDB
QUESTDB_COUNT=$(psql -h localhost -p 8812 -U admin -d qdb -t -c \
  "SELECT count(*) FROM sensor_readings WHERE metadata LIKE '%load_test%';")

echo "QuestDB sensor_readings: $QUESTDB_COUNT events"

# Calculate success rate
SUCCESS_RATE=$(echo "scale=2; $QUESTDB_COUNT / $KAFKA_COUNT * 100" | bc)
echo "Success rate: ${SUCCESS_RATE}%"

if (( $(echo "$SUCCESS_RATE > 95" | bc -l) )); then
  echo "✓ PASS: Success rate > 95%"
else
  echo "✗ FAIL: Success rate < 95%"
  exit 1
fi
```

## Performance Tuning

### If Throughput is Low (<5K events/sec)

1. **Increase Flink Parallelism**
   ```bash
   # Scale TaskManagers
   docker-compose up --scale flink-taskmanager=4

   # Update parallelism in telemetry-processor.py
   export FLINK_PARALLELISM=16
   ```

2. **Optimize QuestDB Batch Size**
   ```bash
   export QUESTDB_BATCH_SIZE=10000
   export QUESTDB_BATCH_INTERVAL_MS=2000
   ```

3. **Increase Kafka Partitions**
   ```bash
   docker exec dcmms-kafka kafka-topics \
     --alter --topic raw_telemetry \
     --partitions 16 \
     --bootstrap-server localhost:9092
   ```

### If Latency is High (>5s P99)

1. **Check Flink Backpressure**
   - http://localhost:8082 → Job → Backpressure
   - If high, increase parallelism or optimize operators

2. **Check QuestDB Write Latency**
   - Switch to InfluxDB Line Protocol if using SQL
   - Increase write buffer size

3. **Check Kafka Lag**
   - If lag is growing, increase Flink parallelism
   - Check network between Kafka and Flink

### If Memory Usage is High

1. **Reduce Flink State Size**
   ```yaml
   # Use RocksDB state backend (already configured)
   # Reduce deduplication window
   DEDUPLICATION_WINDOW_MS=30000  # From 60000
   ```

2. **Tune JVM Heap**
   ```yaml
   taskmanager.memory.process.size: 4096m
   taskmanager.memory.flink.size: 3200m
   ```

## Load Test Report Template

After each test, generate a report with:

### Executive Summary
- Test duration
- Target throughput vs achieved
- Success rate
- Any failures or anomalies

### Detailed Metrics
- Throughput over time (chart)
- Latency percentiles (P50, P95, P99)
- Error rate
- Resource usage (CPU, memory, disk)

### Component Performance
- Flink: checkpoint duration, backpressure
- Kafka: consumer lag, throughput
- QuestDB: write rate, query latency

### Recommendations
- Identified bottlenecks
- Suggested optimizations
- Capacity planning for production

## Continuous Load Testing

### Automated Nightly Tests

```bash
# /etc/cron.d/dcmms-load-test
# Run load test nightly at 2 AM
0 2 * * * /path/to/run_nightly_load_test.sh >> /var/log/dcmms/load-test.log 2>&1
```

```bash
#!/bin/bash
# run_nightly_load_test.sh

export TEST_RUN_ID=$(date +%Y%m%d-%H%M%S)
export API_URL=http://localhost:3000
export AUTH_TOKEN=$(get_test_token.sh)

# Run test
k6 run --vus 50 --duration 300s k6-load-test.js \
  --out json=results-${TEST_RUN_ID}.json

# Generate report
python generate_load_test_report.py \
  --input results-${TEST_RUN_ID}.json \
  --output report-${TEST_RUN_ID}.html

# Send report (email, Slack, etc.)
send_report.sh report-${TEST_RUN_ID}.html
```

## Resources

- **k6 Documentation**: https://k6.io/docs/
- **Flink Performance Tuning**: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/ops/state/large_state_tuning/
- **QuestDB Performance**: https://questdb.io/docs/operations/capacity-planning/
- **Kafka Performance**: https://kafka.apache.org/documentation/#performance
