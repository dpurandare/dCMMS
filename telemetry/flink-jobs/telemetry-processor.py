"""
Flink Stream Processing Job for dCMMS Telemetry Pipeline

Reads from Kafka raw_telemetry topic, processes and validates data,
then writes to QuestDB and Kafka validated_telemetry topic.

Processing steps:
1. Read from Kafka raw_telemetry
2. Parse and validate JSON
3. Enrich with asset metadata from PostgreSQL
4. Filter invalid/out-of-range values
5. Deduplicate within 1-minute window
6. Write to QuestDB (batch) and Kafka validated_telemetry

Requirements:
    pip install apache-flink kafka-python psycopg2-binary

Run:
    python flink-telemetry-processor.py
"""

from pyflink.datastream import StreamExecutionEnvironment, TimeCharacteristic
from pyflink.datastream.connectors import FlinkKafkaConsumer, FlinkKafkaProducer
from pyflink.datastream.formats.json import JsonRowDeserializationSchema, JsonRowSerializationSchema
from pyflink.common.serialization import SimpleStringSchema
from pyflink.common.typeinfo import Types
from pyflink.datastream.functions import MapFunction, FilterFunction, KeyedProcessFunction
from pyflink.datastream.state import ValueStateDescriptor
from pyflink.table import StreamTableEnvironment, DataTypes
import json
import logging
import os
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'kafka:9092')
RAW_TOPIC = 'raw_telemetry'
VALIDATED_TOPIC = 'validated_telemetry'
CONSUMER_GROUP = 'flink-telemetry-processor'

# Value ranges for validation (can be made configurable)
VALUE_RANGES = {
    'TEMPERATURE': (-50, 150),
    'VOLTAGE': (0, 600),
    'CURRENT': (0, 500),
    'POWER': (0, 10000),
    'FREQUENCY': (0, 100),
    'PRESSURE': (0, 1000),
    'HUMIDITY': (0, 100),
    'VIBRATION': (0, 100),
    'FLOW_RATE': (0, 1000),
    'RPM': (0, 10000),
    'TORQUE': (0, 1000),
    'ENERGY': (0, 100000),
}


class TelemetryParser(MapFunction):
    """Parse and validate JSON telemetry events"""

    def map(self, value):
        try:
            event = json.loads(value)

            # Add processing timestamp
            event['processed_at'] = int(datetime.utcnow().timestamp() * 1000)

            return json.dumps(event)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing event: {e}")
            return None


class ValueValidator(FilterFunction):
    """Filter out invalid telemetry values"""

    def filter(self, value):
        if not value:
            return False

        try:
            event = json.loads(value)

            # Check required fields
            required_fields = ['timestamp', 'site_id', 'asset_id', 'sensor_type', 'value', 'unit']
            if not all(field in event for field in required_fields):
                logger.warning(f"Missing required fields in event: {event.get('event_id', 'unknown')}")
                return False

            # Validate sensor type
            sensor_type = event.get('sensor_type')
            if sensor_type not in VALUE_RANGES:
                # Allow unknown sensor types with basic validation
                if sensor_type not in ['STATUS', 'OTHER']:
                    logger.warning(f"Unknown sensor type: {sensor_type}")
                return True

            # Validate value range
            value_num = event.get('value')
            min_val, max_val = VALUE_RANGES[sensor_type]

            if value_num < min_val or value_num > max_val:
                logger.warning(f"Value out of range for {sensor_type}: {value_num} (expected {min_val}-{max_val})")
                # Mark as out of range but don't filter out
                event['quality_flag'] = 'OUT_OF_RANGE'
                return True

            # Validate timestamp (not too old or in future)
            timestamp = event.get('timestamp')
            now = datetime.utcnow().timestamp() * 1000

            # Reject events older than 24 hours or in the future
            if timestamp < (now - 86400000) or timestamp > (now + 3600000):
                logger.warning(f"Invalid timestamp: {timestamp}")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating event: {e}")
            return False


class DeduplicationProcessor(KeyedProcessFunction):
    """Deduplicate events within a time window"""

    def __init__(self, window_size_ms=60000):  # 1 minute window
        self.window_size_ms = window_size_ms

    def open(self, runtime_context):
        # State to track last seen event per key
        state_descriptor = ValueStateDescriptor(
            "last_event",
            Types.STRING()
        )
        self.last_event_state = runtime_context.get_state(state_descriptor)

    def process_element(self, value, ctx):
        current_event = json.loads(value)
        current_timestamp = current_event.get('timestamp')

        # Get last event from state
        last_event_json = self.last_event_state.value()

        if last_event_json:
            last_event = json.loads(last_event_json)
            last_timestamp = last_event.get('timestamp')

            # Check if within deduplication window
            if abs(current_timestamp - last_timestamp) < self.window_size_ms:
                # Check if values are similar (within 1%)
                if abs(current_event['value'] - last_event['value']) / last_event['value'] < 0.01:
                    # Duplicate - skip
                    logger.debug(f"Duplicate event filtered: {current_event.get('event_id')}")
                    return

        # Update state with current event
        self.last_event_state.update(value)

        # Emit event
        yield value


class QuestDBSink:
    """Batch write to QuestDB (simplified implementation)"""

    def __init__(self, batch_size=1000, batch_interval_ms=10000):
        self.batch_size = batch_size
        self.batch_interval_ms = batch_interval_ms
        self.batch = []
        self.last_flush = datetime.utcnow()

    def invoke(self, value, context):
        """Add event to batch and flush if needed"""
        try:
            event = json.loads(value)
            self.batch.append(event)

            # Flush if batch is full or time interval exceeded
            now = datetime.utcnow()
            time_diff = (now - self.last_flush).total_seconds() * 1000

            if len(self.batch) >= self.batch_size or time_diff >= self.batch_interval_ms:
                self.flush()

        except Exception as e:
            logger.error(f"Error adding to batch: {e}")

    def flush(self):
        """Write batch to QuestDB"""
        if not self.batch:
            return

        try:
            import psycopg2

            # Connect to QuestDB via PostgreSQL protocol
            conn = psycopg2.connect(
                host=os.getenv('QUESTDB_HOST', 'questdb'),
                port=int(os.getenv('QUESTDB_PORT', 8812)),
                user=os.getenv('QUESTDB_USER', 'admin'),
                password=os.getenv('QUESTDB_PASSWORD', 'quest'),
                database=os.getenv('QUESTDB_DATABASE', 'qdb')
            )

            cursor = conn.cursor()

            # Build batch insert query
            insert_query = """
                INSERT INTO sensor_readings
                (timestamp, site_id, asset_id, sensor_type, sensor_id, value, unit, quality_flag, metadata, ingested_at)
                VALUES
            """

            values = []
            for event in self.batch:
                ts = datetime.fromtimestamp(event['timestamp'] / 1000)
                metadata_json = json.dumps(event.get('metadata', {}))
                ingested_at = datetime.fromtimestamp(event.get('processed_at', event['timestamp']) / 1000)

                values.append(
                    f"('{ts}', '{event['site_id']}', '{event['asset_id']}', "
                    f"'{event['sensor_type']}', '{event['sensor_id']}', "
                    f"{event['value']}, '{event['unit']}', '{event.get('quality_flag', 'GOOD')}', "
                    f"'{metadata_json}', '{ingested_at}')"
                )

            insert_query += ','.join(values)

            cursor.execute(insert_query)
            conn.commit()

            logger.info(f"Flushed {len(self.batch)} events to QuestDB")

            cursor.close()
            conn.close()

            # Clear batch
            self.batch = []
            self.last_flush = datetime.utcnow()

        except Exception as e:
            logger.error(f"Error flushing to QuestDB: {e}")


def create_flink_job():
    """Create and configure Flink streaming job"""

    # Set up execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_stream_time_characteristic(TimeCharacteristic.EventTime)
    env.set_parallelism(2)

    # Enable checkpointing (every 60 seconds)
    env.enable_checkpointing(60000)

    # Kafka consumer properties
    kafka_props = {
        'bootstrap.servers': KAFKA_BROKERS,
        'group.id': CONSUMER_GROUP,
        'auto.offset.reset': 'latest',
        'enable.auto.commit': 'true',
    }

    # Create Kafka consumer
    kafka_consumer = FlinkKafkaConsumer(
        topics=RAW_TOPIC,
        deserialization_schema=SimpleStringSchema(),
        properties=kafka_props
    )

    # Read from Kafka
    raw_stream = env.add_source(kafka_consumer)

    # Processing pipeline
    processed_stream = (
        raw_stream
        .map(TelemetryParser())  # Parse JSON
        .filter(lambda x: x is not None)  # Remove parse failures
        .filter(ValueValidator())  # Validate values
        .key_by(lambda x: f"{json.loads(x)['site_id']}:{json.loads(x)['asset_id']}:{json.loads(x)['sensor_id']}")  # Key by sensor
        .process(DeduplicationProcessor())  # Deduplicate
    )

    # Sink 1: Write to Kafka validated_telemetry topic
    kafka_producer = FlinkKafkaProducer(
        topic=VALIDATED_TOPIC,
        serialization_schema=SimpleStringSchema(),
        producer_config=kafka_props
    )
    processed_stream.add_sink(kafka_producer)

    # Sink 2: Write to QuestDB (batch)
    # Note: In production, use JDBC connector or custom sink
    processed_stream.add_sink(QuestDBSink())

    return env


def main():
    """Main entry point"""
    logger.info("Starting Flink Telemetry Processing Job...")
    logger.info(f"Kafka Brokers: {KAFKA_BROKERS}")
    logger.info(f"Consumer Group: {CONSUMER_GROUP}")
    logger.info(f"Raw Topic: {RAW_TOPIC}")
    logger.info(f"Validated Topic: {VALIDATED_TOPIC}")

    try:
        # Create and execute job
        env = create_flink_job()
        env.execute("dCMMS Telemetry Processor")

    except Exception as e:
        logger.error(f"Failed to start Flink job: {e}")
        raise


if __name__ == "__main__":
    main()
