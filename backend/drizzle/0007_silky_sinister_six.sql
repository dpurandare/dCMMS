CREATE TABLE IF NOT EXISTS "document_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"embedding" "vector(1536)",
	"created_at" timestamp DEFAULT now() NOT NULL
);
