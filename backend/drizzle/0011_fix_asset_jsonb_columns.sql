-- Migration: Fix asset schema drift (location and metadata to jsonb)
-- Safe idempotent migration: skips the ALTER if columns are already jsonb.

DO $$
BEGIN
  -- Convert location from text to jsonb (only if currently text)
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assets'
      AND column_name = 'location'
  ) = 'text' THEN
    ALTER TABLE assets
      ALTER COLUMN location TYPE jsonb USING
        CASE
          WHEN location IS NULL THEN NULL
          ELSE location::jsonb
        END;
  END IF;

  -- Convert metadata from text to jsonb (only if currently text)
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assets'
      AND column_name = 'metadata'
  ) = 'text' THEN
    ALTER TABLE assets
      ALTER COLUMN metadata TYPE jsonb USING
        COALESCE(metadata::jsonb, '{}');
  END IF;
END
$$;
