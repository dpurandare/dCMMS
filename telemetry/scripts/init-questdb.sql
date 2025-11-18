-- Initialize QuestDB Tables for dCMMS Telemetry Pipeline
-- Execute via: curl -G http://localhost:9000/exec --data-urlencode "query=$(cat init-questdb.sql)"

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS sensor_readings;

-- Create sensor_readings table
CREATE TABLE sensor_readings (
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
) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Create indexes for faster queries
CREATE INDEX idx_site ON sensor_readings (site_id);
CREATE INDEX idx_asset ON sensor_readings (asset_id);
CREATE INDEX idx_sensor_type ON sensor_readings (sensor_type);

-- Sample data for testing
INSERT INTO sensor_readings VALUES
    (systimestamp(), 'site-001', 'asset-001', 'temperature', 'temp-001', 72.5, 'celsius', 'good', '{}', systimestamp()),
    (systimestamp(), 'site-001', 'asset-001', 'voltage', 'volt-001', 230.2, 'volts', 'good', '{}', systimestamp()),
    (systimestamp(), 'site-001', 'asset-002', 'current', 'curr-001', 15.3, 'amperes', 'good', '{}', systimestamp());

-- Verify table creation
SELECT * FROM sensor_readings LIMIT 10;
