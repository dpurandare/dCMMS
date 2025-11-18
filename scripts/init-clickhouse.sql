-- ============================================
-- dCMMS ClickHouse Analytics Database Schema
-- ============================================
-- Version: 1.0
-- Purpose: OLAP analytics and reporting

-- Create database
CREATE DATABASE IF NOT EXISTS dcmms_analytics;
USE dcmms_analytics;

-- ============================================
-- Work Order Metrics Table
-- ============================================
CREATE TABLE IF NOT EXISTS wo_metrics (
    wo_id UUID,
    tenant_id UUID,
    site_id UUID,
    asset_id UUID,
    type String,
    priority String,
    status String,
    assigned_to UUID,
    created_at DateTime,
    scheduled_start DateTime,
    scheduled_end DateTime,
    actual_start DateTime,
    completed_at DateTime,
    duration_hours Float32,
    mttr_hours Float32,
    cost Decimal(10, 2),
    parts_count UInt32,
    tasks_count UInt32,
    tasks_completed UInt32,
    created_date Date MATERIALIZED toDate(created_at),
    created_month Date MATERIALIZED toStartOfMonth(created_at)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, site_id, created_at, wo_id)
SETTINGS index_granularity = 8192;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_wo_tenant ON wo_metrics(tenant_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_wo_site ON wo_metrics(site_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_wo_asset ON wo_metrics(asset_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_wo_status ON wo_metrics(status) TYPE set(10) GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_wo_type ON wo_metrics(type) TYPE set(10) GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_wo_priority ON wo_metrics(priority) TYPE set(5) GRANULARITY 4;

-- ============================================
-- Asset Metrics Table
-- ============================================
CREATE TABLE IF NOT EXISTS asset_metrics (
    asset_id UUID,
    tenant_id UUID,
    site_id UUID,
    asset_name String,
    asset_type String,
    status String,
    health_score UInt8,
    uptime_hours Float32,
    downtime_hours Float32,
    availability_percent Float32,
    mtbf_hours Float32,
    wo_count UInt32,
    corrective_wo_count UInt32,
    preventive_wo_count UInt32,
    alarm_count UInt32,
    critical_alarm_count UInt32,
    last_maintenance DateTime,
    next_maintenance DateTime,
    total_maintenance_cost Decimal(12, 2),
    recorded_at DateTime,
    recorded_date Date MATERIALIZED toDate(recorded_at),
    recorded_month Date MATERIALIZED toStartOfMonth(recorded_at)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (tenant_id, site_id, asset_id, recorded_at)
SETTINGS index_granularity = 8192;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_tenant ON asset_metrics(tenant_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_asset_site ON asset_metrics(site_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_asset_type ON asset_metrics(asset_type) TYPE set(50) GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_asset_status ON asset_metrics(status) TYPE set(10) GRANULARITY 4;

-- ============================================
-- Telemetry Aggregates Table
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_aggregates (
    asset_id UUID,
    tenant_id UUID,
    site_id UUID,
    metric_name String,
    time_bucket DateTime,
    avg_value Float64,
    min_value Float64,
    max_value Float64,
    sum_value Float64,
    count UInt32,
    stddev_value Float64,
    p50_value Float64,
    p95_value Float64,
    p99_value Float64,
    anomaly_count UInt32,
    bucket_date Date MATERIALIZED toDate(time_bucket),
    bucket_month Date MATERIALIZED toStartOfMonth(time_bucket)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(time_bucket)
ORDER BY (tenant_id, asset_id, metric_name, time_bucket)
SETTINGS index_granularity = 8192;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant ON telemetry_aggregates(tenant_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_telemetry_asset ON telemetry_aggregates(asset_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_telemetry_metric ON telemetry_aggregates(metric_name) TYPE bloom_filter() GRANULARITY 4;

-- ============================================
-- Alarm Metrics Table
-- ============================================
CREATE TABLE IF NOT EXISTS alarm_metrics (
    alarm_id UUID,
    tenant_id UUID,
    site_id UUID,
    asset_id UUID,
    severity String,
    status String,
    alarm_type String,
    message String,
    created_at DateTime,
    acknowledged_at DateTime,
    resolved_at DateTime,
    time_to_acknowledge_seconds UInt32,
    time_to_resolve_seconds UInt32,
    created_date Date MATERIALIZED toDate(created_at),
    created_month Date MATERIALIZED toStartOfMonth(created_at)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, site_id, asset_id, created_at, alarm_id)
SETTINGS index_granularity = 8192;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alarm_tenant ON alarm_metrics(tenant_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_alarm_site ON alarm_metrics(site_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_alarm_asset ON alarm_metrics(asset_id) TYPE minmax GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_alarm_severity ON alarm_metrics(severity) TYPE set(10) GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_alarm_status ON alarm_metrics(status) TYPE set(10) GRANULARITY 4;

-- ============================================
-- KPI Snapshots Table (Daily Calculated KPIs)
-- ============================================
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    tenant_id UUID,
    site_id UUID,
    snapshot_date Date,
    mttr_hours Float32,
    mtbf_hours Float32,
    wo_completion_rate Float32,
    asset_availability Float32,
    pm_compliance Float32,
    first_time_fix_rate Float32,
    total_wo_count UInt32,
    completed_wo_count UInt32,
    overdue_wo_count UInt32,
    critical_alarm_count UInt32,
    total_downtime_hours Float32,
    total_maintenance_cost Decimal(12, 2),
    created_at DateTime DEFAULT now()
)
ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (tenant_id, site_id, snapshot_date)
SETTINGS index_granularity = 8192;

-- ============================================
-- User Report Definitions Table
-- ============================================
CREATE TABLE IF NOT EXISTS report_definitions (
    report_id UUID,
    tenant_id UUID,
    created_by UUID,
    report_name String,
    description String,
    datasource String,
    columns Array(String),
    filters String,  -- JSON string
    group_by Array(String),
    aggregations String,  -- JSON string
    created_at DateTime,
    updated_at DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (tenant_id, report_id)
SETTINGS index_granularity = 8192;

-- ============================================
-- Materialized Views for Common Queries
-- ============================================

-- Daily Work Order Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_wo_summary
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(wo_date)
ORDER BY (tenant_id, site_id, wo_date, status, type)
AS SELECT
    tenant_id,
    site_id,
    toDate(created_at) AS wo_date,
    status,
    type,
    priority,
    count() AS wo_count,
    sum(duration_hours) AS total_duration_hours,
    avg(duration_hours) AS avg_duration_hours,
    sum(cost) AS total_cost
FROM wo_metrics
GROUP BY tenant_id, site_id, wo_date, status, type, priority;

-- Monthly Asset Health Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_asset_health
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(month)
ORDER BY (tenant_id, site_id, asset_type, month)
AS SELECT
    tenant_id,
    site_id,
    asset_type,
    toStartOfMonth(recorded_at) AS month,
    count(DISTINCT asset_id) AS asset_count,
    avg(health_score) AS avg_health_score,
    avg(availability_percent) AS avg_availability,
    avg(mtbf_hours) AS avg_mtbf,
    sum(wo_count) AS total_wo_count,
    sum(corrective_wo_count) AS total_corrective_wo,
    sum(preventive_wo_count) AS total_preventive_wo,
    sum(alarm_count) AS total_alarms
FROM asset_metrics
GROUP BY tenant_id, site_id, asset_type, month;

-- Hourly Telemetry Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_telemetry
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (tenant_id, asset_id, metric_name, hour)
AS SELECT
    tenant_id,
    asset_id,
    metric_name,
    toStartOfHour(time_bucket) AS hour,
    avg(avg_value) AS avg_value,
    min(min_value) AS min_value,
    max(max_value) AS max_value,
    sum(count) AS total_count,
    sum(anomaly_count) AS total_anomalies
FROM telemetry_aggregates
GROUP BY tenant_id, asset_id, metric_name, hour;

-- ============================================
-- Helper Functions (UDFs would be defined in application)
-- ============================================

-- Comment: KPI calculations will be done in application layer
-- This schema provides optimized storage for fast analytics queries

-- ============================================
-- Grants (if user doesn't have full access)
-- ============================================
-- GRANT SELECT, INSERT ON dcmms_analytics.* TO clickhouse_user;

-- ============================================
-- Sample Queries for Testing
-- ============================================

-- Check table sizes
-- SELECT
--     table,
--     formatReadableSize(sum(bytes)) AS size,
--     sum(rows) AS rows,
--     max(modification_time) AS latest_modification
-- FROM system.parts
-- WHERE database = 'dcmms_analytics' AND active
-- GROUP BY table
-- ORDER BY sum(bytes) DESC;

-- Check partitions
-- SELECT
--     table,
--     partition,
--     sum(rows) AS rows,
--     formatReadableSize(sum(bytes)) AS size
-- FROM system.parts
-- WHERE database = 'dcmms_analytics' AND active
-- GROUP BY table, partition
-- ORDER BY table, partition;
