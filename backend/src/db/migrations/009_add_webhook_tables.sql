-- Add webhook enums
CREATE TYPE webhook_auth_type AS ENUM ('none', 'bearer', 'basic', 'api_key');
CREATE TYPE webhook_delivery_status AS ENUM ('success', 'failed', 'timeout', 'invalid_response');

-- Webhooks Table
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  auth_type webhook_auth_type NOT NULL DEFAULT 'none',
  auth_token VARCHAR(500),
  auth_username VARCHAR(255),
  auth_password VARCHAR(255),
  headers TEXT DEFAULT '{}',
  events TEXT NOT NULL,
  secret VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);

-- Webhook Deliveries Table (Delivery logs)
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  payload TEXT NOT NULL,
  status webhook_delivery_status NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMP,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);
