#!/usr/bin/env python3
"""
Load Test for dCMMS Telemetry Pipeline

Simulates high-volume sensor data ingestion to test pipeline performance.

Usage:
    python load_test.py --events 100000 --rate 2000 --duration 60

Requirements:
    pip install kafka-python psycopg2-binary click

Target Performance:
    - Ingestion: 10,000 events/sec
    - End-to-end latency: <5 seconds
    - Success rate: >95%
"""

import click
import json
import time
import random
import threading
from datetime import datetime
from typing import List, Dict, Any
from collections import defaultdict, deque
from kafka import KafkaProducer
import psycopg2
import os

# Configuration
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:9092')
QUESTDB_HOST = os.getenv('QUESTDB_HOST', 'localhost')
QUESTDB_PORT = int(os.getenv('QUESTDB_PORT', '8812'))

# Test configuration
SITES = ['site-001', 'site-002', 'site-003']
ASSETS_PER_SITE = 10
SENSORS_PER_ASSET = 5

SENSOR_TYPES = [
    {'type': 'TEMPERATURE', 'unit': 'celsius', 'min': 20, 'max': 80},
    {'type': 'VOLTAGE', 'unit': 'volts', 'min': 220, 'max': 240},
    {'type': 'CURRENT', 'unit': 'amperes', 'min': 5, 'max': 20},
    {'type': 'POWER', 'unit': 'kilowatts', 'min': 1, 'max': 5},
    {'type': 'FREQUENCY', 'unit': 'hertz', 'min': 49, 'max': 51},
]


class LoadTestMetrics:
    """Track load test metrics"""

    def __init__(self):
        self.published_count = 0
        self.failed_count = 0
        self.latencies = deque(maxlen=1000)
        self.start_time = time.time()
        self.lock = threading.Lock()

    def record_publish(self, success: bool):
        with self.lock:
            if success:
                self.published_count += 1
            else:
                self.failed_count += 1

    def record_latency(self, latency: float):
        with self.lock:
            self.latencies.append(latency)

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            elapsed = time.time() - self.start_time
            throughput = self.published_count / elapsed if elapsed > 0 else 0

            latencies_list = list(self.latencies)
            avg_latency = sum(latencies_list) / len(latencies_list) if latencies_list else 0
            p95_latency = sorted(latencies_list)[int(len(latencies_list) * 0.95)] if latencies_list else 0
            p99_latency = sorted(latencies_list)[int(len(latencies_list) * 0.99)] if latencies_list else 0

            return {
                'elapsed_time': elapsed,
                'published': self.published_count,
                'failed': self.failed_count,
                'throughput': throughput,
                'avg_latency': avg_latency,
                'p95_latency': p95_latency,
                'p99_latency': p99_latency,
            }


def generate_event() -> Dict[str, Any]:
    """Generate a random telemetry event"""
    site_id = random.choice(SITES)
    asset_id = f"{site_id}-asset-{random.randint(1, ASSETS_PER_SITE):03d}"
    sensor = random.choice(SENSOR_TYPES)
    sensor_id = f"{asset_id}-{sensor['type'].lower()}-{random.randint(1, SENSORS_PER_ASSET):03d}"

    base_value = (sensor['min'] + sensor['max']) / 2
    variation = (sensor['max'] - sensor['min']) * 0.1
    value = base_value + random.uniform(-variation, variation)

    # Occasionally inject anomalies
    quality_flag = 'GOOD'
    if random.random() < 0.02:  # 2% anomaly rate
        quality_flag = 'OUT_OF_RANGE'
        value = sensor['max'] * 1.5

    return {
        'event_id': f'load-{int(time.time() * 1000)}-{random.randint(1000, 9999)}',
        'timestamp': int(time.time() * 1000),
        'site_id': site_id,
        'asset_id': asset_id,
        'sensor_type': sensor['type'],
        'sensor_id': sensor_id,
        'value': round(value, 2),
        'unit': sensor['unit'],
        'quality_flag': quality_flag,
        'metadata': {
            'load_test': 'true',
            'firmware_version': '1.0.0'
        },
        'source': 'LOAD_TEST',
        'schema_version': '1.0.0'
    }


def publish_worker(producer: KafkaProducer, metrics: LoadTestMetrics, events_per_sec: int, duration: int):
    """Worker thread for publishing events"""
    end_time = time.time() + duration
    interval = 1.0 / events_per_sec

    while time.time() < end_time:
        try:
            event = generate_event()
            publish_start = time.time()

            future = producer.send(
                'raw_telemetry',
                value=json.dumps(event).encode('utf-8'),
                key=f"{event['site_id']}:{event['asset_id']}:{event['sensor_id']}".encode('utf-8')
            )

            # Wait for acknowledgment
            future.get(timeout=10)

            latency = time.time() - publish_start
            metrics.record_publish(True)
            metrics.record_latency(latency)

            # Rate limiting
            time.sleep(interval)

        except Exception as e:
            metrics.record_publish(False)
            print(f"Publish error: {e}")


def stats_reporter(metrics: LoadTestMetrics, duration: int):
    """Report statistics periodically"""
    end_time = time.time() + duration

    while time.time() < end_time:
        time.sleep(5)  # Report every 5 seconds

        stats = metrics.get_stats()
        print(f"\n--- Load Test Stats ({stats['elapsed_time']:.0f}s) ---")
        print(f"  Published: {stats['published']:,} events")
        print(f"  Failed: {stats['failed']:,} events")
        print(f"  Throughput: {stats['throughput']:.0f} events/sec")
        print(f"  Avg Latency: {stats['avg_latency']*1000:.2f}ms")
        print(f"  P95 Latency: {stats['p95_latency']*1000:.2f}ms")
        print(f"  P99 Latency: {stats['p99_latency']*1000:.2f}ms")


def verify_data_in_questdb(expected_count: int) -> Dict[str, Any]:
    """Verify data landed in QuestDB"""
    try:
        conn = psycopg2.connect(
            host=QUESTDB_HOST,
            port=QUESTDB_PORT,
            user='admin',
            password='quest',
            database='qdb'
        )

        cursor = conn.cursor()

        # Count load test events in last hour
        cursor.execute(f"""
            SELECT count(*) FROM sensor_readings
            WHERE timestamp >= dateadd('h', -1, now())
            AND metadata LIKE '%load_test%'
        """)

        stored_count = cursor.fetchone()[0]

        # Get quality flag distribution
        cursor.execute(f"""
            SELECT quality_flag, count(*) FROM sensor_readings
            WHERE timestamp >= dateadd('h', -1, now())
            AND metadata LIKE '%load_test%'
            GROUP BY quality_flag
        """)

        quality_distribution = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.close()
        conn.close()

        success_rate = (stored_count / expected_count * 100) if expected_count > 0 else 0

        return {
            'stored_count': stored_count,
            'expected_count': expected_count,
            'success_rate': success_rate,
            'quality_distribution': quality_distribution
        }

    except Exception as e:
        print(f"Error verifying data: {e}")
        return None


@click.command()
@click.option('--events', default=10000, help='Total number of events to publish')
@click.option('--rate', default=1000, help='Target events per second')
@click.option('--duration', default=60, help='Test duration in seconds')
@click.option('--workers', default=4, help='Number of publisher threads')
@click.option('--verify/--no-verify', default=True, help='Verify data in QuestDB after test')
def main(events: int, rate: int, duration: int, workers: int, verify: bool):
    """Run load test for telemetry pipeline"""

    print("=" * 60)
    print("dCMMS Telemetry Pipeline Load Test")
    print("=" * 60)
    print(f"Target events: {events:,}")
    print(f"Target rate: {rate:,} events/sec")
    print(f"Duration: {duration} seconds")
    print(f"Workers: {workers}")
    print()

    # Create Kafka producer
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKERS,
        compression_type='lz4',
        linger_ms=10,
        batch_size=16384,
    )

    # Initialize metrics
    metrics = LoadTestMetrics()

    # Start stats reporter
    reporter_thread = threading.Thread(target=stats_reporter, args=(metrics, duration))
    reporter_thread.daemon = True
    reporter_thread.start()

    # Start publisher workers
    events_per_worker = rate // workers
    threads = []

    print(f"Starting {workers} publisher threads...")
    for i in range(workers):
        thread = threading.Thread(
            target=publish_worker,
            args=(producer, metrics, events_per_worker, duration)
        )
        thread.start()
        threads.append(thread)

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    # Final statistics
    final_stats = metrics.get_stats()

    print("\n" + "=" * 60)
    print("Load Test Complete")
    print("=" * 60)
    print(f"Duration: {final_stats['elapsed_time']:.2f}s")
    print(f"Published: {final_stats['published']:,} events")
    print(f"Failed: {final_stats['failed']:,} events")
    print(f"Success Rate: {(final_stats['published'] / (final_stats['published'] + final_stats['failed']) * 100):.2f}%")
    print(f"Throughput: {final_stats['throughput']:.0f} events/sec")
    print(f"Avg Latency: {final_stats['avg_latency']*1000:.2f}ms")
    print(f"P95 Latency: {final_stats['p95_latency']*1000:.2f}ms")
    print(f"P99 Latency: {final_stats['p99_latency']*1000:.2f}ms")

    # Verify data in QuestDB
    if verify:
        print("\nVerifying data in QuestDB (waiting 30s for processing)...")
        time.sleep(30)

        verification = verify_data_in_questdb(final_stats['published'])
        if verification:
            print("\n--- QuestDB Verification ---")
            print(f"Expected: {verification['expected_count']:,} events")
            print(f"Stored: {verification['stored_count']:,} events")
            print(f"Success Rate: {verification['success_rate']:.2f}%")
            print("\nQuality Distribution:")
            for quality, count in verification['quality_distribution'].items():
                print(f"  {quality}: {count:,} events")

            # Performance evaluation
            print("\n--- Performance Evaluation ---")
            if final_stats['throughput'] >= rate * 0.9:
                print("✓ Throughput: PASS (≥90% of target)")
            else:
                print("✗ Throughput: FAIL (<90% of target)")

            if verification['success_rate'] >= 95:
                print("✓ Data Delivery: PASS (≥95% success rate)")
            else:
                print("✗ Data Delivery: FAIL (<95% success rate)")

            if final_stats['p95_latency'] < 0.1:  # 100ms
                print("✓ Latency: PASS (P95 <100ms)")
            else:
                print("✗ Latency: FAIL (P95 ≥100ms)")

    producer.close()
    print("\n✓ Load test complete")


if __name__ == '__main__':
    main()
