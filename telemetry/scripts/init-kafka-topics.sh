#!/bin/bash

# Initialize Kafka Topics for dCMMS Telemetry Pipeline
#
# Usage: ./init-kafka-topics.sh

set -e

KAFKA_CONTAINER="dcmms-kafka"
KAFKA_BROKER="kafka:9092"

echo "=== Initializing Kafka Topics for dCMMS Telemetry Pipeline ==="
echo ""

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
docker exec $KAFKA_CONTAINER kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER > /dev/null 2>&1
while [ $? -ne 0 ]; do
    echo "Kafka not ready yet, waiting..."
    sleep 5
    docker exec $KAFKA_CONTAINER kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER > /dev/null 2>&1
done
echo "✓ Kafka is ready"
echo ""

# Create raw_telemetry topic
echo "Creating topic: raw_telemetry"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BROKER \
    --create \
    --if-not-exists \
    --topic raw_telemetry \
    --partitions 8 \
    --replication-factor 1 \
    --config retention.ms=604800000 \
    --config compression.type=lz4

# Create validated_telemetry topic
echo "Creating topic: validated_telemetry"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BROKER \
    --create \
    --if-not-exists \
    --topic validated_telemetry \
    --partitions 8 \
    --replication-factor 1 \
    --config retention.ms=604800000 \
    --config compression.type=lz4

# Create alarms topic
echo "Creating topic: alarms"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BROKER \
    --create \
    --if-not-exists \
    --topic alarms \
    --partitions 4 \
    --replication-factor 1 \
    --config retention.ms=2592000000 \
    --config compression.type=lz4

echo ""
echo "=== Topic Creation Complete ==="
echo ""

# List all topics
echo "Current topics:"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BROKER --list

echo ""
echo "Topic details:"
docker exec $KAFKA_CONTAINER kafka-topics --bootstrap-server $KAFKA_BROKER --describe

echo ""
echo "✓ Kafka topics initialized successfully!"
