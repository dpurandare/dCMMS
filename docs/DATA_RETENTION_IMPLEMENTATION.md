# Data Retention Policy Implementation Guide

This guide provides technical instructions for implementing the dCMMS Data Retention Policy.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [PostgreSQL pg_cron Setup](#postgresql-pgcron-setup)
3. [Automated Purge Jobs](#automated-purge-jobs)
4. [ClickHouse TTL Configuration](#clickhouse-ttl-configuration)
5. [Monitoring and Alerts](#monitoring-and-alerts)
6. [Manual Deletion Procedures](#manual-deletion-procedures)
7. [Testing](#testing)

---

## Prerequisites

### Required Extensions
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Configuration
Add to `postgresql.conf`:
```conf
shared_preload_libraries = 'pg_cron'
cron.database_name = 'dcmms'
```

---

## PostgreSQL pg_cron Setup

### 1. Install pg_cron Extension
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-<version>-cron

# Enable in database
psql -U postgres -d dcmms -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"
```

### 2. Verify Installation
```sql
SELECT * FROM cron.job;
```

---

## Automated Purge Jobs

### Job 1: Raw Telemetry Purge (Daily)
Deletes raw telemetry data older than 90 days.

```sql
SELECT cron.schedule(
  'purge-raw-telemetry',
  '0 2 * * *',  -- Daily at 2:00 AM UTC
  $$
  DO $$
  DECLARE
    rows_deleted INTEGER;
  BEGIN
    DELETE FROM telemetry_readings
    WHERE created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RAISE NOTICE 'Purged % raw telemetry rows', rows_deleted;

    -- Log to audit (if needed)
    INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
    VALUES (
      '00000000-0000-0000-0000-000000000000',  -- System tenant
      '00000000-0000-0000-0000-000000000000',  -- System user
      'data_purge',
      'telemetry_readings',
      'scheduled',
      jsonb_build_object('rows_deleted', rows_deleted, 'retention_days', 90)
    );
  END $$;
  $$
);
```

### Job 2: Resolved Alerts Purge (Weekly)
Deletes resolved alerts older than 2 years.

```sql
SELECT cron.schedule(
  'purge-resolved-alerts',
  '0 3 * * 0',  -- Weekly on Sundays at 3:00 AM UTC
  $$
  DO $$
  DECLARE
    rows_deleted INTEGER;
  BEGIN
    DELETE FROM alerts
    WHERE status = 'resolved'
      AND resolved_at < NOW() - INTERVAL '2 years';

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RAISE NOTICE 'Purged % resolved alerts', rows_deleted;
  END $$;
  $$
);
```

### Job 3: Notification History Purge (Monthly)
Deletes notification history older than 1 year.

```sql
SELECT cron.schedule(
  'purge-notification-history',
  '0 4 1 * *',  -- Monthly on 1st at 4:00 AM UTC
  $$
  DO $$
  DECLARE
    rows_deleted INTEGER;
  BEGIN
    DELETE FROM notification_history
    WHERE created_at < NOW() - INTERVAL '1 year';

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RAISE NOTICE 'Purged % notification history rows', rows_deleted;
  END $$;
  $$
);
```

### Job 4: Anonymize Deleted Users (Daily)
Anonymizes users deleted more than 30 days ago.

```sql
SELECT cron.schedule(
  'anonymize-deleted-users',
  '0 5 * * *',  -- Daily at 5:00 AM UTC
  $$
  DO $$
  DECLARE
    rows_updated INTEGER;
  BEGIN
    UPDATE users
    SET
      first_name = 'Deleted',
      last_name = 'User',
      email = CONCAT('deleted-', id, '@anonymized.local'),
      phone_number = NULL,
      metadata = '{}',
      is_anonymized = true
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '30 days'
      AND is_anonymized = false;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    RAISE NOTICE 'Anonymized % deleted users', rows_updated;
  END $$;
  $$
);
```

### Job 5: Decommissioned Assets Archival (Quarterly)
Archives and deletes assets decommissioned more than 10 years ago.

```sql
SELECT cron.schedule(
  'purge-decommissioned-assets',
  '0 6 1 1,4,7,10 *',  -- Quarterly on 1st at 6:00 AM UTC
  $$
  DO $$
  DECLARE
    rows_deleted INTEGER;
  BEGIN
    -- First, export to S3 or archival system (external script)
    -- PERFORM pg_notify('archive_assets', 'decommissioned_10years');

    -- Then delete from database (with caution)
    -- Uncomment after implementing archival system
    -- DELETE FROM assets
    -- WHERE status = 'decommissioned'
    --   AND decommissioned_at < NOW() - INTERVAL '10 years';

    -- GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RAISE NOTICE 'Decommissioned asset purge job executed (dry run)';
  END $$;
  $$
);
```

---

## ClickHouse TTL Configuration

### Telemetry Aggregates (10-year TTL)
```sql
-- Apply TTL to telemetry_aggregates table
ALTER TABLE telemetry_aggregates
MODIFY TTL time_bucket + INTERVAL 10 YEAR;

-- Verify TTL
SHOW CREATE TABLE telemetry_aggregates;
```

### KPI Snapshots (7-year TTL)
```sql
ALTER TABLE kpi_snapshots
MODIFY TTL snapshot_date + INTERVAL 7 YEAR;
```

---

## Monitoring and Alerts

### Monitor Purge Job Execution
```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- Check for failed jobs
SELECT *
FROM cron.job_run_details
WHERE status = 'failed'
  AND start_time > NOW() - INTERVAL '7 days';
```

### Create Alerting Function
```sql
CREATE OR REPLACE FUNCTION notify_purge_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' THEN
    -- Send notification (integrate with notification service)
    PERFORM pg_notify('purge_job_failed', json_build_object(
      'job_name', NEW.jobname,
      'error', NEW.return_message
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purge_failure_alert
AFTER INSERT ON cron.job_run_details
FOR EACH ROW
EXECUTE FUNCTION notify_purge_failure();
```

---

## Manual Deletion Procedures

### Delete Specific Work Orders (with approval)
```sql
-- Step 1: Verify work order exists
SELECT id, title, status, created_at
FROM work_orders
WHERE id = '<work-order-id>';

-- Step 2: Archive to audit log
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
VALUES (
  '<tenant-id>',
  '<admin-user-id>',
  'work_order_deleted',
  'work_order',
  '<work-order-id>',
  (SELECT row_to_json(wo) FROM work_orders wo WHERE id = '<work-order-id>')
);

-- Step 3: Soft delete (preferred)
UPDATE work_orders
SET deleted_at = NOW()
WHERE id = '<work-order-id>';

-- Step 4: Hard delete (if required)
-- DELETE FROM work_orders WHERE id = '<work-order-id>';
```

### Delete Compliance Report
```sql
-- Step 1: Verify report
SELECT report_id, template_id, status, generated_at
FROM compliance_generated_reports
WHERE report_id = '<report-id>';

-- Step 2: Audit log
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
VALUES (
  '<tenant-id>',
  '<admin-user-id>',
  'report_deleted',
  'compliance_report',
  '<report-id>',
  jsonb_build_object('status', 'deleted', 'deleted_by', '<admin-user-id>')
);

-- Step 3: Delete file from storage
-- (external script to delete from S3/filesystem)

-- Step 4: Delete database record
DELETE FROM compliance_generated_reports
WHERE report_id = '<report-id>';
```

---

## Testing

### Test Purge Jobs (Dry Run)
```sql
-- Test telemetry purge (without actually deleting)
DO $$
DECLARE
  count_to_delete INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_to_delete
  FROM telemetry_readings
  WHERE created_at < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Would delete % telemetry rows', count_to_delete;
END $$;
```

### Verify Retention Compliance
```sql
-- Check oldest records per table
SELECT 'work_orders' AS table_name, MIN(created_at) AS oldest_record FROM work_orders
UNION ALL
SELECT 'assets', MIN(created_at) FROM assets
UNION ALL
SELECT 'telemetry_readings', MIN(created_at) FROM telemetry_readings
UNION ALL
SELECT 'audit_logs', MIN(created_at) FROM audit_logs;
```

### Simulate User Anonymization
```sql
-- Test anonymization on a single user
DO $$
DECLARE
  test_user_id UUID := '<test-user-id>';
BEGIN
  UPDATE users
  SET
    first_name = 'Deleted',
    last_name = 'User',
    email = CONCAT('deleted-', id, '@anonymized.local'),
    phone_number = NULL,
    metadata = '{}'
  WHERE id = test_user_id;

  RAISE NOTICE 'User % anonymized', test_user_id;
END $$;
```

---

## Environment Variables

Add to `.env`:
```env
# Data Retention Configuration
DATA_RETENTION_TELEMETRY_RAW_DAYS=90
DATA_RETENTION_ALERTS_RESOLVED_YEARS=2
DATA_RETENTION_NOTIFICATION_HISTORY_YEARS=1
DATA_RETENTION_USER_DELETED_DAYS=30
DATA_RETENTION_ASSETS_DECOMMISSIONED_YEARS=10
DATA_RETENTION_WORK_ORDERS_YEARS=7
DATA_RETENTION_AUDIT_LOGS_YEARS=7
DATA_RETENTION_COMPLIANCE_REPORTS_YEARS=7

# Purge Job Configuration
PURGE_JOBS_ENABLED=true
PURGE_JOBS_DRY_RUN=false  # Set to true for testing
```

---

## Rollback Procedures

### Disable All Purge Jobs
```sql
-- Unschedule all purge jobs
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname LIKE 'purge-%';
```

### Re-enable Purge Jobs
```sql
-- Re-run the job creation scripts from above
```

---

## Best Practices

1. **Always test purge jobs in staging first**
2. **Monitor disk space trends after enabling purges**
3. **Review audit logs monthly for purge activity**
4. **Keep archival backups for at least 30 days**
5. **Document any manual deletions with approval workflow**
6. **Run VACUUM ANALYZE after large purges**

---

## Support

For questions or issues with data retention:
- Technical Support: support@dcmms.com
- Compliance Team: compliance@dcmms.com
- Emergency: Escalate via incident management system

---

**Last Updated:** 2025-11-18
**Version:** 1.0
