#!/usr/bin/env python3
"""
Real-time Alarm Detection Service (DCMMS-060)

Monitors validated telemetry events and triggers alarms based on threshold rules.

Features:
- Threshold-based alarm detection (min/max)
- Alarm deduplication (5-minute suppression window)
- Severity levels (INFO, WARNING, CRITICAL)
- Publishes to Kafka alarms topic
- Stores alarm history in PostgreSQL

Usage:
    python alarm-detector.py

Requirements:
    pip install kafka-python psycopg2-binary
"""

import json
import os
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from kafka import KafkaConsumer, KafkaProducer
import psycopg2
from psycopg2.extras import RealDictCursor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:9092')
VALIDATED_TOPIC = 'validated_telemetry'
ALARMS_TOPIC = 'alarms'
CONSUMER_GROUP = 'alarm-detector'

PG_CONFIG = {
    'host': os.getenv('DATABASE_HOST', 'localhost'),
    'port': int(os.getenv('DATABASE_PORT', '5432')),
    'user': os.getenv('DATABASE_USER', 'postgres'),
    'password': os.getenv('DATABASE_PASSWORD', 'postgres'),
    'database': os.getenv('DATABASE_NAME', 'dcmms'),
}

SUPPRESSION_WINDOW_SECONDS = 300  # 5 minutes

# In-memory alarm rules cache (refreshed periodically)
alarm_rules_cache: List[Dict] = []
alarm_suppressions: Dict[str, datetime] = {}  # alarm_key -> last_triggered


def get_db_connection():
    """Get PostgreSQL connection"""
    return psycopg2.connect(**PG_CONFIG)


def load_alarm_rules():
    """Load alarm rules from PostgreSQL"""
    global alarm_rules_cache

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT
                id, tenant_id, site_id, asset_id, sensor_type,
                threshold_min, threshold_max, severity, name, description
            FROM alarm_rules
            WHERE enabled = true
        """)

        alarm_rules_cache = cursor.fetchall()

        logger.info(f"Loaded {len(alarm_rules_cache)} alarm rules")

        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"Failed to load alarm rules: {e}")


def get_alarm_key(event: Dict, alarm_type: str) -> str:
    """Generate unique alarm key for deduplication"""
    key_parts = [
        event['site_id'],
        event['asset_id'],
        event['sensor_id'],
        alarm_type
    ]
    return ':'.join(key_parts)


def is_suppressed(alarm_key: str) -> bool:
    """Check if alarm is currently suppressed"""
    if alarm_key in alarm_suppressions:
        last_triggered = alarm_suppressions[alarm_key]
        if datetime.utcnow() - last_triggered < timedelta(seconds=SUPPRESSION_WINDOW_SECONDS):
            return True
        else:
            # Suppression window expired
            del alarm_suppressions[alarm_key]

    return False


def suppress_alarm(alarm_key: str):
    """Mark alarm as suppressed"""
    alarm_suppressions[alarm_key] = datetime.utcnow()


def check_thresholds(event: Dict) -> List[Dict]:
    """
    Check event against alarm rules and return triggered alarms

    Returns list of alarm objects
    """
    alarms = []

    sensor_type = event.get('sensor_type')
    value = event.get('value')

    if not sensor_type or value is None:
        return alarms

    # Find matching rules
    for rule in alarm_rules_cache:
        # Check if rule applies to this event
        if rule['sensor_type'] != sensor_type:
            continue

        # Site/Asset filtering (if specified)
        if rule['site_id'] and rule['site_id'] != event.get('site_id'):
            continue

        if rule['asset_id'] and rule['asset_id'] != event.get('asset_id'):
            continue

        # Check thresholds
        threshold_min = rule['threshold_min']
        threshold_max = rule['threshold_max']

        alarm_type = None
        threshold_violated = None

        if threshold_min is not None and value < threshold_min:
            alarm_type = 'THRESHOLD_MIN'
            threshold_violated = threshold_min
        elif threshold_max is not None and value > threshold_max:
            alarm_type = 'THRESHOLD_MAX'
            threshold_violated = threshold_max

        if alarm_type:
            # Check if alarm is suppressed
            alarm_key = get_alarm_key(event, alarm_type)

            if is_suppressed(alarm_key):
                logger.debug(f"Alarm suppressed: {alarm_key}")
                continue

            # Create alarm object
            alarm = {
                'alarm_id': hashlib.md5(f"{alarm_key}:{event['timestamp']}".encode()).hexdigest(),
                'alarm_rule_id': str(rule['id']),
                'tenant_id': str(rule['tenant_id']),
                'alarm_type': alarm_type,
                'severity': rule['severity'],
                'status': 'ACTIVE',

                # Asset/Sensor info
                'site_id': event['site_id'],
                'asset_id': event['asset_id'],
                'sensor_type': event['sensor_type'],
                'sensor_id': event['sensor_id'],

                # Trigger details
                'trigger_value': value,
                'threshold_min': threshold_min,
                'threshold_max': threshold_max,
                'threshold_violated': threshold_violated,
                'unit': event.get('unit'),

                # Timing
                'timestamp': event['timestamp'],
                'first_occurrence': int(datetime.utcnow().timestamp() * 1000),

                # Metadata
                'message': f"{rule['name']}: {sensor_type} value {value} {event.get('unit', '')} "
                          f"is {'below' if alarm_type == 'THRESHOLD_MIN' else 'above'} "
                          f"threshold {threshold_violated}",
                'metadata': {
                    'rule_name': rule['name'],
                    'rule_description': rule['description'],
                    'event_id': event.get('event_id'),
                },
            }

            alarms.append(alarm)

            # Suppress future alarms
            suppress_alarm(alarm_key)

            logger.warning(f"🚨 Alarm triggered: {alarm['message']}")

    return alarms


def store_alarm(alarm: Dict):
    """Store alarm in PostgreSQL"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO alarms
            (id, tenant_id, alarm_rule_id, alarm_type, severity, status,
             site_id, asset_id, sensor_type, sensor_id,
             trigger_value, threshold_min, threshold_max, unit,
             first_occurrence, message, metadata)
            VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
             to_timestamp(%s), %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                last_occurrence = to_timestamp(%s),
                updated_at = NOW()
        """, (
            alarm['alarm_id'],
            alarm['tenant_id'],
            alarm['alarm_rule_id'],
            alarm['alarm_type'],
            alarm['severity'],
            alarm['status'],
            alarm['site_id'],
            alarm['asset_id'],
            alarm['sensor_type'],
            alarm['sensor_id'],
            alarm['trigger_value'],
            alarm['threshold_min'],
            alarm['threshold_max'],
            alarm['unit'],
            alarm['first_occurrence'] / 1000,
            alarm['message'],
            json.dumps(alarm['metadata']),
            alarm['first_occurrence'] / 1000,
        ))

        conn.commit()
        cursor.close()
        conn.close()

        logger.debug(f"Stored alarm: {alarm['alarm_id']}")

    except Exception as e:
        logger.error(f"Failed to store alarm: {e}")


def publish_alarm(producer: KafkaProducer, alarm: Dict):
    """Publish alarm to Kafka alarms topic"""
    try:
        message = json.dumps(alarm).encode('utf-8')
        future = producer.send(ALARMS_TOPIC, value=message)
        future.get(timeout=10)

        logger.debug(f"Published alarm to Kafka: {alarm['alarm_id']}")

    except Exception as e:
        logger.error(f"Failed to publish alarm to Kafka: {e}")


def process_event(event: Dict, producer: KafkaProducer):
    """Process a single telemetry event for alarm detection"""
    try:
        # Check thresholds
        alarms = check_thresholds(event)

        # Process triggered alarms
        for alarm in alarms:
            # Store in database
            store_alarm(alarm)

            # Publish to Kafka
            publish_alarm(producer, alarm)

    except Exception as e:
        logger.error(f"Error processing event: {e}")


def main():
    """Main service loop"""
    logger.info("=" * 60)
    logger.info("dCMMS Alarm Detection Service")
    logger.info("=" * 60)
    logger.info(f"Kafka Brokers: {KAFKA_BROKERS}")
    logger.info(f"Consumer Topic: {VALIDATED_TOPIC}")
    logger.info(f"Producer Topic: {ALARMS_TOPIC}")
    logger.info(f"Suppression Window: {SUPPRESSION_WINDOW_SECONDS}s")
    logger.info("=" * 60)

    # Load alarm rules
    load_alarm_rules()

    # Create Kafka consumer
    consumer = KafkaConsumer(
        VALIDATED_TOPIC,
        bootstrap_servers=KAFKA_BROKERS,
        group_id=CONSUMER_GROUP,
        auto_offset_reset='latest',
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

    # Create Kafka producer
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKERS,
        compression_type='lz4',
    )

    logger.info("✓ Alarm detector started, monitoring for threshold violations...")

    # Periodic alarm rule refresh
    last_rules_refresh = datetime.utcnow()
    rules_refresh_interval = timedelta(minutes=5)

    try:
        for message in consumer:
            event = message.value

            # Process event
            process_event(event, producer)

            # Periodically refresh alarm rules
            now = datetime.utcnow()
            if now - last_rules_refresh > rules_refresh_interval:
                load_alarm_rules()
                last_rules_refresh = now

    except KeyboardInterrupt:
        logger.info("\n\nStopping alarm detector...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        consumer.close()
        producer.close()
        logger.info("✓ Alarm detector stopped")


if __name__ == '__main__':
    main()
