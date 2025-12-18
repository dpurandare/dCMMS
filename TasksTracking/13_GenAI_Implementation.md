# 13. GenAI Document Intelligence

**Focus:** RAG Pipeline, Vector DB, Chat Interface (Strategic)
**Specs Covered:** 26 (GenAI Document Intelligence)

## Phase 1: Infrastructure & Spike

- [x] **DCMMS-GENAI-01** - Vector Database Setup
  - [x] Enable `pgvector` extension on PostgreSQL
  - [x] Implement schema migration for `document_embeddings` table
- [x] **DCMMS-GENAI-02** - Ingestion Pipeline Guidelines
  - [x] Select chunking strategy (RecursiveCharacterTextSplitter)
  - [x] Choose embedding model (Gemini text-embedding-004)
- [x] **DCMMS-GENAI-03** - Tech Spike: Simple RAG
  - [x] Ingest 5 sample PDFs (Manuals) (Verified with sample text)
  - [x] Run test queries via script

## Phase 2: Core Implementation

- [x] **DCMMS-GENAI-04** - Ingestion API Service
  - [x] `POST /api/v1/genai/upload` endpoint
  - [x] PDF text extraction (pdf-parse)
  - [x] Metadata extraction (Asset Type, Error Codes)
- [x] **DCMMS-GENAI-05** - Query API Service
  - [x] `POST /api/v1/genai/chat` endpoint
  - [x] Context retrieval logic
  - [x] LLM Prompt Engineering (Gemini 2.5 Flash)
    - [x] Maintenance-specific domain expertise
    - [x] Structured response format
    - [x] Citation system with numbered references
- [x] **DCMMS-GENAI-06** - Frontend Chat Interface
  - [x] Chat Component (Input, History)
  - [x] Citation Display UI
- [x] **DCMMS-GENAI-06b** - Document Management UI
  - [x] Drag & Drop Upload Page
  - [x] Job Status Tracking with Progress Bar
  - [x] Document List & Status View

## Phase 3: Production Hardening

- [x] **DCMMS-GENAI-07** - Background Queue
  - [x] Move ingestion to BullMQ (async processing)
  - [x] Job status tracking endpoint
  - [x] Progress polling implementation
- [x] **DCMMS-GENAI-08** - Security & RBAC
  - [x] Filter embeddings by Tenant access (tenant-level only)
  - [x] Enable authentication on all GenAI routes
  - [x] Update service methods to accept and use tenantId
  - [x] Update queue worker to store tenantId
- [x] **DCMMS-GENAI-09** - Feedback Loop
  - [x] Create chat_feedback table schema
  - [x] Implement backend feedback API endpoint
  - [x] Add thumbs up/down UI to chat interface
  - [x] Store feedback with query, answer, rating, and context IDs
