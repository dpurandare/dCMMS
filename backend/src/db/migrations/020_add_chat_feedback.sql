-- ==========================================
-- Migration: Add Chat Feedback Table
-- Sprint: 26 (DCMMS-GENAI-09 - Feedback Loop)
-- Date: 2025-12-18
-- ==========================================
-- Description:
--   Creates chat_feedback table to log user feedback (thumbs up/down)
--   on GenAI chat responses for RLHF and quality tracking.
-- ==========================================

-- Create chat_feedback table
CREATE TABLE IF NOT EXISTS chat_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    answer TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
    context_ids TEXT, -- JSON array of document embedding IDs used in the response
    feedback TEXT, -- Optional text feedback from user
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for analytics and performance
CREATE INDEX idx_chat_feedback_tenant_id ON chat_feedback(tenant_id);
CREATE INDEX idx_chat_feedback_user_id ON chat_feedback(user_id);
CREATE INDEX idx_chat_feedback_rating ON chat_feedback(rating);
CREATE INDEX idx_chat_feedback_created_at ON chat_feedback(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE chat_feedback IS 'Stores user feedback on GenAI chat responses for quality tracking and RLHF';
COMMENT ON COLUMN chat_feedback.rating IS 'User rating: 1 for thumbs up (helpful), -1 for thumbs down (not helpful)';
COMMENT ON COLUMN chat_feedback.context_ids IS 'JSON array of document_embeddings.id values used to generate the answer';
COMMENT ON COLUMN chat_feedback.feedback IS 'Optional text feedback explaining why the response was helpful or not';

-- ==========================================
-- Rollback Script (if needed):
-- ==========================================
-- DROP INDEX IF EXISTS idx_chat_feedback_created_at;
-- DROP INDEX IF EXISTS idx_chat_feedback_rating;
-- DROP INDEX IF EXISTS idx_chat_feedback_user_id;
-- DROP INDEX IF EXISTS idx_chat_feedback_tenant_id;
-- DROP TABLE IF EXISTS chat_feedback;
