-- Notification Batching Tables

-- Notification Queue Table (for batched notifications)
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type notification_event_type NOT NULL,
  channel notification_channel NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  subject VARCHAR(500),
  body TEXT NOT NULL,
  template_id UUID,
  data TEXT DEFAULT '{}',
  batch_key VARCHAR(255) NOT NULL,
  is_batched BOOLEAN NOT NULL DEFAULT false,
  batched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_batch_key ON notification_queue(batch_key);
CREATE INDEX idx_notification_queue_is_batched ON notification_queue(is_batched);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at DESC);
CREATE INDEX idx_notification_queue_user_event ON notification_queue(user_id, event_type);

-- Add batching preference to notification_preferences
ALTER TABLE notification_preferences
  ADD COLUMN enable_batching BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN batch_interval_minutes INTEGER NOT NULL DEFAULT 15;

-- Add comment for documentation
COMMENT ON TABLE notification_queue IS 'Queue for batched notifications to reduce notification noise';
COMMENT ON COLUMN notification_queue.batch_key IS 'Composite key for batching: userId_eventType_channel';
COMMENT ON COLUMN notification_preferences.enable_batching IS 'Enable batching for low/medium priority notifications';
COMMENT ON COLUMN notification_preferences.batch_interval_minutes IS 'Interval in minutes for batching notifications (default 15)';
