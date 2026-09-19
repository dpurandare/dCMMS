-- Prerequisites for the baseline schema (REV-011).
--
-- These used to live in scripts/init-db.sql, which only runs via the Postgres
-- container's docker-entrypoint-initdb.d hook. That made `npm run db:migrate`
-- unusable against any database the compose file did not create, and it is why
-- the baseline below references enum types it never defined.
--
-- The enum block is generated from backend/src/db/schema.ts (pgEnum
-- declarations); regenerate it if the enums there change.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "vector";

DO $$ BEGIN
  CREATE TYPE "alert_severity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "alert_status" AS ENUM ('active', 'acknowledged', 'resolved', 'suppressed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "asset_status" AS ENUM ('operational', 'degraded', 'down', 'maintenance', 'decommissioned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "asset_type" AS ENUM ('inverter', 'transformer', 'panel', 'disconnector', 'meter', 'turbine', 'access_point', 'gateway', 'weather_station', 'sensor', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "energy_type" AS ENUM ('solar', 'wind', 'hydro', 'biomass', 'geothermal', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'push', 'webhook', 'slack');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_event_type" AS ENUM ('work_order_assigned', 'work_order_overdue', 'work_order_completed', 'alert_critical', 'alert_high', 'alert_medium', 'alert_acknowledged', 'alert_resolved', 'asset_down', 'maintenance_due');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('super_admin', 'tenant_admin', 'site_manager', 'technician', 'operator', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "webhook_auth_type" AS ENUM ('none', 'bearer', 'basic', 'api_key');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "webhook_delivery_status" AS ENUM ('success', 'failed', 'timeout', 'invalid_response');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "work_order_priority" AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "work_order_status" AS ENUM ('draft', 'open', 'scheduled', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "work_order_type" AS ENUM ('corrective', 'preventive', 'predictive', 'inspection', 'emergency');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
