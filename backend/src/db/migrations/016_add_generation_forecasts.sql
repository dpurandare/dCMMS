-- Migration: Add Generation Forecasts Tables
-- Description: Tables for storing power generation forecasts from ML models
-- Author: dCMMS Development Team
-- Date: November 19, 2025
-- Sprint: 19 (DCMMS-152, DCMMS-153, DCMMS-156)

-- ==========================================
-- Generation Forecasts Table
-- ==========================================

CREATE TABLE IF NOT EXISTS generation_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE, -- NULL for site-level forecasts

  -- Forecast metadata
  forecast_timestamp TIMESTAMPTZ NOT NULL, -- Timestamp for which this forecast is valid
  forecast_horizon_hours INT NOT NULL, -- How many hours ahead this forecast is (1, 24, 48, etc.)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When this forecast was generated

  -- Model information
  model_name VARCHAR(100) NOT NULL, -- 'arima_solar_v1', 'sarima_wind_v1', 'prophet_solar_v1'
  model_version VARCHAR(50) NOT NULL, -- Model version for tracking
  algorithm VARCHAR(50) NOT NULL, -- 'ARIMA', 'SARIMA', 'Prophet', 'LSTM'

  -- Forecast values
  predicted_generation_mw DECIMAL(10, 3) NOT NULL, -- Predicted generation (MW)
  confidence_interval_lower_mw DECIMAL(10, 3), -- Lower bound of 95% confidence interval
  confidence_interval_upper_mw DECIMAL(10, 3), -- Upper bound of 95% confidence interval
  prediction_std_dev DECIMAL(10, 3), -- Standard deviation of prediction

  -- Actual generation (filled in after the forecast_timestamp occurs)
  actual_generation_mw DECIMAL(10, 3), -- Actual generation (for accuracy tracking)
  error_mw DECIMAL(10, 3), -- Forecast error (actual - predicted)
  absolute_error_mw DECIMAL(10, 3), -- Absolute error
  percentage_error DECIMAL(5, 2), -- Percentage error (MAPE)

  -- Weather inputs used for this forecast
  weather_forecast_id UUID REFERENCES weather_forecasts(id) ON DELETE SET NULL,

  -- Feature values (for explainability)
  feature_values JSONB, -- Key features used: { "irradiation": 800, "temperature": 25, "hour_of_day": 12 }

  -- Model metadata
  model_accuracy_score DECIMAL(5, 4), -- Model's historical accuracy score (R², MAPE, etc.)
  training_data_end_date DATE, -- Last date in training dataset (to detect staleness)

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE if this forecast has been superseded
  accuracy_validated BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE after actual_generation_mw is filled

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_site_asset_forecast_model UNIQUE (site_id, asset_id, forecast_timestamp, model_name),
  CONSTRAINT positive_generation CHECK (predicted_generation_mw >= 0),
  CONSTRAINT valid_confidence_interval CHECK (
    confidence_interval_lower_mw IS NULL OR
    confidence_interval_upper_mw IS NULL OR
    confidence_interval_lower_mw <= predicted_generation_mw AND
    predicted_generation_mw <= confidence_interval_upper_mw
  )
);

-- ==========================================
-- Forecast Accuracy Metrics Table
-- ==========================================

CREATE TABLE IF NOT EXISTS forecast_accuracy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Time period for these metrics
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  forecast_horizon_hours INT NOT NULL, -- Metrics for specific forecast horizon

  -- Accuracy metrics
  mean_absolute_error_mw DECIMAL(10, 3), -- MAE
  mean_absolute_percentage_error DECIMAL(5, 2), -- MAPE
  root_mean_squared_error_mw DECIMAL(10, 3), -- RMSE
  r_squared DECIMAL(5, 4), -- R² score
  forecast_skill_score DECIMAL(5, 4), -- Skill score vs persistence model

  -- Sample size
  num_forecasts INT NOT NULL, -- Number of forecasts in this period
  num_validated INT NOT NULL, -- Number with actual_generation_mw filled

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_model_site_period_horizon UNIQUE (model_name, model_version, site_id, period_start, period_end, forecast_horizon_hours)
);

-- ==========================================
-- Indexes for generation_forecasts
-- ==========================================

-- Most common query: Get active forecasts for a site
CREATE INDEX idx_generation_forecasts_site_active
  ON generation_forecasts(site_id, forecast_timestamp DESC)
  WHERE is_active = TRUE;

-- Query forecasts by asset
CREATE INDEX idx_generation_forecasts_asset
  ON generation_forecasts(asset_id, forecast_timestamp DESC)
  WHERE asset_id IS NOT NULL;

-- Query by model for model comparison
CREATE INDEX idx_generation_forecasts_model
  ON generation_forecasts(model_name, forecast_timestamp DESC);

-- Query for accuracy validation (forecasts needing actual data)
CREATE INDEX idx_generation_forecasts_validation
  ON generation_forecasts(forecast_timestamp, accuracy_validated)
  WHERE accuracy_validated = FALSE AND forecast_timestamp < NOW();

-- Query by forecast horizon (e.g., 24-hour ahead forecasts)
CREATE INDEX idx_generation_forecasts_horizon
  ON generation_forecasts(site_id, forecast_horizon_hours, forecast_timestamp DESC);

-- Query for recent forecasts
CREATE INDEX idx_generation_forecasts_generated_at
  ON generation_forecasts(generated_at DESC);

-- ==========================================
-- Indexes for forecast_accuracy_metrics
-- ==========================================

CREATE INDEX idx_forecast_accuracy_model_site
  ON forecast_accuracy_metrics(model_name, site_id, period_end DESC);

CREATE INDEX idx_forecast_accuracy_calculated_at
  ON forecast_accuracy_metrics(calculated_at DESC);

-- ==========================================
-- Comments
-- ==========================================

COMMENT ON TABLE generation_forecasts IS 'Power generation forecasts from ML models (ARIMA, SARIMA, Prophet)';
COMMENT ON COLUMN generation_forecasts.forecast_timestamp IS 'Timestamp for which this forecast predicts generation';
COMMENT ON COLUMN generation_forecasts.forecast_horizon_hours IS 'How many hours in the future this forecast predicts';
COMMENT ON COLUMN generation_forecasts.predicted_generation_mw IS 'Forecasted power generation in megawatts';
COMMENT ON COLUMN generation_forecasts.actual_generation_mw IS 'Actual generation (filled after forecast_timestamp for accuracy tracking)';
COMMENT ON COLUMN generation_forecasts.is_active IS 'FALSE if superseded by a newer forecast for the same timestamp';

COMMENT ON TABLE forecast_accuracy_metrics IS 'Aggregated accuracy metrics for forecast models over time periods';
COMMENT ON COLUMN forecast_accuracy_metrics.mean_absolute_percentage_error IS 'MAPE - primary metric for forecast accuracy (target <15%)';
COMMENT ON COLUMN forecast_accuracy_metrics.forecast_skill_score IS 'Skill score vs naive persistence model (1.0 = perfect, 0.0 = same as persistence)';

-- ==========================================
-- Data Retention Policy
-- ==========================================

-- Forecasts: Keep 1 year of validated forecasts
-- Accuracy metrics: Keep 2 years
-- See: docs/DATA_RETENTION_POLICY.md

COMMENT ON TABLE generation_forecasts IS E'Power generation forecasts from ML models.\nRetention: 1 year for validated forecasts';
COMMENT ON TABLE forecast_accuracy_metrics IS E'Aggregated forecast accuracy metrics.\nRetention: 2 years';
