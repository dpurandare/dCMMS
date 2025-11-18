-- ==========================================
-- dCMMS TimescaleDB Initialization Script
-- ==========================================
-- This script initializes TimescaleDB for time-series aggregated data

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ==========================================
-- HYPERTABLES FOR TIME-SERIES DATA
-- ==========================================

-- Asset Telemetry Aggregates (1-minute intervals)
CREATE TABLE telemetry_1min (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    site_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    sum_value DOUBLE PRECISION,
    count_value BIGINT,
    stddev_value DOUBLE PRECISION,
    unit VARCHAR(50)
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('telemetry_1min', 'time', chunk_time_interval => INTERVAL '1 day');

-- Create indexes
CREATE INDEX idx_telemetry_1min_asset ON telemetry_1min (asset_id, time DESC);
CREATE INDEX idx_telemetry_1min_site ON telemetry_1min (site_id, time DESC);
CREATE INDEX idx_telemetry_1min_metric ON telemetry_1min (metric_name, time DESC);

-- Asset Telemetry Aggregates (5-minute intervals)
CREATE TABLE telemetry_5min (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    site_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    sum_value DOUBLE PRECISION,
    count_value BIGINT,
    stddev_value DOUBLE PRECISION,
    unit VARCHAR(50)
);

SELECT create_hypertable('telemetry_5min', 'time', chunk_time_interval => INTERVAL '7 days');

CREATE INDEX idx_telemetry_5min_asset ON telemetry_5min (asset_id, time DESC);
CREATE INDEX idx_telemetry_5min_site ON telemetry_5min (site_id, time DESC);
CREATE INDEX idx_telemetry_5min_metric ON telemetry_5min (metric_name, time DESC);

-- Asset Telemetry Aggregates (1-hour intervals)
CREATE TABLE telemetry_1hour (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    site_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    sum_value DOUBLE PRECISION,
    count_value BIGINT,
    stddev_value DOUBLE PRECISION,
    unit VARCHAR(50)
);

SELECT create_hypertable('telemetry_1hour', 'time', chunk_time_interval => INTERVAL '30 days');

CREATE INDEX idx_telemetry_1hour_asset ON telemetry_1hour (asset_id, time DESC);
CREATE INDEX idx_telemetry_1hour_site ON telemetry_1hour (site_id, time DESC);
CREATE INDEX idx_telemetry_1hour_metric ON telemetry_1hour (metric_name, time DESC);

-- Asset Telemetry Aggregates (1-day intervals)
CREATE TABLE telemetry_1day (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    site_id UUID NOT NULL,
    asset_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    avg_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    sum_value DOUBLE PRECISION,
    count_value BIGINT,
    stddev_value DOUBLE PRECISION,
    unit VARCHAR(50)
);

SELECT create_hypertable('telemetry_1day', 'time', chunk_time_interval => INTERVAL '180 days');

CREATE INDEX idx_telemetry_1day_asset ON telemetry_1day (asset_id, time DESC);
CREATE INDEX idx_telemetry_1day_site ON telemetry_1day (site_id, time DESC);
CREATE INDEX idx_telemetry_1day_metric ON telemetry_1day (metric_name, time DESC);

-- ==========================================
-- CONTINUOUS AGGREGATES
-- ==========================================
-- TimescaleDB will automatically maintain these materialized views

-- Create continuous aggregate policy to automatically downsample from 1min to 5min
-- Note: This requires raw data in QuestDB to be streamed/synced to TimescaleDB first

-- ==========================================
-- RETENTION POLICIES
-- ==========================================

-- Automatically drop old data
SELECT add_retention_policy('telemetry_1min', INTERVAL '30 days');   -- Keep 30 days of 1-min data
SELECT add_retention_policy('telemetry_5min', INTERVAL '90 days');   -- Keep 90 days of 5-min data
SELECT add_retention_policy('telemetry_1hour', INTERVAL '1 year');   -- Keep 1 year of hourly data
SELECT add_retention_policy('telemetry_1day', INTERVAL '5 years');   -- Keep 5 years of daily data

-- ==========================================
-- COMPRESSION POLICIES
-- ==========================================

-- Enable compression for better storage efficiency
ALTER TABLE telemetry_1min SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'asset_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

ALTER TABLE telemetry_5min SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'asset_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

ALTER TABLE telemetry_1hour SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'asset_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

ALTER TABLE telemetry_1day SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'asset_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

-- Compress chunks older than 7 days
SELECT add_compression_policy('telemetry_1min', INTERVAL '7 days');
SELECT add_compression_policy('telemetry_5min', INTERVAL '14 days');
SELECT add_compression_policy('telemetry_1hour', INTERVAL '30 days');
SELECT add_compression_policy('telemetry_1day', INTERVAL '60 days');

COMMENT ON DATABASE timescaledb IS 'dCMMS TimescaleDB - Time-series aggregated telemetry data';
