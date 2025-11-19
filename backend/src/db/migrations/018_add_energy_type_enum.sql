-- ==========================================
-- Migration: Add Energy Type Enum and Column
-- Sprint: 19 (DCMMS-158 - Energy Bias Fix)
-- Date: 2025-11-19
-- ==========================================
-- Description:
--   Adds energy_type enum and column to sites table to fix solar bias
--   in forecast generation. Migrates existing sites based on wind turbine
--   metadata presence.
-- ==========================================

-- Create energy_type enum
CREATE TYPE energy_type AS ENUM (
  'solar',
  'wind',
  'hydro',
  'biomass',
  'geothermal',
  'hybrid'
);

-- Add energy_type column to sites table
ALTER TABLE sites
ADD COLUMN energy_type energy_type;

-- Migrate existing data: Mark sites with wind turbines as 'wind'
UPDATE sites
SET energy_type = 'wind'
WHERE id IN (
  SELECT DISTINCT a.site_id
  FROM assets a
  INNER JOIN wind_turbine_metadata wtm ON a.id = wtm.asset_id
);

-- Migrate existing data: Infer from site type field
UPDATE sites
SET energy_type = 'wind'
WHERE energy_type IS NULL
  AND (
    LOWER(type) LIKE '%wind%'
    OR LOWER(name) LIKE '%wind%'
  );

UPDATE sites
SET energy_type = 'solar'
WHERE energy_type IS NULL
  AND (
    LOWER(type) LIKE '%solar%'
    OR LOWER(name) LIKE '%solar%'
  );

-- Migrate existing data: Check config JSON for energyType
UPDATE sites
SET energy_type = CASE
  WHEN config::jsonb->>'energyType' = 'wind' THEN 'wind'::energy_type
  WHEN config::jsonb->>'energyType' = 'solar' THEN 'solar'::energy_type
  WHEN config::jsonb->>'energyType' = 'hydro' THEN 'hydro'::energy_type
  WHEN config::jsonb->>'energyType' = 'biomass' THEN 'biomass'::energy_type
  WHEN config::jsonb->>'energyType' = 'geothermal' THEN 'geothermal'::energy_type
  WHEN config::jsonb->>'energyType' = 'hybrid' THEN 'hybrid'::energy_type
  ELSE NULL
END
WHERE energy_type IS NULL
  AND config IS NOT NULL
  AND config::jsonb->>'energyType' IS NOT NULL;

-- Default remaining sites to solar (legacy behavior, but now explicit)
-- NOTE: Sites should have energyType specified going forward
UPDATE sites
SET energy_type = 'solar'
WHERE energy_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN sites.energy_type IS 'Type of energy generation: solar, wind, hydro, biomass, geothermal, or hybrid. Used for forecast model selection and weather API routing.';

-- Create index for faster energy type queries
CREATE INDEX idx_sites_energy_type ON sites(energy_type);

-- ==========================================
-- Rollback Script (if needed):
-- ==========================================
-- DROP INDEX IF EXISTS idx_sites_energy_type;
-- ALTER TABLE sites DROP COLUMN IF EXISTS energy_type;
-- DROP TYPE IF EXISTS energy_type;
