#!/bin/bash

# Initialize QuestDB Tables for dCMMS Telemetry Pipeline
#
# Usage: ./init-questdb.sh

set -e

QUESTDB_URL="http://localhost:9000"

echo "=== Initializing QuestDB for dCMMS Telemetry Pipeline ==="
echo ""

# Wait for QuestDB to be ready
echo "Waiting for QuestDB to be ready..."
until curl -s -f "${QUESTDB_URL}/" > /dev/null 2>&1; do
    echo "QuestDB not ready yet, waiting..."
    sleep 5
done
echo "✓ QuestDB is ready"
echo ""

# Execute SQL initialization
echo "Creating tables and indexes..."

# Drop existing table
curl -G "${QUESTDB_URL}/exec" --data-urlencode "query=DROP TABLE IF EXISTS sensor_readings;" > /dev/null 2>&1
echo "✓ Dropped existing tables (if any)"

# Create sensor_readings table
SQL_CREATE="CREATE TABLE sensor_readings (
    timestamp TIMESTAMP,
    site_id SYMBOL,
    asset_id SYMBOL,
    sensor_type SYMBOL,
    sensor_id SYMBOL,
    value DOUBLE,
    unit SYMBOL,
    quality_flag SYMBOL,
    metadata STRING,
    ingested_at TIMESTAMP
) TIMESTAMP(timestamp) PARTITION BY DAY;"

curl -G "${QUESTDB_URL}/exec" --data-urlencode "query=${SQL_CREATE}"
echo "✓ Created sensor_readings table"

# Insert sample data
SQL_INSERT="INSERT INTO sensor_readings VALUES
    (systimestamp(), 'site-001', 'asset-001', 'temperature', 'temp-001', 72.5, 'celsius', 'good', '{}', systimestamp()),
    (systimestamp(), 'site-001', 'asset-001', 'voltage', 'volt-001', 230.2, 'volts', 'good', '{}', systimestamp()),
    (systimestamp(), 'site-001', 'asset-002', 'current', 'curr-001', 15.3, 'amperes', 'good', '{}', systimestamp());"

curl -G "${QUESTDB_URL}/exec" --data-urlencode "query=${SQL_INSERT}"
echo "✓ Inserted sample data"

# Verify table creation
echo ""
echo "Verifying table..."
curl -G "${QUESTDB_URL}/exec" --data-urlencode "query=SELECT * FROM sensor_readings LIMIT 5;" | jq '.'

echo ""
echo "✓ QuestDB initialized successfully!"
echo ""
echo "Access QuestDB Console at: ${QUESTDB_URL}"
