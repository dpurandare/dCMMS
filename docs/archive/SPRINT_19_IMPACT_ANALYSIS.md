# Sprint 19: Forecasting & Wind Support - Impact Analysis

**Date:** November 19, 2025
**Sprint:** Sprint 19 (Weeks 41-46)
**Scope:** Weather API Integration, ARIMA/SARIMA Forecasting, Wind Energy Support

---

## Executive Summary

Sprint 19 adds **generation forecasting** and **wind energy support** to dCMMS. This document analyzes the impact on existing systems and identifies all code, database, and documentation changes required.

**Impact Level:** 🟡 **MEDIUM-HIGH**
- New subsystems: Weather API, Forecasting models, Forecast serving
- Database changes: New tables for forecasts, wind asset metadata
- API changes: New endpoints, no breaking changes to existing
- Frontend changes: New dashboards and widgets
- ML infrastructure: New model types (time-series vs classification)

---

## 1. Database Impact Analysis

### 1.1 New Tables Required

**`weather_forecasts` (New)**
```sql
CREATE TABLE weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Solar-specific
  irradiation_wh_m2 DECIMAL(10,2),  -- W/m²
  cloud_cover_pct DECIMAL(5,2),     -- 0-100%
  temperature_c DECIMAL(5,2),

  -- Wind-specific
  wind_speed_ms DECIMAL(5,2),       -- m/s
  wind_direction_deg INT,           -- 0-360°
  turbulence_intensity_pct DECIMAL(5,2),
  air_density_kg_m3 DECIMAL(5,3),

  -- Common
  humidity_pct DECIMAL(5,2),
  pressure_hpa DECIMAL(7,2),

  provider VARCHAR(50),              -- 'openweathermap', 'noaa', 'solcast'
  forecast_horizon_hours INT,

  CONSTRAINT unique_weather_forecast UNIQUE(site_id, forecast_timestamp, provider)
);

CREATE INDEX idx_weather_forecasts_site_time ON weather_forecasts(site_id, forecast_timestamp);
```

**`generation_forecasts` (New)**
```sql
CREATE TABLE generation_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Forecast values
  predicted_generation_mw DECIMAL(10,3) NOT NULL,
  confidence_interval_lower_mw DECIMAL(10,3),
  confidence_interval_upper_mw DECIMAL(10,3),
  confidence_level_pct DECIMAL(5,2) DEFAULT 95.0,  -- 95% confidence interval

  -- Model info
  model_name VARCHAR(100) NOT NULL,  -- 'arima_solar_v1', 'sarima_wind_v1'
  model_version VARCHAR(20) NOT NULL,
  forecast_horizon_hours INT NOT NULL,

  -- Actual generation (for validation)
  actual_generation_mw DECIMAL(10,3),
  forecast_error_mw DECIMAL(10,3),
  forecast_error_pct DECIMAL(7,4),

  CONSTRAINT unique_generation_forecast UNIQUE(site_id, forecast_timestamp, model_name, model_version)
);

CREATE INDEX idx_generation_forecasts_site_time ON generation_forecasts(site_id, forecast_timestamp);
CREATE INDEX idx_generation_forecasts_created ON generation_forecasts(created_at);
```

**`asset_metadata` (Extend Existing)**
```sql
-- Add wind turbine metadata columns to existing assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS wind_turbine_metadata JSONB;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS power_curve_data JSONB;

-- Example wind_turbine_metadata structure:
{
  "manufacturer": "Vestas",
  "model": "V150-4.2MW",
  "rated_power_kw": 4200,
  "rotor_diameter_m": 150,
  "hub_height_m": 105,
  "cut_in_wind_speed_ms": 3.0,
  "rated_wind_speed_ms": 11.0,
  "cut_out_wind_speed_ms": 25.0,
  "power_curve": [
    {"wind_speed_ms": 3.0, "power_kw": 0},
    {"wind_speed_ms": 5.0, "power_kw": 200},
    // ... more points
  ]
}
```

### 1.2 Existing Tables - No Changes
✅ All existing tables remain unchanged
✅ No breaking schema changes
✅ Backward compatible

### 1.3 Migration Files Required

**New migrations:**
- `018_add_weather_forecasts.sql`
- `019_add_generation_forecasts.sql`
- `020_add_wind_asset_metadata.sql`

---

## 2. Backend API Impact Analysis

### 2.1 New API Endpoints

**Weather API** (`backend/src/routes/weather.ts`)
```typescript
GET /api/v1/weather/forecasts
  - Query: site_id, from_date, to_date
  - Returns: Weather forecasts for site

GET /api/v1/weather/forecasts/:site_id/latest
  - Returns: Latest 48-hour weather forecast

POST /api/v1/weather/forecasts/refresh
  - Triggers: Manual weather forecast refresh from provider
  - Returns: Job ID for async processing
```

**Generation Forecast API** (`backend/src/routes/forecasts.ts`)
```typescript
GET /api/v1/forecasts/generation
  - Query: site_id, from_date, to_date, model_name (optional)
  - Returns: Generation forecasts with confidence intervals

GET /api/v1/forecasts/generation/:site_id/latest
  - Query: horizon_hours (default: 48)
  - Returns: Latest generation forecast

POST /api/v1/forecasts/generation/generate
  - Body: { site_id, horizon_hours, model_name }
  - Triggers: On-demand forecast generation
  - Returns: Forecast ID + async job ID

GET /api/v1/forecasts/accuracy
  - Query: site_id, from_date, to_date, model_name
  - Returns: Forecast accuracy metrics (MAE, MAPE, RMSE)
```

**Wind Asset API** (Extend `backend/src/routes/assets.ts`)
```typescript
// No new endpoints, but extend existing:
POST /api/v1/assets
  - Add support for asset_type: 'wind_turbine'
  - Validate wind_turbine_metadata structure

PUT /api/v1/assets/:id/power-curve
  - Body: { power_curve_points: [{wind_speed_ms, power_kw}] }
  - Updates: power_curve_data in assets table
```

### 2.2 Existing Endpoints - No Changes
✅ All existing API endpoints remain unchanged
✅ No breaking changes
✅ Fully backward compatible

### 2.3 New Backend Services

**`backend/src/services/weather-api.service.ts`**
- Integrates with OpenWeatherMap API
- Fetches and stores weather forecasts
- Cron job: Refresh every 6 hours

**`backend/src/services/generation-forecast.service.ts`**
- Triggers ML forecast generation
- Stores forecast results in database
- Calculates forecast accuracy (when actuals available)

**`backend/src/services/wind-turbine.service.ts`**
- Power curve interpolation
- Wind-to-power conversion
- Turbine-specific calculations

### 2.4 Dependencies Added
```json
{
  "axios": "^1.6.0",  // For weather API calls
  "node-cron": "^3.0.3"  // For scheduled forecast updates
}
```

---

## 3. ML Infrastructure Impact Analysis

### 3.1 New ML Models

**ARIMA/SARIMA Models** (`ml/models/`)
- `arima_forecast.py` - ARIMA/SARIMA implementation
- `prophet_forecast.py` - Facebook Prophet (alternative)
- `ensemble_forecast.py` - Ensemble of multiple models

**Key Differences from Existing Models:**
| Aspect | Existing (Anomaly/PdM) | New (Forecasting) |
|--------|------------------------|-------------------|
| **Problem Type** | Classification/Regression | Time-series forecasting |
| **Algorithms** | Random Forest, XGBoost, Isolation Forest | ARIMA, SARIMA, LSTM, Prophet |
| **Features** | Aggregated metrics (7-day avg, etc.) | Temporal sequences + weather |
| **Training** | Batch training (monthly) | Continuous training (daily) |
| **Inference** | Real-time (single prediction) | Batch (48-hour horizon) |
| **Validation** | K-fold cross-validation | Temporal train-test split |

### 3.2 New ML Dependencies
```python
# requirements.txt additions
statsmodels==0.14.0      # ARIMA, SARIMA
pmdarima==2.0.3          # Auto-ARIMA
prophet==1.1.4           # Facebook Prophet
sktime==0.24.0           # Time-series utilities
matplotlib==3.8.0        # Forecast visualization
seaborn==0.13.0          # Statistical plotting
```

### 3.3 MLflow Integration

**New Experiments:**
- `generation_forecast_solar` - Solar ARIMA/SARIMA experiments
- `generation_forecast_wind` - Wind ARIMA/SARIMA experiments

**New Metrics Tracked:**
- MAE (Mean Absolute Error)
- MAPE (Mean Absolute Percentage Error)
- RMSE (Root Mean Squared Error)
- Forecast horizon accuracy by hour (1h, 6h, 12h, 24h, 48h)

### 3.4 Feast Feature Store Impact

**New Feature Views:**
```python
# ml/feast/features/weather_features.py
@feast_feature_view(
    sources=[weather_forecast_source],
    schema=[
        Field(name="irradiation_1h_ahead", dtype=Float32),
        Field(name="irradiation_6h_ahead", dtype=Float32),
        Field(name="irradiation_24h_ahead", dtype=Float32),
        Field(name="wind_speed_1h_ahead", dtype=Float32),
        Field(name="temperature_1h_ahead", dtype=Float32),
    ]
)
def weather_forecast_features(df: DataFrame):
    # Transform weather forecasts into features
    return df
```

**Existing Feature Views:** ✅ No changes required

---

## 4. Frontend Impact Analysis

### 4.1 New Components

**Forecast Dashboard** (`frontend/src/app/forecasts/page.tsx`)
- Chart: 48-hour generation forecast with confidence intervals
- Weather overlay: Irradiation, temperature, wind speed
- Accuracy metrics: MAE, MAPE for past forecasts
- Model selector: ARIMA vs SARIMA vs Prophet

**Wind Farm Dashboard** (`frontend/src/app/wind/page.tsx`)
- Wind farm overview: Total capacity, active turbines
- Wind speed heatmap: By turbine location
- Power curve visualization: Expected vs actual
- Turbine health status: Grid view

**Forecast Widgets** (For existing dashboards)
```typescript
// frontend/src/components/forecasts/GenerationForecastWidget.tsx
interface GenerationForecastWidgetProps {
  siteId: string;
  horizonHours: number;
}

// frontend/src/components/wind/WindSpeedWidget.tsx
interface WindSpeedWidgetProps {
  siteId: string;
  timeRange: 'hour' | 'day' | 'week';
}
```

### 4.2 Existing Components - Extensions

**Site Dashboard** (`frontend/src/app/sites/[id]/page.tsx`)
- ✅ Add "Forecast" tab (solar/wind sites)
- ✅ Add "Weather" widget
- No breaking changes

**Asset List** (`frontend/src/app/assets/page.tsx`)
- ✅ Add filter for asset_type: 'wind_turbine'
- ✅ Show wind-specific columns (rated_power, rotor_diameter)
- No breaking changes

### 4.3 New Dependencies
```json
{
  "recharts": "^2.10.0",  // Already exists, use for forecast charts
  "date-fns": "^2.30.0"   // Already exists, use for time manipulation
}
```

✅ No new frontend dependencies required

---

## 5. Documentation Impact Analysis

### 5.1 Documents Requiring Updates

**High Priority:**

1. **README.md**
   - ✅ Update "Key Features" to mention generation forecasting
   - ✅ Add wind energy support to overview
   - ✅ Update technology stack with statsmodels/pmdarima

2. **specs/22_AI_ML_IMPLEMENTATION.md**
   - ✅ Mark "Generation Forecasting" use case as ✅ IMPLEMENTED
   - ✅ Add ARIMA/SARIMA implementation details
   - ✅ Update model catalog

3. **SPRINT_STATUS_TRACKER.md**
   - ✅ Add Sprint 19 section with 8 tasks
   - ✅ Update overall progress (Sprint 19: 41 story points)

4. **PRD_FINAL.md**
   - ✅ Update ML capabilities section
   - ✅ Mark forecasting as implemented

5. **API Documentation** (OpenAPI spec)
   - ✅ Add `/api/v1/weather/*` endpoints
   - ✅ Add `/api/v1/forecasts/*` endpoints
   - ✅ Update asset endpoints for wind metadata

**Medium Priority:**

6. **docs/user-guide/** (New guides)
   - `generation-forecasting-guide.md` - How to use forecasts
   - `wind-farm-operations-guide.md` - Wind-specific operations

7. **docs/architecture/**
   - Update architecture diagrams to show weather API + forecast service
   - Add forecasting data flow diagram

8. **docs/training/faq.md**
   - Add 10-15 questions about forecasting and wind

**Low Priority:**

9. **ml/docs/model-cards/**
   - `arima-solar-forecast.md` - Solar ARIMA model card
   - `sarima-wind-forecast.md` - Wind SARIMA model card

10. **docs/testing/**
    - Add forecast accuracy validation report

### 5.2 New Documentation Required

**Technical:**
- `docs/api/weather-api-integration.md` - OpenWeatherMap integration guide
- `docs/ml/time-series-forecasting.md` - Forecasting methodology
- `ml/docs/FORECASTING_PIPELINE.md` - Forecast training and serving

**User-Facing:**
- `docs/user-guide/understanding-forecasts.md` - Interpreting forecast confidence intervals
- `docs/user-guide/wind-power-curves.md` - Wind power curve management

---

## 6. Testing Impact Analysis

### 6.1 New Test Suites Required

**Backend Tests:**
```
backend/tests/
├── unit/
│   ├── services/weather-api.service.test.ts
│   ├── services/generation-forecast.service.test.ts
│   └── services/wind-turbine.service.test.ts
├── integration/
│   ├── forecasts-api.integration.test.ts
│   └── weather-api.integration.test.ts
└── e2e/
    └── generation-forecast-flow.e2e.test.ts
```

**ML Tests:**
```
ml/tests/
├── test_arima_forecast.py
├── test_prophet_forecast.py
├── test_forecast_accuracy.py
└── test_weather_features.py
```

**Frontend Tests:**
```
frontend/tests/
└── components/
    ├── GenerationForecastWidget.test.tsx
    └── WindSpeedWidget.test.tsx
```

### 6.2 Existing Tests - No Changes
✅ All existing tests remain valid
✅ No test updates required (backward compatible)

### 6.3 Performance Tests

**New k6 tests:**
```javascript
// backend/tests/performance/forecast-api-load-test.js
// Test: 100 concurrent users requesting 48h forecasts
// Target: p95 <500ms
```

---

## 7. Infrastructure Impact Analysis

### 7.1 New Infrastructure Components

**Weather API Cron Job:**
```yaml
# infrastructure/kubernetes/cronjobs/weather-forecast-refresh.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weather-forecast-refresh
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: weather-refresh
            image: dcmms-backend:latest
            command: ["node", "dist/jobs/refresh-weather.js"]
```

**Forecast Generation Cron Job:**
```yaml
# Every day at 6 AM, generate 48-hour forecasts for all sites
# infrastructure/kubernetes/cronjobs/generation-forecast.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: generation-forecast
spec:
  schedule: "0 6 * * *"  # Daily at 6 AM
```

### 7.2 External Dependencies

**Weather API Provider:**
- **OpenWeatherMap API** (recommended)
  - Free tier: 1,000 calls/day
  - Paid tier: 60 calls/min ($40/month)
  - Data: Hourly forecasts for 48 hours

**Alternative:** NOAA API (free, US-only)

### 7.3 Storage Impact

**Additional Storage:**
- Weather forecasts: ~50 KB/site/day = 18 MB/site/year
- Generation forecasts: ~100 KB/site/day = 36 MB/site/year
- For 100 sites: ~5.4 GB/year (negligible)

---

## 8. Security & Compliance Impact

### 8.1 New Security Considerations

**API Keys:**
- OpenWeatherMap API key storage in HashiCorp Vault
- Rotation policy: Every 90 days

**Data Privacy:**
- Weather data: Public domain, no PII
- Forecast data: Business-sensitive, restrict access by site permissions

### 8.2 Compliance Impact

**Forecast Accuracy Auditing:**
- Regulatory requirement: Grid operators may require forecast accuracy >80%
- Audit trail: Store all forecasts + actuals for 2 years
- Reporting: Monthly forecast accuracy reports

---

## 9. Migration & Rollback Strategy

### 9.1 Migration Plan (Zero Downtime)

**Phase 1: Database (Week 1)**
```sql
-- Run migrations during maintenance window (low traffic)
-- Migrations are additive (no breaking changes)
BEGIN;
  -- Migration 018
  CREATE TABLE weather_forecasts (...);
  -- Migration 019
  CREATE TABLE generation_forecasts (...);
  -- Migration 020
  ALTER TABLE assets ADD COLUMN wind_turbine_metadata JSONB;
COMMIT;
```

**Phase 2: Backend Deployment (Week 2-3)**
- Deploy backend with new endpoints (no breaking changes to existing)
- Start weather cron job
- Backfill 7 days of weather forecasts

**Phase 3: ML Model Deployment (Week 3-4)**
- Train ARIMA/SARIMA models on historical data
- Register models in MLflow
- Generate initial forecasts for all sites

**Phase 4: Frontend Deployment (Week 4-5)**
- Deploy frontend with forecast components
- Gradual rollout: 10% → 50% → 100% traffic

**Phase 5: Validation (Week 5-6)**
- Monitor forecast accuracy
- Collect user feedback
- Fine-tune models

### 9.2 Rollback Strategy

**If Critical Issue:**
```sql
-- Rollback database (if needed)
-- Migrations are non-destructive, can leave tables
-- OR drop tables if blocking:
DROP TABLE generation_forecasts;
DROP TABLE weather_forecasts;
ALTER TABLE assets DROP COLUMN wind_turbine_metadata;
ALTER TABLE assets DROP COLUMN power_curve_data;
```

**Backend Rollback:**
- Revert to previous Docker image
- Stop weather/forecast cron jobs
- Existing functionality unaffected (no breaking changes)

**Frontend Rollback:**
- Revert to previous deployment
- Forecast components hidden (graceful degradation)

---

## 10. Cost Impact Analysis

### 10.1 Development Costs

**Engineering Effort:**
- Backend: 2 weeks (1 engineer) = $15,000
- ML: 3 weeks (1 ML engineer) = $25,000
- Frontend: 1 week (1 engineer) = $7,500
- QA/Testing: 1 week (1 QA engineer) = $7,500
- Documentation: 1 week (1 tech writer) = $7,500
- **Total:** 6-8 weeks, $62,500

### 10.2 Operational Costs

**Monthly Recurring:**
- OpenWeatherMap API: $40/month (60 calls/min tier)
- Additional compute (cron jobs): $20/month
- Additional storage (forecasts): $1/month (negligible)
- **Total:** ~$61/month = $732/year

**Cost per Site:**
- For 100 sites: $7.32/site/year (very low)

---

## 11. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Weather API downtime | Medium | High | Cache last forecast, fallback to persistence model |
| ARIMA underperforms | Low | Medium | Have Prophet as backup, plan LSTM for later |
| Forecast accuracy <80% | Medium | Medium | Ensemble multiple models, continuous retraining |
| Wind turbine data unavailable | Low | Low | Start with solar-only, add wind incrementally |
| User adoption low | Low | Medium | Training, in-app tutorials, show ROI metrics |

---

## 12. Success Metrics

### 12.1 Technical Metrics

**Forecast Accuracy:**
- Solar: MAPE <15% (target: <12%)
- Wind: MAE <10% of capacity (target: <8%)

**Performance:**
- Forecast generation: <30 seconds for 48-hour horizon
- API response: p95 <500ms
- Forecast refresh: Every 6 hours (on schedule)

### 12.2 Business Metrics

**User Adoption:**
- 80% of supervisors viewing forecasts weekly
- 50% of managers using forecasts for planning

**ROI:**
- 10% reduction in grid curtailment penalties
- 20% better maintenance scheduling (utilize low-generation windows)

---

## 13. Timeline

```
Week 1-2:   Database migrations + Weather API integration
Week 3-4:   ARIMA/SARIMA models + Wind asset templates
Week 5:     Forecast API endpoints + Frontend components
Week 6:     Integration testing + Documentation
Week 7-8:   Production deployment + Validation
```

**Sprint 19 Duration:** 6-8 weeks
**Target Completion:** End of Q1 2026

---

## Appendix A: Breaking Changes Checklist

✅ **No Breaking Changes:**
- ❌ No existing API endpoints modified
- ❌ No existing database columns removed
- ❌ No existing frontend components removed
- ❌ No existing ML models deprecated

✅ **Fully Backward Compatible**

---

## Appendix B: Affected Files Summary

**New Files Created:** ~40 files
**Existing Files Modified:** ~10 files
**Total Lines of Code:** ~8,000 new lines

**Breakdown:**
- Backend: ~2,500 lines (services, routes, migrations)
- ML: ~3,000 lines (models, pipelines, tests)
- Frontend: ~2,000 lines (components, pages)
- Documentation: ~500 lines (guides, API docs)

---

**Impact Assessment:** ✅ **APPROVED**
- Low risk of breaking existing functionality
- High value addition (critical feature gap)
- Manageable scope (6-8 weeks)

**Prepared By:** dCMMS Development Team
**Date:** November 19, 2025
**Status:** Ready for Implementation
