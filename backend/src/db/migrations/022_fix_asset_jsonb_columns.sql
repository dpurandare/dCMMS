-- Migration: Fix asset table schema drift
-- Converts location and metadata columns from text to jsonb to match actual DB state.
-- Uses a safe DO block so this migration is idempotent — safe to run even if the
-- columns are already jsonb (the ALTER is skipped in that case).

DO $$
BEGIN
  -- Convert location from text to jsonb (if still text)
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'location'
  ) = 'text' THEN
    ALTER TABLE assets
      ALTER COLUMN location TYPE jsonb USING
        CASE
          WHEN location IS NULL THEN NULL
          ELSE location::jsonb
        END;
    RAISE NOTICE 'assets.location converted from text to jsonb';
  ELSE
    RAISE NOTICE 'assets.location is already jsonb — skipping';
  END IF;

  -- Convert metadata from text to jsonb (if still text)
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'metadata'
  ) = 'text' THEN
    ALTER TABLE assets
      ALTER COLUMN metadata TYPE jsonb USING
        COALESCE(metadata::jsonb, '{}');
    RAISE NOTICE 'assets.metadata converted from text to jsonb';
  ELSE
    RAISE NOTICE 'assets.metadata is already jsonb — skipping';
  END IF;
END
$$;
