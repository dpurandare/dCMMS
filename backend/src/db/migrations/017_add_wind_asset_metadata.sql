-- Migration: Add Wind Turbine Asset Metadata
-- Description: Extends assets table with wind turbine-specific metadata and creates wind turbine templates
-- Author: dCMMS Development Team
-- Date: November 19, 2025
-- Sprint: 19 (DCMMS-154)

-- ==========================================
-- Wind Turbine Metadata Table
-- ==========================================

CREATE TABLE IF NOT EXISTS wind_turbine_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,

  -- Turbine specifications
  manufacturer VARCHAR(100), -- 'Vestas', 'GE', 'Siemens Gamesa', 'Nordex'
  model VARCHAR(100), -- 'V150-4.2 MW', 'GE 2.5-120'
  rated_power_mw DECIMAL(6, 3) NOT NULL, -- Rated power capacity (MW)
  rotor_diameter_m DECIMAL(6, 2), -- Rotor diameter (meters)
  hub_height_m DECIMAL(6, 2), -- Hub height (meters)
  number_of_blades INT DEFAULT 3, -- Typically 3

  -- Power curve
  cut_in_wind_speed_ms DECIMAL(5, 2), -- Cut-in wind speed (m/s) - turbine starts generating
  rated_wind_speed_ms DECIMAL(5, 2), -- Rated wind speed (m/s) - reaches rated power
  cut_out_wind_speed_ms DECIMAL(5, 2), -- Cut-out wind speed (m/s) - turbine shuts down
  power_curve_data JSONB, -- Full power curve: { "wind_speeds": [3,4,5,...], "power_output_kw": [0,50,150,...] }

  -- Blade specifications
  blade_length_m DECIMAL(6, 2),
  blade_material VARCHAR(100), -- 'Fiberglass', 'Carbon fiber'
  blade_serial_numbers JSONB, -- Array: ["BL001", "BL002", "BL003"]

  -- Gearbox
  gearbox_type VARCHAR(50), -- 'Planetary', 'Direct drive'
  gearbox_ratio VARCHAR(20), -- '1:97', 'N/A' for direct drive
  gearbox_manufacturer VARCHAR(100),

  -- Generator
  generator_type VARCHAR(50), -- 'DFIG', 'PMSG', 'SCIG'
  generator_rated_power_mw DECIMAL(6, 3),
  generator_voltage_kv DECIMAL(6, 2),
  generator_frequency_hz INT DEFAULT 50, -- 50 Hz or 60 Hz

  -- Control system
  control_system_type VARCHAR(100), -- 'Pitch-regulated', 'Stall-regulated'
  yaw_system_type VARCHAR(100), -- 'Active yaw', 'Passive yaw'
  pitch_control_type VARCHAR(100), -- 'Electrical', 'Hydraulic'

  -- Performance characteristics
  capacity_factor DECIMAL(5, 4), -- Typical capacity factor (0.25 = 25%)
  availability_target DECIMAL(5, 4), -- Target availability (0.95 = 95%)

  -- Operational limits
  max_operational_temp_c INT, -- Maximum operating temperature
  min_operational_temp_c INT, -- Minimum operating temperature
  max_wind_speed_survival_ms DECIMAL(6, 2), -- Survival wind speed

  -- Installation details
  commissioning_date DATE, -- When turbine was commissioned
  warranty_end_date DATE, -- Warranty expiration
  expected_lifetime_years INT DEFAULT 25, -- Typical wind turbine lifetime

  -- Maintenance
  last_major_service_date DATE,
  next_major_service_date DATE,
  service_interval_months INT DEFAULT 6, -- Preventive maintenance interval

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- Wind Turbine Telemetry Schema Extension
-- ==========================================
-- Note: Telemetry is stored in QuestDB, this is just documentation
-- Actual schema is in telemetry/schemas/wind_turbine_telemetry.avsc

COMMENT ON TABLE wind_turbine_metadata IS E'Wind turbine-specific metadata.\n\nTelemetry schema (QuestDB):\n- wind_speed_ms: Wind speed (m/s)\n- wind_direction_deg: Wind direction (0-360°)\n- power_output_kw: Power output (kW)\n- rotor_speed_rpm: Rotor speed (RPM)\n- generator_speed_rpm: Generator speed (RPM)\n- nacelle_position_deg: Nacelle yaw position (0-360°)\n- blade_pitch_angle_deg: Blade pitch angle (degrees)\n- turbulence_intensity: Turbulence intensity (0-1)\n- ambient_temperature_c: Ambient temperature (°C)\n- nacelle_temperature_c: Nacelle temperature (°C)\n- gearbox_oil_temperature_c: Gearbox oil temperature (°C)\n- gearbox_vibration_mms: Gearbox vibration (mm/s)\n- generator_bearing_temperature_c: Generator bearing temperature (°C)\n- grid_voltage_kv: Grid voltage (kV)\n- grid_frequency_hz: Grid frequency (Hz)\n- active_power_mw: Active power (MW)\n- reactive_power_mvar: Reactive power (MVAR)\n- power_factor: Power factor\n- availability_status: Boolean (1=available, 0=down)\n- alarm_codes: Alarm/fault codes (JSONB)';

-- ==========================================
-- Wind Work Order Templates Table
-- ==========================================

CREATE TABLE IF NOT EXISTS wind_work_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Template metadata
  template_name VARCHAR(200) NOT NULL,
  template_code VARCHAR(50) NOT NULL, -- 'WIND_BLADE_INSPECT', 'WIND_GEARBOX_MAINT'
  description TEXT,

  -- Work order defaults
  default_priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  default_type VARCHAR(20) DEFAULT 'preventive', -- 'corrective', 'preventive', 'predictive'
  estimated_duration_hours DECIMAL(6, 2), -- Estimated completion time

  -- Checklist
  checklist_items JSONB, -- Array of checklist items: [{"item": "Inspect blade surface", "required": true}]

  -- Required skills
  required_skills JSONB, -- Array: ["rope_access", "blade_repair", "composite_materials"]

  -- Safety requirements
  safety_requirements JSONB, -- Array: ["harness", "helmet", "rescue_plan"]

  -- Parts/materials typically needed
  typical_parts JSONB, -- Array: [{"part_code": "BLADE_TAPE", "quantity": 2}]

  -- Frequency (for preventive maintenance)
  frequency_days INT, -- Repeat every N days
  frequency_description VARCHAR(200), -- 'Every 6 months', 'Annual'

  -- Active status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_tenant_template_code UNIQUE (tenant_id, template_code)
);

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX idx_wind_turbine_metadata_asset
  ON wind_turbine_metadata(asset_id);

CREATE INDEX idx_wind_turbine_metadata_manufacturer
  ON wind_turbine_metadata(manufacturer, model);

CREATE INDEX idx_wind_turbine_metadata_service_due
  ON wind_turbine_metadata(next_major_service_date)
  WHERE next_major_service_date IS NOT NULL;

CREATE INDEX idx_wind_work_order_templates_tenant
  ON wind_work_order_templates(tenant_id, is_active);

CREATE INDEX idx_wind_work_order_templates_code
  ON wind_work_order_templates(template_code);

-- ==========================================
-- Seed Data: Wind Work Order Templates
-- ==========================================

-- Default wind work order templates (for tenant 00000000-0000-0000-0000-000000000001)
-- These will be seeded in backend/src/db/seeds/wind_templates.seed.ts

-- Template Categories:
-- 1. Blade Inspection & Maintenance
--    - WIND_BLADE_VISUAL_INSPECT (every 6 months)
--    - WIND_BLADE_DETAILED_INSPECT (annual)
--    - WIND_BLADE_REPAIR (as needed)
--    - WIND_BLADE_CLEANING (as needed)
--
-- 2. Gearbox Maintenance
--    - WIND_GEARBOX_OIL_CHANGE (annual)
--    - WIND_GEARBOX_INSPECT (every 6 months)
--    - WIND_GEARBOX_OVERHAUL (every 5 years)
--
-- 3. Generator Maintenance
--    - WIND_GENERATOR_INSPECT (annual)
--    - WIND_GENERATOR_BEARING_REPLACE (every 10 years)
--
-- 4. Yaw System Maintenance
--    - WIND_YAW_GREASE (every 6 months)
--    - WIND_YAW_BRAKE_INSPECT (annual)
--
-- 5. Electrical Systems
--    - WIND_ELECTRICAL_INSPECT (annual)
--    - WIND_SCADA_UPDATE (quarterly)
--
-- 6. Safety Systems
--    - WIND_LIGHTNING_PROTECT_INSPECT (annual)
--    - WIND_RESCUE_EQUIP_INSPECT (every 6 months)

-- ==========================================
-- Comments
-- ==========================================

COMMENT ON TABLE wind_turbine_metadata IS 'Wind turbine-specific technical specifications and metadata';
COMMENT ON COLUMN wind_turbine_metadata.power_curve_data IS 'Full power curve mapping wind speed to power output';
COMMENT ON COLUMN wind_turbine_metadata.generator_type IS 'DFIG=Doubly Fed Induction Generator, PMSG=Permanent Magnet Synchronous Generator, SCIG=Squirrel Cage Induction Generator';

COMMENT ON TABLE wind_work_order_templates IS 'Predefined work order templates for wind turbine maintenance tasks';
COMMENT ON COLUMN wind_work_order_templates.required_skills IS 'Skills required: rope_access, blade_repair, composite_materials, high_voltage, etc.';
