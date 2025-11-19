-- Migration: Add Weather Forecasts Tables
-- Description: Tables for storing weather forecast data from external APIs (OpenWeatherMap)
-- Author: dCMMS Development Team
-- Date: November 19, 2025
-- Sprint: 19 (DCMMS-151)

-- ==========================================
-- Weather Forecasts Table
-- ==========================================

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Forecast metadata
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) NOT NULL DEFAULT 'openweathermap', -- 'openweathermap', 'noaa', 'solcast'
  forecast_type VARCHAR(20) NOT NULL, -- 'historical', 'current', 'forecast'

  -- Solar-specific weather data
  irradiation_wh_m2 DECIMAL(10, 2), -- Global Horizontal Irradiance (W/m²)
  ghi_wh_m2 DECIMAL(10, 2), -- Global Horizontal Irradiance
  dni_wh_m2 DECIMAL(10, 2), -- Direct Normal Irradiance
  dhi_wh_m2 DECIMAL(10, 2), -- Diffuse Horizontal Irradiance

  -- Wind-specific weather data
  wind_speed_ms DECIMAL(5, 2), -- Wind speed (m/s)
  wind_direction_deg INT, -- Wind direction (0-360 degrees)
  wind_gust_ms DECIMAL(5, 2), -- Wind gust speed (m/s)

  -- General weather data
  temperature_c DECIMAL(5, 2), -- Temperature (Celsius)
  humidity_percent INT, -- Relative humidity (0-100%)
  pressure_hpa DECIMAL(7, 2), -- Atmospheric pressure (hPa)
  cloud_cover_percent INT, -- Cloud coverage (0-100%)
  precipitation_mm DECIMAL(6, 2), -- Precipitation (mm)
  snow_mm DECIMAL(6, 2), -- Snow (mm)
  visibility_m INT, -- Visibility (meters)

  -- Air quality (affects solar panel efficiency)
  air_density_kg_m3 DECIMAL(6, 4), -- Air density (kg/m³)
  aqi INT, -- Air Quality Index

  -- Weather description
  weather_condition VARCHAR(100), -- 'clear', 'cloudy', 'rain', 'snow', etc.
  weather_description TEXT, -- Full weather description

  -- Raw API response (for debugging and future enhancements)
  raw_api_response JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for efficient querying
  CONSTRAINT unique_site_forecast_timestamp UNIQUE (site_id, forecast_timestamp, source)
);

-- ==========================================
-- Indexes
-- ==========================================

-- Index for querying forecasts by site and time range (most common query)
CREATE INDEX idx_weather_forecasts_site_timestamp
  ON weather_forecasts(site_id, forecast_timestamp DESC);

-- Index for querying by forecast type
CREATE INDEX idx_weather_forecasts_type
  ON weather_forecasts(forecast_type, forecast_timestamp DESC);

-- Index for querying recent forecasts
CREATE INDEX idx_weather_forecasts_fetched_at
  ON weather_forecasts(fetched_at DESC);

-- Partial index for active forecasts (future timestamps)
CREATE INDEX idx_weather_forecasts_future
  ON weather_forecasts(site_id, forecast_timestamp)
  WHERE forecast_timestamp > NOW();

-- Index for solar-related queries (GHI lookups)
CREATE INDEX idx_weather_forecasts_solar
  ON weather_forecasts(site_id, forecast_timestamp)
  WHERE irradiation_wh_m2 IS NOT NULL;

-- Index for wind-related queries
CREATE INDEX idx_weather_forecasts_wind
  ON weather_forecasts(site_id, forecast_timestamp)
  WHERE wind_speed_ms IS NOT NULL;

-- ==========================================
-- Comments
-- ==========================================

COMMENT ON TABLE weather_forecasts IS 'Weather forecast data from external APIs for solar and wind energy sites';
COMMENT ON COLUMN weather_forecasts.forecast_timestamp IS 'Timestamp for which this forecast is valid';
COMMENT ON COLUMN weather_forecasts.fetched_at IS 'When this forecast was fetched from the API';
COMMENT ON COLUMN weather_forecasts.irradiation_wh_m2 IS 'Global Horizontal Irradiance - key metric for solar generation forecasting';
COMMENT ON COLUMN weather_forecasts.wind_speed_ms IS 'Wind speed - key metric for wind generation forecasting';
COMMENT ON COLUMN weather_forecasts.raw_api_response IS 'Full API response for debugging and future feature extraction';

-- ==========================================
-- Data Retention Policy
-- ==========================================

-- Historical data: Keep 2 years
-- Forecast data: Keep 30 days past forecast_timestamp
-- See: docs/DATA_RETENTION_POLICY.md

COMMENT ON TABLE weather_forecasts IS E'Weather forecast data from external APIs.\nRetention: 2 years for historical, 30 days past forecast_timestamp for forecasts';
