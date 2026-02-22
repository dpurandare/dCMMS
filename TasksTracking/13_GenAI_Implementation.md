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
  - [x] Filter embeddings by Tenant/Site access
- [x] **DCMMS-GENAI-09** - Feedback Loop
  - [x] Implement Thumbs Up/Down logging

## Phase 4: Testing

- [x] **DCMMS-GENAI-10** - Backend CSRF Protection for GenAI Endpoints ✅
  - [x] CSRF middleware fully deployed on all state-changing GenAI routes
  - [x] Frontend CSRF token injection integrated in API client (`src/lib/csrf.ts`)
  - [x] Manual testing via browser/Postman confirmed working
  - [x] Frontend React app successfully uses all GenAI endpoints
  - **Completed:** January 25, 2026
  - **Status:** ✅ COMPLETE

- [ ] **DCMMS-GENAI-11** - Fix CSRF Cookie Handling in Integration Test Script
  - **Issue:** `backend/src/scripts/test_genai_api.ts` fails with `403 Invalid CSRF token` because `node-fetch` v2 does not automatically handle cookies (no cookie jar)
  - **Root Cause:** Test script manually extracts `Set-Cookie` header but doesn't send it back correctly in subsequent requests due to `node-fetch` v2 limitations with `SameSite=Strict` cookies
  - **Affected File:** `backend/src/scripts/test_genai_api.ts`
  - **Severity:** Low (testing infrastructure only — production API and frontend work correctly)
  - [ ] Option A (Recommended): Replace `node-fetch` with `undici` or add `tough-cookie` for proper cookie jar support
  - [ ] Option B: Migrate `test_genai_api.ts` to use Supertest (consistent with rest of backend test suite)
  - [ ] After fix, validate all GenAI endpoints: `POST /genai/upload`, `POST /genai/chat`, `GET /genai/documents`, `GET /genai/jobs/:id`
  - **Estimated Effort:** 2–3 hours
  - **Priority:** 🟡 MODERATE
  - **Status:** ⏳ PENDING
