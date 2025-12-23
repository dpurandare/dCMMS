-- Add tenant_id and site_id columns to document_embeddings
ALTER TABLE "document_embeddings" ADD COLUMN "tenant_id" uuid NOT NULL;
ALTER TABLE "document_embeddings" ADD COLUMN "site_id" uuid;

-- Add foreign key constraints
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE cascade ON UPDATE no action;

-- Create genai_feedback table
CREATE TABLE IF NOT EXISTS "genai_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"answer" text NOT NULL,
	"rating" varchar(10) NOT NULL,
	"context_ids" text NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for genai_feedback
ALTER TABLE "genai_feedback" ADD CONSTRAINT "genai_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "genai_feedback" ADD CONSTRAINT "genai_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "document_embeddings_tenant_id_idx" ON "document_embeddings" ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_embeddings_site_id_idx" ON "document_embeddings" ("site_id");
CREATE INDEX IF NOT EXISTS "genai_feedback_tenant_id_idx" ON "genai_feedback" ("tenant_id");
CREATE INDEX IF NOT EXISTS "genai_feedback_user_id_idx" ON "genai_feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "genai_feedback_rating_idx" ON "genai_feedback" ("rating");
CREATE INDEX IF NOT EXISTS "genai_feedback_created_at_idx" ON "genai_feedback" ("created_at");
