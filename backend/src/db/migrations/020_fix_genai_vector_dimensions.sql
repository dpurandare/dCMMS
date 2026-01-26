-- ==========================================
-- Migration: Fix Vector Dimension for Gemini Embeddings
-- Date: 2026-01-26
-- ==========================================
-- Description:
--   The original migration created vector(768) which is correct,
--   but we need to ensure any existing data is cleared and the
--   dimension is properly set for Gemini text-embedding-004.
-- ==========================================

-- Drop the existing index (will be recreated)
DROP INDEX IF EXISTS idx_document_embeddings_embedding;

-- Alter the column type to ensure it's vector(768)
ALTER TABLE document_embeddings 
  ALTER COLUMN embedding TYPE vector(768);

-- Recreate the HNSW index
CREATE INDEX idx_document_embeddings_embedding 
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Add comment to clarify dimension
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding (768 dimensions for Gemini text-embedding-004, not OpenAI 1536)';
