# Adding New Energy Types to dCMMS

**Version**: 1.0
**Date**: November 19, 2025
**Status**: Architecture Guide

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Supported Energy Types](#supported-energy-types)
3. [Architecture Guidelines](#architecture-guidelines)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Energy Type Specifics](#energy-type-specifics)
6. [Testing & Validation](#testing--validation)
7. [Deployment Checklist](#deployment-checklist)

---

## 🎯 Overview

The dCMMS platform is designed to be **energy-agnostic** and extensible. This guide provides a comprehensive blueprint for adding new energy generation types beyond the currently implemented solar and wind support.

### Current State (Sprint 19)

✅ **Implemented**:
- Solar energy (photovoltaic)
- Wind energy (turbines)

🔄 **Supported but Not Implemented**:
- Hydroelectric (hydro)
- Biomass
- Geothermal
- Hybrid (mixed energy sites)

🎯 **Future Candidates**:
- Tidal/wave energy
- Nuclear
- Natural gas (transitional)
- Energy storage (batteries, pumped hydro)

---

## 📊 Supported Energy Types

The system already includes an `energy_type` enum with the following values:

```typescript
export const energyTypeEnum = pgEnum('energy_type', [
  'solar',      // ✅ Implemented
  'wind',       // ✅ Implemented
  'hydro',      // 🔄 Schema ready, needs implementation
  'biomass',    // 🔄 Schema ready, needs implementation
  'geothermal', // 🔄 Schema ready, needs implementation
  'hybrid',     // 🔄 Schema ready, needs implementation
]);
```

### Adding New Energy Types to Enum

If you need to add additional types (e.g., 'tidal', 'nuclear'):

**Step 1**: Update the database enum
```sql
-- Migration: 019_add_tidal_energy_type.sql
ALTER TYPE energy_type ADD VALUE 'tidal';
ALTER TYPE energy_type ADD VALUE 'nuclear';
```

**Step 2**: Update TypeScript schema
```typescript
// backend/src/db/schema.ts
export const energyTypeEnum = pgEnum('energy_type', [
  'solar',
  'wind',
  'hydro',
  'biomass',
  'geothermal',
  'hybrid',
  'tidal',      // NEW
  'nuclear',    // NEW
]);
```

**Step 3**: Update TypeScript interfaces
```typescript
// backend/src/services/site.service.ts
export interface CreateSiteData {
  // ...
  energyType?: 'solar' | 'wind' | 'hydro' | 'biomass' | 'geothermal' | 'hybrid' | 'tidal' | 'nuclear';
}
```

---

## 🏗️ Architecture Guidelines

### Core Principles

1. **Energy-Agnostic Core**: Database schema, API endpoints, and base services should work for all energy types
2. **Type-Specific Extensions**: Energy-specific logic should be isolated in dedicated modules
3. **Graceful Degradation**: Fallback to generic implementations when type-specific features are unavailable
4. **Consistent Patterns**: Follow the solar/wind implementation pattern for new energy types

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  (Energy-agnostic endpoints with optional type parameter)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ├─ Energy Type Detection (forecast.service.ts)             │
│  ├─ Generic Services (forecast, weather)                    │
│  └─ Type-Specific Services (solar, wind, hydro, etc.)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  ├─ Generic Tables (sites, assets, weather_forecasts)       │
│  └─ Type-Specific Tables (*_metadata, *_templates)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ML/Analytics Layer                        │
│  ├─ Generic Models (ARIMA/SARIMA base)                      │
│  └─ Type-Specific Models (SolarForecaster, WindForecaster)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Implementation

### Phase 1: Database Schema (Required)

#### 1.1 Create Energy-Specific Metadata Table

Each energy type should have a metadata table for type-specific technical specifications.

**Example: Hydroelectric**

```sql
-- Migration: 020_add_hydro_metadata.sql

-- Hydroelectric facility metadata
CREATE TABLE hydro_facility_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,

  -- Facility type
  facility_type VARCHAR(50) NOT NULL, -- 'run_of_river', 'reservoir', 'pumped_storage'

  -- Capacity specifications
  rated_power_mw DECIMAL(6, 3) NOT NULL,
  number_of_turbines INTEGER NOT NULL DEFAULT 1,
  turbine_type VARCHAR(100), -- 'francis', 'kaplan', 'pelton', 'bulb'

  -- Hydraulic specifications
  design_head_m DECIMAL(8, 2), -- Hydraulic head (height difference)
  design_flow_m3s DECIMAL(8, 2), -- Design flow rate (cubic meters per second)
  min_flow_m3s DECIMAL(8, 2), -- Environmental minimum flow
  max_flow_m3s DECIMAL(8, 2), -- Maximum flow capacity

  -- Reservoir specifications (if applicable)
  reservoir_capacity_m3 BIGINT, -- Reservoir volume
  usable_storage_m3 BIGINT, -- Active storage
  min_operating_level_m DECIMAL(6, 2), -- Minimum water level
  max_operating_level_m DECIMAL(6, 2), -- Maximum water level

  -- Efficiency
  turbine_efficiency DECIMAL(5, 4), -- e.g., 0.9200 = 92%
  generator_efficiency DECIMAL(5, 4),

  -- Performance
  capacity_factor DECIMAL(5, 4),
  availability_target DECIMAL(5, 4),

  -- Water intake
  intake_type VARCHAR(50), -- 'penstock', 'canal', 'tunnel'
  penstock_diameter_m DECIMAL(5, 2),
  penstock_length_m DECIMAL(8, 2),

  -- Environmental
  fish_passage_system BOOLEAN DEFAULT false,
  sediment_management_system BOOLEAN DEFAULT false,

  -- Operational limits
  startup_time_minutes INTEGER,
  shutdown_time_minutes INTEGER,
  ramping_rate_mw_min DECIMAL(6, 3),

  -- Maintenance
  commissioning_date TIMESTAMP,
  last_major_overhaul TIMESTAMP,
  next_scheduled_overhaul TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_hydro_facility_asset_id ON hydro_facility_metadata(asset_id);
CREATE INDEX idx_hydro_facility_type ON hydro_facility_metadata(facility_type);

-- Comments
COMMENT ON TABLE hydro_facility_metadata IS 'Technical specifications for hydroelectric facilities';
COMMENT ON COLUMN hydro_facility_metadata.design_head_m IS 'Hydraulic head: vertical distance water falls (meters)';
COMMENT ON COLUMN hydro_facility_metadata.design_flow_m3s IS 'Design flow rate in cubic meters per second';
```

**Example: Geothermal**

```sql
-- Migration: 021_add_geothermal_metadata.sql

CREATE TABLE geothermal_facility_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,

  -- Facility type
  facility_type VARCHAR(50) NOT NULL, -- 'dry_steam', 'flash_steam', 'binary_cycle'

  -- Capacity
  rated_power_mw DECIMAL(6, 3) NOT NULL,
  number_of_production_wells INTEGER,
  number_of_injection_wells INTEGER,

  -- Reservoir characteristics
  reservoir_temperature_c DECIMAL(6, 2), -- Average reservoir temperature
  reservoir_depth_m DECIMAL(8, 2), -- Depth to geothermal reservoir
  reservoir_pressure_bar DECIMAL(8, 2),

  -- Well specifications
  production_flow_rate_kgs DECIMAL(8, 2), -- kg/s per well
  wellhead_temperature_c DECIMAL(6, 2),
  wellhead_pressure_bar DECIMAL(8, 2),

  -- Fluid properties
  steam_quality DECIMAL(5, 4), -- Fraction of steam vs liquid (0-1)
  non_condensable_gases_ppm DECIMAL(8, 2), -- CO2, H2S, etc.
  total_dissolved_solids_ppm DECIMAL(8, 2),

  -- Thermal efficiency
  thermal_efficiency DECIMAL(5, 4),
  capacity_factor DECIMAL(5, 4),

  -- Cooling system
  cooling_type VARCHAR(50), -- 'wet_tower', 'dry_tower', 'hybrid'
  cooling_water_consumption_m3h DECIMAL(8, 2),

  -- Environmental
  reinjection_rate DECIMAL(5, 4), -- Fraction of extracted fluid reinjected
  hydrogen_sulfide_abatement BOOLEAN DEFAULT false,

  -- Operational parameters
  min_load_mw DECIMAL(6, 3),
  max_load_mw DECIMAL(6, 3),

  -- Maintenance
  commissioning_date TIMESTAMP,
  last_well_workover TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geothermal_facility_asset_id ON geothermal_facility_metadata(asset_id);
CREATE INDEX idx_geothermal_facility_type ON geothermal_facility_metadata(facility_type);
```

#### 1.2 Create Energy-Specific Work Order Templates

```sql
-- Example: Hydro work order templates
CREATE TABLE hydro_work_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template metadata
  template_name VARCHAR(200) NOT NULL,
  template_code VARCHAR(50) NOT NULL,
  description TEXT,

  -- Hydro-specific maintenance type
  maintenance_category VARCHAR(50), -- 'turbine', 'generator', 'dam', 'intake', 'penstock'

  -- Work order defaults
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_type VARCHAR(20) DEFAULT 'preventive',
  estimated_duration_hours DECIMAL(6, 2),

  -- Checklist
  checklist_items TEXT, -- JSON
  required_skills TEXT, -- JSON
  safety_requirements TEXT, -- JSON
  typical_parts TEXT, -- JSON

  -- Frequency
  frequency_days INTEGER,
  frequency_description VARCHAR(200),

  -- Active
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### Phase 2: Weather Data Integration (Required)

Each energy type requires specific environmental/weather data for forecasting.

#### 2.1 Identify Required Weather Parameters

| Energy Type | Key Weather Parameters | Primary Data Sources |
|-------------|------------------------|---------------------|
| **Solar** | GHI, DNI, DHI, temperature, cloud cover | Solcast, NREL, OpenWeatherMap |
| **Wind** | Wind speed, direction, air density, gusts | NOAA, OpenWeatherMap, WindGuru |
| **Hydro** | Precipitation, river flow, water level, snowpack | USGS, NOAA, local gauges |
| **Geothermal** | Ground temperature, seismic activity | USGS, local monitoring |
| **Tidal** | Tide height, current speed, lunar phase | NOAA Tides & Currents |
| **Biomass** | Temperature, humidity (for storage) | OpenWeatherMap |

#### 2.2 Extend Weather Forecast Schema

The existing `weather_forecasts` table is extensible. Add new columns for energy-specific data:

```sql
-- Migration: 022_add_hydro_weather_fields.sql

ALTER TABLE weather_forecasts
ADD COLUMN precipitation_mm_24h DECIMAL(6, 2),     -- 24-hour precipitation
ADD COLUMN snow_water_equivalent_mm DECIMAL(6, 2), -- Snowpack
ADD COLUMN river_flow_m3s DECIMAL(8, 2),          -- River discharge
ADD COLUMN reservoir_level_m DECIMAL(6, 2);       -- Water level

-- Migration: 023_add_tidal_weather_fields.sql

ALTER TABLE weather_forecasts
ADD COLUMN tide_height_m DECIMAL(5, 2),           -- Tide height above datum
ADD COLUMN current_speed_ms DECIMAL(5, 2),        -- Tidal current speed
ADD COLUMN current_direction_deg INTEGER,         -- Current direction
ADD COLUMN lunar_phase VARCHAR(20);               -- Moon phase

-- Add comments
COMMENT ON COLUMN weather_forecasts.river_flow_m3s IS 'River discharge rate for hydro forecasting';
COMMENT ON COLUMN weather_forecasts.tide_height_m IS 'Tide height above mean lower low water (MLLW)';
```

#### 2.3 Implement Weather API Service

**Example: Hydroelectric Water Flow API**

```typescript
// backend/src/services/weather-api.service.ts

/**
 * Fetch water flow data from USGS Water Services
 * For hydroelectric forecasting
 */
async fetchHydroWaterFlow(
  siteLocation: SiteLocation,
  usgsGaugeId: string,
  hours: number = 24
): Promise<WeatherForecast[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    // USGS Instantaneous Values Web Service
    // https://waterservices.usgs.gov/rest/IV-Service.html
    const response = await axios.get(
      'https://waterservices.usgs.gov/nwis/iv/',
      {
        params: {
          sites: usgsGaugeId,              // USGS site number (e.g., '01646500')
          parameterCd: '00060,00065',      // 00060=Discharge, 00065=Gage height
          startDT: startDate.toISOString(),
          endDT: endDate.toISOString(),
          format: 'json',
        },
      }
    );

    const timeSeries = response.data.value.timeSeries;
    const forecasts: WeatherForecast[] = [];

    for (const series of timeSeries) {
      const variable = series.variable.variableCode[0].value;
      const values = series.values[0].value;

      for (const dataPoint of values) {
        const timestamp = new Date(dataPoint.dateTime);
        const value = parseFloat(dataPoint.value);

        let forecast = forecasts.find(f =>
          f.forecastTimestamp.getTime() === timestamp.getTime()
        );

        if (!forecast) {
          forecast = {
            id: '',
            siteId: siteLocation.siteId,
            forecastTimestamp: timestamp,
            fetchedAt: new Date(),
            source: 'usgs',
            forecastType: 'current' as const,
          };
          forecasts.push(forecast);
        }

        // Map USGS parameter codes
        if (variable === '00060') {
          // Discharge in cubic feet per second -> convert to m³/s
          forecast.riverFlowM3s = value * 0.0283168;
        } else if (variable === '00065') {
          // Gage height in feet -> convert to meters
          forecast.reservoirLevelM = value * 0.3048;
        }
      }
    }

    // Save to database
    await this.saveWeatherForecasts(forecasts);

    return forecasts;
  } catch (error) {
    console.error('Error fetching USGS water flow data:', error);
    throw new Error('Failed to fetch hydro water flow data');
  }
}

/**
 * Fetch tidal data from NOAA Tides & Currents API
 * For tidal energy forecasting
 */
async fetchTidalData(
  siteLocation: SiteLocation,
  noaaStationId: string,
  hours: number = 24
): Promise<WeatherForecast[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    // NOAA CO-OPS API
    // https://api.tidesandcurrents.noaa.gov/api/prod/
    const response = await axios.get(
      'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
      {
        params: {
          station: noaaStationId,          // NOAA station ID (e.g., '8454000')
          product: 'predictions',          // Tide predictions
          datum: 'MLLW',                   // Mean Lower Low Water
          time_zone: 'gmt',
          units: 'metric',
          format: 'json',
          begin_date: startDate.toISOString().split('T')[0].replace(/-/g, ''),
          end_date: endDate.toISOString().split('T')[0].replace(/-/g, ''),
          interval: 'h',                   // Hourly
        },
      }
    );

    const predictions = response.data.predictions;
    const forecasts: WeatherForecast[] = [];

    for (const pred of predictions) {
      forecasts.push({
        id: '',
        siteId: siteLocation.siteId,
        forecastTimestamp: new Date(pred.t),
        fetchedAt: new Date(),
        source: 'noaa_tides',
        forecastType: 'forecast' as const,
        tideHeightM: parseFloat(pred.v),
        rawApiResponse: pred,
      });
    }

    // Fetch current speed (separate API call)
    const currentResponse = await axios.get(
      'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
      {
        params: {
          station: noaaStationId,
          product: 'currents',
          bin: '1',                        // Surface bin
          time_zone: 'gmt',
          units: 'metric',
          format: 'json',
          begin_date: startDate.toISOString().split('T')[0].replace(/-/g, ''),
          end_date: endDate.toISOString().split('T')[0].replace(/-/g, ''),
        },
      }
    );

    // Merge current data with tide forecasts
    if (currentResponse.data.data) {
      for (const current of currentResponse.data.data) {
        const timestamp = new Date(current.t);
        const forecast = forecasts.find(f =>
          Math.abs(f.forecastTimestamp.getTime() - timestamp.getTime()) < 60000
        );

        if (forecast) {
          forecast.currentSpeedMs = parseFloat(current.s);
          forecast.currentDirectionDeg = parseFloat(current.d);
        }
      }
    }

    await this.saveWeatherForecasts(forecasts);
    return forecasts;
  } catch (error) {
    console.error('Error fetching NOAA tidal data:', error);
    throw new Error('Failed to fetch tidal data');
  }
}
```

---

### Phase 3: ML Model Implementation (Required for Forecasting)

#### 3.1 Create Energy-Specific Forecaster Class

**Example: Hydroelectric Forecaster**

```python
# ml/models/hydro_forecast.py

import numpy as np
import pandas as pd
from typing import Dict, Optional
from .arima_forecast import PowerGenerationForecaster

class HydroGenerationForecaster(PowerGenerationForecaster):
    """
    SARIMA model for hydroelectric power generation forecasting.

    Forecast Horizon: 24-168 hours (1-7 days)
    Performance Target: MAPE <12% (better than solar/wind due to water storage)
    """

    def __init__(self):
        super().__init__(
            model_name="sarima_hydro",
            model_version="v1.0",
            algorithm="SARIMA",
        )
        # Hydro has daily + weekly seasonality
        self.seasonal_period = 24  # Daily cycle
        self.secondary_seasonal = 168  # Weekly cycle (7 days * 24 hours)

    def fit_hydro_model(
        self,
        generation_data: pd.DataFrame,
        water_data: pd.DataFrame,
    ) -> None:
        """
        Fit SARIMA model for hydro generation.

        Args:
            generation_data: Historical hydro generation (hourly)
            water_data: Water flow, reservoir level, precipitation data
        """
        # Prepare data
        df = self.prepare_data(generation_data, water_data)

        # Exogenous features for hydro forecasting
        exog_columns = [
            "river_flow_m3s",           # Most important: water availability
            "reservoir_level_m",        # Storage level
            "precipitation_mm_24h",     # Inflow prediction
            "snow_water_equivalent_mm", # Snowpack (seasonal factor)
        ]

        # Ensure all exogenous columns exist
        exog_columns = [col for col in exog_columns if col in df.columns]

        # Fit SARIMA model
        # Hydro is more predictable than solar/wind due to water storage
        self.fit(
            data=df,
            target_column="generation_mw",
            exog_columns=exog_columns if exog_columns else None,
            seasonal_period=self.seasonal_period,
            auto_tune=True,
        )

    def forecast_hydro(
        self,
        hours_ahead: int = 24,
        water_forecast: Optional[pd.DataFrame] = None,
    ) -> Dict:
        """
        Generate hydro generation forecast.

        Args:
            hours_ahead: Forecast horizon in hours (default 24, max 168)
            water_forecast: Future water flow and precipitation forecast

        Returns:
            Forecast dictionary with predictions and confidence intervals
        """
        return self.forecast(steps=hours_ahead, exog_future=water_forecast)

    def calculate_hydro_power(
        self,
        flow_m3s: float,
        head_m: float,
        efficiency: float = 0.90
    ) -> float:
        """
        Calculate theoretical hydro power using hydraulic formula.
        P = ρ × g × Q × H × η

        Args:
            flow_m3s: Water flow rate (m³/s)
            head_m: Hydraulic head (m)
            efficiency: Overall efficiency (turbine + generator)

        Returns:
            Power in MW
        """
        rho = 1000  # Water density (kg/m³)
        g = 9.81    # Gravity (m/s²)

        power_watts = rho * g * flow_m3s * head_m * efficiency
        power_mw = power_watts / 1_000_000

        return power_mw


class TidalGenerationForecaster(PowerGenerationForecaster):
    """
    SARIMA model for tidal power generation forecasting.

    Forecast Horizon: 24-48 hours
    Performance Target: MAPE <10% (tides are highly predictable)
    """

    def __init__(self):
        super().__init__(
            model_name="sarima_tidal",
            model_version="v1.0",
            algorithm="SARIMA",
        )
        # Tidal cycles: ~12.4 hours (semi-diurnal) and ~24.8 hours (diurnal)
        self.seasonal_period = 12  # Approximate 12-hour tidal cycle

    def fit_tidal_model(
        self,
        generation_data: pd.DataFrame,
        tidal_data: pd.DataFrame,
    ) -> None:
        """
        Fit SARIMA model for tidal generation.

        Args:
            generation_data: Historical tidal generation (15-minute intervals)
            tidal_data: Tide height, current speed, lunar phase data
        """
        df = self.prepare_data(generation_data, tidal_data)

        exog_columns = [
            "tide_height_m",        # Water level
            "current_speed_ms",     # Current velocity (most important)
            "current_direction_deg", # Flow direction
        ]

        exog_columns = [col for col in exog_columns if col in df.columns]

        self.fit(
            data=df,
            target_column="generation_mw",
            exog_columns=exog_columns if exog_columns else None,
            seasonal_period=self.seasonal_period,
            auto_tune=True,
        )

    def calculate_tidal_power(
        self,
        current_speed_ms: float,
        rotor_area_m2: float,
        efficiency: float = 0.40
    ) -> float:
        """
        Calculate tidal stream power.
        P = 0.5 × ρ × A × v³ × η

        Args:
            current_speed_ms: Tidal current speed (m/s)
            rotor_area_m2: Turbine rotor swept area (m²)
            efficiency: Power coefficient (Cp), typically 0.35-0.45

        Returns:
            Power in MW
        """
        rho = 1025  # Seawater density (kg/m³)

        power_watts = 0.5 * rho * rotor_area_m2 * (current_speed_ms ** 3) * efficiency
        power_mw = power_watts / 1_000_000

        return power_mw
```

#### 3.2 Extend Mock Forecast Generation

```typescript
// backend/src/services/forecast.service.ts

private generateMockForecast(hours: number, energyType: string): any {
  const forecast = [];
  const lowerBound = [];
  const upperBound = [];
  const stdDev = [];

  for (let i = 0; i < hours; i++) {
    let value = 0;

    switch (energyType) {
      case 'solar':
        // Solar: Peak at noon, zero at night
        const hour = (new Date().getHours() + i) % 24;
        const solarRadiation = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
        const cloudFactor = 0.8 + Math.random() * 0.2;
        value = 10 * solarRadiation * cloudFactor;
        break;

      case 'wind':
        // Wind: Weibull distribution + power curve
        const windSpeed = this.weibullRandom(2.0, 8.0);
        const cutInSpeed = 3.0;
        const ratedSpeed = 12.5;
        const cutOutSpeed = 25.0;
        const ratedPower = 10.0;

        if (windSpeed < cutInSpeed || windSpeed > cutOutSpeed) {
          value = 0;
        } else if (windSpeed >= ratedSpeed) {
          value = ratedPower;
        } else {
          value = ratedPower * Math.pow((windSpeed - cutInSpeed) / (ratedSpeed - cutInSpeed), 3);
        }
        value *= (0.95 + Math.random() * 0.1);
        break;

      case 'hydro':
        // Hydro: Base load + seasonal variation
        // More stable than solar/wind due to water storage
        const baseLoad = 8.0;  // Base generation (MW)
        const seasonalFactor = 1.0 + 0.3 * Math.sin((i / 168) * 2 * Math.PI); // Weekly cycle
        const dailyVariation = 0.1 * Math.sin((i / 24) * 2 * Math.PI); // Small daily variation
        value = baseLoad * seasonalFactor * (1 + dailyVariation);
        // Small random variation (hydro is predictable)
        value *= (0.98 + Math.random() * 0.04);
        break;

      case 'geothermal':
        // Geothermal: Very stable base load
        // Minimal variation (geothermal is the most predictable)
        const geothermalBase = 7.5;
        // Tiny maintenance-related variation
        value = geothermalBase * (0.99 + Math.random() * 0.02);
        break;

      case 'tidal':
        // Tidal: Sinusoidal pattern following tidal cycles
        // 2 tides per day (semi-diurnal), ~12.4 hour period
        const tidalPeriod = 12.4;
        const tidalPhase = (i / tidalPeriod) * 2 * Math.PI;
        const tidalAmplitude = 6.0;  // MW
        // Tides are very predictable
        value = tidalAmplitude * Math.abs(Math.sin(tidalPhase));
        // Minimal random variation
        value *= (0.98 + Math.random() * 0.04);
        break;

      case 'biomass':
        // Biomass: Steady base load with fuel availability variations
        const biomassBase = 5.0;
        // Small variation based on fuel quality/availability
        const fuelVariation = 0.9 + Math.random() * 0.2;
        value = biomassBase * fuelVariation;
        break;

      default:
        // Generic: Flat load
        value = 5.0 + Math.random() * 2.0;
    }

    forecast.push(value);
    lowerBound.push(value * 0.85);
    upperBound.push(value * 1.15);
    stdDev.push(value * 0.075);
  }

  return {
    forecast,
    lower_bound: lowerBound,
    upper_bound: upperBound,
    std_dev: stdDev,
    model_name: `mock_${energyType}`,
    model_version: 'v1.0',
    algorithm: 'MOCK',
    model_accuracy_score: 0.85,
    training_data_end_date: new Date().toISOString(),
  };
}
```

---

### Phase 4: Service Layer Updates (Required)

#### 4.1 Update Energy Type Detection

```typescript
// backend/src/services/forecast.service.ts

private async detectEnergyType(siteId: string, assetId?: string): Promise<EnergyType> {
  // Check asset metadata first
  if (assetId) {
    const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));

    if (asset) {
      // Check type-specific metadata tables
      const [windTurbine] = await db.select().from(windTurbineMetadata)
        .where(eq(windTurbineMetadata.assetId, assetId));
      if (windTurbine) return 'wind';

      const [hydroFacility] = await db.select().from(hydroFacilityMetadata)
        .where(eq(hydroFacilityMetadata.assetId, assetId));
      if (hydroFacility) return 'hydro';

      const [geothermalFacility] = await db.select().from(geothermalFacilityMetadata)
        .where(eq(geothermalFacilityMetadata.assetId, assetId));
      if (geothermalFacility) return 'geothermal';

      // Check metadata JSON
      if (asset.metadata) {
        const metadata = JSON.parse(asset.metadata);
        if (metadata.energyType) return metadata.energyType;
      }

      // Infer from asset type
      const type = asset.type.toLowerCase();
      if (type.includes('wind') || type.includes('turbine')) return 'wind';
      if (type.includes('hydro') || type.includes('dam') || type.includes('penstock')) return 'hydro';
      if (type.includes('geothermal') || type.includes('well')) return 'geothermal';
      if (type.includes('tidal') || type.includes('wave')) return 'tidal';
      if (type.includes('biomass') || type.includes('biogas')) return 'biomass';
      if (type.includes('solar') || type.includes('panel')) return 'solar';
    }
  }

  // Check site
  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));

  if (site?.energyType) {
    return site.energyType;
  }

  // ... rest of detection logic

  throw new Error(`Unable to determine energy type for site ${siteId}`);
}
```

---

### Phase 5: API Documentation (Required)

#### 5.1 Update API Schemas

```typescript
// backend/src/routes/forecasts.ts

energyType: {
  type: 'string',
  enum: ['solar', 'wind', 'hydro', 'biomass', 'geothermal', 'tidal', 'hybrid']
}
```

#### 5.2 Add Energy-Specific Endpoints

```typescript
// backend/src/routes/hydro.ts

const hydroRoutes: FastifyPluginAsync = async (server) => {
  // Get hydro facility metadata
  server.get(
    '/facilities/:assetId/metadata',
    {
      schema: {
        description: 'Get hydroelectric facility technical specifications',
        tags: ['hydro'],
        params: {
          type: 'object',
          required: ['assetId'],
          properties: {
            assetId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              facilityType: { type: 'string' },
              ratedPowerMw: { type: 'number' },
              designHeadM: { type: 'number' },
              designFlowM3s: { type: 'number' },
              // ... other fields
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { assetId } = request.params as { assetId: string };

      const [metadata] = await db
        .select()
        .from(hydroFacilityMetadata)
        .where(eq(hydroFacilityMetadata.assetId, assetId));

      if (!metadata) {
        return reply.code(404).send({ error: 'Hydro facility not found' });
      }

      return reply.code(200).send(metadata);
    }
  );

  // Calculate theoretical power output
  server.post(
    '/power-calculation',
    {
      schema: {
        description: 'Calculate theoretical hydro power output',
        tags: ['hydro'],
        body: {
          type: 'object',
          required: ['flowM3s', 'headM'],
          properties: {
            flowM3s: { type: 'number', minimum: 0 },
            headM: { type: 'number', minimum: 0 },
            efficiency: { type: 'number', minimum: 0, maximum: 1, default: 0.9 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              powerMw: { type: 'number' },
              formula: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { flowM3s, headM, efficiency = 0.9 } = request.body as any;

      const rho = 1000; // kg/m³
      const g = 9.81;   // m/s²
      const powerWatts = rho * g * flowM3s * headM * efficiency;
      const powerMw = powerWatts / 1_000_000;

      return reply.code(200).send({
        powerMw,
        formula: 'P = ρ × g × Q × H × η',
      });
    }
  );
};
```

---

## 🎓 Energy Type Specifics

### Hydroelectric

**Key Characteristics**:
- Most predictable renewable energy (water storage acts as buffer)
- Forecasting depends on: river flow, reservoir level, precipitation, snowpack
- Can provide base load or peaking power
- Environmental constraints (minimum flow requirements)

**Data Requirements**:
- USGS stream gauge data (flow, water level)
- NOAA precipitation forecasts
- SNOTEL snowpack data (for snowmelt-fed systems)
- Reservoir management rules

**Power Calculation**:
```
P = ρ × g × Q × H × η
where:
  P = Power (watts)
  ρ = Water density (1000 kg/m³)
  g = Gravity (9.81 m/s²)
  Q = Flow rate (m³/s)
  H = Hydraulic head (m)
  η = Efficiency (0.85-0.95)
```

**Forecasting Challenges**:
- Balancing flood control vs power generation
- Seasonal variations (snowmelt, monsoons)
- Downstream constraints
- Multi-reservoir coordination

---

### Geothermal

**Key Characteristics**:
- Most stable renewable energy (base load)
- Minimal weather dependence
- Forecasting focuses on: reservoir pressure, well production, reinjection rates
- Very low variability (<5%)

**Data Requirements**:
- Wellhead pressure and temperature
- Steam/fluid production rates
- Reinjection rates
- Non-condensable gas levels
- Seismic monitoring (reservoir subsidence)

**Power Calculation**:
```
P = ṁ × h_available × η
where:
  P = Power (watts)
  ṁ = Mass flow rate (kg/s)
  h_available = Available enthalpy (J/kg)
  η = Thermal efficiency (0.10-0.25)
```

**Forecasting Challenges**:
- Long-term reservoir depletion
- Well productivity decline
- Scaling and corrosion (maintenance scheduling)
- Minimal short-term variation

---

### Tidal/Wave

**Key Characteristics**:
- Highly predictable (celestial mechanics)
- Diurnal and semi-diurnal cycles
- Forecasting depends on: astronomical tide predictions, current speed
- Weather can affect wave energy (not tidal stream)

**Data Requirements**:
- NOAA tidal predictions
- Current speed and direction measurements
- Wave height/period (for wave energy converters)
- Lunar phase data

**Power Calculation** (Tidal Stream):
```
P = 0.5 × ρ × A × v³ × Cp
where:
  P = Power (watts)
  ρ = Seawater density (1025 kg/m³)
  A = Rotor swept area (m²)
  v = Current velocity (m/s)
  Cp = Power coefficient (0.35-0.45)
```

**Forecasting Challenges**:
- Spring/neap tide cycles (14-day variation)
- Extreme current speeds (equipment protection)
- Marine growth (biofouling)
- Storm impacts on availability

---

### Biomass

**Key Characteristics**:
- Dispatchable (can control generation)
- Forecasting depends on: fuel availability, fuel quality, demand
- Weather affects fuel storage (humidity)
- Similar to fossil fuel plants operationally

**Data Requirements**:
- Fuel inventory levels
- Fuel heating value (calorific content)
- Boiler efficiency
- Demand forecasts

**Power Calculation**:
```
P = ṁfuel × LHV × ηboiler × ηturbine
where:
  P = Power (watts)
  ṁfuel = Fuel consumption rate (kg/s)
  LHV = Lower heating value (J/kg)
  ηboiler = Boiler efficiency (0.80-0.90)
  ηturbine = Turbine efficiency (0.30-0.40)
```

**Forecasting Challenges**:
- Fuel supply interruptions
- Seasonal fuel availability (agricultural waste)
- Fuel moisture content variations
- Maintenance outages

---

## 🧪 Testing & Validation

### Unit Tests

```typescript
// backend/test/unit/energy-type-detection.test.ts

describe('Energy Type Detection', () => {
  test('should detect hydro from hydro_facility_metadata', async () => {
    const siteId = 'test-site-id';
    const assetId = 'test-hydro-asset-id';

    // Create hydro facility metadata
    await db.insert(hydroFacilityMetadata).values({
      assetId: assetId,
      facilityType: 'run_of_river',
      ratedPowerMw: 25.0,
      // ...
    });

    const energyType = await forecastService.detectEnergyType(siteId, assetId);
    expect(energyType).toBe('hydro');
  });

  test('should detect geothermal from site energyType field', async () => {
    const site = await createTestSite({ energyType: 'geothermal' });
    const energyType = await forecastService.detectEnergyType(site.id);
    expect(energyType).toBe('geothermal');
  });
});
```

### Integration Tests

```typescript
// backend/test/integration/hydro-forecast.test.ts

describe('Hydro Forecast Generation', () => {
  test('should generate forecast using water flow data', async () => {
    const hydroSite = await createTestSite({ energyType: 'hydro' });

    // Mock USGS water data
    nock('https://waterservices.usgs.gov')
      .get('/nwis/iv/')
      .query(true)
      .reply(200, mockUSGSResponse);

    const forecast = await forecastService.generateForecast({
      siteId: hydroSite.id,
      forecastHorizonHours: 24,
    });

    expect(forecast).toHaveLength(24);
    expect(forecast[0].modelName).toContain('hydro');
  });
});
```

---

## 📋 Deployment Checklist

### For Each New Energy Type

- [ ] **Database Schema**
  - [ ] Create `{type}_metadata` table
  - [ ] Create `{type}_work_order_templates` table
  - [ ] Add weather fields to `weather_forecasts` if needed
  - [ ] Create migration script
  - [ ] Test migration on staging database

- [ ] **Weather API**
  - [ ] Identify primary data source(s)
  - [ ] Implement API integration method
  - [ ] Add fallback logic
  - [ ] Document API keys in `.env.example`
  - [ ] Test API with real data

- [ ] **ML Model**
  - [ ] Create `{Type}GenerationForecaster` class
  - [ ] Implement power calculation formula
  - [ ] Create mock forecast logic
  - [ ] Train initial model with sample data
  - [ ] Validate forecast accuracy

- [ ] **Service Layer**
  - [ ] Update energy type detection logic
  - [ ] Add type-specific metadata queries
  - [ ] Update mock forecast generation
  - [ ] Add energy-specific calculations

- [ ] **API Layer**
  - [ ] Update enum in route schemas
  - [ ] Create type-specific endpoints (optional)
  - [ ] Update API documentation
  - [ ] Add examples to API docs

- [ ] **Testing**
  - [ ] Unit tests for detection
  - [ ] Unit tests for power calculations
  - [ ] Integration tests for forecasts
  - [ ] E2E tests for full workflow
  - [ ] Load testing with realistic data

- [ ] **Documentation**
  - [ ] Add to `ADDING_NEW_ENERGY_TYPES.md`
  - [ ] Update API documentation
  - [ ] Create operator guide
  - [ ] Add troubleshooting section

- [ ] **Deployment**
  - [ ] Deploy to staging
  - [ ] Run migration
  - [ ] Configure API keys
  - [ ] Test with real sites
  - [ ] Monitor for errors
  - [ ] Deploy to production

---

## 🔮 Future Enhancements

### Energy Storage Integration

```typescript
// Treat batteries as special "energy type"
export const energyTypeEnum = pgEnum('energy_type', [
  // ... existing
  'battery_storage',
  'pumped_hydro_storage',
  'compressed_air_storage',
]);

// Battery metadata
CREATE TABLE battery_storage_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE,

  -- Capacity
  rated_power_mw DECIMAL(6, 3),
  energy_capacity_mwh DECIMAL(8, 3),

  -- Performance
  round_trip_efficiency DECIMAL(5, 4),  -- Charge/discharge efficiency
  state_of_charge DECIMAL(5, 4),        -- Current SOC (0-1)

  -- Operational constraints
  max_charge_rate_mw DECIMAL(6, 3),
  max_discharge_rate_mw DECIMAL(6, 3),
  min_state_of_charge DECIMAL(5, 4),    -- DOD limit
  max_state_of_charge DECIMAL(5, 4),

  -- Degradation
  cycle_count INTEGER,
  capacity_degradation_percent DECIMAL(5, 2),

  -- Chemistry
  battery_chemistry VARCHAR(50),         -- 'lithium_ion', 'flow_battery', etc.
);
```

### Hybrid Sites

```typescript
// Sites with multiple energy types
CREATE TABLE hybrid_site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),

  -- Energy mix
  energy_types JSONB NOT NULL,
  -- Example: [
  --   {"type": "solar", "capacity_mw": 50, "asset_ids": [...]},
  --   {"type": "wind", "capacity_mw": 30, "asset_ids": [...]},
  --   {"type": "battery_storage", "capacity_mw": 20, "asset_ids": [...]}
  -- ]

  -- Hybrid optimization strategy
  dispatch_strategy VARCHAR(50),  -- 'peak_shaving', 'load_following', 'arbitrage'
  priority_order TEXT,            -- JSON array of energy types in dispatch order
);
```

---

## 📚 Resources

### Data Sources by Energy Type

| Energy Type | Data Source | API | Cost | Coverage |
|-------------|-------------|-----|------|----------|
| Solar | Solcast | REST | Free tier | Global |
| Solar | NREL NSRDB | REST | Free | USA |
| Wind | NOAA | REST | Free | USA |
| Wind | OpenWeatherMap | REST | Free tier | Global |
| Hydro | USGS Water Services | REST | Free | USA |
| Hydro | Environment Canada | REST | Free | Canada |
| Tidal | NOAA Tides & Currents | REST | Free | USA |
| Tidal | UK Admiralty | Commercial | Paid | UK |
| Geothermal | USGS Earthquake | REST | Free | USA |
| General | OpenWeatherMap | REST | Free tier | Global |

### Calculation Formulas

**Hydro Power**: `P = ρ × g × Q × H × η`
**Wind Power**: `P = 0.5 × ρ × A × v³ × Cp`
**Solar Power**: `P = A × I × η`
**Tidal Power**: `P = 0.5 × ρ × A × v³ × Cp`
**Geothermal**: `P = ṁ × Δh × η`

### Standards & Regulations

- **IEC 61400**: Wind turbine standards
- **IEEE 1547**: Interconnection standards
- **FERC**: Hydroelectric licensing (USA)
- **NERC**: Grid reliability standards

---

## 💡 Best Practices

1. **Start with Mock Forecasts**: Implement realistic mock generation before integrating real ML models
2. **Gradual Rollout**: Deploy one energy type at a time, validate, then add next
3. **Consistent Patterns**: Follow the solar/wind implementation pattern for consistency
4. **Comprehensive Testing**: Test edge cases (zero generation, maximum capacity, outages)
5. **Documentation**: Document all assumptions, formulas, and data sources
6. **Monitoring**: Set up alerts for forecast accuracy degradation
7. **Versioning**: Version all ML models and track accuracy metrics over time

---

## 🤝 Contributing

When adding a new energy type:

1. Create feature branch: `feature/add-{energy-type}-support`
2. Follow this guide step-by-step
3. Include tests for all components
4. Update this documentation with energy-specific details
5. Create PR with detailed description
6. Request review from ML and backend teams

---

**Questions?** Contact:
- Architecture: architecture@dcmms.io
- ML/Forecasting: ml-team@dcmms.io
- Data Engineering: data-engineering@dcmms.io

**Last Updated**: November 19, 2025
**Next Review**: Sprint 22 (Q1 2026)
