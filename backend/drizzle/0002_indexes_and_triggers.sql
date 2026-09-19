-- Indexes, trigger functions and triggers (REV-011).
--
-- Ported from the 16 files in backend/src/db/migrations/ that no runner ever
-- executed. Without this the database has only primary keys: the baseline
-- schema above declares no secondary index at all, because schema.ts declares
-- none for drizzle-kit to generate.
--
-- Statements for chat_feedback were deliberately not ported: that table is in
-- neither schema.ts nor any backend code (REV-009 records it as Absent).
--
-- These index choices are inherited, not reviewed. REV-015 checks them against
-- real query shapes; treat this migration as restoring intent, not as a
-- validated index design.

-- updated_at maintenance, previously defined in scripts/init-db.sql.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- from 008_add_notification_tables.sql [notification_templates]
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);

-- from 008_add_notification_tables.sql [notification_templates]
CREATE INDEX IF NOT EXISTS idx_notification_templates_event_type ON notification_templates(event_type);

-- from 008_add_notification_tables.sql [notification_rules]
CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant ON notification_rules(tenant_id);

-- from 008_add_notification_tables.sql [notification_rules]
CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON notification_rules(event_type);

-- from 008_add_notification_tables.sql [notification_preferences]
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- from 008_add_notification_tables.sql [notification_history]
CREATE INDEX IF NOT EXISTS idx_notification_history_tenant ON notification_history(tenant_id);

-- from 008_add_notification_tables.sql [notification_history]
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);

-- from 008_add_notification_tables.sql [notification_history]
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- from 008_add_notification_tables.sql [notification_history]
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at DESC);

-- from 008_add_notification_tables.sql [device_tokens]
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- from 008_add_notification_tables.sql [device_tokens]
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active);

-- from 009_add_webhook_tables.sql [webhooks]
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);

-- from 009_add_webhook_tables.sql [webhooks]
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);

-- from 009_add_webhook_tables.sql [webhook_deliveries]
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- from 009_add_webhook_tables.sql [webhook_deliveries]
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- from 009_add_webhook_tables.sql [webhook_deliveries]
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- from 010_add_notification_batching.sql [notification_queue]
CREATE INDEX IF NOT EXISTS idx_notification_queue_batch_key ON notification_queue(batch_key);

-- from 010_add_notification_batching.sql [notification_queue]
CREATE INDEX IF NOT EXISTS idx_notification_queue_is_batched ON notification_queue(is_batched);

-- from 010_add_notification_batching.sql [notification_queue]
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at DESC);

-- from 010_add_notification_batching.sql [notification_queue]
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_event ON notification_queue(user_id, event_type);

-- from 011_add_report_definitions.sql [report_definitions]
CREATE INDEX IF NOT EXISTS idx_report_definitions_created_by ON report_definitions(created_by);

-- from 011_add_report_definitions.sql [report_definitions]
CREATE INDEX IF NOT EXISTS idx_report_definitions_datasource ON report_definitions(datasource);

-- from 012_add_asset_health_scores.sql [asset_health_scores]
CREATE INDEX IF NOT EXISTS idx_asset_health_scores_category ON asset_health_scores(category);

-- from 012_add_asset_health_scores.sql [asset_health_scores]
CREATE INDEX IF NOT EXISTS idx_asset_health_scores_score ON asset_health_scores(score DESC);

-- from 012_add_asset_health_scores.sql [asset_health_scores]
CREATE INDEX IF NOT EXISTS idx_asset_health_scores_calculated ON asset_health_scores(calculated_at DESC);

-- from 013_add_compliance_reports.sql [compliance_report_templates]
CREATE INDEX IF NOT EXISTS idx_compliance_templates_type ON compliance_report_templates(report_type);

-- from 013_add_compliance_reports.sql [compliance_report_templates]
CREATE INDEX IF NOT EXISTS idx_compliance_templates_active ON compliance_report_templates(is_active);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant ON compliance_generated_reports(tenant_id);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_template ON compliance_generated_reports(template_id);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_site ON compliance_generated_reports(site_id);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_generated_reports(status);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_generated_reports(generated_at DESC);

-- from 013_add_compliance_reports.sql [compliance_generated_reports]
CREATE INDEX IF NOT EXISTS idx_compliance_reports_period ON compliance_generated_reports(reporting_period_start, reporting_period_end);

-- from 014_add_audit_logs.sql [audit_logs]
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- from 014_add_audit_logs.sql [audit_logs]
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- from 014_add_audit_logs.sql [audit_logs]
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- from 014_add_audit_logs.sql [audit_logs]
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Audit logs are append-only. From 014_add_audit_logs.sql.
CREATE OR REPLACE FUNCTION prevent_audit_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- from 014_add_audit_logs.sql [fn/trigger]
DROP TRIGGER IF EXISTS prevent_audit_log_update ON audit_logs;
CREATE TRIGGER prevent_audit_log_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modifications();

-- from 014_add_audit_logs.sql [fn/trigger]
DROP TRIGGER IF EXISTS prevent_audit_log_delete ON audit_logs;
CREATE TRIGGER prevent_audit_log_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modifications();

-- from 016_add_generation_forecasts.sql [forecast_accuracy_metrics]
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_calculated_at
  ON forecast_accuracy_metrics(calculated_at DESC);

-- from 017_add_wind_asset_metadata.sql [wind_turbine_metadata]
CREATE INDEX IF NOT EXISTS idx_wind_turbine_metadata_manufacturer
  ON wind_turbine_metadata(manufacturer, model);

-- from 017_add_wind_asset_metadata.sql [wind_turbine_metadata]
CREATE INDEX IF NOT EXISTS idx_wind_turbine_metadata_service_due
  ON wind_turbine_metadata(next_major_service_date)
  WHERE next_major_service_date IS NOT NULL;

-- from 017_add_wind_asset_metadata.sql [wind_work_order_templates]
CREATE INDEX IF NOT EXISTS idx_wind_work_order_templates_tenant
  ON wind_work_order_templates(tenant_id, is_active);

-- from 017_add_wind_asset_metadata.sql [wind_work_order_templates]
CREATE INDEX IF NOT EXISTS idx_wind_work_order_templates_code
  ON wind_work_order_templates(template_code);

-- from 019_add_genai_document_embeddings.sql [document_embeddings]
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding ON document_embeddings USING hnsw (embedding vector_cosine_ops);

-- from 019_add_genai_document_embeddings.sql [document_embeddings]
CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata ON document_embeddings USING gin(metadata);

-- from 021_add_refresh_tokens.sql [refresh_tokens]
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- from 021_add_refresh_tokens.sql [refresh_tokens]
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- from 021_add_refresh_tokens.sql [refresh_tokens]
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

-- Attach updated_at maintenance to every table that has the column.
--
-- scripts/init-db.sql used to do this for 8 named tables. Naming them again
-- would silently miss the 27 tables that file never knew about, so this
-- derives the list from the schema instead and stays correct as tables are
-- added. schema.ts gives updated_at a defaultNow(), which only fires on
-- INSERT — without these triggers the column never changes after creation.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I',
      'update_' || target.table_name || '_updated_at', target.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'update_' || target.table_name || '_updated_at', target.table_name);
  END LOOP;
END $$;
