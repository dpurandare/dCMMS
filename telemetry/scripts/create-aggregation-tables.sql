-- ==========================================
-- QuestDB Aggregation Tables (DCMMS-059)
-- ==========================================
--
-- Pre-computed aggregations for fast time-series queries
--
-- Aggregation levels:
-- - 1 minute:  Last 7 days (real-time dashboard)
-- - 5 minutes: Last 30 days (hourly trends)
-- - 15 minutes: Last 90 days (daily trends)
-- - 1 hour:    Last 5 years (long-term analysis)
--
-- Retention:
-- - raw: 90 days
-- - 1min: 1 year
-- - 5min: 2 years
-- - 15min: 3 years
-- - 1hour: 5 years
--
-- Performance target: <200ms for 1-day aggregated query
-- ==========================================

-- ==========================================
-- 1-Minute Aggregations
-- ==========================================
CREATE TABLE IF NOT EXISTS sensor_readings_1min (
    -- Time bucket
    timestamp TIMESTAMP,

    -- Dimensions (indexed for filtering)
    site_id SYMBOL INDEX,
    asset_id SYMBOL INDEX,
    sensor_type SYMBOL INDEX,
    sensor_id SYMBOL INDEX,
    unit SYMBOL INDEX,

    -- Aggregated metrics
    value_avg DOUBLE,
    value_min DOUBLE,
    value_max DOUBLE,
    value_sum DOUBLE,
    value_count LONG,
    value_stddev DOUBLE,

    -- Quality metrics
    good_count LONG,
    bad_count LONG,
    out_of_range_count LONG,

    -- Metadata
    first_timestamp TIMESTAMP,
    last_timestamp TIMESTAMP,
    computed_at TIMESTAMP

) TIMESTAMP(timestamp) PARTITION BY DAY;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_1min_site ON sensor_readings_1min (site_id);
CREATE INDEX IF NOT EXISTS idx_1min_asset ON sensor_readings_1min (asset_id);
CREATE INDEX IF NOT EXISTS idx_1min_sensor_type ON sensor_readings_1min (sensor_type);
CREATE INDEX IF NOT EXISTS idx_1min_sensor_id ON sensor_readings_1min (sensor_id);

-- ==========================================
-- 5-Minute Aggregations
-- ==========================================
CREATE TABLE IF NOT EXISTS sensor_readings_5min (
    timestamp TIMESTAMP,
    site_id SYMBOL INDEX,
    asset_id SYMBOL INDEX,
    sensor_type SYMBOL INDEX,
    sensor_id SYMBOL INDEX,
    unit SYMBOL INDEX,

    value_avg DOUBLE,
    value_min DOUBLE,
    value_max DOUBLE,
    value_sum DOUBLE,
    value_count LONG,
    value_stddev DOUBLE,

    good_count LONG,
    bad_count LONG,
    out_of_range_count LONG,

    first_timestamp TIMESTAMP,
    last_timestamp TIMESTAMP,
    computed_at TIMESTAMP

) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE INDEX IF NOT EXISTS idx_5min_site ON sensor_readings_5min (site_id);
CREATE INDEX IF NOT EXISTS idx_5min_asset ON sensor_readings_5min (asset_id);
CREATE INDEX IF NOT EXISTS idx_5min_sensor_type ON sensor_readings_5min (sensor_type);
CREATE INDEX IF NOT EXISTS idx_5min_sensor_id ON sensor_readings_5min (sensor_id);

-- ==========================================
-- 15-Minute Aggregations
-- ==========================================
CREATE TABLE IF NOT EXISTS sensor_readings_15min (
    timestamp TIMESTAMP,
    site_id SYMBOL INDEX,
    asset_id SYMBOL INDEX,
    sensor_type SYMBOL INDEX,
    sensor_id SYMBOL INDEX,
    unit SYMBOL INDEX,

    value_avg DOUBLE,
    value_min DOUBLE,
    value_max DOUBLE,
    value_sum DOUBLE,
    value_count LONG,
    value_stddev DOUBLE,

    good_count LONG,
    bad_count LONG,
    out_of_range_count LONG,

    first_timestamp TIMESTAMP,
    last_timestamp TIMESTAMP,
    computed_at TIMESTAMP

) TIMESTAMP(timestamp) PARTITION BY DAY;

CREATE INDEX IF NOT EXISTS idx_15min_site ON sensor_readings_15min (site_id);
CREATE INDEX IF NOT EXISTS idx_15min_asset ON sensor_readings_15min (asset_id);
CREATE INDEX IF NOT EXISTS idx_15min_sensor_type ON sensor_readings_15min (sensor_type);
CREATE INDEX IF NOT EXISTS idx_15min_sensor_id ON sensor_readings_15min (sensor_id);

-- ==========================================
-- 1-Hour Aggregations
-- ==========================================
CREATE TABLE IF NOT EXISTS sensor_readings_1hour (
    timestamp TIMESTAMP,
    site_id SYMBOL INDEX,
    asset_id SYMBOL INDEX,
    sensor_type SYMBOL INDEX,
    sensor_id SYMBOL INDEX,
    unit SYMBOL INDEX,

    value_avg DOUBLE,
    value_min DOUBLE,
    value_max DOUBLE,
    value_sum DOUBLE,
    value_count LONG,
    value_stddev DOUBLE,

    good_count LONG,
    bad_count LONG,
    out_of_range_count LONG,

    first_timestamp TIMESTAMP,
    last_timestamp TIMESTAMP,
    computed_at TIMESTAMP

) TIMESTAMP(timestamp) PARTITION BY MONTH;  -- Monthly partitions for long retention

CREATE INDEX IF NOT EXISTS idx_1hour_site ON sensor_readings_1hour (site_id);
CREATE INDEX IF NOT EXISTS idx_1hour_asset ON sensor_readings_1hour (asset_id);
CREATE INDEX IF NOT EXISTS idx_1hour_sensor_type ON sensor_readings_1hour (sensor_type);
CREATE INDEX IF NOT EXISTS idx_1hour_sensor_id ON sensor_readings_1hour (sensor_id);

-- ==========================================
-- Aggregation Progress Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS aggregation_status (
    aggregation_level SYMBOL INDEX,  -- '1min', '5min', '15min', '1hour'
    last_processed_timestamp TIMESTAMP,
    rows_processed LONG,
    processing_duration_ms LONG,
    error_message VARCHAR,
    updated_at TIMESTAMP
) TIMESTAMP(updated_at);

-- ==========================================
-- Data Retention Views (for monitoring)
-- ==========================================

-- View: Aggregation table sizes
-- SELECT * FROM aggregation_table_sizes;
-- (Run via PostgreSQL protocol)

-- ==========================================
-- Sample Aggregation Query (for reference)
-- ==========================================

/*
-- 1-minute aggregation (manual example)
INSERT INTO sensor_readings_1min
SELECT
    to_timestamp(floor(timestamp / 60000) * 60000) as timestamp,
    site_id,
    asset_id,
    sensor_type,
    sensor_id,
    first(unit) as unit,
    avg(value) as value_avg,
    min(value) as value_min,
    max(value) as value_max,
    sum(value) as value_sum,
    count(*) as value_count,
    stddev(value) as value_stddev,
    sum(case when quality_flag = 'GOOD' then 1 else 0 end) as good_count,
    sum(case when quality_flag = 'BAD' then 1 else 0 end) as bad_count,
    sum(case when quality_flag = 'OUT_OF_RANGE' then 1 else 0 end) as out_of_range_count,
    min(timestamp) as first_timestamp,
    max(timestamp) as last_timestamp,
    now() as computed_at
FROM sensor_readings
WHERE timestamp >= dateadd('m', -5, now())
    AND timestamp < dateadd('m', -4, now())
GROUP BY
    to_timestamp(floor(timestamp / 60000) * 60000),
    site_id,
    asset_id,
    sensor_type,
    sensor_id;
*/

-- ==========================================
-- Useful Queries
-- ==========================================

/*
-- Check aggregation table sizes
SELECT
    'raw' as level,
    count(*) as row_count,
    min(timestamp) as oldest,
    max(timestamp) as newest
FROM sensor_readings
UNION ALL
SELECT
    '1min' as level,
    count(*) as row_count,
    min(timestamp) as oldest,
    max(timestamp) as newest
FROM sensor_readings_1min
UNION ALL
SELECT
    '5min' as level,
    count(*) as row_count,
    min(timestamp) as oldest,
    max(timestamp) as newest
FROM sensor_readings_5min
UNION ALL
SELECT
    '15min' as level,
    count(*) as row_count,
    min(timestamp) as oldest,
    max(timestamp) as newest
FROM sensor_readings_15min
UNION ALL
SELECT
    '1hour' as level,
    count(*) as row_count,
    min(timestamp) as oldest,
    max(timestamp) as newest
FROM sensor_readings_1hour;

-- Check aggregation status
SELECT * FROM aggregation_status
ORDER BY updated_at DESC;

-- Query 1-day data (uses 1min aggregation)
SELECT
    timestamp,
    sensor_id,
    value_avg,
    value_min,
    value_max
FROM sensor_readings_1min
WHERE asset_id = 'asset-001'
    AND sensor_type = 'TEMPERATURE'
    AND timestamp >= dateadd('d', -1, now())
ORDER BY timestamp DESC;
*/
