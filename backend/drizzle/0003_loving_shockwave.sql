ALTER TABLE "sites" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "contact_name" varchar(100);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "contact_phone" varchar(50);