-- Asset Health Scores Table

CREATE TABLE IF NOT EXISTS asset_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    category VARCHAR(20) NOT NULL CHECK (category IN ('excellent', 'good', 'fair', 'poor')),
    recent_alarms INTEGER NOT NULL DEFAULT 0,
    recent_work_orders INTEGER NOT NULL DEFAULT 0,
    anomaly_count INTEGER NOT NULL DEFAULT 0,
    asset_age_months INTEGER NOT NULL DEFAULT 0,
    days_since_last_maintenance INTEGER NOT NULL DEFAULT 0,
    component_scores JSONB,  -- Store breakdown of component scores
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_asset_health_scores_asset ON asset_health_scores(asset_id);
CREATE INDEX idx_asset_health_scores_category ON asset_health_scores(category);
CREATE INDEX idx_asset_health_scores_score ON asset_health_scores(score DESC);
CREATE INDEX idx_asset_health_scores_calculated ON asset_health_scores(calculated_at DESC);

-- Comments
COMMENT ON TABLE asset_health_scores IS 'Asset health scores calculated from multiple factors';
COMMENT ON COLUMN asset_health_scores.score IS 'Health score 0-100';
COMMENT ON COLUMN asset_health_scores.category IS 'Health category: excellent (90-100), good (70-89), fair (50-69), poor (<50)';
COMMENT ON COLUMN asset_health_scores.component_scores IS 'JSON breakdown of component scores and weights';
