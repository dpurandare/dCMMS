# Telemetry Pipeline Integration Tests

Comprehensive integration tests for the dCMMS telemetry pipeline, covering the complete data flow from ingestion to storage.

## Test Coverage

### 1. Kafka Ingestion Tests
- ✓ Kafka topic existence validation
- ✓ Single event publishing to raw_telemetry
- ✓ Batch publishing performance (target: 1000 events/sec)

### 2. MQTT Ingestion Tests
- ✓ MQTT message publishing
- ✓ Batch MQTT publishing (100 events)
- ✓ QoS 1 delivery verification

### 3. Data Validation Tests
- ✓ Valid event processing through Flink
- ✓ Out-of-range value flagging
- ✓ Invalid event filtering (missing fields)
- ✓ Timestamp validation

### 4. Deduplication Tests
- ✓ Duplicate event filtering within time window
- ✓ Similar value detection (±1%)

### 5. End-to-End Latency Tests
- ✓ Pipeline latency measurement (target: <5 seconds)
- ✓ Kafka → Flink → QuestDB flow timing

### 6. Data Integrity Tests
- ✓ Sensor value preservation
- ✓ Metadata preservation through pipeline
- ✓ Unit and quality flag accuracy

### 7. Stress Tests
- ✓ High-volume ingestion (10,000 events)
- ✓ Throughput measurement
- ✓ Success rate validation (>90%)

## Prerequisites

1. **Start Infrastructure**
   ```bash
   cd ../
   docker-compose up -d
   ```

2. **Wait for Services**
   ```bash
   # Wait ~30 seconds for all services to be healthy
   docker-compose ps
   ```

3. **Initialize Schema**
   ```bash
   ./scripts/init-kafka-topics.sh
   ./scripts/init-questdb.sh
   ```

4. **Install Test Dependencies**
   ```bash
   cd tests/
   pip install -r requirements.txt
   ```

## Running Tests

### Run All Tests
```bash
pytest integration/test_telemetry_pipeline.py -v
```

### Run Specific Test Class
```bash
pytest integration/test_telemetry_pipeline.py::TestKafkaIngestion -v
```

### Run Specific Test
```bash
pytest integration/test_telemetry_pipeline.py::TestEndToEndLatency::test_pipeline_latency -v
```

### Run with Detailed Output
```bash
pytest integration/test_telemetry_pipeline.py -v -s
```

### Run with Coverage
```bash
pytest integration/test_telemetry_pipeline.py --cov=. --cov-report=html
```

## Configuration

Tests use environment variables for configuration:

```bash
export KAFKA_BROKERS=localhost:9092
export MQTT_BROKER=localhost
export MQTT_PORT=1883
export QUESTDB_HOST=localhost
export QUESTDB_PORT=8812
```

Default values are provided if environment variables are not set.

## Test Data

All tests use a dedicated test site and asset:
- Site ID: `test-site-001`
- Asset ID: `test-asset-001`
- Sensor IDs: `temp-test-001`, `volt-test-001`, `curr-test-001`

Test data is automatically cleaned up before each test to ensure isolation.

## Expected Output

```
tests/integration/test_telemetry_pipeline.py::TestKafkaIngestion::test_kafka_topic_exists PASSED
tests/integration/test_telemetry_pipeline.py::TestKafkaIngestion::test_publish_to_raw_telemetry PASSED
  ✓ Published event to partition 3

tests/integration/test_telemetry_pipeline.py::TestKafkaIngestion::test_batch_publish_performance PASSED
  ✓ Published 1000 events in 0.85s
  Throughput: 1176 events/sec

tests/integration/test_telemetry_pipeline.py::TestDataValidation::test_valid_event_processing PASSED
  ✓ Valid event processed and stored in QuestDB

tests/integration/test_telemetry_pipeline.py::TestEndToEndLatency::test_pipeline_latency PASSED
  ✓ End-to-end latency: 3.50s

tests/integration/test_telemetry_pipeline.py::TestStressTest::test_high_volume_ingestion PASSED
  Publishing 10000 events...
  ✓ Published 10000 events in 8.45s
  Throughput: 1183 events/sec
  ✓ Processed 9876/10000 events (98.8%)

========================== 16 passed in 125.43s ===========================
```

## Performance Targets

| Metric | Target | Test |
|--------|--------|------|
| Ingestion Throughput | >1000 events/sec | test_batch_publish_performance |
| End-to-End Latency | <5 seconds | test_pipeline_latency |
| Success Rate | >90% | test_high_volume_ingestion |
| Deduplication Accuracy | 100% | test_duplicate_filtering |

## Troubleshooting

### Tests Fail to Connect
```bash
# Check service health
docker-compose ps

# Check logs
docker-compose logs kafka
docker-compose logs questdb
docker-compose logs emqx
```

### QuestDB Connection Errors
```bash
# Verify QuestDB is ready
curl http://localhost:9000

# Check PostgreSQL wire protocol
psql -h localhost -p 8812 -U admin -d qdb
```

### Kafka Connection Errors
```bash
# Test Kafka connectivity
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### MQTT Connection Errors
```bash
# Test MQTT connectivity
docker-compose exec emqx emqx_ctl status
```

### Events Not Appearing in QuestDB
1. Check Flink job is running (if using Flink processor)
2. Check Kafka consumer group lag
3. Verify MQTT bridge is configured correctly
4. Check application logs for errors

## Continuous Integration

To run these tests in CI/CD:

```yaml
# .github/workflows/telemetry-tests.yml
name: Telemetry Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start infrastructure
        run: |
          cd telemetry
          docker-compose up -d
          sleep 30

      - name: Initialize schema
        run: |
          cd telemetry
          ./scripts/init-kafka-topics.sh
          ./scripts/init-questdb.sh

      - name: Run tests
        run: |
          cd telemetry/tests
          pip install -r requirements.txt
          pytest integration/test_telemetry_pipeline.py -v

      - name: Cleanup
        if: always()
        run: |
          cd telemetry
          docker-compose down -v
```

## Test Maintenance

- **Update sensor ranges**: Modify `TEST_SENSOR_TYPES` in test file
- **Add new sensor types**: Extend the sensor configuration
- **Adjust timeouts**: Modify wait times for slower environments
- **Add new tests**: Follow existing test class patterns

## Coverage Goals

- Overall test coverage: ≥75%
- Integration test coverage: ≥85%
- Critical path coverage: 100%
