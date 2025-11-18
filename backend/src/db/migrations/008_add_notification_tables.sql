-- Add notification enums
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'webhook', 'slack');
CREATE TYPE notification_event_type AS ENUM (
  'work_order_assigned',
  'work_order_overdue',
  'work_order_completed',
  'alert_critical',
  'alert_high',
  'alert_medium',
  'alert_acknowledged',
  'alert_resolved',
  'asset_down',
  'maintenance_due'
);
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');

-- Notification Templates Table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  event_type notification_event_type NOT NULL,
  channel notification_channel NOT NULL,
  subject VARCHAR(500),
  body_template TEXT NOT NULL,
  variables TEXT DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX idx_notification_templates_event_type ON notification_templates(event_type);

-- Notification Rules Table
CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  event_type notification_event_type NOT NULL,
  channels TEXT NOT NULL,
  conditions TEXT DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  escalation_minutes INTEGER,
  escalation_role_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX idx_notification_rules_event_type ON notification_rules(event_type);

-- Notification Preferences Table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  channel notification_channel NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_type, channel)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Notification History Table
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  channel notification_channel NOT NULL,
  template_id UUID REFERENCES notification_templates(id),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_history_tenant ON notification_history(tenant_id);
CREATE INDEX idx_notification_history_user ON notification_history(user_id);
CREATE INDEX idx_notification_history_status ON notification_history(status);
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at DESC);

-- Device Tokens Table (for push notifications)
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  device_type VARCHAR(50) NOT NULL,
  device_id VARCHAR(255),
  app_version VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active);
