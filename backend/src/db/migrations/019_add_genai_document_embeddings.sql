-- ==========================================
-- Migration: Add GenAI Document Embeddings with RBAC
-- Sprint: 26 (DCMMS-GENAI-08 - Security & RBAC)
-- Date: 2025-12-18
-- ==========================================
-- Description:
--   Creates document_embeddings table with pgvector support
--   and tenant-level RBAC filtering for GenAI features.
-- ==========================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table with tenant_id for RBAC
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB, -- store source_file, page_number, asset_id, etc.
    embedding vector(768), -- Gemini text-embedding-004 uses 768 dimensions
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_document_embeddings_tenant_id ON document_embeddings(tenant_id);
CREATE INDEX idx_document_embeddings_embedding ON document_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_document_embeddings_metadata ON document_embeddings USING gin(metadata);

-- Add comments for documentation
COMMENT ON TABLE document_embeddings IS 'Stores document chunks and their vector embeddings for GenAI RAG pipeline with tenant-level RBAC';
COMMENT ON COLUMN document_embeddings.tenant_id IS 'Tenant ID for RBAC filtering - users can only query documents from their tenant';
COMMENT ON COLUMN document_embeddings.metadata IS 'JSON metadata including source filename, page number, asset ID, etc.';
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding (768 dimensions for Gemini text-embedding-004)';

-- ==========================================
-- Rollback Script (if needed):
-- ==========================================
-- DROP INDEX IF EXISTS idx_document_embeddings_metadata;
-- DROP INDEX IF EXISTS idx_document_embeddings_embedding;
-- DROP INDEX IF EXISTS idx_document_embeddings_tenant_id;
-- DROP TABLE IF EXISTS document_embeddings;
