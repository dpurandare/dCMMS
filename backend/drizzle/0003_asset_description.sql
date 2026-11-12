-- The assets table never had a `description` column, but the API schemas and the web edit form
-- both accept one, so it was silently discarded on every create/update (found by the REV-038
-- asset-update tests). Additive and nullable: safe on existing data.
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "description" text;
