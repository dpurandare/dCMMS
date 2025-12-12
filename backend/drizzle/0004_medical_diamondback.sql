DO $$ BEGIN
 CREATE TYPE "asset_type" AS ENUM('inverter', 'transformer', 'panel', 'disconnector', 'meter', 'turbine', 'access_point', 'gateway', 'weather_station', 'sensor', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "type" SET DATA TYPE asset_type USING 'other'::asset_type;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "type" SET DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "tags" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "image" text;