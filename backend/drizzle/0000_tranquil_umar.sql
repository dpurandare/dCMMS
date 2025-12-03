DO $$ BEGIN
 CREATE TYPE "alert_severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "alert_status" AS ENUM('active', 'acknowledged', 'resolved', 'suppressed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_status" AS ENUM('operational', 'degraded', 'down', 'maintenance', 'decommissioned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "energy_type" AS ENUM('solar', 'wind', 'hydro', 'biomass', 'geothermal', 'hybrid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_channel" AS ENUM('email', 'sms', 'push', 'webhook', 'slack');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_event_type" AS ENUM('work_order_assigned', 'work_order_overdue', 'work_order_completed', 'alert_critical', 'alert_high', 'alert_medium', 'alert_acknowledged', 'alert_resolved', 'asset_down', 'maintenance_due');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('super_admin', 'tenant_admin', 'site_manager', 'technician', 'operator', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "webhook_auth_type" AS ENUM('none', 'bearer', 'basic', 'api_key');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "webhook_delivery_status" AS ENUM('success', 'failed', 'timeout', 'invalid_response');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_order_priority" AS ENUM('critical', 'high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_order_status" AS ENUM('draft', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_order_type" AS ENUM('corrective', 'preventive', 'predictive', 'inspection', 'emergency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"asset_id" uuid,
	"alert_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" "alert_severity" NOT NULL,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"rule_id" varchar(100),
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by" uuid,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"category" varchar(20) NOT NULL,
	"recent_alarms" integer DEFAULT 0 NOT NULL,
	"recent_work_orders" integer DEFAULT 0 NOT NULL,
	"anomaly_count" integer DEFAULT 0 NOT NULL,
	"asset_age_months" integer DEFAULT 0 NOT NULL,
	"days_since_last_maintenance" integer DEFAULT 0 NOT NULL,
	"component_scores" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"parent_asset_id" uuid,
	"asset_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"manufacturer" varchar(255),
	"model" varchar(255),
	"serial_number" varchar(255),
	"installation_date" timestamp,
	"warranty_expiry_date" timestamp,
	"status" "asset_status" DEFAULT 'operational' NOT NULL,
	"specifications" text DEFAULT '{}',
	"location" text,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"changes" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_generated_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"site_id" uuid,
	"report_name" varchar(255) NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"reporting_period_start" timestamp NOT NULL,
	"reporting_period_end" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"report_data" text NOT NULL,
	"file_url" text,
	"file_size_bytes" integer,
	"file_format" varchar(20) DEFAULT 'pdf' NOT NULL,
	"watermark" varchar(50) DEFAULT 'DRAFT',
	"generated_by" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_by" uuid,
	"finalized_at" timestamp,
	"submitted_at" timestamp,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_report_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"template_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"report_type" varchar(50) NOT NULL,
	"compliance_standard" varchar(100) NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"required_fields" text DEFAULT '[]' NOT NULL,
	"optional_fields" text DEFAULT '[]' NOT NULL,
	"auto_populate_mappings" text,
	"validation_rules" text,
	"format" varchar(20) DEFAULT 'pdf' NOT NULL,
	"frequency" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system_template" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "compliance_report_templates_template_id_unique" UNIQUE("template_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"device_type" varchar(50) NOT NULL,
	"device_id" varchar(255),
	"app_version" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forecast_accuracy_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"site_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"forecast_horizon_hours" integer NOT NULL,
	"mean_absolute_error_mw" numeric(10, 3),
	"mean_absolute_percentage_error" numeric(5, 2),
	"root_mean_squared_error_mw" numeric(10, 3),
	"r_squared" numeric(5, 4),
	"forecast_skill_score" numeric(5, 4),
	"num_forecasts" integer NOT NULL,
	"num_validated" integer NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generation_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"asset_id" uuid,
	"forecast_timestamp" timestamp NOT NULL,
	"forecast_horizon_hours" integer NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"algorithm" varchar(50) NOT NULL,
	"predicted_generation_mw" numeric(10, 3) NOT NULL,
	"confidence_interval_lower_mw" numeric(10, 3),
	"confidence_interval_upper_mw" numeric(10, 3),
	"prediction_std_dev" numeric(10, 3),
	"actual_generation_mw" numeric(10, 3),
	"error_mw" numeric(10, 3),
	"absolute_error_mw" numeric(10, 3),
	"percentage_error" numeric(5, 2),
	"weather_forecast_id" uuid,
	"feature_values" text,
	"model_accuracy_score" numeric(5, 4),
	"training_data_end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"accuracy_validated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"template_id" uuid,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"enable_batching" boolean DEFAULT true NOT NULL,
	"batch_interval_minutes" integer DEFAULT 15 NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"subject" varchar(500),
	"body" text NOT NULL,
	"template_id" uuid,
	"data" text DEFAULT '{}',
	"batch_key" varchar(255) NOT NULL,
	"is_batched" boolean DEFAULT false NOT NULL,
	"batched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channels" text NOT NULL,
	"conditions" text DEFAULT '{}',
	"priority" integer DEFAULT 5 NOT NULL,
	"escalation_minutes" integer,
	"escalation_role_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject" varchar(500),
	"body_template" text NOT NULL,
	"variables" text DEFAULT '[]',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"datasource" varchar(50) NOT NULL,
	"columns" text NOT NULL,
	"filters" text DEFAULT '[]',
	"group_by" text DEFAULT '[]',
	"aggregations" text DEFAULT '[]',
	"order_by" text DEFAULT '[]',
	"limit_rows" integer DEFAULT 1000,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"energy_type" "energy_type",
	"location" text NOT NULL,
	"capacity_mw" numeric(10, 2),
	"commission_date" timestamp,
	"config" text DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"config" text DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"phone" varchar(20),
	"last_login_at" timestamp,
	"password_hash" varchar(255),
	"idp_user_id" varchar(255),
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_forecasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"forecast_timestamp" timestamp NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"source" varchar(50) DEFAULT 'openweathermap' NOT NULL,
	"forecast_type" varchar(20) NOT NULL,
	"irradiation_wh_m2" numeric(10, 2),
	"ghi_wh_m2" numeric(10, 2),
	"dni_wh_m2" numeric(10, 2),
	"dhi_wh_m2" numeric(10, 2),
	"wind_speed_ms" numeric(5, 2),
	"wind_direction_deg" integer,
	"wind_gust_ms" numeric(5, 2),
	"temperature_c" numeric(5, 2),
	"humidity_percent" integer,
	"pressure_hpa" numeric(7, 2),
	"cloud_cover_percent" integer,
	"precipitation_mm" numeric(6, 2),
	"snow_mm" numeric(6, 2),
	"visibility_m" integer,
	"air_density_kg_m3" numeric(6, 4),
	"aqi" integer,
	"weather_condition" varchar(100),
	"weather_description" text,
	"raw_api_response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"payload" text NOT NULL,
	"status" "webhook_delivery_status" NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error_message" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"sent_at" timestamp,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"webhook_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(500) NOT NULL,
	"auth_type" "webhook_auth_type" DEFAULT 'none' NOT NULL,
	"auth_token" varchar(500),
	"auth_username" varchar(255),
	"auth_password" varchar(255),
	"headers" text DEFAULT '{}',
	"events" text NOT NULL,
	"secret" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhooks_webhook_id_unique" UNIQUE("webhook_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wind_turbine_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"manufacturer" varchar(100),
	"model" varchar(100),
	"rated_power_mw" numeric(6, 3) NOT NULL,
	"rotor_diameter_m" numeric(6, 2),
	"hub_height_m" numeric(6, 2),
	"number_of_blades" integer DEFAULT 3,
	"cut_in_wind_speed_ms" numeric(5, 2),
	"rated_wind_speed_ms" numeric(5, 2),
	"cut_out_wind_speed_ms" numeric(5, 2),
	"power_curve_data" text,
	"blade_length_m" numeric(6, 2),
	"blade_material" varchar(100),
	"blade_serial_numbers" text,
	"gearbox_type" varchar(50),
	"gearbox_ratio" varchar(20),
	"gearbox_manufacturer" varchar(100),
	"generator_type" varchar(50),
	"generator_rated_power_mw" numeric(6, 3),
	"generator_voltage_kv" numeric(6, 2),
	"generator_frequency_hz" integer DEFAULT 50,
	"control_system_type" varchar(100),
	"yaw_system_type" varchar(100),
	"pitch_control_type" varchar(100),
	"capacity_factor" numeric(5, 4),
	"availability_target" numeric(5, 4),
	"max_operational_temp_c" integer,
	"min_operational_temp_c" integer,
	"max_wind_speed_survival_ms" numeric(6, 2),
	"commissioning_date" timestamp,
	"warranty_end_date" timestamp,
	"expected_lifetime_years" integer DEFAULT 25,
	"last_major_service_date" timestamp,
	"next_major_service_date" timestamp,
	"service_interval_months" integer DEFAULT 6,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wind_turbine_metadata_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wind_work_order_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_name" varchar(200) NOT NULL,
	"template_code" varchar(50) NOT NULL,
	"description" text,
	"default_priority" varchar(20) DEFAULT 'medium',
	"default_type" varchar(20) DEFAULT 'preventive',
	"estimated_duration_hours" numeric(6, 2),
	"checklist_items" text,
	"required_skills" text,
	"safety_requirements" text,
	"typical_parts" text,
	"frequency_days" integer,
	"frequency_description" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"task_order" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"asset_id" uuid,
	"work_order_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "work_order_type" NOT NULL,
	"priority" "work_order_priority" DEFAULT 'medium' NOT NULL,
	"status" "work_order_status" DEFAULT 'draft' NOT NULL,
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"estimated_hours" numeric(6, 2),
	"actual_hours" numeric(6, 2),
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_health_scores" ADD CONSTRAINT "asset_health_scores_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_generated_reports" ADD CONSTRAINT "compliance_generated_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_generated_reports" ADD CONSTRAINT "compliance_generated_reports_template_id_compliance_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "compliance_report_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_generated_reports" ADD CONSTRAINT "compliance_generated_reports_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_generated_reports" ADD CONSTRAINT "compliance_generated_reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_generated_reports" ADD CONSTRAINT "compliance_generated_reports_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_report_templates" ADD CONSTRAINT "compliance_report_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_report_templates" ADD CONSTRAINT "compliance_report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "forecast_accuracy_metrics" ADD CONSTRAINT "forecast_accuracy_metrics_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generation_forecasts" ADD CONSTRAINT "generation_forecasts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generation_forecasts" ADD CONSTRAINT "generation_forecasts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generation_forecasts" ADD CONSTRAINT "generation_forecasts_weather_forecast_id_weather_forecasts_id_fk" FOREIGN KEY ("weather_forecast_id") REFERENCES "weather_forecasts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "weather_forecasts" ADD CONSTRAINT "weather_forecasts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wind_turbine_metadata" ADD CONSTRAINT "wind_turbine_metadata_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wind_work_order_templates" ADD CONSTRAINT "wind_work_order_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_order_tasks" ADD CONSTRAINT "work_order_tasks_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_order_tasks" ADD CONSTRAINT "work_order_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
