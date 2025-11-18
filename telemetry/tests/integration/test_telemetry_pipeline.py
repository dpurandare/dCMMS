#!/usr/bin/env python3
"""
Integration Tests for dCMMS Telemetry Pipeline

Tests the complete data flow:
MQTT → Kafka → Flink → QuestDB

Requirements:
    pip install pytest pytest-asyncio kafka-python paho-mqtt psycopg2-binary

Run:
    pytest tests/integration/test_telemetry_pipeline.py -v
"""

import pytest
import json
import time
import random
from datetime import datetime, timedelta
from kafka import KafkaProducer, KafkaConsumer, KafkaAdminClient
from kafka.admin import NewTopic
import paho.mqtt.client as mqtt
import psycopg2
import os
from typing import List, Dict, Any
import threading
from collections import defaultdict

# Configuration
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:9092')
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', '1883'))
QUESTDB_HOST = os.getenv('QUESTDB_HOST', 'localhost')
QUESTDB_PORT = int(os.getenv('QUESTDB_PORT', '8812'))

# Test data configuration
TEST_SITE_ID = 'test-site-001'
TEST_ASSET_ID = 'test-asset-001'
TEST_SENSOR_TYPES = [
    {'id': 'temp-test-001', 'type': 'TEMPERATURE', 'unit': 'celsius', 'min': 20, 'max': 80},
    {'id': 'volt-test-001', 'type': 'VOLTAGE', 'unit': 'volts', 'min': 220, 'max': 240},
    {'id': 'curr-test-001', 'type': 'CURRENT', 'unit': 'amperes', 'min': 5, 'max': 15},
]


@pytest.fixture(scope='module')
def kafka_admin():
    """Kafka admin client for topic management"""
    admin = KafkaAdminClient(
        bootstrap_servers=KAFKA_BROKERS,
        client_id='test-admin'
    )
    yield admin
    admin.close()


@pytest.fixture(scope='module')
def kafka_producer():
    """Kafka producer for publishing test events"""
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8') if k else None
    )
    yield producer
    producer.close()


@pytest.fixture(scope='module')
def kafka_consumer():
    """Kafka consumer for reading validated events"""
    consumer = KafkaConsumer(
        'validated_telemetry',
        bootstrap_servers=KAFKA_BROKERS,
        auto_offset_reset='latest',
        enable_auto_commit=True,
        group_id='test-consumer',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    yield consumer
    consumer.close()


@pytest.fixture(scope='module')
def questdb_connection():
    """QuestDB connection for querying test data"""
    conn = psycopg2.connect(
        host=QUESTDB_HOST,
        port=QUESTDB_PORT,
        user='admin',
        password='quest',
        database='qdb'
    )
    yield conn
    conn.close()


@pytest.fixture(scope='module')
def mqtt_client():
    """MQTT client for publishing test events"""
    client = mqtt.Client(client_id=f'test-publisher-{random.randint(1000, 9999)}')
    client.username_pw_set('sensor01', 'password')
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    time.sleep(1)  # Wait for connection
    yield client
    client.loop_stop()
    client.disconnect()


def generate_test_event(sensor: Dict[str, Any], event_id: str = None, quality: str = 'GOOD') -> Dict[str, Any]:
    """Generate a test telemetry event"""
    base_value = (sensor['min'] + sensor['max']) / 2
    variation = (sensor['max'] - sensor['min']) * 0.1
    value = base_value + random.uniform(-variation, variation)

    if quality == 'OUT_OF_RANGE':
        value = sensor['max'] * 1.5
    elif quality == 'BAD':
        value = -9999

    return {
        'event_id': event_id or f'test-evt-{int(time.time() * 1000)}-{random.randint(1000, 9999)}',
        'timestamp': int(time.time() * 1000),
        'site_id': TEST_SITE_ID,
        'asset_id': TEST_ASSET_ID,
        'sensor_type': sensor['type'],
        'sensor_id': sensor['id'],
        'value': round(value, 2),
        'unit': sensor['unit'],
        'quality_flag': quality,
        'metadata': {
            'test_run': 'integration_test',
            'firmware_version': '1.0.0-test'
        },
        'source': 'TEST',
        'schema_version': '1.0.0'
    }


def cleanup_test_data(conn):
    """Clean up test data from QuestDB"""
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            DELETE FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND asset_id = '{TEST_ASSET_ID}'
        """)
        conn.commit()
        print(f"✓ Cleaned up test data from QuestDB")
    except Exception as e:
        print(f"Warning: Failed to cleanup test data: {e}")
    finally:
        cursor.close()


class TestKafkaIngestion:
    """Test Kafka ingestion and basic pipeline"""

    def test_kafka_topic_exists(self, kafka_admin):
        """Verify required Kafka topics exist"""
        topics = kafka_admin.list_topics()
        assert 'raw_telemetry' in topics, "raw_telemetry topic not found"
        assert 'validated_telemetry' in topics, "validated_telemetry topic not found"

    def test_publish_to_raw_telemetry(self, kafka_producer):
        """Test publishing events to raw_telemetry topic"""
        event = generate_test_event(TEST_SENSOR_TYPES[0])

        future = kafka_producer.send(
            'raw_telemetry',
            value=event,
            key=f"{event['site_id']}:{event['asset_id']}:{event['sensor_id']}"
        )

        # Wait for send to complete
        record_metadata = future.get(timeout=10)

        assert record_metadata.topic == 'raw_telemetry'
        assert record_metadata.partition >= 0
        print(f"✓ Published event to partition {record_metadata.partition}")

    def test_batch_publish_performance(self, kafka_producer):
        """Test batch publishing performance (target: 1000 events/sec)"""
        num_events = 1000
        events = [generate_test_event(random.choice(TEST_SENSOR_TYPES)) for _ in range(num_events)]

        start_time = time.time()

        futures = []
        for event in events:
            future = kafka_producer.send(
                'raw_telemetry',
                value=event,
                key=f"{event['site_id']}:{event['asset_id']}:{event['sensor_id']}"
            )
            futures.append(future)

        # Wait for all sends to complete
        for future in futures:
            future.get(timeout=10)

        elapsed_time = time.time() - start_time
        throughput = num_events / elapsed_time

        print(f"✓ Published {num_events} events in {elapsed_time:.2f}s")
        print(f"  Throughput: {throughput:.0f} events/sec")

        assert throughput > 500, f"Throughput too low: {throughput:.0f} events/sec (target: >500)"


class TestMQTTIngestion:
    """Test MQTT ingestion path"""

    def test_mqtt_publish(self, mqtt_client):
        """Test publishing telemetry via MQTT"""
        event = generate_test_event(TEST_SENSOR_TYPES[0])
        topic = f"telemetry/{TEST_SITE_ID}/{TEST_ASSET_ID}/{event['sensor_type']}"

        result = mqtt_client.publish(topic, json.dumps(event), qos=1)
        result.wait_for_publish(timeout=5)

        assert result.is_published(), "MQTT message not published"
        print(f"✓ Published MQTT event to topic: {topic}")

    def test_mqtt_batch_publish(self, mqtt_client):
        """Test batch MQTT publishing"""
        num_events = 100
        published = 0

        for _ in range(num_events):
            sensor = random.choice(TEST_SENSOR_TYPES)
            event = generate_test_event(sensor)
            topic = f"telemetry/{TEST_SITE_ID}/{TEST_ASSET_ID}/{sensor['type']}"

            result = mqtt_client.publish(topic, json.dumps(event), qos=1)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                published += 1
            time.sleep(0.01)  # Small delay between publishes

        print(f"✓ Published {published}/{num_events} MQTT events")
        assert published == num_events


class TestDataValidation:
    """Test Flink data validation and filtering"""

    def test_valid_event_processing(self, kafka_producer, questdb_connection):
        """Test that valid events are processed correctly"""
        cleanup_test_data(questdb_connection)

        # Publish valid event
        event = generate_test_event(TEST_SENSOR_TYPES[0], event_id='test-valid-001')
        kafka_producer.send('raw_telemetry', value=event).get(timeout=10)

        # Wait for processing
        time.sleep(10)

        # Query QuestDB
        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT * FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND sensor_id = '{event['sensor_id']}'
            AND timestamp >= to_timestamp({event['timestamp'] - 5000})
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        result = cursor.fetchone()
        cursor.close()

        assert result is not None, "Event not found in QuestDB"
        print(f"✓ Valid event processed and stored in QuestDB")

    def test_out_of_range_flagging(self, kafka_producer, questdb_connection):
        """Test that out-of-range values are flagged"""
        cleanup_test_data(questdb_connection)

        # Publish out-of-range event
        event = generate_test_event(
            TEST_SENSOR_TYPES[0],
            event_id='test-out-of-range-001',
            quality='OUT_OF_RANGE'
        )
        kafka_producer.send('raw_telemetry', value=event).get(timeout=10)

        # Wait for processing
        time.sleep(10)

        # Query QuestDB
        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT quality_flag FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND sensor_id = '{event['sensor_id']}'
            AND timestamp >= to_timestamp({event['timestamp'] - 5000})
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        result = cursor.fetchone()
        cursor.close()

        assert result is not None, "Event not found in QuestDB"
        assert result[0] == 'OUT_OF_RANGE', f"Quality flag incorrect: {result[0]}"
        print(f"✓ Out-of-range event flagged correctly")

    def test_invalid_event_filtering(self, kafka_producer, questdb_connection):
        """Test that invalid events are filtered out"""
        cleanup_test_data(questdb_connection)

        # Publish event with missing required fields
        invalid_event = {
            'event_id': 'test-invalid-001',
            'timestamp': int(time.time() * 1000),
            # Missing site_id, asset_id, etc.
            'value': 42.0
        }
        kafka_producer.send('raw_telemetry', value=invalid_event).get(timeout=10)

        # Wait for processing
        time.sleep(10)

        # Query QuestDB - should not find the event
        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT * FROM sensor_readings
            WHERE timestamp >= to_timestamp({invalid_event['timestamp'] - 5000})
            AND value = {invalid_event['value']}
        """)

        result = cursor.fetchone()
        cursor.close()

        assert result is None, "Invalid event should have been filtered out"
        print(f"✓ Invalid event filtered correctly")


class TestDeduplication:
    """Test event deduplication logic"""

    def test_duplicate_filtering(self, kafka_producer, questdb_connection):
        """Test that duplicate events within time window are filtered"""
        cleanup_test_data(questdb_connection)

        sensor = TEST_SENSOR_TYPES[0]
        base_event = generate_test_event(sensor, event_id='test-dup-001')

        # Publish original event
        kafka_producer.send('raw_telemetry', value=base_event).get(timeout=10)
        time.sleep(2)

        # Publish duplicate event (same value, within 1 minute)
        dup_event = base_event.copy()
        dup_event['event_id'] = 'test-dup-002'
        dup_event['timestamp'] = base_event['timestamp'] + 5000  # 5 seconds later
        kafka_producer.send('raw_telemetry', value=dup_event).get(timeout=10)

        # Wait for processing
        time.sleep(10)

        # Count events in QuestDB
        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT count(*) FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND sensor_id = '{sensor['id']}'
            AND timestamp >= to_timestamp({base_event['timestamp'] - 5000})
        """)

        count = cursor.fetchone()[0]
        cursor.close()

        # Should only have 1 event (duplicate filtered)
        assert count == 1, f"Expected 1 event, found {count}"
        print(f"✓ Duplicate event filtered correctly")


class TestEndToEndLatency:
    """Test end-to-end pipeline latency"""

    def test_pipeline_latency(self, kafka_producer, questdb_connection):
        """Test end-to-end latency (target: <5 seconds)"""
        cleanup_test_data(questdb_connection)

        event = generate_test_event(TEST_SENSOR_TYPES[0], event_id='test-latency-001')

        # Record publish time
        publish_time = time.time()
        kafka_producer.send('raw_telemetry', value=event).get(timeout=10)

        # Poll QuestDB until event appears
        max_wait = 15  # seconds
        poll_interval = 0.5
        elapsed = 0
        found = False

        cursor = questdb_connection.cursor()
        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

            cursor.execute(f"""
                SELECT timestamp FROM sensor_readings
                WHERE site_id = '{TEST_SITE_ID}'
                AND sensor_id = '{event['sensor_id']}'
                AND timestamp >= to_timestamp({event['timestamp'] - 5000})
                ORDER BY timestamp DESC
                LIMIT 1
            """)

            result = cursor.fetchone()
            if result is not None:
                found = True
                latency = elapsed
                break

        cursor.close()

        assert found, f"Event not found in QuestDB after {max_wait}s"
        print(f"✓ End-to-end latency: {latency:.2f}s")
        assert latency < 5.0, f"Latency too high: {latency:.2f}s (target: <5s)"


class TestDataIntegrity:
    """Test data integrity through the pipeline"""

    def test_value_preservation(self, kafka_producer, questdb_connection):
        """Test that sensor values are preserved accurately"""
        cleanup_test_data(questdb_connection)

        sensor = TEST_SENSOR_TYPES[1]
        expected_value = 230.45
        event = generate_test_event(sensor, event_id='test-integrity-001')
        event['value'] = expected_value

        kafka_producer.send('raw_telemetry', value=event).get(timeout=10)
        time.sleep(10)

        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT value FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND sensor_id = '{sensor['id']}'
            AND timestamp >= to_timestamp({event['timestamp'] - 5000})
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        result = cursor.fetchone()
        cursor.close()

        assert result is not None, "Event not found"
        stored_value = float(result[0])

        assert abs(stored_value - expected_value) < 0.01, \
            f"Value mismatch: expected {expected_value}, got {stored_value}"
        print(f"✓ Value preserved accurately: {stored_value}")

    def test_metadata_preservation(self, kafka_producer, questdb_connection):
        """Test that metadata is preserved"""
        cleanup_test_data(questdb_connection)

        event = generate_test_event(TEST_SENSOR_TYPES[0], event_id='test-metadata-001')
        event['metadata']['custom_field'] = 'test_value_123'

        kafka_producer.send('raw_telemetry', value=event).get(timeout=10)
        time.sleep(10)

        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT metadata FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND sensor_id = '{event['sensor_id']}'
            AND timestamp >= to_timestamp({event['timestamp'] - 5000})
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        result = cursor.fetchone()
        cursor.close()

        assert result is not None, "Event not found"
        metadata = json.loads(result[0]) if isinstance(result[0], str) else result[0]

        assert 'custom_field' in metadata, "Custom metadata field missing"
        assert metadata['custom_field'] == 'test_value_123', "Metadata value mismatch"
        print(f"✓ Metadata preserved correctly")


class TestStressTest:
    """Stress tests for pipeline performance"""

    def test_high_volume_ingestion(self, kafka_producer, questdb_connection):
        """Test high-volume ingestion (10,000 events)"""
        cleanup_test_data(questdb_connection)

        num_events = 10000
        print(f"Publishing {num_events} events...")

        start_time = time.time()

        # Publish events
        futures = []
        for i in range(num_events):
            sensor = random.choice(TEST_SENSOR_TYPES)
            event = generate_test_event(sensor, event_id=f'stress-test-{i}')

            future = kafka_producer.send(
                'raw_telemetry',
                value=event,
                key=f"{event['site_id']}:{event['asset_id']}:{event['sensor_id']}"
            )
            futures.append(future)

            if i % 1000 == 0:
                print(f"  Published {i} events...")

        # Wait for all sends
        for future in futures:
            future.get(timeout=30)

        publish_time = time.time() - start_time
        print(f"✓ Published {num_events} events in {publish_time:.2f}s")
        print(f"  Throughput: {num_events / publish_time:.0f} events/sec")

        # Wait for processing
        print("Waiting for processing (30s)...")
        time.sleep(30)

        # Check QuestDB
        cursor = questdb_connection.cursor()
        cursor.execute(f"""
            SELECT count(*) FROM sensor_readings
            WHERE site_id = '{TEST_SITE_ID}'
            AND asset_id = '{TEST_ASSET_ID}'
            AND timestamp >= to_timestamp({int((time.time() - 60) * 1000)})
        """)

        count = cursor.fetchone()[0]
        cursor.close()

        success_rate = (count / num_events) * 100
        print(f"✓ Processed {count}/{num_events} events ({success_rate:.1f}%)")

        # Allow some loss due to deduplication, but should be >90%
        assert success_rate > 90, f"Success rate too low: {success_rate:.1f}%"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
