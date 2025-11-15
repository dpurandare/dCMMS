# dCMMS Implementation Task List

**Version:** 2.0
**Date:** November 15, 2025
**Status:** Ready for Execution (Updated with Stakeholder Decisions)
**Sprint Duration:** 2 weeks (flexible)
**Test Coverage Requirement:** ≥75%
**Based on:** STAKEHOLDER_DECISIONS.md

**Major Changes from v1.0:**
- Sprint 0 extended to 4 weeks (high-fidelity UI mockups added)
- Cloud-agnostic architecture approach
- IdP adapter pattern implementation
- ERP integration deferred to Release 3+
- CEA/MNRE (India) compliance focus only
- Hindi-only i18n (not 15+ languages)
- MDM-optional mobile security

---

## Table of Contents

1. [Sprint 0: Foundation Setup (Weeks 1-4) **[EXTENDED]**](#sprint-0-foundation-setup-weeks-1-4)
2. [Sprint 1: Asset Management Backend (Weeks 5-6)](#sprint-1-asset-management-backend-weeks-5-6)
3. [Sprint 2: Work Order Backend (Weeks 7-8)](#sprint-2-work-order-backend-weeks-7-8)
4. [Sprint 3: Frontend Foundation & Asset UI (Weeks 9-10)](#sprint-3-frontend-foundation--asset-ui-weeks-9-10)
5. [Sprint 4: Work Order Frontend & Mobile App (Weeks 11-12)](#sprint-4-work-order-frontend--mobile-app-weeks-11-12)
6. [Sprint 5: MVP Integration & Testing (Weeks 13-14)](#sprint-5-mvp-integration--testing-weeks-13-14)
7. [Sprint 6: Telemetry Pipeline Foundation (Weeks 15-16)](#sprint-6-telemetry-pipeline-foundation-weeks-15-16)
8. [Sprint 7: Telemetry Optimization & QuestDB (Weeks 17-18)](#sprint-7-telemetry-optimization--questdb-weeks-17-18)
9. [Sprint 8: Alerting & Notification System (Weeks 19-20)](#sprint-8-alerting--notification-system-weeks-19-20)
10. [Sprint 9: Multi-Channel Notifications (Weeks 21-22)](#sprint-9-multi-channel-notifications-weeks-21-22)
11. [Sprint 10: Analytics & Reporting (Weeks 23-24)](#sprint-10-analytics--reporting-weeks-23-24)
12. [Sprint 11: CEA/MNRE Compliance & Release 1 Hardening (Weeks 25-26) **[UPDATED]**](#sprint-11-ceamnre-compliance--release-1-hardening-weeks-25-26)
13. [Sprint 12: ML Infrastructure & Feature Store (Weeks 27-28)](#sprint-12-ml-infrastructure--feature-store-weeks-27-28)
14. [Sprint 13: Feature Engineering & Model Training (Weeks 29-30)](#sprint-13-feature-engineering--model-training-weeks-29-30)
15. [Sprint 14: Model Serving & Explainability (Weeks 31-32)](#sprint-14-model-serving--explainability-weeks-31-32)
16. [Sprint 15: Predictive Maintenance Integration (Weeks 33-34)](#sprint-15-predictive-maintenance-integration-weeks-33-34)
17. [Sprint 16: Cost Management (Weeks 35-36)](#sprint-16-cost-management-weeks-35-36)
18. [Sprint 17: Hindi i18n & ML Model Cards (Weeks 37-38) **[UPDATED]**](#sprint-17-hindi-i18n--ml-model-cards-weeks-37-38)
19. [Sprint 18: Release 2 Integration & Production Readiness (Weeks 39-40) **[NEW]**](#sprint-18-release-2-integration--production-readiness-weeks-39-40)

---

## Task Format

Each task follows this format:
```
[DCMMS-XXX] Task Title
- Assignee: [Role]
- Specification: [Spec reference]
- Story Points: [1-13]
- Dependencies: [Other tasks]
- Acceptance Criteria:
  - Criterion 1
  - Criterion 2
- Testing: Unit + Integration tests included (75% coverage)
```

**Story Point Scale:**
- 1-2: Simple task (few hours)
- 3-5: Medium task (1-2 days)
- 8: Large task (3-4 days)
- 13: Very large task (full sprint)

---

## Sprint 0: Foundation Setup (Weeks 1-4) **[EXTENDED PER STAKEHOLDER DECISION]**

**Goal:** Define cloud-agnostic architecture, design system, create high-fidelity UI mockups, and set up development environment

**Specifications:** Spec 01, 03, 05, 07, 11, 13, 17, 19, 21

**Sprint Capacity:** 140 points (4 weeks × 35 points/week)

**Timeline:**
- **Week 1:** Cloud-agnostic architecture, design, and API contracts
- **Week 2:** Infrastructure setup and implementation scaffolding
- **Week 3:** High-fidelity UI mockup creation (design system, 20+ screens)
- **Week 4:** Mockup review, approval, and design token extraction

**Scope Changes:**
- ✅ **Added:** High-fidelity UI mockups (Weeks 3-4)
- ✅ **Added:** Cloud-agnostic architecture design
- ✅ **Added:** IdP adapter pattern design
- ✅ **Added:** Multi-protocol SCADA architecture
- ✅ **Added:** MDM-optional mobile security design

### Week 1: Cloud-Agnostic Architecture & Design Tasks

#### [DCMMS-001A] Cloud-Agnostic System Architecture Design **[UPDATED]**
- **Assignee:** Backend Developer + Mobile Developer + Frontend Developer
- **Specification:** Spec 01, 10, 11, 21 (API, Data Ingestion, Data Models, Edge)
- **Story Points:** 8
- **Dependencies:** None
- **Acceptance Criteria:**
  - **Cloud-agnostic system architecture diagram** (component view): Frontend, Backend APIs, Data Pipeline, Storage, ML Platform
  - Cloud provider comparison matrix (AWS, Azure, GCP) with service mappings
  - Service dependency map showing all interactions
  - High-level data flow diagrams (telemetry ingestion, work order lifecycle, offline sync)
  - Technology stack documentation with rationale (reference TECHNOLOGY_STACK_EVALUATION.md)
  - Infrastructure architecture: local development vs **cloud-agnostic deployment (Kubernetes, not provider-specific)**
  - Security architecture: **IdP adapter pattern**, authentication flow, authorization, data encryption
  - Edge computing architecture (K3s gateways, MQTT, local buffering, **multi-protocol SCADA**)
  - Architecture Decision Records (ADRs) for major decisions:
    - **ADR: Cloud-agnostic architecture strategy**
    - **ADR: IdP adapter pattern for flexible authentication**
    - **ADR: Multi-protocol SCADA support (OPC-UA, Modbus, IEC 61850, DNP3)**
  - Deployment architecture (Docker Compose → **cloud-agnostic Kubernetes**)
  - Scalability considerations documented (horizontal scaling, caching strategy)
  - **Mobile security without MDM** (app-level security, server-side device management)
- **Deliverables:**
  - `docs/architecture/system-architecture.md` with cloud-agnostic diagrams
  - `docs/architecture/adrs/` directory with ADR files (cloud-agnostic, IdP, SCADA)
  - Component diagram (draw.io/Mermaid/PlantUML)
  - Data flow diagrams for 3-5 critical flows
  - **Cloud provider selection criteria document**
- **Testing:** Architecture review with full team

#### [DCMMS-001B] API Contract Design (OpenAPI Specification)
- **Assignee:** Backend Developer + Frontend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-001A
- **Acceptance Criteria:**
  - Complete OpenAPI 3.1 specification for MVP endpoints:
    - Assets API (CRUD, hierarchy, search, tagging)
    - Work Orders API (CRUD, state transitions, tasks, parts)
    - Sites API (CRUD)
    - Authentication API (login, logout, refresh)
    - Users API (CRUD, roles, permissions)
    - Sync API (mobile offline sync, conflict resolution)
  - Request/response schemas defined (Zod/JSON Schema)
  - Error response schemas (400, 401, 403, 404, 500)
  - Authentication scheme defined (Bearer JWT)
  - Pagination, filtering, sorting conventions
  - API versioning strategy (/api/v1/*)
  - Rate limiting specifications
  - Webhook endpoints (if applicable)
- **Deliverables:**
  - `docs/api/openapi.yaml` (or JSON)
  - Published to Swagger UI / Redoc
- **Testing:** Validate spec with OpenAPI linter, team review

#### [DCMMS-001C] Database Schema Design (Detailed ERD)
- **Assignee:** Backend Developer
- **Specification:** Spec 11 (Complete Data Models)
- **Story Points:** 5
- **Dependencies:** DCMMS-001A
- **Acceptance Criteria:**
  - Complete Entity-Relationship Diagram (ERD) for all entities:
    - **Core:** sites, assets, components, work_orders, maintenance_tasks
    - **Parts:** inventory_items, parts_reservations, parts_consumed
    - **Users:** users, roles, permissions, user_roles, audit_logs
    - **Telemetry:** telemetry_data (QuestDB), telemetry_aggregates (TimescaleDB)
    - **Notifications:** alerts, notifications, notification_channels
    - **Compliance:** compliance_reports, regulatory_logs
    - **ML:** feature_store_metadata, model_registry, predictions
    - **Cost:** work_order_costs, budget_allocations
  - All relationships defined (1:1, 1:N, N:M with junction tables)
  - Primary keys, foreign keys, indexes specified
  - Data types, constraints (NOT NULL, UNIQUE, CHECK)
  - Audit fields (created_at, updated_at, created_by, updated_by)
  - Soft delete strategy (deleted_at)
  - Partitioning strategy for large tables (telemetry_data)
  - Migration strategy documented
- **Deliverables:**
  - `docs/database/erd.pdf` or `erd.png` (using dbdiagram.io, draw.io, or Lucidchart)
  - `docs/database/schema-design.md` with detailed explanations
  - Table definitions with estimated row counts
- **Testing:** Peer review, validate against specifications

#### [DCMMS-001D] Critical User Flow Design (Sequence Diagrams)
- **Assignee:** Backend Developer + Frontend Developer + Mobile Developer
- **Specification:** Spec 01, 02, 03, 04 (API, State Machines, Auth, Mobile Sync)
- **Story Points:** 5
- **Dependencies:** DCMMS-001B, DCMMS-001C
- **Acceptance Criteria:**
  - Sequence diagrams for 6-8 critical user flows:
    1. **User Login Flow** (OAuth2/OIDC with IdP)
    2. **Create Work Order Flow** (frontend → API → database)
    3. **Mobile Offline Sync Flow** (conflict resolution, version tokens)
    4. **Telemetry Ingestion Flow** (MQTT → Kafka → Flink → QuestDB)
    5. **Alert Generation Flow** (anomaly detection → alert → notification → WO creation)
    6. **Work Order State Transition Flow** (state machine validation)
    7. **Asset Hierarchy Traversal** (recursive query)
    8. **ML Prediction Flow** (feature fetch → model inference → WO creation)
  - State machine diagrams for:
    - Work Order lifecycle (7+ states, 10+ transitions)
    - Asset lifecycle (operational, maintenance, failed, decommissioned)
  - Error handling paths documented
  - Alternative flows (edge cases, failures)
  - Security checkpoints marked (auth, authorization)
- **Deliverables:**
  - `docs/flows/sequence-diagrams/` directory with diagrams (PlantUML/Mermaid)
  - `docs/flows/state-machines.md` with state diagrams
- **Testing:** Walkthrough with team, validate against specs

#### [DCMMS-001E] Mobile Architecture Design
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 5
- **Dependencies:** DCMMS-001A, DCMMS-001C
- **Acceptance Criteria:**
  - Flutter app architecture (MVVM, BLoC, Riverpod, or Provider pattern)
  - Offline-first data flow:
    - Local database schema (Drift for relational, Isar for documents)
    - Sync queue design (pending changes tracked locally)
    - Conflict resolution algorithm (version tokens, last-write-wins, or custom)
    - Background sync strategy (periodic, on connectivity, manual)
  - State management approach (BLoC, Riverpod, Provider)
  - Navigation architecture (GoRouter, Navigator 2.0)
  - Local storage strategy (Drift, Isar, Hive)
  - File handling (photos, documents, offline caching)
  - Push notification integration (FCM)
  - Camera/barcode scanner integration
  - Battery optimization strategies
  - Offline indicators and sync status UI
- **Deliverables:**
  - `docs/mobile/architecture.md`
  - Mobile app component diagram
  - Offline sync algorithm pseudocode
  - Database schema for mobile (ERD)
- **Testing:** Architecture review, validate offline scenarios

#### [DCMMS-001F] Technical Design Review Meeting
- **Assignee:** All Developers + Product Manager
- **Specification:** All specs
- **Story Points:** 2
- **Dependencies:** DCMMS-001A, DCMMS-001B, DCMMS-001C, DCMMS-001D, DCMMS-001E, DCMMS-008A
- **Acceptance Criteria:**
  - Design review meeting conducted (2-3 hours)
  - All architecture documents reviewed
  - API contract validated against requirements
  - Database schema validated against data models spec
  - User flows validated against product requirements
  - Mobile architecture approved
  - Wireframes reviewed and approved
  - Open questions documented and resolved
  - Design approval sign-off from Product Manager
  - Action items tracked (if any design changes needed)
- **Deliverables:**
  - Design review meeting notes
  - Approval sign-off document
  - Action items list (if any)
- **Testing:** N/A

#### [DCMMS-008A] UI Wireframe Creation (MVP Screens)
- **Assignee:** Frontend Developer + Product Manager
- **Specification:** Spec 17 (UX Design System)
- **Story Points:** 5
- **Dependencies:** DCMMS-001A
- **Acceptance Criteria:**
  - Low-fidelity wireframes for MVP screens:
    - **Authentication:** Login page, forgot password
    - **Dashboard:** KPI cards, recent work orders, alerts summary
    - **Assets:** Asset list (table), asset detail, asset hierarchy (tree view), create/edit asset form
    - **Work Orders:** WO list (with filters), WO detail, create WO form, task checklist, parts consumption
    - **Mobile:** Mobile dashboard, WO list, WO detail, offline sync status, camera capture
    - **Settings:** User profile, role management, system settings
  - Navigation flows between screens
  - Responsive design considerations (desktop, tablet, mobile web)
  - Accessibility annotations (ARIA labels, keyboard navigation)
  - Component mapping to shadcn/ui library
  - User interaction notes (click, hover, drag-drop)
- **Deliverables:**
  - Wireframes in Figma/Sketch/Balsamiq/draw.io
  - `docs/design/wireframes.pdf` export
  - Screen inventory spreadsheet (screen name, route, components used)
- **Testing:** Wireframe walkthrough with team, user flow validation

### Week 2: Infrastructure & DevOps Tasks

#### [DCMMS-001] Docker Compose Stack Setup
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 05 (Deployment)
- **Story Points:** 8
- **Dependencies:** None
- **Acceptance Criteria:**
  - Docker Compose file with PostgreSQL 16, Redis 7.2, Kafka 3.6 (KRaft), EMQX
  - All services start with single `docker-compose up` command
  - Health checks configured for all services
  - Persistent volumes for data
  - Network isolation between services
  - README with setup instructions
- **Testing:** Smoke tests for each service connectivity

#### [DCMMS-002] CI/CD Pipeline Setup
- **Assignee:** DevOps + Backend Developer
- **Specification:** Spec 07 (Testing Strategy)
- **Story Points:** 5
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - GitHub Actions / GitLab CI pipeline configured
  - Lint check (ESLint, Pylint, Dart Analyzer)
  - Format check (Prettier, Black, dart format)
  - Unit test execution with coverage report
  - Build verification for all components
  - Branch protection rules on `main` and `develop`
  - Coverage gate: block merge if <75%
- **Testing:** Test pipeline with sample PR

#### [DCMMS-003] Test Framework Configuration
- **Assignee:** QA Engineer + Backend Developer
- **Specification:** Spec 07 (Testing Strategy)
- **Story Points:** 5
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - Jest configured for backend (with coverage)
  - Supertest for API integration tests
  - Cypress for E2E tests
  - k6 for load testing
  - Test data factories/fixtures
  - Coverage thresholds enforced (75%)
  - Test reports generated (HTML, JUnit)
- **Testing:** Sample test suite running in CI

### Backend Tasks

#### [DCMMS-004] PostgreSQL Schema Initialization
- **Assignee:** Backend Developer
- **Specification:** Spec 11 (Data Models)
- **Story Points:** 5
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - Database migration tool setup (Prisma/TypeORM/Alembic)
  - Initial schema for: users, sites, assets, work_orders (basic)
  - Foreign key constraints
  - Indexes on frequently queried fields
  - Seed data script for development
  - Migration rollback tested
- **Testing:** Migration up/down tests, constraint validation

#### [DCMMS-005] Fastify API Skeleton
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-004
- **Acceptance Criteria:**
  - Fastify project initialized with TypeScript
  - Project structure: routes, controllers, services, middleware
  - Error handling middleware (global)
  - Request validation (Zod/Joi)
  - Logging configured (Pino)
  - Health check endpoint: `GET /health`
  - API versioning: `/api/v1/*`
  - OpenAPI/Swagger documentation setup
- **Testing:** Health check test, error handling tests

#### [DCMMS-006] Authentication Scaffolding
- **Assignee:** Backend Developer
- **Specification:** Spec 03 (Auth/Authorization)
- **Story Points:** 5
- **Dependencies:** DCMMS-005
- **Acceptance Criteria:**
  - JWT token generation/validation
  - Mock IdP integration (for Sprint 0)
  - Auth middleware for protected routes
  - User session management
  - Login/logout endpoints (mocked)
  - Token refresh mechanism
  - RBAC middleware skeleton
- **Testing:** Auth flow tests, token validation tests

### Frontend Tasks

#### [DCMMS-007] Next.js Project Setup
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design System)
- **Story Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - Next.js 14+ with App Router
  - TypeScript strict mode
  - Tailwind CSS 3.4+ configured
  - shadcn/ui initialized
  - Project structure: app, components, lib, hooks
  - ESLint + Prettier configured
  - Environment variables setup (.env.local)
  - Basic layout with header/sidebar
- **Testing:** Build verification, linting tests

#### [DCMMS-008] Design System Foundation
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design System)
- **Story Points:** 3
- **Dependencies:** DCMMS-007
- **Acceptance Criteria:**
  - Install core shadcn/ui components (Button, Card, Dialog, Form, Table)
  - Custom color palette (primary, secondary, accent)
  - Typography scale configured
  - Spacing/sizing tokens
  - Dark mode support (toggle component)
  - Storybook setup (optional for Sprint 0)
- **Testing:** Visual regression tests (Chromatic/Percy optional)

#### [DCMMS-009] Authentication UI (Mocked)
- **Assignee:** Frontend Developer
- **Specification:** Spec 03 (Auth/Authorization)
- **Story Points:** 3
- **Dependencies:** DCMMS-007, DCMMS-006
- **Acceptance Criteria:**
  - Login page with form (email/password)
  - Form validation (Zod + React Hook Form)
  - Loading states during login
  - Error message display
  - Redirect to dashboard after login
  - Protected route wrapper (HOC/middleware)
  - Mock token storage (localStorage)
- **Testing:** Form validation tests, navigation tests

### Mobile Tasks

#### [DCMMS-010] Flutter Project Setup
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - Flutter project initialized
  - Project structure: lib/screens, lib/widgets, lib/services, lib/models
  - Drift (SQLite) configured for offline storage
  - Isar configured for asset metadata
  - Navigation setup (GoRouter/Navigator 2.0)
  - Dart Analyzer + formatter configured
  - Environment configuration (dev, staging, prod)
  - Splash screen and app icon
- **Testing:** Widget tests for navigation

#### [DCMMS-011] Mobile Offline Database Schema
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 3
- **Dependencies:** DCMMS-010
- **Acceptance Criteria:**
  - Drift schema: work_orders, assets, users, sync_queue
  - Isar schema: asset_metadata, documents
  - Database migration strategy
  - Seed data for testing
  - CRUD operations for each table
  - Indexes for performance
- **Testing:** Database CRUD tests, migration tests

### Documentation

#### [DCMMS-012] Developer Onboarding Guide
- **Assignee:** Product Manager + Tech Lead
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 2
- **Dependencies:** DCMMS-001, DCMMS-005, DCMMS-007, DCMMS-010
- **Acceptance Criteria:**
  - README.md with quick start guide
  - Local setup instructions (Docker, env variables)
  - Git workflow and branching strategy
  - Code review checklist
  - Testing guidelines
  - Contribution guidelines
  - Architecture overview diagram
- **Testing:** New developer can set up environment in <30 minutes

#### [DCMMS-012A] Database Data Dictionary
- **Assignee:** Backend Developer
- **Specification:** Spec 11 (Data Models)
- **Story Points:** 3
- **Dependencies:** DCMMS-001C (ERD)
- **Acceptance Criteria:**
  - Complete data dictionary for all tables (20+ tables)
  - For each table: purpose, primary/foreign keys, indexes
  - For each field: name, data type, constraints, description, sample values
  - Relationships documented (1:1, 1:N, N:M)
  - Business rules documented (e.g., status transitions, validation rules)
  - Format: Markdown or Spreadsheet
- **Deliverables:**
  - `docs/database/data-dictionary.md` or `.xlsx`
- **Testing:** Dictionary reviewed and approved by team

#### [DCMMS-012B] Environment Configuration Template
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 05 (Deployment)
- **Story Points:** 1
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - .env.example file with all required environment variables
  - Comments explaining each variable
  - Separate sections: Database, API, Frontend, Mobile, External Services
  - Secure defaults (no actual secrets)
  - Documentation in README referencing .env.example
- **Deliverables:**
  - `.env.example` in repository root
  - Environment variables documented in README
- **Testing:** New developer can copy .env.example to .env and start services

#### [DCMMS-012C] Local Setup Troubleshooting Guide
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 2
- **Dependencies:** DCMMS-001, DCMMS-012
- **Acceptance Criteria:**
  - Common setup issues documented (10+ scenarios)
  - Docker issues: port conflicts, volume permissions, container fails to start
  - Database issues: connection refused, migration failures
  - Node.js issues: dependency conflicts, version mismatches
  - Mobile issues: Flutter SDK, emulator setup
  - Solutions with step-by-step instructions
  - Links to external resources
- **Deliverables:**
  - `docs/troubleshooting/local-setup.md`
- **Testing:** Test on fresh machine, validate solutions

**Sprint 0 Total:** 82 points
- **Week 1 (Architecture & Design):** 35 points
- **Week 2 (Infrastructure & Documentation):** 47 points

**Sprint Review Demo:**
- Present system architecture diagrams and ADRs
- Walk through API contract (OpenAPI spec)
- Review database ERD and schema design
- Present user flow sequence diagrams and state machines
- Review mobile architecture and offline sync strategy
- Present UI wireframes for MVP screens
- Show full stack running locally (Docker Compose)
- Demonstrate CI/CD pipeline
- Walk through test execution
- Show basic login flow (mocked)

---

## Sprint 1: Asset Management Backend (Weeks 3-4)

**Goal:** Implement asset hierarchy API with CRUD operations

**Specifications:** Spec 01, 02, 11

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-013] Asset Data Models
- **Assignee:** Backend Developer
- **Specification:** Spec 11 (Data Models)
- **Story Points:** 5
- **Dependencies:** DCMMS-004
- **Acceptance Criteria:**
  - Complete asset schema: id, name, type, status, site_id, parent_id, metadata, geo_location, tags
  - Site schema: id, name, location, capacity, timezone
  - Component schema (child of asset)
  - Hierarchical relationship (self-join on parent_id)
  - Asset type enum (inverter, transformer, panel, turbine, etc.)
  - Status enum (operational, maintenance, failed, decommissioned)
  - Audit fields: created_at, updated_at, created_by, updated_by
- **Testing:** Schema validation tests, relationship tests

#### [DCMMS-014] Asset CRUD API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 8
- **Dependencies:** DCMMS-013
- **Acceptance Criteria:**
  - POST /api/v1/assets (create asset + tests)
  - GET /api/v1/assets (list with pagination, filtering, sorting)
  - GET /api/v1/assets/:id (get single asset)
  - PATCH /api/v1/assets/:id (update asset)
  - DELETE /api/v1/assets/:id (soft delete)
  - Query params: ?site_id=X, ?type=inverter, ?status=operational
  - Pagination: ?page=1&limit=20
  - Sorting: ?sort=name:asc
  - Response includes metadata (total count, page info)
  - OpenAPI documentation for all endpoints
- **Testing:** Unit tests (services), Integration tests (API), 75% coverage

#### [DCMMS-015] Asset Hierarchy API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-014
- **Acceptance Criteria:**
  - GET /api/v1/assets/:id/hierarchy (get full tree: site → asset → components)
  - POST /api/v1/assets/:id/children (add child asset)
  - GET /api/v1/sites/:id/assets (get all assets for a site)
  - Validation: prevent circular references
  - Validation: max hierarchy depth = 5 levels
  - Response includes full ancestry path
  - Efficient tree traversal (recursive CTE or materialized path)
- **Testing:** Hierarchy tests, circular reference prevention tests

#### [DCMMS-016] Asset Search & Tagging
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-014
- **Acceptance Criteria:**
  - GET /api/v1/assets/search?q=<query> (full-text search on name, tags, metadata)
  - POST /api/v1/assets/:id/tags (add tags)
  - DELETE /api/v1/assets/:id/tags/:tag (remove tag)
  - Tag autocomplete endpoint
  - Search supports multiple fields
  - Search results ranked by relevance
  - PostgreSQL full-text search or Elasticsearch (if available)
- **Testing:** Search tests, tag CRUD tests

#### [DCMMS-017] Site Management API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-013
- **Acceptance Criteria:**
  - POST /api/v1/sites (create site + tests)
  - GET /api/v1/sites (list sites with pagination)
  - GET /api/v1/sites/:id (get site details)
  - PATCH /api/v1/sites/:id (update site)
  - DELETE /api/v1/sites/:id (soft delete)
  - Geo-location validation (lat/lon)
  - Timezone validation
  - Site capacity tracking
- **Testing:** Unit + integration tests, 75% coverage

### Security Tasks

#### [DCMMS-018] RBAC Implementation for Assets
- **Assignee:** Backend Developer
- **Specification:** Spec 03, 09 (Auth + Role Matrix)
- **Story Points:** 5
- **Dependencies:** DCMMS-006, DCMMS-014
- **Acceptance Criteria:**
  - Role definitions: admin, supervisor, technician, viewer
  - Permission checks on asset endpoints
  - Admins: full CRUD
  - Supervisors: create, read, update (not delete)
  - Technicians: read only (assigned assets)
  - Viewers: read only (all assets)
  - Middleware: `requirePermission('asset:read')`
  - Audit log for create/update/delete operations
- **Testing:** Permission tests for each role, audit log tests

### QA Tasks

#### [DCMMS-019] Asset API Test Suite
- **Assignee:** QA Engineer
- **Specification:** Spec 07 (Testing Strategy)
- **Story Points:** 5
- **Dependencies:** DCMMS-014, DCMMS-015
- **Acceptance Criteria:**
  - Integration test suite (Supertest)
  - Test CRUD operations (happy path + error cases)
  - Test pagination, filtering, sorting
  - Test hierarchy endpoints
  - Test authorization for each role
  - Test data validation (invalid inputs)
  - Performance test: 1000 assets list in <200ms (p95)
  - Test coverage ≥75%
- **Testing:** All tests passing in CI

**Sprint 1 Total:** 38 points

**Sprint Review Demo:**
- Create site hierarchy (site → asset → components)
- Demonstrate asset CRUD via Postman/Swagger
- Show pagination, filtering, sorting
- Demonstrate RBAC (different roles)
- Show test coverage report

---

## Sprint 2: Work Order Backend (Weeks 5-6)

**Goal:** Implement work order lifecycle API with state machine

**Specifications:** Spec 01, 02, 11

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-020] Work Order Data Models
- **Assignee:** Backend Developer
- **Specification:** Spec 11 (Data Models)
- **Story Points:** 5
- **Dependencies:** DCMMS-013
- **Acceptance Criteria:**
  - Work order schema: id, title, description, type, priority, status, site_id, asset_id, assigned_to, scheduled_start, scheduled_end
  - Type enum: preventive, corrective, predictive, inspection, emergency
  - Priority enum: low, medium, high, critical
  - Status enum: draft, scheduled, in_progress, on_hold, completed, closed, canceled
  - Maintenance task schema: id, wo_id, title, description, order, completed
  - Parts required/consumed schema
  - Labor records schema
  - Audit fields: created_at, updated_at, completed_at
- **Testing:** Schema validation, relationship tests

#### [DCMMS-021] Work Order State Machine
- **Assignee:** Backend Developer
- **Specification:** Spec 02 (State Machines)
- **Story Points:** 8
- **Dependencies:** DCMMS-020
- **Acceptance Criteria:**
  - State machine implementation (XState or custom)
  - Valid transitions:
    - draft → scheduled → in_progress → completed → closed
    - Any state → on_hold → resume to previous state
    - Any state → canceled (except completed/closed)
  - Validation: prevent invalid transitions
  - Transition hooks (before/after events)
  - Audit trail: state change log with user + timestamp
  - Business rules:
    - Cannot complete WO with incomplete tasks
    - Cannot delete WO in progress
    - Must assign technician before scheduling
- **Testing:** State transition tests, validation tests, audit tests

#### [DCMMS-022] Work Order CRUD API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 8
- **Dependencies:** DCMMS-021
- **Acceptance Criteria:**
  - POST /api/v1/work-orders (create WO + tests)
  - GET /api/v1/work-orders (list with filters: status, priority, assigned_to, site_id, date_range)
  - GET /api/v1/work-orders/:id (get WO details with tasks, parts, labor)
  - PATCH /api/v1/work-orders/:id (update WO fields)
  - POST /api/v1/work-orders/:id/transition (change state: {action: 'schedule'})
  - DELETE /api/v1/work-orders/:id (soft delete if draft)
  - Pagination, sorting support
  - Validation: enforce state machine rules
  - OpenAPI documentation
- **Testing:** CRUD tests, state transition tests, 75% coverage

#### [DCMMS-023] Maintenance Tasks API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-022
- **Acceptance Criteria:**
  - POST /api/v1/work-orders/:id/tasks (add task to WO)
  - GET /api/v1/work-orders/:id/tasks (list tasks for WO)
  - PATCH /api/v1/work-orders/:id/tasks/:taskId (update task, mark complete)
  - DELETE /api/v1/work-orders/:id/tasks/:taskId (remove task)
  - Task ordering (drag-drop support)
  - Task completion tracking
  - Conditional logic support (future: if task A complete, show task B)
- **Testing:** Task CRUD tests, completion tests

#### [DCMMS-024] Parts Reservation API
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 5
- **Dependencies:** DCMMS-022
- **Acceptance Criteria:**
  - Inventory item schema: id, part_number, name, quantity, location
  - POST /api/v1/work-orders/:id/parts (reserve parts for WO)
  - GET /api/v1/work-orders/:id/parts (list reserved/consumed parts)
  - POST /api/v1/work-orders/:id/parts/:partId/consume (mark part consumed)
  - Stock validation: prevent reservation if insufficient stock
  - Release reservation if WO canceled
  - Track consumed vs reserved quantities
- **Testing:** Reservation tests, stock validation tests

#### [DCMMS-025] Work Order Filtering & Search
- **Assignee:** Backend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 3
- **Dependencies:** DCMMS-022
- **Acceptance Criteria:**
  - Filter by: status (multiple), priority, assigned_to, site_id, asset_id, type
  - Date range filters: created_date, scheduled_date, completed_date
  - Search: title, description, WO ID
  - Sorting: priority (desc), scheduled_start (asc), created_at
  - Combined filters (AND logic)
  - Fast query performance (<200ms for 10K WOs)
- **Testing:** Filter tests, performance tests

### QA Tasks

#### [DCMMS-026] Work Order API Test Suite
- **Assignee:** QA Engineer
- **Specification:** Spec 07 (Testing Strategy)
- **Story Points:** 5
- **Dependencies:** DCMMS-022, DCMMS-023, DCMMS-024
- **Acceptance Criteria:**
  - Integration test suite (Supertest)
  - Test CRUD operations
  - Test state machine transitions (all valid paths)
  - Test invalid transitions (expect errors)
  - Test parts reservation (stock validation)
  - Test task completion logic
  - Test authorization (role-based access)
  - Performance test: WO list in <200ms (p95)
  - Test coverage ≥75%
- **Testing:** All tests passing in CI

**Sprint 2 Total:** 39 points

**Sprint Review Demo:**
- Create work order with tasks and parts
- Demonstrate state transitions (draft → scheduled → in_progress → completed)
- Show invalid transition rejection
- Filter work orders by status, priority, assigned_to
- Show test coverage and state machine diagram

---

## Sprint 3: Frontend Foundation & Asset UI (Weeks 7-8)

**Goal:** Build frontend foundation with asset management UI

**Specifications:** Spec 17 (UX Design)

**Sprint Capacity:** 45 points

### Design Tasks

#### [DCMMS-026A] High-Fidelity UI Mockups (MVP Screens)
- **Assignee:** Frontend Developer + Product Manager
- **Specification:** Spec 17 (UX Design System)
- **Story Points:** 5
- **Dependencies:** DCMMS-008A (Wireframes)
- **Acceptance Criteria:**
  - High-fidelity mockups for all MVP screens (10+ screens):
    - Authentication: Login page
    - Dashboard: KPI cards, charts, recent activity
    - Assets: List, detail, create/edit forms, hierarchy tree view
    - Work Orders: List, detail, create/edit forms, task checklist
    - Settings: User profile, role management
  - Consistent design system application (colors, typography, spacing)
  - shadcn/ui components selected and customized
  - Responsive designs (desktop, tablet, mobile)
  - Interactive states: hover, active, disabled, loading, error
  - Accessibility annotations: ARIA labels, contrast ratios, keyboard navigation
  - Design tokens documented (colors, spacing, typography)
  - Mockups approved by stakeholders
- **Deliverables:**
  - Figma/Sketch mockups (high-fidelity)
  - `docs/design/mockups.pdf` export
  - `docs/design/design-tokens.md` (color palette, typography scale, spacing)
- **Testing:** Design review with team, accessibility validation

### Frontend Tasks

#### [DCMMS-027] API Client Setup
- **Assignee:** Frontend Developer
- **Specification:** Spec 01 (API Specifications)
- **Story Points:** 3
- **Dependencies:** DCMMS-009, DCMMS-014
- **Acceptance Criteria:**
  - Axios or Fetch wrapper with TypeScript
  - Base URL configuration (env variable)
  - Request interceptor: add auth token
  - Response interceptor: handle 401 (refresh token or logout)
  - Error handling (network errors, API errors)
  - Type definitions for API responses (generate from OpenAPI)
  - React Query setup for caching
- **Testing:** Mock API tests, error handling tests

#### [DCMMS-028] Dashboard Layout
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 5
- **Dependencies:** DCMMS-009
- **Acceptance Criteria:**
  - Responsive layout: sidebar + main content area
  - Sidebar navigation: Dashboard, Assets, Work Orders, Inventory, Settings
  - Top bar: search, notifications (placeholder), user menu
  - Breadcrumbs component
  - Mobile responsive (hamburger menu)
  - Dark mode toggle functional
  - User avatar and name display
  - Logout functionality
- **Testing:** Navigation tests, responsive tests

#### [DCMMS-029] Asset List Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 8
- **Dependencies:** DCMMS-027, DCMMS-028, DCMMS-014
- **Acceptance Criteria:**
  - shadcn/ui DataTable component
  - Columns: Asset ID, Name, Type, Status, Site, Actions
  - Client-side sorting (all columns)
  - Server-side pagination (page size: 20, 50, 100)
  - Filters: Site dropdown, Type dropdown, Status dropdown
  - Search: asset name (debounced)
  - Loading states (skeleton)
  - Empty state (no assets)
  - Error state (API failure with retry)
  - Click row → navigate to asset details
- **Testing:** Component tests, integration tests with mock API

#### [DCMMS-030] Asset Details Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 5
- **Dependencies:** DCMMS-029, DCMMS-014
- **Acceptance Criteria:**
  - Asset details card: name, type, status, location, tags
  - Tabs: Overview, Hierarchy, Work Orders, Documents, Telemetry (placeholder)
  - Hierarchy tab: tree view (site → asset → components)
  - Edit button → open dialog
  - Delete button (with confirmation)
  - Back button to list
  - Loading state
  - Error state (asset not found)
- **Testing:** Component tests, navigation tests

#### [DCMMS-031] Asset Create/Edit Form
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 8
- **Dependencies:** DCMMS-030, DCMMS-014
- **Acceptance Criteria:**
  - Dialog or drawer for form
  - Fields: Name, Type (select), Status (select), Site (select), Parent Asset (select), Location (lat/lon), Tags (multi-select)
  - Form validation: required fields, format validation
  - Real-time validation feedback
  - Submit button: create or update API call
  - Loading state during save
  - Success toast notification
  - Error handling (display API errors)
  - Close dialog after success
- **Testing:** Form validation tests, submit tests, error tests

#### [DCMMS-032] Site Management Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 5
- **Dependencies:** DCMMS-027, DCMMS-017
- **Acceptance Criteria:**
  - Site list with DataTable
  - Columns: Site Name, Location, Capacity, Timezone, Actions
  - Create site button → form dialog
  - Edit/delete actions
  - Map view (optional for Sprint 3, or placeholder)
  - Pagination and search
  - Loading and error states
- **Testing:** Component tests, CRUD tests

### Design System

#### [DCMMS-033] Common Components Library
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 5
- **Dependencies:** DCMMS-008
- **Acceptance Criteria:**
  - PageHeader component (with breadcrumbs, actions)
  - EmptyState component (icon, title, description, action button)
  - LoadingSkeleton component (for tables, cards)
  - ErrorBoundary component (catch React errors)
  - ConfirmDialog component (for delete confirmations)
  - StatusBadge component (for asset/WO status)
  - All components documented (Storybook or inline docs)
- **Testing:** Component tests for each, visual tests

**Sprint 3 Total:** 39 points

**Sprint Review Demo:**
- Navigate through dashboard
- View asset list with filters and search
- Create new asset via form
- View asset details with hierarchy
- Edit and delete asset
- Show site management
- Demonstrate dark mode toggle

---

## Sprint 4: Work Order Frontend & Mobile App (Weeks 9-10)

**Goal:** Build work order UI and mobile app foundation

**Specifications:** Spec 17 (UX Design), Spec 04 (Mobile Offline)

**Sprint Capacity:** 40 points

### Frontend Tasks

#### [DCMMS-034] Work Order List Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 8
- **Dependencies:** DCMMS-028, DCMMS-022
- **Acceptance Criteria:**
  - DataTable with columns: WO ID, Title, Type, Priority, Status, Assigned To, Scheduled Date, Actions
  - Filters: Status (multi-select), Priority, Type, Assigned To, Date Range
  - Search: title, WO ID
  - Status badge with colors (draft=gray, scheduled=blue, in_progress=yellow, completed=green)
  - Priority badge (critical=red, high=orange, medium=yellow, low=gray)
  - Click row → navigate to WO details
  - Pagination, sorting
  - Loading, empty, error states
- **Testing:** Component tests, filter tests, navigation tests

#### [DCMMS-035] Work Order Details Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 8
- **Dependencies:** DCMMS-034, DCMMS-022
- **Acceptance Criteria:**
  - WO header: title, status, priority, assigned to, scheduled date
  - State transition buttons (based on current state): "Schedule", "Start", "Complete", "Close"
  - Tabs: Details, Tasks, Parts, Labor, Attachments, History
  - Details tab: description, asset, site, type, dates
  - Tasks tab: checklist (with checkboxes)
  - Parts tab: reserved and consumed parts
  - History tab: state change audit log (timeline view)
  - Edit WO button (if status = draft)
  - Loading and error states
- **Testing:** Component tests, state transition tests

#### [DCMMS-036] Work Order Create/Edit Form
- **Assignee:** Frontend Developer
- **Specification:** Spec 17 (UX Design)
- **Story Points:** 8
- **Dependencies:** DCMMS-035, DCMMS-022
- **Acceptance Criteria:**
  - Form dialog with steps: 1) Basic Info, 2) Tasks, 3) Parts
  - Basic Info: Title, Description, Type, Priority, Asset (select), Site (auto-filled from asset), Assigned To
  - Tasks section: add/remove tasks, drag to reorder
  - Parts section: search parts, add to WO, specify quantity
  - Form validation: required fields, date validation
  - Save as draft or create + schedule (two buttons)
  - Loading state during save
  - Toast notifications (success/error)
- **Testing:** Multi-step form tests, validation tests

#### [DCMMS-037] Work Order State Transition UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 02 (State Machines)
- **Story Points:** 5
- **Dependencies:** DCMMS-035, DCMMS-021
- **Acceptance Criteria:**
  - Action buttons dynamically shown based on current state
  - Confirmation dialog for each transition (e.g., "Start work order?")
  - API call to /work-orders/:id/transition
  - Optimistic UI update (immediate feedback)
  - Error handling (invalid transition)
  - State change reflected in UI
  - Toast notification on success
- **Testing:** Transition tests, error handling tests

### Mobile Tasks

#### [DCMMS-038] Mobile Authentication
- **Assignee:** Mobile Developer
- **Specification:** Spec 03 (Auth/Authorization)
- **Story Points:** 5
- **Dependencies:** DCMMS-010, DCMMS-006
- **Acceptance Criteria:**
  - Login screen (email/password form)
  - API call to backend auth endpoint
  - Store JWT token securely (flutter_secure_storage)
  - Auto-login on app restart (check token validity)
  - Logout functionality
  - Biometric auth (optional for Sprint 4)
  - Error handling (invalid credentials, network error)
- **Testing:** Login flow tests, token storage tests

#### [DCMMS-039] Mobile Work Order List
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 8
- **Dependencies:** DCMMS-038, DCMMS-011
- **Acceptance Criteria:**
  - Fetch WOs from API (assigned to current user)
  - Store in local Drift database
  - Display list (offline-first: show from local DB first)
  - Filter: Status, Priority
  - Pull-to-refresh (sync with server)
  - Offline indicator (banner if no network)
  - Tap WO → navigate to details
  - Loading shimmer, empty state
- **Testing:** Widget tests, offline behavior tests

#### [DCMMS-040] Mobile Work Order Details
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 5
- **Dependencies:** DCMMS-039
- **Acceptance Criteria:**
  - WO details screen (header, description, asset, tasks)
  - Task checklist (checkboxes)
  - State transition buttons (Start, Complete)
  - Offline support: changes queued for sync
  - Sync indicator (pending changes badge)
  - Edit task completion (checkbox toggle)
  - Save changes locally
- **Testing:** Widget tests, offline queue tests

#### [DCMMS-041] Mobile Sync Service
- **Assignee:** Mobile Developer
- **Specification:** Spec 04 (Mobile Offline Sync)
- **Story Points:** 8
- **Dependencies:** DCMMS-040
- **Acceptance Criteria:**
  - Background sync service (syncs when online)
  - Sync queue table in Drift (pending operations)
  - Sync algorithm: upload local changes → download server changes
  - Conflict detection (server version != local version)
  - Conflict resolution strategy: last-write-wins (for Sprint 4)
  - Retry logic (exponential backoff)
  - Sync status UI (last synced time, pending count)
  - Manual sync trigger (button)
- **Testing:** Sync tests, conflict resolution tests

**Sprint 4 Total:** 40 points (flexible, may extend to 3 weeks if needed)

**Sprint Review Demo:**
- Navigate to work order list (web)
- Create new work order (web)
- Transition WO through states (web)
- Login to mobile app
- View WOs on mobile (offline)
- Complete task on mobile (offline)
- Go online and sync changes

---

## Sprint 5: MVP Integration & Testing (Weeks 11-12)

**Goal:** Integration testing, bug fixes, MVP demo preparation

**Specifications:** All P0 specs (01-13)

**Sprint Capacity:** 30 points (lighter sprint for stabilization)

### Integration Tasks

#### [DCMMS-042] End-to-End Workflow Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07 (Testing Strategy)
- **Story Points:** 8
- **Dependencies:** All Sprint 1-4 tasks
- **Acceptance Criteria:**
  - E2E test: Create site → Create asset → Create WO → Assign → Start → Complete → Close
  - E2E test: Mobile sync workflow (offline task completion → online sync)
  - E2E test: Asset hierarchy (3 levels)
  - E2E test: Parts reservation and consumption
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Mobile testing (iOS, Android)
  - All critical paths covered
  - Tests automated (Cypress for web, Maestro for mobile)
- **Testing:** E2E test suite in CI

#### [DCMMS-043] Performance Testing
- **Assignee:** QA Engineer + Backend Developer
- **Specification:** Spec 18 (Performance)
- **Story Points:** 5
- **Dependencies:** DCMMS-042
- **Acceptance Criteria:**
  - Load test: 100 concurrent users (k6)
  - API latency: p95 <200ms for CRUD operations
  - Database query optimization (analyze slow queries)
  - Asset list: load 1000 assets in <1s
  - WO list: load 1000 WOs in <1s
  - Mobile sync: 100 WOs in <5s
  - Test results documented
- **Testing:** Load test reports, performance benchmarks

#### [DCMMS-044] Security Audit (MVP)
- **Assignee:** Backend Developer + QA Engineer
- **Specification:** Spec 13 (Security)
- **Story Points:** 5
- **Dependencies:** All backend tasks
- **Acceptance Criteria:**
  - OWASP ZAP scan (no high/critical vulnerabilities)
  - SQL injection tests (parameterized queries verified)
  - XSS tests (input sanitization verified)
  - Authentication bypass tests (all protected routes tested)
  - RBAC tests (unauthorized access attempts fail)
  - Secrets not in code (env variables verified)
  - HTTPS enforced (redirect HTTP → HTTPS)
  - Security report generated
- **Testing:** Security scan reports

#### [DCMMS-045] Real IdP Integration
- **Assignee:** Backend Developer
- **Specification:** Spec 03 (Auth/Authorization)
- **Story Points:** 5
- **Dependencies:** DCMMS-006
- **Acceptance Criteria:**
  - Replace mock auth with real IdP (Keycloak/Okta/Auth0)
  - OAuth2/OIDC flow implemented
  - User profile sync (name, email, roles)
  - Token refresh flow
  - Logout with IdP session cleanup
  - Mobile app integration (OAuth flow)
  - Test with multiple users and roles
- **Testing:** OAuth flow tests, token refresh tests

#### [DCMMS-046] Bug Fixing & Stabilization
- **Assignee:** All Developers
- **Specification:** All specs
- **Story Points:** 8
- **Dependencies:** DCMMS-042, DCMMS-043, DCMMS-044
- **Acceptance Criteria:**
  - Fix all critical bugs (P0)
  - Fix high-priority bugs (P1)
  - Address medium bugs if time permits
  - Update tests for bug fixes
  - Regression testing
  - Known issues documented (if any)
- **Testing:** All tests passing, regression suite green

### Documentation

#### [DCMMS-047] MVP User Documentation
- **Assignee:** Product Manager + QA Engineer
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 3
- **Dependencies:** DCMMS-042
- **Acceptance Criteria:**
  - User guide: How to create assets
  - User guide: How to create work orders
  - User guide: How to use mobile app (offline mode)
  - Screenshots and screen recordings
  - FAQ section
  - Troubleshooting guide
  - Published to documentation site (or README)
- **Testing:** User walkthrough (internal team)

#### [DCMMS-047A] API Documentation Portal
- **Assignee:** Backend Developer
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 3
- **Dependencies:** DCMMS-005, DCMMS-001B (OpenAPI spec)
- **Acceptance Criteria:**
  - Publish OpenAPI specification to documentation portal
  - Swagger UI or Redoc hosted and accessible
  - API usage examples for key endpoints (code snippets)
  - Authentication guide (how to get and use tokens)
  - Pagination, filtering, sorting conventions documented
  - Error response format documented
  - Rate limiting information
  - Versioning strategy documented
  - Search functionality for API endpoints
- **Deliverables:**
  - Public URL for API docs (e.g., https://api.dcmms.com/docs)
  - `docs/api/usage-guide.md` with examples
- **Testing:** Validate all endpoints documented, examples work

#### [DCMMS-047B] Administrator Guide (MVP)
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 3
- **Dependencies:** DCMMS-042
- **Acceptance Criteria:**
  - Admin Guide: User and role management
    - How to create users, assign roles
    - Role permissions matrix
    - How to deactivate users
  - Admin Guide: System configuration
    - Environment variables explained
    - Feature flags (if any)
    - System settings and defaults
  - Admin Guide: Backup and restore procedures
    - Database backup commands
    - Restore procedures
    - Backup schedule recommendations
  - Admin Guide: Monitoring and health checks
    - How to check system health
    - Key metrics to monitor
    - Log locations and access
- **Deliverables:**
  - `docs/admin/user-management.md`
  - `docs/admin/system-configuration.md`
  - `docs/admin/backup-restore.md`
  - `docs/admin/monitoring.md`
- **Testing:** Admin walkthrough, validate procedures

#### [DCMMS-047C] Deployment Runbook (MVP)
- **Assignee:** DevOps + Backend Developer
- **Specification:** Spec 05 (Deployment)
- **Story Points:** 3
- **Dependencies:** DCMMS-042
- **Acceptance Criteria:**
  - Step-by-step deployment procedure (local environment)
  - Pre-deployment checklist:
    - Code merged to main
    - All tests passing
    - Database migrations ready
    - Environment variables configured
  - Deployment steps:
    - Database migration commands
    - Service startup order
    - Health check validation
    - Smoke test procedures
  - Rollback procedure:
    - When to rollback
    - Rollback steps
    - Database migration rollback
  - Post-deployment validation:
    - Health checks to perform
    - Key functionality to test
    - Monitoring to watch
  - Troubleshooting common deployment issues
- **Deliverables:**
  - `docs/deployment/runbook-mvp.md`
  - Pre-deployment checklist template
  - Post-deployment validation checklist
- **Testing:** Dry-run deployment, validate all steps

#### [DCMMS-047D] Release Notes (MVP)
- **Assignee:** Product Manager
- **Specification:** N/A
- **Story Points:** 2
- **Dependencies:** DCMMS-042
- **Acceptance Criteria:**
  - Release notes document for MVP/Release 0
  - Version: v0.1.0 (or v1.0.0)
  - Release date
  - Summary: High-level overview of MVP features
  - Features implemented:
    - Asset management (list of features)
    - Work order management (list of features)
    - Mobile offline sync (list of features)
    - Security and authentication (list of features)
  - Specifications covered: List all 13 P0 specs
  - Known issues and limitations
  - Breaking changes (if any)
  - Migration guide (if upgrading from prototype)
  - Contributors and acknowledgments
- **Deliverables:**
  - `RELEASE_NOTES_v0.1.0.md` or in `CHANGELOG.md`
  - Published to documentation site
- **Testing:** Review with stakeholders

#### [DCMMS-048] MVP Demo Preparation
- **Assignee:** Product Manager
- **Specification:** N/A
- **Story Points:** 2
- **Dependencies:** DCMMS-047
- **Acceptance Criteria:**
  - Demo script prepared
  - Demo data seeded (sites, assets, WOs)
  - Demo environment stable
  - Presentation slides (optional)
  - Stakeholder invitations sent
  - Recording setup (screen capture)
- **Testing:** Dry run of demo

#### [DCMMS-049] User Acceptance Testing (UAT) - MVP
- **Assignee:** QA Engineer + Product Manager
- **Specification:** All MVP specs (01-13)
- **Story Points:** 5
- **Dependencies:** DCMMS-042, DCMMS-047
- **Acceptance Criteria:**
  - UAT test plan created (based on user stories and acceptance criteria)
  - UAT environment prepared (separate from dev, mirrors production)
  - Test users identified (internal stakeholders, pilot users if available)
  - UAT test cases executed:
    - Asset management workflows (create, edit, hierarchy, search)
    - Work order workflows (create, assign, execute, close)
    - Mobile offline workflows (create WO offline, sync when online, conflict resolution)
    - Role-based access control (test different user roles)
    - Security scenarios (unauthorized access, token expiry)
  - Defects logged and prioritized (critical, high, medium, low)
  - Critical and high-priority defects resolved
  - UAT sign-off obtained from Product Manager
  - UAT report generated (test results, defects, sign-off)
- **Testing:** Formal UAT execution with stakeholders

**Sprint 5 Total:** 50 points
- Integration & Testing: 26 points
- Documentation: 24 points (User docs, API portal, Admin guide, Deployment runbook, Release notes)

**Sprint Review / MVP Demo:**
- Full workflow demonstration: Site → Asset → WO → Mobile → Sync
- Show offline mobile capabilities
- Present performance metrics
- Security scan results
- Present UAT results and sign-off
- Known issues and roadmap to Release 1

---

## Sprint 6: Telemetry Pipeline Foundation (Weeks 13-14)

**Goal:** Set up Kafka + Flink + QuestDB pipeline for telemetry ingestion

**Specifications:** Spec 10 (Data Ingestion)

**Sprint Capacity:** 40 points

### Infrastructure Tasks

#### [DCMMS-049] Kafka Cluster Setup (Local)
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 5
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - Kafka 3.6+ (KRaft mode) in Docker Compose
  - Single broker for local development
  - Topics created: raw_telemetry, validated_telemetry, alarms
  - Schema Registry configured (Avro schemas)
  - Kafka UI (kafka-ui or akhq) for monitoring
  - Retention policy: 7 days (local), 90 days (production note)
  - Partitions: 8 per topic (for local)
- **Testing:** Kafka connectivity tests, topic creation tests

#### [DCMMS-050] QuestDB Setup
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 3
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - QuestDB in Docker Compose
  - Table: sensor_readings (timestamp, site_id, asset_id, sensor_type, value, unit, quality)
  - Partitioned by DAY
  - Indexed on: timestamp, site_id, asset_id
  - Web console accessible (port 9000)
  - Retention policy: 90 days (auto-delete old data)
- **Testing:** QuestDB connectivity, insert/query tests

#### [DCMMS-051] EMQX MQTT Broker Setup
- **Assignee:** Backend Developer + DevOps
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 3
- **Dependencies:** DCMMS-001
- **Acceptance Criteria:**
  - EMQX in Docker Compose
  - MQTT topics: telemetry/+/+/+ (site/asset/sensor)
  - MQTT bridge to Kafka (forward messages to raw_telemetry topic)
  - Authentication: username/password (for local)
  - EMQX dashboard accessible (port 18083)
  - QoS 1 (at least once delivery)
- **Testing:** MQTT publish/subscribe tests, Kafka bridge tests

### Backend Tasks

#### [DCMMS-052] Telemetry Avro Schema
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 3
- **Dependencies:** DCMMS-049
- **Acceptance Criteria:**
  - Avro schema: TelemetryEvent (timestamp, site_id, asset_id, sensor_type, value, unit, quality_flag, metadata)
  - Schema registered in Schema Registry
  - Version 1.0.0 (semantic versioning)
  - Backward compatibility enforced
  - Schema evolution plan documented
  - Code generation (Avro classes for Java/Python)
- **Testing:** Schema validation tests, compatibility tests

#### [DCMMS-053] Flink Stream Processing Job
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 8
- **Dependencies:** DCMMS-049, DCMMS-052
- **Acceptance Criteria:**
  - Flink job (Python or Scala)
  - Source: Kafka raw_telemetry topic
  - Processing:
    - Deserialize Avro messages
    - Validate schema
    - Enrich with asset metadata (lookup in PostgreSQL)
    - Filter invalid records (out-of-range values)
    - Deduplicate (within 1-minute window)
  - Sinks:
    - Kafka validated_telemetry topic
    - QuestDB (batch insert, 1000 records or 10 seconds)
  - Checkpointing enabled (1 minute interval)
  - Monitoring (metrics exposed)
- **Testing:** Flink job tests, validation tests, deduplication tests

#### [DCMMS-054] Telemetry Ingestion API (REST)
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 5
- **Dependencies:** DCMMS-049
- **Acceptance Criteria:**
  - POST /api/v1/telemetry (batch upload, for systems without MQTT)
  - Request body: array of telemetry events (JSON)
  - Validation: schema validation, timestamp format
  - Publish to Kafka raw_telemetry topic
  - Rate limiting: 1000 requests/minute per API key
  - Response: {accepted: 1234, rejected: 5, errors: [...]}
  - API key authentication
  - OpenAPI documentation
- **Testing:** API tests, batch tests, rate limiting tests

#### [DCMMS-055] Telemetry Query API
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 5
- **Dependencies:** DCMMS-050
- **Acceptance Criteria:**
  - GET /api/v1/telemetry (query sensor readings)
  - Query params: site_id, asset_id, sensor_type, start_time, end_time, aggregation (raw/1min/5min/15min/1hour)
  - Return: array of {timestamp, value, unit}
  - Pagination: limit=1000 (max)
  - Aggregation: avg, min, max, sum (if aggregation param set)
  - Performance: <500ms for 1-day query
  - OpenAPI documentation
- **Testing:** Query tests, aggregation tests, performance tests

### QA Tasks

#### [DCMMS-056] Telemetry Pipeline Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 10
- **Story Points:** 5
- **Dependencies:** DCMMS-053, DCMMS-054
- **Acceptance Criteria:**
  - Integration test: MQTT → Kafka → Flink → QuestDB
  - Test data generator (simulate 1000 events/sec locally)
  - Validate: all events reach QuestDB
  - Validate: deduplication works
  - Validate: invalid events filtered
  - Validate: enrichment adds asset metadata
  - End-to-end latency: <5 seconds (local)
  - Test coverage ≥75%
- **Testing:** Pipeline tests, latency tests

**Sprint 6 Total:** 37 points

**Sprint Review Demo:**
- Show Kafka UI with topics
- Publish MQTT messages (via client)
- Show Flink job processing
- Query QuestDB for telemetry data
- Show telemetry via API endpoint
- Demonstrate monitoring (Kafka lag, Flink metrics)

---

## Sprint 7: Telemetry Optimization & QuestDB (Weeks 15-16)

**Goal:** Optimize telemetry pipeline for production scale (72K events/sec target)

**Specifications:** Spec 10, 18 (Performance)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-057] Flink Job Optimization
- **Assignee:** Backend Developer
- **Specification:** Spec 18 (Performance)
- **Story Points:** 8
- **Dependencies:** DCMMS-053
- **Acceptance Criteria:**
  - Increase parallelism (match Kafka partitions: 32 in production plan)
  - Tune checkpointing (interval, timeout, concurrent checkpoints)
  - RocksDB state backend for larger state
  - Incremental checkpoints enabled
  - Backpressure handling (watermarks)
  - Memory tuning (heap size, managed memory)
  - Metrics: throughput, backpressure, checkpoint duration
  - Load test: handle 10K events/sec locally (simulate production 72K)
- **Testing:** Load tests, backpressure tests, checkpoint tests

#### [DCMMS-058] QuestDB Batch Insert Optimization
- **Assignee:** Backend Developer
- **Specification:** Spec 10, 18
- **Story Points:** 5
- **Dependencies:** DCMMS-050, DCMMS-053
- **Acceptance Criteria:**
  - Batch inserts: 5000 records per batch (tune for throughput)
  - InfluxDB Line Protocol (faster than SQL inserts)
  - Connection pooling
  - Write buffer size tuning
  - Partitioning verified (by DAY)
  - Compression enabled
  - Insert performance: >100K rows/sec (local)
  - Monitor: write amplification, disk I/O
- **Testing:** Insert performance tests, batch tests

#### [DCMMS-059] Time-Series Aggregation (Pre-computed)
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 8
- **Dependencies:** DCMMS-050
- **Acceptance Criteria:**
  - Aggregation tables: sensor_readings_1min, sensor_readings_5min, sensor_readings_15min, sensor_readings_1hour
  - Scheduled jobs (cron or Airflow): compute aggregates every minute
  - Aggregations: AVG, MIN, MAX, SUM, COUNT for each sensor
  - Indexes on: timestamp, site_id, asset_id
  - Query API updated: use aggregation tables if time range > 1 hour
  - Performance: query 1-day aggregated data in <200ms
  - Retention: raw (90 days), 1min (1 year), 1hour (5 years)
- **Testing:** Aggregation tests, query performance tests

#### [DCMMS-060] Alarm Detection (Threshold-based)
- **Assignee:** Backend Developer
- **Specification:** Spec 10, 14 (Notification)
- **Story Points:** 8
- **Dependencies:** DCMMS-053
- **Acceptance Criteria:**
  - Alarm rules table: sensor_type, threshold_min, threshold_max, severity
  - Flink CEP (Complex Event Processing) or simple filter
  - Detect: value < threshold_min OR value > threshold_max
  - Publish to Kafka alarms topic
  - Alarm event: {alarm_id, timestamp, site_id, asset_id, sensor_type, value, threshold, severity}
  - Deduplication: same alarm within 5 minutes = suppress
  - Store alarms in PostgreSQL (for history)
- **Testing:** Alarm detection tests, deduplication tests

#### [DCMMS-061] Telemetry Dashboard (Basic)
- **Assignee:** Frontend Developer
- **Specification:** Spec 16 (Analytics)
- **Story Points:** 5
- **Dependencies:** DCMMS-055
- **Acceptance Criteria:**
  - Telemetry page in web app
  - Asset selector dropdown
  - Sensor type selector (power, voltage, temperature, etc.)
  - Time range picker (1 hour, 6 hours, 24 hours, 7 days, 30 days)
  - Line chart (shadcn/ui Recharts)
  - Real-time updates (WebSocket or polling every 10 seconds)
  - Loading state, error state
  - Zoom/pan on chart
- **Testing:** Component tests, chart rendering tests

### QA Tasks

#### [DCMMS-062] Telemetry Load Testing
- **Assignee:** QA Engineer + Backend Developer
- **Specification:** Spec 18 (Performance)
- **Story Points:** 5
- **Dependencies:** DCMMS-057, DCMMS-058
- **Acceptance Criteria:**
  - k6 load test script (simulate 72K events/sec)
  - Local test: 10K events/sec sustained (limited by local Docker)
  - Production simulation: calculate resource requirements
  - End-to-end latency: <5 seconds (99th percentile)
  - No data loss (verify all events reach QuestDB)
  - Kafka lag: <10 seconds during peak load
  - Flink backpressure: <10% during steady state
  - Load test report with graphs
- **Testing:** Load test results, latency measurements

**Sprint 7 Total:** 39 points

**Sprint Review Demo:**
- Show load test (10K events/sec)
- Query real-time telemetry data
- Show aggregated data (1-hour avg)
- Demonstrate alarm detection (send out-of-range value)
- Show telemetry dashboard with real-time chart
- Present performance metrics (throughput, latency, Kafka lag)

---

## Sprint 8: Alerting & Notification System (Weeks 17-18)

**Goal:** Build notification system with email/SMS/push channels

**Specifications:** Spec 14 (Notification & Alerting)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-063] Notification Service Setup
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - Notification service (separate microservice or module)
  - Database tables: notification_templates, notification_rules, notification_history
  - Template variables: {asset_name}, {wo_id}, {alarm_severity}, {value}, {threshold}
  - Rule engine: if alarm.severity = critical → send email + SMS
  - Priority queue (Redis or in-memory)
  - Rate limiting: max 10 emails/minute per user
  - Retry logic (exponential backoff)
- **Testing:** Unit tests, rule engine tests

#### [DCMMS-064] Email Notifications
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - Email provider integration (SendGrid/AWS SES/SMTP)
  - HTML email templates (Handlebars or Pug)
  - Templates: alarm_critical, alarm_warning, wo_assigned, wo_overdue
  - Send email function: sendEmail(to, template, variables)
  - Delivery tracking (sent, delivered, failed)
  - Error handling (invalid email, provider error)
  - Unsubscribe link (for non-critical emails)
- **Testing:** Email sending tests (use test provider like Mailtrap)

#### [DCMMS-065] SMS Notifications
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - SMS provider integration (Twilio/AWS SNS)
  - SMS templates (plain text, <160 chars)
  - Send SMS function: sendSMS(phone, template, variables)
  - Phone number validation (E.164 format)
  - Cost tracking (log SMS count for billing)
  - Delivery status tracking
  - Opt-out handling (STOP keyword)
- **Testing:** SMS sending tests (use Twilio test numbers)

#### [DCMMS-066] Push Notifications (Mobile)
- **Assignee:** Backend Developer + Mobile Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 8
- **Dependencies:** DCMMS-063, DCMMS-010
- **Acceptance Criteria:**
  - Firebase Cloud Messaging (FCM) setup
  - Device token registration (POST /api/v1/users/device-token)
  - Send push function: sendPush(user_id, title, body, data)
  - Push templates: wo_assigned, alarm_critical
  - Deep linking (tap notification → open WO in app)
  - Badge count for unread notifications
  - Silent notifications (for background sync trigger)
  - Mobile app: receive and display push notifications
- **Testing:** Push notification tests (iOS/Android)

#### [DCMMS-067] Notification Preferences API
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - User preferences table: user_id, channel (email/sms/push), event_type, enabled
  - GET /api/v1/users/:id/notification-preferences
  - PUT /api/v1/users/:id/notification-preferences (update preferences)
  - Default preferences: email=enabled, SMS=disabled, push=enabled
  - Respect preferences before sending (check before email/SMS/push)
  - Quiet hours support (optional for Sprint 8)
- **Testing:** Preference tests, respect preference tests

#### [DCMMS-068] Alarm to Notification Integration
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-060, DCMMS-064, DCMMS-065, DCMMS-066
- **Acceptance Criteria:**
  - Kafka consumer: alarms topic → trigger notifications
  - Notification rules:
    - Critical alarm → email + SMS + push (immediate)
    - High alarm → email + push (immediate)
    - Medium alarm → email only (batched, every 15 min)
    - Low alarm → no notification (log only)
  - Escalation: if critical alarm not acknowledged in 30 min → notify supervisor
  - Notification history tracked (sent to whom, when, channel)
- **Testing:** Alarm notification tests, escalation tests

### Frontend Tasks

#### [DCMMS-069] Notification Preferences UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 14, 17
- **Story Points:** 5
- **Dependencies:** DCMMS-067
- **Acceptance Criteria:**
  - Settings page → Notification Preferences tab
  - Toggle switches: Email, SMS, Push (per event type)
  - Event types: Work Order Assigned, Alarm Critical, Alarm High, Work Order Overdue
  - Save button with API call
  - Toast notification on save success
  - Loading and error states
- **Testing:** Component tests, save tests

### QA Tasks

#### [DCMMS-070] Notification System Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 14
- **Story Points:** 5
- **Dependencies:** DCMMS-064, DCMMS-065, DCMMS-066, DCMMS-068
- **Acceptance Criteria:**
  - Integration tests: alarm → notification sent
  - Test each channel (email, SMS, push)
  - Test escalation (delay ack, verify supervisor notified)
  - Test preferences (disable email → verify no email sent)
  - Test rate limiting (send 20 emails → verify only 10/min)
  - Test retry logic (simulate provider failure)
  - Test coverage ≥75%
- **Testing:** All notification tests passing

**Sprint 8 Total:** 38 points

**Sprint Review Demo:**
- Create critical alarm (manually or via telemetry)
- Show email received
- Show SMS received
- Show push notification on mobile
- Demonstrate notification preferences (disable SMS → verify)
- Show escalation (wait 30 min → supervisor notified)
- Show notification history

---

## Sprint 9: Multi-Channel Notifications (Weeks 19-20)

**Goal:** Add webhooks, Slack, and notification enhancements

**Specifications:** Spec 14 (Notification & Alerting)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-071] Webhook Notifications
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - Webhook configuration table: url, auth_type (none/bearer/basic), headers, events
  - POST /api/v1/webhooks (register webhook)
  - GET /api/v1/webhooks (list webhooks)
  - DELETE /api/v1/webhooks/:id (remove webhook)
  - Send webhook: HTTP POST to URL with JSON payload
  - Signature verification (HMAC-SHA256)
  - Retry logic (3 retries, exponential backoff)
  - Delivery logs (success/failure, response code)
  - Timeout: 10 seconds
- **Testing:** Webhook tests, retry tests, signature tests

#### [DCMMS-072] Slack Integration
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - Slack App created (OAuth, Bot Token)
  - POST /api/v1/integrations/slack/install (OAuth flow)
  - Send Slack message: channel, text, attachments (blocks)
  - Rich formatting: alarm severity with colors (red=critical, orange=high)
  - Interactive buttons: "Acknowledge Alarm", "View Work Order"
  - Slack event handling: button clicks → API callbacks
  - Error handling (invalid channel, permission error)
- **Testing:** Slack message tests, button interaction tests

#### [DCMMS-073] Notification Batching
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - Batch low/medium priority notifications (queue for 15 minutes)
  - Digest email: "You have 5 new alarms" with summary table
  - Batch by user and event type
  - Scheduler: process batches every 15 minutes
  - User preference: enable/disable batching (per event type)
  - Immediate notifications for critical events (no batching)
- **Testing:** Batching tests, digest email tests

#### [DCMMS-074] Notification History & Audit
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 3
- **Dependencies:** DCMMS-063
- **Acceptance Criteria:**
  - GET /api/v1/notifications/history (query sent notifications)
  - Query params: user_id, channel, event_type, start_date, end_date, status (sent/failed)
  - Pagination support
  - Metrics: total sent, delivery rate, failed count
  - Retention: 90 days (auto-delete old records)
  - Admin-only access (RBAC)
- **Testing:** History query tests, metrics tests

#### [DCMMS-075] Alarm Acknowledgment
- **Assignee:** Backend Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-060
- **Acceptance Criteria:**
  - POST /api/v1/alarms/:id/acknowledge (mark alarm as acknowledged)
  - Request body: {user_id, comment}
  - Stop escalation when alarm acknowledged
  - Alarm status: active → acknowledged → resolved
  - Auto-resolve if sensor value returns to normal (within threshold)
  - Notification sent when alarm resolved
  - Alarm history: track state changes
- **Testing:** Acknowledgment tests, escalation stop tests

### Frontend Tasks

#### [DCMMS-076] Alarms Dashboard
- **Assignee:** Frontend Developer
- **Specification:** Spec 14, 16
- **Story Points:** 8
- **Dependencies:** DCMMS-060, DCMMS-075
- **Acceptance Criteria:**
  - Alarms page with table: Alarm ID, Asset, Sensor, Value, Threshold, Severity, Status, Time
  - Filters: Severity (critical/high/medium/low), Status (active/acknowledged/resolved), Asset, Time Range
  - Real-time updates (WebSocket or polling every 5 sec)
  - Click alarm row → show details modal
  - Acknowledge button → confirmation dialog → API call
  - Color coding: red (critical), orange (high), yellow (medium), gray (low)
  - Sound notification for new critical alarms (optional, with mute button)
- **Testing:** Component tests, real-time update tests

#### [DCMMS-077] Webhook Configuration UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 14, 17
- **Story Points:** 5
- **Dependencies:** DCMMS-071
- **Acceptance Criteria:**
  - Settings → Integrations → Webhooks
  - Add webhook form: URL, Auth Type, Headers, Events (multi-select)
  - Test webhook button (send test event)
  - Webhook list with edit/delete actions
  - Delivery logs: show recent webhook calls (timestamp, status, response)
  - Loading and error states
- **Testing:** Form tests, webhook CRUD tests

### Mobile Tasks

#### [DCMMS-078] Mobile Push Notification Handling
- **Assignee:** Mobile Developer
- **Specification:** Spec 14 (Notification)
- **Story Points:** 5
- **Dependencies:** DCMMS-066
- **Acceptance Criteria:**
  - Foreground notifications: show in-app banner
  - Background notifications: show system notification
  - Tap notification: navigate to relevant screen (WO details, alarm details)
  - Badge count: update app icon badge
  - Notification center: list all notifications (with mark as read)
  - Settings: enable/disable push notifications
  - Sound and vibration (user configurable)
- **Testing:** Notification handling tests, deep link tests

### QA Tasks

#### [DCMMS-079] Multi-Channel Notification Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 14
- **Story Points:** 5
- **Dependencies:** All Sprint 8-9 tasks
- **Acceptance Criteria:**
  - Test all channels: email, SMS, push, webhook, Slack
  - Test batching (low priority → verify digest email after 15 min)
  - Test acknowledgment (ack alarm → verify escalation stopped)
  - Test webhooks (register, send event, verify delivery)
  - Test Slack integration (send message, verify formatting, button click)
  - Load test: 1000 notifications/minute (verify rate limiting)
  - Test coverage ≥75%
- **Testing:** All notification tests passing

**Sprint 9 Total:** 41 points (may extend to 3 weeks if Slack integration is complex)

**Sprint Review Demo:**
- Show alarms dashboard (real-time updates)
- Create critical alarm
- Receive notifications on all channels (email, SMS, push, Slack, webhook)
- Acknowledge alarm (via UI and Slack button)
- Show batched digest email
- Show webhook delivery logs
- Demonstrate notification history

---

## Sprint 10: Analytics & Reporting (Weeks 21-22)

**Goal:** Build advanced analytics dashboards and custom report builder

**Specifications:** Spec 16 (Analytics & Reporting)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-080] Analytics Data Warehouse Setup
- **Assignee:** Backend Developer
- **Specification:** Spec 16 (Analytics)
- **Story Points:** 5
- **Dependencies:** DCMMS-050
- **Acceptance Criteria:**
  - ClickHouse setup in Docker Compose
  - Materialized views: wo_metrics, asset_metrics, telemetry_aggregates
  - ETL job (Airflow or cron): sync from PostgreSQL to ClickHouse (daily)
  - ClickHouse tables partitioned by month
  - Indexes on: site_id, asset_id, date
  - Query performance: <1s for complex aggregations
- **Testing:** ETL tests, query performance tests

#### [DCMMS-081] KPI Calculation Service
- **Assignee:** Backend Developer
- **Specification:** Spec 16 (Analytics)
- **Story Points:** 8
- **Dependencies:** DCMMS-080
- **Acceptance Criteria:**
  - KPIs calculated:
    - MTTR (Mean Time To Repair): avg(completed_at - created_at) for corrective WOs
    - MTBF (Mean Time Between Failures): avg time between corrective WOs
    - WO Completion Rate: (completed_WOs / total_WOs) * 100
    - Asset Availability: (operational_time / total_time) * 100
    - PM Compliance: (completed_PM_WOs / scheduled_PM_WOs) * 100
    - First Time Fix Rate: (WOs closed without reopening / total_WOs) * 100
  - GET /api/v1/analytics/kpis?site_id=X&start_date=Y&end_date=Z
  - Response: {mttr: 4.5, mtbf: 120, completion_rate: 92, ...}
  - Cache results (Redis, 1-hour TTL)
  - Calculation runs daily (scheduled job)
- **Testing:** KPI calculation tests, API tests

#### [DCMMS-082] Custom Report Builder API
- **Assignee:** Backend Developer
- **Specification:** Spec 16 (Analytics)
- **Story Points:** 8
- **Dependencies:** DCMMS-080
- **Acceptance Criteria:**
  - Report definition schema: {name, description, datasource, columns, filters, groupBy, aggregations}
  - POST /api/v1/reports (create custom report definition)
  - GET /api/v1/reports/:id/run (execute report, return data)
  - Export formats: CSV, JSON, PDF (basic)
  - Supported datasources: work_orders, assets, telemetry, alarms
  - Supported aggregations: count, sum, avg, min, max
  - Supported groupBy: date (day/week/month), site, asset_type, status
  - Query builder: translate report definition → SQL query
  - Security: validate user has access to requested data
- **Testing:** Report execution tests, query builder tests

#### [DCMMS-083] Asset Health Scoring
- **Assignee:** Backend Developer + ML/AI Expert
- **Specification:** Spec 16 (Analytics)
- **Story Points:** 8
- **Dependencies:** DCMMS-081
- **Acceptance Criteria:**
  - Health score (0-100) calculated based on:
    - Recent alarms (weight: 30%)
    - Recent WO frequency (weight: 20%)
    - Telemetry anomalies (weight: 30%)
    - Asset age (weight: 10%)
    - Last maintenance date (weight: 10%)
  - Score categories: Excellent (90-100), Good (70-89), Fair (50-69), Poor (<50)
  - GET /api/v1/assets/:id/health-score
  - GET /api/v1/assets/health-scores (bulk, for list view)
  - Scheduled job: calculate scores daily
  - Store in PostgreSQL: asset_health_scores table
- **Testing:** Health score tests, calculation accuracy tests

### Frontend Tasks

#### [DCMMS-084] Analytics Dashboard Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 16, 17
- **Story Points:** 8
- **Dependencies:** DCMMS-081
- **Acceptance Criteria:**
  - KPI cards (top of page): MTTR, MTBF, Completion Rate, Availability, PM Compliance
  - Charts:
    - WO trend (line chart: WOs over time, grouped by week)
    - WO by type (pie chart: preventive, corrective, etc.)
    - WO by status (bar chart: draft, scheduled, in_progress, completed)
    - Asset health distribution (bar chart: excellent, good, fair, poor)
  - Filters: Site, Date Range, Asset Type
  - Export button: download dashboard as PDF (optional for Sprint 10)
  - Loading states, error states
  - Responsive layout
- **Testing:** Component tests, chart rendering tests

#### [DCMMS-085] Custom Report Builder UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 16, 17
- **Story Points:** 8
- **Dependencies:** DCMMS-082
- **Acceptance Criteria:**
  - Report Builder page
  - Step 1: Select datasource (dropdown: work_orders, assets, telemetry, alarms)
  - Step 2: Select columns (multi-select: available fields)
  - Step 3: Add filters (field, operator, value)
  - Step 4: Group by (select field, e.g., date, site)
  - Step 5: Add aggregations (count, sum, avg)
  - Preview button: show table preview (first 100 rows)
  - Save report button: save definition
  - Export button: CSV, JSON
  - Saved reports list: load and run saved reports
- **Testing:** Report builder tests, preview tests

#### [DCMMS-086] Asset Health Score UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 16, 17
- **Story Points:** 3
- **Dependencies:** DCMMS-083
- **Acceptance Criteria:**
  - Asset list: add Health Score column
  - Health score badge with color:
    - Excellent: green
    - Good: blue
    - Fair: yellow
    - Poor: red
  - Asset details page: show health score with trend (up/down arrow)
  - Click score → show breakdown (alarm count, WO count, etc.)
  - Sort by health score
- **Testing:** Component tests, sort tests

### QA Tasks

#### [DCMMS-087] Analytics & Reporting Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 16
- **Story Points:** 5
- **Dependencies:** DCMMS-081, DCMMS-082, DCMMS-083
- **Acceptance Criteria:**
  - Test KPI calculations (verify accuracy with manual calculations)
  - Test custom report builder (create report, run, export)
  - Test health score calculation (verify formula)
  - Test analytics dashboard (verify chart data)
  - Performance test: KPI calculation <1s
  - Performance test: complex report <5s
  - Test coverage ≥75%
- **Testing:** All analytics tests passing

**Sprint 10 Total:** 40 points

**Sprint Review Demo:**
- Show analytics dashboard with KPIs and charts
- Explain KPI calculations (MTTR, MTBF, etc.)
- Build custom report using report builder
- Export report as CSV
- Show asset health scores in list
- Drill into health score breakdown
- Present ClickHouse query performance

---

## Sprint 11: Compliance & Release 1 Hardening (Weeks 23-24)

**Goal:** Add compliance reporting and stabilize Release 1

**Specifications:** Spec 15 (Compliance), Spec 18 (Performance)

**Sprint Capacity:** 35 points (lighter for stabilization)

### Backend Tasks

#### [DCMMS-088] Compliance Report Templates
- **Assignee:** Backend Developer
- **Specification:** Spec 15 (Compliance)
- **Story Points:** 8
- **Dependencies:** DCMMS-082
- **Acceptance Criteria:**
  - Report templates for:
    - NERC CIP-005 (Cyber Security - Perimeter): access logs, network diagrams
    - CEA (India): asset register, maintenance logs, incident reports
    - MNRE (India): capacity factor, generation reports
  - Template schema: {report_type, required_fields, format, frequency}
  - Auto-populate data from dCMMS (WOs, assets, telemetry)
  - Manual data entry fields (for external data)
  - Validation: ensure all required fields present
  - Preview: generate draft report
- **Testing:** Template tests, validation tests

#### [DCMMS-089] Compliance Report Generation API
- **Assignee:** Backend Developer
- **Specification:** Spec 15 (Compliance)
- **Story Points:** 5
- **Dependencies:** DCMMS-088
- **Acceptance Criteria:**
  - POST /api/v1/compliance/reports (generate report)
  - Request body: {template_id, site_id, start_date, end_date, data: {...}}
  - Generate: PDF (primary), CSV (optional), JSON
  - PDF formatting: header, footer, tables, charts
  - Watermark: "DRAFT" or "FINAL"
  - Store generated reports in S3 (or local filesystem for local dev)
  - GET /api/v1/compliance/reports (list generated reports)
  - Download: GET /api/v1/compliance/reports/:id/download
- **Testing:** Report generation tests, PDF tests

#### [DCMMS-090] Audit Trail Enhancements
- **Assignee:** Backend Developer
- **Specification:** Spec 13 (Security)
- **Story Points:** 5
- **Dependencies:** DCMMS-018
- **Acceptance Criteria:**
  - Audit log for all compliance-related actions
  - Fields: user_id, action, entity_type, entity_id, changes (JSON), timestamp, IP address
  - Actions logged: report_generated, report_downloaded, report_deleted, template_modified
  - GET /api/v1/audit-logs (query audit logs, admin-only)
  - Retention: 7 years (compliance requirement)
  - Tamper-proof: append-only table, write-once
  - Export audit logs: CSV (for external audit)
- **Testing:** Audit log tests, tamper-proof tests

### Frontend Tasks

#### [DCMMS-091] Compliance Report UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 15, 17
- **Story Points:** 8
- **Dependencies:** DCMMS-089
- **Acceptance Criteria:**
  - Compliance page
  - Report template selector (dropdown)
  - Form: site, date range, additional fields (dynamic based on template)
  - Generate button → preview PDF in browser
  - Mark as FINAL button (with confirmation)
  - Download button
  - Report history: list previously generated reports
  - Status: Draft, Final, Submitted
  - Loading and error states
- **Testing:** Component tests, PDF preview tests

### Performance & Hardening

#### [DCMMS-092] Release 1 Performance Optimization
- **Assignee:** Backend Developer + QA Engineer
- **Specification:** Spec 18 (Performance)
- **Story Points:** 8
- **Dependencies:** All Release 1 tasks
- **Acceptance Criteria:**
  - Database query optimization (add indexes, rewrite N+1 queries)
  - API response caching (Redis, for read-heavy endpoints)
  - Frontend bundle optimization (code splitting, lazy loading)
  - Image optimization (WebP, responsive images)
  - Lighthouse score: >90 for performance
  - API p95 latency: <200ms (verify)
  - Telemetry end-to-end latency: <5s (verify)
  - Load test: 100 concurrent users without degradation
- **Testing:** Performance tests, Lighthouse tests

#### [DCMMS-093] Release 1 Bug Fixes
- **Assignee:** All Developers
- **Specification:** All specs
- **Story Points:** 8
- **Dependencies:** All Release 1 tasks
- **Acceptance Criteria:**
  - Fix all critical bugs (P0)
  - Fix high-priority bugs (P1)
  - Address medium bugs if time permits
  - Regression testing
  - Known issues documented
  - Release notes prepared
- **Testing:** All tests passing, regression suite green

### Documentation

#### [DCMMS-094] Release 1 Documentation
- **Assignee:** Product Manager + QA Engineer
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 3
- **Dependencies:** All Release 1 tasks
- **Acceptance Criteria:**
  - User guide updates: telemetry, alarms, analytics, compliance
  - Admin guide: how to configure notifications, webhooks
  - API documentation: OpenAPI updated
  - Changelog: Release 1 features
  - Migration guide (if schema changes)
  - Training materials (videos or slides)
- **Testing:** Documentation review

#### [DCMMS-094A] Monitoring Dashboards Configuration
- **Assignee:** DevOps + Backend Developer
- **Specification:** Spec 18 (Performance), Spec 10 (Data Ingestion)
- **Story Points:** 5
- **Dependencies:** DCMMS-050 (Kafka), DCMMS-053 (Flink), DCMMS-054 (QuestDB)
- **Acceptance Criteria:**
  - Grafana dashboards configured and version-controlled (JSON files)
  - Dashboard 1: Telemetry Pipeline Health
    - MQTT broker metrics (messages/sec, connections)
    - Kafka metrics (throughput, lag, partition count)
    - Flink job metrics (records processed, latency, checkpoints)
    - QuestDB metrics (ingestion rate, query latency, storage)
  - Dashboard 2: System Health
    - CPU, memory, disk usage per service
    - API request rate, latency (p50, p95, p99)
    - Database connection pool, query performance
    - Cache hit rate (Redis)
  - Dashboard 3: Application Performance
    - Work order creation rate
    - Mobile sync success rate
    - Alert generation rate
    - User activity metrics
  - All dashboards support time range selection
  - Alerts configured in dashboards
- **Deliverables:**
  - `monitoring/grafana/dashboards/telemetry-pipeline.json`
  - `monitoring/grafana/dashboards/system-health.json`
  - `monitoring/grafana/dashboards/application-performance.json`
  - `docs/monitoring/dashboard-guide.md`
- **Testing:** Validate dashboards display correct data

#### [DCMMS-094B] Alert Runbooks
- **Assignee:** DevOps + Backend Developer
- **Specification:** Spec 18 (Performance), Spec 14 (Notifications)
- **Story Points:** 3
- **Dependencies:** DCMMS-094A
- **Acceptance Criteria:**
  - Runbooks for common alerts (10+ scenarios):
    - **HighCPUUsage**: When CPU >80% for 5 minutes
    - **HighMemoryUsage**: When memory >85% for 5 minutes
    - **DiskSpaceLow**: When disk <15% free
    - **APIHighLatency**: When p95 latency >500ms for 5 minutes
    - **TelemetryPipelineFailure**: When Kafka/Flink/QuestDB down
    - **DatabaseConnectionPoolExhausted**: When DB connections maxed
    - **CacheDown**: When Redis is unreachable
    - **HighErrorRate**: When error rate >5% for 5 minutes
    - **MobileSyncFailureRate**: When sync failure rate >10%
    - **MLModelInferenceFailure**: When model serving fails
  - Each runbook includes:
    - Alert description and severity
    - Impact on users/system
    - Investigation steps
    - Resolution steps
    - Escalation path
    - Related dashboards/logs
- **Deliverables:**
  - `docs/runbooks/alert-runbooks.md` or individual files per alert
- **Testing:** Review with team, validate procedures

#### [DCMMS-094C] Telemetry Pipeline Documentation
- **Assignee:** Backend Developer
- **Specification:** Spec 10 (Data Ingestion)
- **Story Points:** 3
- **Dependencies:** DCMMS-050-062
- **Acceptance Criteria:**
  - Telemetry pipeline architecture document:
    - Component diagram (MQTT → Kafka → Flink → QuestDB)
    - Data flow diagram
    - Message schemas (Avro/Protobuf)
  - MQTT configuration guide:
    - Broker setup (EMQX)
    - Topic structure
    - QoS levels
    - Client authentication
  - Kafka configuration guide:
    - Topic naming conventions
    - Partitioning strategy
    - Retention policies
    - Consumer group management
  - Flink job documentation:
    - Job DAG (directed acyclic graph)
    - Processing logic
    - State management
    - Checkpoint configuration
    - How to deploy/restart jobs
  - QuestDB configuration:
    - Table schema
    - Partitioning strategy
    - Retention policies
    - Query optimization tips
  - Troubleshooting guide:
    - Common pipeline issues
    - How to check backlog
    - How to replay messages
- **Deliverables:**
  - `docs/telemetry/architecture.md`
  - `docs/telemetry/mqtt-configuration.md`
  - `docs/telemetry/kafka-configuration.md`
  - `docs/telemetry/flink-jobs.md`
  - `docs/telemetry/questdb-configuration.md`
  - `docs/telemetry/troubleshooting.md`
- **Testing:** Documentation review, validate procedures

#### [DCMMS-094D] Deployment Runbook (Release 1)
- **Assignee:** DevOps + Backend Developer
- **Specification:** Spec 05 (Deployment)
- **Story Points:** 3
- **Dependencies:** All Release 1 tasks
- **Acceptance Criteria:**
  - Updated deployment runbook for Release 1
  - Include new services: Kafka, Flink, QuestDB, EMQX
  - Service startup order and dependencies
  - Health check validation for each service
  - Data migration procedures (if any)
  - Rollback procedures
  - Post-deployment smoke tests
- **Deliverables:**
  - `docs/deployment/runbook-release-1.md`
- **Testing:** Dry-run deployment

#### [DCMMS-094E] Release Notes (Release 1)
- **Assignee:** Product Manager
- **Specification:** N/A
- **Story Points:** 2
- **Dependencies:** All Release 1 tasks
- **Acceptance Criteria:**
  - Release notes for Release 1 (v0.2.0 or v2.0.0)
  - Summary of new features
  - Telemetry pipeline (72K events/sec capability)
  - Multi-channel alerting and notifications
  - Advanced analytics dashboards
  - Compliance reporting (NERC, CEA, MNRE)
  - Edge computing capabilities
  - Specifications covered: List all 8 P1 specs
  - Performance improvements
  - Breaking changes (if any)
  - Migration guide
  - Known issues
- **Deliverables:**
  - `RELEASE_NOTES_v0.2.0.md`
- **Testing:** Review with stakeholders

#### [DCMMS-095A] User Acceptance Testing (UAT) - Release 1
- **Assignee:** QA Engineer + Product Manager
- **Specification:** All Release 1 specs (14-21)
- **Story Points:** 5
- **Dependencies:** DCMMS-092, DCMMS-093, DCMMS-094
- **Acceptance Criteria:**
  - UAT test plan for Release 1 features
  - UAT test cases executed:
    - Telemetry ingestion workflows (MQTT → Kafka → Flink → QuestDB → Dashboard)
    - Alert generation and notification workflows (email, SMS, push, webhooks)
    - Analytics dashboards (KPI cards, time-series charts, heatmaps)
    - Compliance report generation (NERC, CEA, MNRE templates)
    - Edge computing scenarios (local buffering, connectivity loss)
    - Performance validation (72K events/sec, p95 latency <200ms)
  - Defects logged and prioritized
  - Critical and high-priority defects resolved
  - UAT sign-off obtained from Product Manager
  - UAT report generated
- **Testing:** Formal UAT execution with stakeholders

**Sprint 11 Total:** 59 points
- Performance & Hardening: 16 points
- Documentation & Operational Readiness: 24 points
- UAT: 5 points

**Sprint Review / Release 1 Demo:**
- Full platform demonstration: asset → WO → telemetry → alarms → notifications → analytics → compliance
- Show telemetry pipeline (72K events/sec simulation locally, production plan)
- Show multi-channel notifications
- Generate compliance report
- Present performance metrics
- Present UAT results and sign-off
- Roadmap to Release 2

---

## Sprint 12: ML Infrastructure & Feature Store (Weeks 25-26)

**Goal:** Set up ML infrastructure with Feast feature store

**Specifications:** Spec 22 (AI/ML Implementation)

**Sprint Capacity:** 40 points

### Infrastructure Tasks

#### [DCMMS-095] Feast Feature Store Setup
- **Assignee:** ML/AI Expert + Backend Developer
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-050, DCMMS-080
- **Acceptance Criteria:**
  - Feast 0.35+ installed (local)
  - Offline store: S3 + Iceberg (or local filesystem + Parquet)
  - Online store: Redis
  - Feature repository: YAML definitions
  - Feature views defined: asset_features, telemetry_features, wo_features
  - Materialization job: sync offline → online (scheduled hourly)
  - Feature serving API: get_online_features(feature_names, entity_ids)
  - Monitoring: feature freshness, null rates
- **Testing:** Feast tests, materialization tests

#### [DCMMS-096] MLflow Model Registry Setup
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - MLflow server running (local or Docker)
  - Backend store: PostgreSQL (metadata)
  - Artifact store: S3 (or local filesystem)
  - Experiment tracking configured
  - Model registry: register, version, stage (staging/production)
  - Model lineage: track datasets, parameters, metrics
  - Model approval workflow: staging → production (manual approval)
  - UI accessible (MLflow UI)
- **Testing:** MLflow tests, model registration tests

#### [DCMMS-097] Metaflow Setup
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** None
- **Acceptance Criteria:**
  - Metaflow installed (Python)
  - Metadata service: local (or AWS Step Functions for production)
  - Datastore: local filesystem (or S3 for production)
  - Example flow: data ingestion → feature engineering → model training → evaluation
  - Flow parameters: configurable via CLI
  - Integration with MLflow: log metrics to MLflow
  - Scheduling: cron or Airflow (for production)
- **Testing:** Metaflow flow tests

### ML/AI Tasks

#### [DCMMS-098] Feature Engineering Pipeline
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-095
- **Acceptance Criteria:**
  - Features for predictive maintenance:
    - Asset features: age, type, location, last_maintenance_date, total_wo_count
    - Telemetry features: rolling_avg_power_7d, rolling_std_voltage_7d, anomaly_count_30d
    - WO features: mttr, mtbf, recent_corrective_wo_count
  - Feature definitions in Feast YAML
  - Feature engineering code: Python (Pandas/Polars)
  - Data quality checks: null rate, outlier detection
  - Feature versioning (v1, v2, ...)
  - Unit tests for feature functions
- **Testing:** Feature engineering tests, data quality tests

#### [DCMMS-099] Training Dataset Creation
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-098
- **Acceptance Criteria:**
  - Historical data extraction: past 1 year of WOs, telemetry, alarms
  - Label generation: failure_within_7d (binary: 0/1)
  - Positive class: asset had corrective WO within 7 days
  - Negative class: asset operated normally for 7+ days
  - Train/test split: 80/20 (time-based split to avoid leakage)
  - Dataset stored in S3/Iceberg (offline store)
  - Dataset statistics: class distribution, feature distributions
  - Dataset versioned (v1.0, v1.1, ...)
- **Testing:** Dataset generation tests, label validation tests

#### [DCMMS-100] Baseline Model Training
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-099, DCMMS-096
- **Acceptance Criteria:**
  - Baseline models: Logistic Regression, Random Forest, XGBoost
  - Metaflow training flow: load_data → train → evaluate → register_model
  - Hyperparameter tuning: GridSearchCV or Optuna (3-5 hyperparameters)
  - Evaluation metrics: Precision, Recall, F1, AUC-ROC, Confusion Matrix
  - Model selection: choose best model based on F1 score
  - Register model in MLflow: model artifact, parameters, metrics
  - Model versioning (v1.0)
  - Training notebook (Jupyter) for exploratory analysis
- **Testing:** Training tests, evaluation tests

### QA Tasks

#### [DCMMS-101] ML Pipeline Testing
- **Assignee:** QA Engineer + ML/AI Expert
- **Specification:** Spec 07, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-098, DCMMS-100
- **Acceptance Criteria:**
  - Unit tests for feature engineering functions
  - Integration tests: Feast materialization → Redis
  - Model training tests: train on sample data, verify metrics
  - Model registration tests: register in MLflow, verify versioning
  - Data quality tests: validate feature distributions, null rates
  - Test coverage ≥75%
- **Testing:** All ML pipeline tests passing

**Sprint 12 Total:** 42 points (may extend to 3 weeks if ML setup is complex)

**Sprint Review Demo:**
- Show Feast feature store (offline/online)
- Show MLflow UI (experiments, models)
- Show Metaflow flow execution
- Show feature engineering pipeline output
- Show training dataset statistics
- Show baseline model training (Jupyter notebook)
- Show model metrics (precision, recall, F1, AUC)
- Register model in MLflow

---

## Sprint 13: Feature Engineering & Model Training (Weeks 27-28)

**Goal:** Advanced feature engineering and model optimization

**Specifications:** Spec 22 (AI/ML Implementation)

**Sprint Capacity:** 40 points

### ML/AI Tasks

#### [DCMMS-102] Advanced Feature Engineering
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-098
- **Acceptance Criteria:**
  - Time-series features:
    - Lag features: power_lag_1d, power_lag_7d
    - Rolling statistics: rolling_mean_14d, rolling_std_30d, rolling_min_7d, rolling_max_7d
    - Trend features: power_trend_7d (linear regression slope)
  - Domain-specific features:
    - Capacity factor: actual_production / rated_capacity
    - Degradation rate: (production_today - production_1yr_ago) / production_1yr_ago
    - Alarm frequency: alarm_count_30d / 30
  - Feature interactions: age * alarm_frequency, mttr * recent_wo_count
  - Feature selection: eliminate low-importance features (< 1% importance)
  - Update Feast definitions
- **Testing:** Feature tests, feature selection tests

#### [DCMMS-103] Model Hyperparameter Tuning
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-100, DCMMS-102
- **Acceptance Criteria:**
  - Optuna hyperparameter optimization
  - Search space:
    - XGBoost: max_depth (3-10), learning_rate (0.01-0.3), n_estimators (100-500)
    - Random Forest: max_depth (5-30), n_estimators (100-300), min_samples_split (2-10)
  - Objective: maximize F1 score (or AUC-ROC)
  - Cross-validation: 5-fold time-series CV
  - Trials: 50-100 trials per model
  - Best hyperparameters logged to MLflow
  - Training with best params
  - Model improvement: target >10% F1 increase vs baseline
- **Testing:** Hyperparameter tuning tests, CV tests

#### [DCMMS-104] Model Evaluation & Validation
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-103
- **Acceptance Criteria:**
  - Test set evaluation (hold-out 20%)
  - Metrics: Precision, Recall, F1, AUC-ROC, Confusion Matrix
  - Precision target: >70% (minimize false positives)
  - Recall target: >60% (catch most failures)
  - Threshold tuning: optimize threshold for F1 or business metric
  - Error analysis: investigate false positives and false negatives
  - Feature importance: SHAP values (top 10 features)
  - Model card: document model purpose, metrics, limitations
  - Approval: model ready for staging deployment
- **Testing:** Evaluation tests, threshold tuning tests

#### [DCMMS-105] Drift Detection Setup
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-104
- **Acceptance Criteria:**
  - Data drift detection: compare feature distributions (train vs production)
  - Statistical tests: Kolmogorov-Smirnov test, chi-square test
  - Concept drift detection: model performance degradation (F1 drop >5%)
  - Monitoring job: run daily, compare last 7 days vs training data
  - Drift alerts: email/Slack if drift detected
  - Drift dashboard: visualize feature distributions over time
  - Retraining trigger: if drift exceeds threshold → trigger retraining flow
- **Testing:** Drift detection tests, alert tests

#### [DCMMS-106] Model Retraining Pipeline
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-105
- **Acceptance Criteria:**
  - Automated retraining flow (Metaflow)
  - Trigger: weekly schedule OR drift alert
  - Steps: fetch_new_data → engineer_features → train → evaluate → register → deploy (if approved)
  - Incremental training: use recent 3 months of data
  - A/B testing: challenger vs champion model (route 10% traffic to new model)
  - Promotion criteria: challenger F1 > champion F1 by 2%
  - Rollback: if performance degrades, rollback to previous version
  - Approval workflow: human-in-the-loop for production promotion
- **Testing:** Retraining tests, A/B testing simulation

### QA Tasks

#### [DCMMS-107] Model Validation Testing
- **Assignee:** QA Engineer + ML/AI Expert
- **Specification:** Spec 07, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-104, DCMMS-105
- **Acceptance Criteria:**
  - Test feature engineering (verify calculations)
  - Test model predictions (smoke tests with known inputs)
  - Test drift detection (simulate drift, verify alert)
  - Test retraining flow (trigger manually, verify new model registered)
  - Bias testing: check for bias across asset types, sites
  - Fairness metrics: demographic parity, equal opportunity
  - Test coverage ≥75%
- **Testing:** All model validation tests passing

**Sprint 13 Total:** 42 points (may extend to 3 weeks)

**Sprint Review Demo:**
- Show advanced features in Feast
- Show hyperparameter tuning results (Optuna trials)
- Show final model metrics (precision, recall, F1, AUC)
- Show SHAP feature importance
- Show drift detection dashboard
- Simulate drift → show alert
- Show retraining pipeline execution
- Model card presentation

---

## Sprint 14: Model Serving & Explainability (Weeks 29-30)

**Goal:** Deploy ML models to production with KServe and add explainability

**Specifications:** Spec 22 (AI/ML Implementation)

**Sprint Capacity:** 40 points

### Infrastructure Tasks

#### [DCMMS-108] KServe Setup
- **Assignee:** ML/AI Expert + DevOps
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-096
- **Acceptance Criteria:**
  - KServe installed (local Kubernetes or Kind cluster)
  - InferenceService CRD configured
  - Model storage: MLflow artifact store (S3 or local)
  - Predictor: MLflow model server (or custom Python server)
  - Auto-scaling: HPA based on CPU/RPS (min=1, max=5 replicas)
  - Model versioning: canary deployment (90% v1, 10% v2)
  - Health checks: liveness and readiness probes
  - Monitoring: Prometheus metrics (request count, latency, errors)
- **Testing:** KServe deployment tests, health check tests

#### [DCMMS-109] Model Deployment API
- **Assignee:** ML/AI Expert + Backend Developer
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-108
- **Acceptance Criteria:**
  - POST /api/v1/ml/models/:model_id/deploy (deploy model to KServe)
  - GET /api/v1/ml/models/:model_id/status (check deployment status)
  - DELETE /api/v1/ml/models/:model_id/undeploy (remove model from serving)
  - Deployment config: replicas, auto-scaling, canary %
  - Validation: ensure model exists in MLflow before deploy
  - Rollback: POST /api/v1/ml/models/:model_id/rollback
  - Admin-only access (RBAC)
- **Testing:** Deployment API tests, rollback tests

### ML/AI Tasks

#### [DCMMS-110] Model Inference API
- **Assignee:** ML/AI Expert + Backend Developer
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-108
- **Acceptance Criteria:**
  - POST /api/v1/ml/predict (batch prediction)
  - Request body: {model_name: "failure_prediction", asset_ids: ["A1", "A2", ...]}
  - Fetch features from Feast (get_online_features)
  - Call KServe inference endpoint
  - Response: {predictions: [{asset_id: "A1", failure_probability: 0.75, risk_level: "high"}, ...]}
  - Latency target: <500ms for 100 assets (p95)
  - Error handling: missing features, model unavailable
  - Logging: log all predictions (for drift monitoring)
- **Testing:** Inference API tests, latency tests

#### [DCMMS-111] SHAP Explainability Integration
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-110
- **Acceptance Criteria:**
  - SHAP explainer: TreeExplainer for XGBoost/RF
  - POST /api/v1/ml/explain (get SHAP values for a prediction)
  - Request body: {model_name, asset_id}
  - Response: {shap_values: [{feature: "alarm_count_30d", value: 12, shap: 0.15}, ...], base_value: 0.05}
  - Visualization data: feature importance plot (top 10 features)
  - Caching: cache SHAP explainer (load once, reuse)
  - Performance: <1s for single asset explanation
- **Testing:** Explainability tests, SHAP tests

#### [DCMMS-112] Confidence Scoring
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-110
- **Acceptance Criteria:**
  - Confidence score calculation:
    - Prediction probability: 0.0-1.0
    - Feature coverage: % of features non-null (target >90%)
    - Model uncertainty: ensemble variance (if multiple models)
  - Confidence categories: High (>0.8), Medium (0.5-0.8), Low (<0.5)
  - Include confidence in prediction response
  - Low confidence → human review required (flag for review)
  - Logging: track confidence distribution over time
- **Testing:** Confidence scoring tests

### Frontend Tasks

#### [DCMMS-113] ML Prediction Dashboard
- **Assignee:** Frontend Developer
- **Specification:** Spec 17, 22
- **Story Points:** 8
- **Dependencies:** DCMMS-110, DCMMS-111
- **Acceptance Criteria:**
  - ML Predictions page
  - Asset list with predicted risk: High (red), Medium (yellow), Low (green)
  - Filter: Risk Level, Site, Asset Type
  - Sort: by failure probability (desc)
  - Click asset → show prediction details:
    - Failure probability: 75%
    - Confidence: High
    - SHAP feature importance (horizontal bar chart)
    - Recommended action: "Schedule preventive maintenance"
  - Refresh predictions button (trigger batch prediction)
  - Loading and error states
- **Testing:** Component tests, SHAP visualization tests

#### [DCMMS-114] Explainability UI (Asset Details)
- **Assignee:** Frontend Developer
- **Specification:** Spec 17, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-113
- **Acceptance Criteria:**
  - Asset details page → new tab: "ML Insights"
  - Show prediction: failure probability, risk level, confidence
  - SHAP waterfall chart: how each feature contributed to prediction
  - Feature values: show actual values vs normal range
  - Recommendation: suggested actions (e.g., "Inspect inverter, check voltage sensor")
  - Historical predictions: trend of failure probability over time (line chart)
  - Feedback button: "Was this prediction helpful?" (thumbs up/down)
- **Testing:** Component tests, chart rendering tests

### QA Tasks

#### [DCMMS-115] ML Serving Testing
- **Assignee:** QA Engineer + ML/AI Expert
- **Specification:** Spec 07, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-108, DCMMS-110, DCMMS-111
- **Acceptance Criteria:**
  - Test model deployment (deploy to KServe, verify serving)
  - Test inference API (batch predictions)
  - Test explainability API (SHAP values)
  - Load test: 1000 predictions/minute
  - Latency test: p95 <500ms
  - Test canary deployment (route 10% traffic to new version)
  - Test rollback (deploy bad model, rollback, verify)
  - Test coverage ≥75%
- **Testing:** All ML serving tests passing

**Sprint 14 Total:** 39 points

**Sprint Review Demo:**
- Show KServe deployment (model served)
- Trigger batch prediction for all assets
- Show ML Predictions dashboard (risk levels)
- Click high-risk asset → show SHAP explanation
- Explain top features driving prediction
- Show confidence score
- Demonstrate canary deployment (90/10 split)
- Show monitoring (prediction latency, request count)

---

## Sprint 15: Predictive Maintenance Integration (Weeks 31-32)

**Goal:** Integrate ML predictions with work order creation

**Specifications:** Spec 22 (AI/ML Implementation)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-116] Predictive WO Creation Service
- **Assignee:** Backend Developer + ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-110, DCMMS-022
- **Acceptance Criteria:**
  - Scheduled job: run daily, fetch high-risk predictions (probability >0.7)
  - Auto-create WO:
    - Type: predictive
    - Title: "Predictive Maintenance - [Asset Name]"
    - Description: "ML model predicted failure probability: 75%. Top factors: [feature1, feature2]"
    - Priority: based on probability (>0.9=critical, >0.7=high)
    - Status: draft (requires supervisor approval)
    - Assigned to: asset owner or supervisor
  - Attach SHAP explanation to WO (metadata)
  - Notification: send email/push to assigned user
  - De-duplication: don't create WO if one already exists for asset (within 7 days)
- **Testing:** WO creation tests, deduplication tests

#### [DCMMS-117] Human-in-the-Loop Approval
- **Assignee:** Backend Developer
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-116
- **Acceptance Criteria:**
  - Predictive WOs require supervisor approval before scheduling
  - POST /api/v1/work-orders/:id/approve (supervisor approves WO)
  - POST /api/v1/work-orders/:id/reject (supervisor rejects WO, provide reason)
  - Rejection feedback: store reason, send to ML team for review
  - Approval rate tracking: measure % of predictive WOs approved
  - If approved: transition to scheduled, assign technician
  - If rejected: mark as canceled, log reason
- **Testing:** Approval tests, rejection tests, feedback tests

#### [DCMMS-118] Model Performance Tracking
- **Assignee:** ML/AI Expert + Backend Developer
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 8
- **Dependencies:** DCMMS-117
- **Acceptance Criteria:**
  - Track ground truth: did asset actually fail within 7 days?
  - Compare prediction vs outcome:
    - True Positive: predicted failure, asset failed
    - False Positive: predicted failure, asset didn't fail
    - True Negative: predicted normal, asset normal
    - False Negative: predicted normal, asset failed
  - Calculate production metrics: precision, recall, F1 (on production data)
  - Monitoring dashboard: track metrics over time
  - Alert: if F1 drops >10% → trigger model review
  - Feedback loop: use production data for next retraining
- **Testing:** Tracking tests, metrics calculation tests

#### [DCMMS-119] ML Model Governance
- **Assignee:** ML/AI Expert + Product Manager
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-118
- **Acceptance Criteria:**
  - Model documentation: README per model (purpose, features, metrics, limitations, owner)
  - Model approval workflow: staging → review → production
  - Review checklist: performance metrics, bias tests, explainability, security
  - Model retirement: decommission old models (archive in MLflow)
  - Incident response: runbook for model failures (rollback, notify team)
  - Compliance: document AI governance per EU AI Act / NIST AI RMF
  - Audit trail: all model deployments logged
- **Testing:** Governance checklist validation

### Frontend Tasks

#### [DCMMS-120] Predictive WO Review UI
- **Assignee:** Frontend Developer
- **Specification:** Spec 17, 22
- **Story Points:** 8
- **Dependencies:** DCMMS-116, DCMMS-117
- **Acceptance Criteria:**
  - Predictive WOs page (supervisor view)
  - List: pending approval predictive WOs
  - Columns: Asset, Failure Probability, Confidence, Predicted Factors, Created Date, Actions
  - Click row → show WO details + ML explanation
  - Approve button → confirmation dialog → API call
  - Reject button → modal with reason (dropdown + text)
  - Batch approve: select multiple WOs, approve all
  - Filters: Site, Asset Type, Risk Level
  - Metrics: approval rate, avg time to review
- **Testing:** Component tests, approval/reject tests

#### [DCMMS-121] ML Performance Dashboard
- **Assignee:** Frontend Developer
- **Specification:** Spec 16, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-118
- **Acceptance Criteria:**
  - ML Performance page (ML team view)
  - Metrics: production precision, recall, F1, approval rate
  - Charts:
    - Prediction accuracy over time (line chart)
    - Confusion matrix (heatmap)
    - Feature drift (line chart for top features)
  - Model version selector (compare v1 vs v2)
  - Alerts: show active drift alerts
  - Refresh button (fetch latest metrics)
- **Testing:** Component tests, chart rendering tests

### Mobile Tasks

#### [DCMMS-122] Mobile Predictive WO Handling
- **Assignee:** Mobile Developer
- **Specification:** Spec 04, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-116
- **Acceptance Criteria:**
  - Show predictive WOs in mobile app (badge: "ML Predicted")
  - WO details: show failure probability, SHAP explanation
  - Technician can view but not edit ML metadata
  - After completing predictive WO: feedback form ("Did you find the predicted issue?")
  - Feedback options: Yes (TP), No (FP), Unsure
  - Submit feedback → API call → stored for model improvement
  - Offline support: queue feedback, sync when online
- **Testing:** Widget tests, feedback tests

### QA Tasks

#### [DCMMS-123] Predictive Maintenance E2E Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 22
- **Story Points:** 5
- **Dependencies:** DCMMS-116, DCMMS-117, DCMMS-120
- **Acceptance Criteria:**
  - E2E test: high-risk prediction → auto WO creation → supervisor approval → technician execution → feedback
  - Test approval workflow (approve/reject)
  - Test deduplication (verify no duplicate WOs)
  - Test notifications (supervisor notified of new predictive WO)
  - Test feedback loop (technician feedback stored)
  - Test production metrics tracking
  - Test coverage ≥75%
- **Testing:** All E2E tests passing

**Sprint 15 Total:** 39 points

**Sprint Review Demo:**
- Show daily prediction job running
- Show auto-created predictive WOs (draft)
- Supervisor reviews and approves WO
- Show SHAP explanation in WO details
- Technician completes WO on mobile, provides feedback
- Show ML performance dashboard (production metrics)
- Show approval rate and accuracy metrics
- Demonstrate 10% of WOs are ML-driven (goal achieved)

---

## Sprint 16: Cost Management (Weeks 33-34)

**Goal:** Implement work order costing and budget management

**Specifications:** Spec 23 (Cost Management)

**Sprint Capacity:** 40 points

### Backend Tasks

#### [DCMMS-124] Cost Data Models
- **Assignee:** Backend Developer
- **Specification:** Spec 23 (Cost Management)
- **Story Points:** 5
- **Dependencies:** DCMMS-020
- **Acceptance Criteria:**
  - Cost record schema: id, wo_id, category (labor/parts/equipment/other), amount, currency, timestamp
  - Labor rate table: role, hourly_rate, overtime_multiplier
  - Equipment rate table: equipment_type, hourly_rate
  - Budget table: site_id, budget_period (month/quarter/year), category, allocated_amount, spent_amount
  - Cost allocation: track costs per site, asset, WO type
  - Audit fields: created_at, created_by
- **Testing:** Schema validation tests

#### [DCMMS-125] Cost Calculation API
- **Assignee:** Backend Developer
- **Specification:** Spec 23 (Cost Management)
- **Story Points:** 8
- **Dependencies:** DCMMS-124, DCMMS-024
- **Acceptance Criteria:**
  - POST /api/v1/work-orders/:id/costs (add cost record)
  - GET /api/v1/work-orders/:id/costs (get all costs for WO)
  - Auto-calculate costs:
    - Labor: hours_worked * hourly_rate (from labor records)
    - Parts: consumed_parts * unit_price (from inventory)
    - Equipment: equipment_hours * hourly_rate
  - Total cost: sum(labor + parts + equipment + other)
  - Update WO: total_cost field
  - GET /api/v1/work-orders/:id/cost-summary (breakdown by category)
  - Validation: prevent negative amounts, enforce currency
- **Testing:** Cost calculation tests, auto-calculation tests

#### [DCMMS-126] Budget Management API
- **Assignee:** Backend Developer
- **Specification:** Spec 23 (Cost Management)
- **Story Points:** 5
- **Dependencies:** DCMMS-125
- **Acceptance Criteria:**
  - POST /api/v1/budgets (create budget for site/period)
  - GET /api/v1/budgets (list budgets with filters: site, period, category)
  - PATCH /api/v1/budgets/:id (update allocated amount)
  - GET /api/v1/budgets/:id/spending (current spending vs allocated)
  - Budget alerts: email if spending >80% of budget
  - Forecast: predict end-of-period spending (linear extrapolation)
  - Budget variance: (actual - allocated) / allocated * 100
  - Admin-only access (RBAC)
- **Testing:** Budget tests, alert tests, forecast tests

#### [DCMMS-127] Cost Analytics API
- **Assignee:** Backend Developer
- **Specification:** Spec 23 (Cost Management)
- **Story Points:** 5
- **Dependencies:** DCMMS-125, DCMMS-126
- **Acceptance Criteria:**
  - GET /api/v1/analytics/costs (aggregate costs)
  - Query params: site_id, start_date, end_date, groupBy (site/asset/wo_type/category)
  - Metrics: total_cost, avg_cost_per_wo, cost_per_asset, cost_variance
  - Breakdown: labor %, parts %, equipment %, other %
  - Trends: cost over time (monthly aggregates)
  - Comparison: current period vs previous period
  - Export: CSV, PDF
- **Testing:** Analytics tests, aggregation tests

### Frontend Tasks

#### [DCMMS-128] Cost Tracking UI (WO Details)
- **Assignee:** Frontend Developer
- **Specification:** Spec 17, 23
- **Story Points:** 8
- **Dependencies:** DCMMS-125
- **Acceptance Criteria:**
  - WO details page → Costs tab
  - Show cost breakdown table: Category, Description, Amount, Date
  - Add cost button → modal form (category, amount, description)
  - Auto-calculated costs (labor, parts) shown separately
  - Total cost: sum of all costs (highlighted)
  - Edit/delete manual cost entries
  - Cost history: timeline of cost additions
  - Loading and error states
- **Testing:** Component tests, CRUD tests

#### [DCMMS-129] Budget Management Page
- **Assignee:** Frontend Developer
- **Specification:** Spec 17, 23
- **Story Points:** 8
- **Dependencies:** DCMMS-126
- **Acceptance Criteria:**
  - Budget page (admin view)
  - Budget list: Site, Period, Category, Allocated, Spent, Variance, Status (On Track/At Risk/Over Budget)
  - Create budget button → form (site, period, category, amount)
  - Edit budget → update allocated amount
  - Progress bars: spending % (color: green <80%, yellow 80-100%, red >100%)
  - Filters: Site, Period, Category, Status
  - Alerts: list budgets >80% spent
  - Forecast: predicted end-of-period spending
- **Testing:** Component tests, budget CRUD tests

#### [DCMMS-130] Cost Analytics Dashboard
- **Assignee:** Frontend Developer
- **Specification:** Spec 16, 23
- **Story Points:** 8
- **Dependencies:** DCMMS-127
- **Acceptance Criteria:**
  - Cost Analytics page
  - KPI cards: Total Cost, Avg Cost per WO, Cost Variance
  - Charts:
    - Cost trend (line chart: monthly costs)
    - Cost breakdown (pie chart: labor/parts/equipment/other)
    - Cost by site (bar chart)
    - Cost by WO type (bar chart: preventive vs corrective vs predictive)
  - Filters: Site, Date Range, Category
  - Export button: PDF, CSV
  - Loading and error states
- **Testing:** Component tests, chart tests

### QA Tasks

#### [DCMMS-131] Cost Management Testing
- **Assignee:** QA Engineer
- **Specification:** Spec 07, 23
- **Story Points:** 5
- **Dependencies:** DCMMS-125, DCMMS-126, DCMMS-127
- **Acceptance Criteria:**
  - Test cost calculation (manual + auto)
  - Test budget creation and tracking
  - Test budget alerts (simulate >80% spending)
  - Test cost analytics (verify aggregations)
  - Test export functionality (CSV, PDF)
  - Performance test: calculate costs for 10K WOs <2s
  - Test coverage ≥75%
- **Testing:** All cost management tests passing

**Sprint 16 Total:** 39 points

**Sprint Review Demo:**
- Create WO, add labor and parts, show auto-cost calculation
- Add manual cost entry (equipment rental)
- Show total cost breakdown
- Create budget for site
- Show budget dashboard (spending progress)
- Simulate exceeding budget → show alert
- Show cost analytics dashboard (trends, breakdown)
- Export cost report as PDF

---

## Sprint 17: Internationalization & Release 2 (Weeks 35-36)

**Goal:** Add multi-language support and finalize Release 2

**Specifications:** Spec 24 (Internationalization)

**Sprint Capacity:** 35 points (lighter for stabilization)

### Frontend Tasks

#### [DCMMS-132] i18n Setup (Next.js + react-i18next)
- **Assignee:** Frontend Developer
- **Specification:** Spec 24 (Internationalization)
- **Story Points:** 5
- **Dependencies:** DCMMS-007
- **Acceptance Criteria:**
  - next.config.js: i18n configured (locales: en-US, es-ES, fr-FR, de-DE, hi-IN, zh-CN, ar-SA)
  - react-i18next setup
  - Translation files: public/locales/{locale}/{namespace}.json
  - Namespaces: common, auth, work-orders, assets, analytics, settings
  - useTranslation hook in components
  - Language switcher component (dropdown in header)
  - Persist language preference (localStorage)
  - SSR: locale detection from Accept-Language header
- **Testing:** Translation tests, language switching tests

#### [DCMMS-133] Translation Files (5 Languages)
- **Assignee:** Frontend Developer + Product Manager
- **Specification:** Spec 24 (Internationalization)
- **Story Points:** 8
- **Dependencies:** DCMMS-132
- **Acceptance Criteria:**
  - Translate to 5 languages: en-US, es-ES, fr-FR, de-DE, hi-IN (zh-CN, ar-SA in future)
  - Translation files:
    - common.json: navigation, buttons, labels
    - auth.json: login, logout, errors
    - work-orders.json: WO fields, statuses, types
    - assets.json: asset fields, types, statuses
    - analytics.json: KPIs, chart labels
  - All UI text replaced with t('key')
  - Pluralization support: t('items', {count: 5})
  - Date/time formatting: locale-specific (Intl.DateTimeFormat)
  - Number formatting: locale-specific (Intl.NumberFormat)
  - Currency formatting: locale-specific (Intl.NumberFormat with currency)
- **Testing:** Translation coverage tests, formatting tests

#### [DCMMS-134] RTL Support (Arabic)
- **Assignee:** Frontend Developer
- **Specification:** Spec 24 (Internationalization)
- **Story Points:** 5
- **Dependencies:** DCMMS-133
- **Acceptance Criteria:**
  - Tailwind logical properties: ms-, me-, ps-, pe- (margin/padding start/end)
  - dir="rtl" attribute on <html> when locale=ar-SA
  - Layout reversal: sidebar on right, text-align right
  - Icons: mirror horizontally (arrows, chevrons)
  - Test Arabic translation file (ar-SA)
  - Visual verification: all pages render correctly in RTL
  - No hardcoded left/right (use start/end)
- **Testing:** RTL visual tests, layout tests

### Backend Tasks

#### [DCMMS-135] Backend i18n for Notifications
- **Assignee:** Backend Developer
- **Specification:** Spec 24 (Internationalization)
- **Story Points:** 5
- **Dependencies:** DCMMS-064
- **Acceptance Criteria:**
  - User language preference in database (users table: preferred_language)
  - Notification templates: multi-language support
  - Email templates: en, es, fr, de, hi (5 languages)
  - SMS templates: en, es, fr, de, hi
  - Template variables: {asset_name}, {wo_id}, etc. (same across languages)
  - Send notification in user's preferred language
  - Fallback: en-US if translation missing
  - Date/time in notifications: locale-specific format
- **Testing:** i18n notification tests

### Stabilization & Release

#### [DCMMS-136] Release 2 Bug Fixes
- **Assignee:** All Developers
- **Specification:** All specs
- **Story Points:** 8
- **Dependencies:** All Release 2 tasks
- **Acceptance Criteria:**
  - Fix all critical bugs (P0)
  - Fix high-priority bugs (P1)
  - Address medium bugs if time permits
  - Regression testing
  - Known issues documented
  - Release notes prepared
- **Testing:** All tests passing, regression suite green

### ML Documentation

#### [DCMMS-136A] ML Model Cards
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-104 (Model training), DCMMS-108 (Model serving)
- **Acceptance Criteria:**
  - Model card for Anomaly Detection Model:
    - Model purpose and use cases
    - Training data description (features, size, time period)
    - Model architecture (algorithm, hyperparameters)
    - Performance metrics (precision, recall, F1, AUC-ROC, confusion matrix)
    - Feature importance (top 10 features with SHAP values)
    - Limitations and known issues
    - Ethical considerations and bias analysis
    - Intended use and misuse scenarios
    - Model versioning and update history
  - Model card for Predictive Maintenance Model:
    - Same structure as above for predictive model
  - Each model card follows standard template (e.g., Google Model Cards format)
  - Model cards published and accessible to stakeholders
- **Deliverables:**
  - `docs/ml/model-cards/anomaly-detection.md`
  - `docs/ml/model-cards/predictive-maintenance.md`
  - Model cards published to ML dashboard (optional)
- **Testing:** Review with data science team and stakeholders

#### [DCMMS-136B] ML Pipeline Documentation
- **Assignee:** ML/AI Expert
- **Specification:** Spec 22 (AI/ML)
- **Story Points:** 5
- **Dependencies:** DCMMS-095-107 (ML infrastructure and training)
- **Acceptance Criteria:**
  - Feature Engineering Documentation:
    - Feature definitions (20+ features documented)
    - Feature importance analysis with graphs
    - Feature selection rationale
    - Feature transformation logic
    - Feature quality metrics (null rate, drift)
  - ML Training Pipeline Documentation:
    - Metaflow pipeline code documentation
    - Training data preparation steps
    - Hyperparameter tuning process (Optuna configuration)
    - Model evaluation methodology
    - Cross-validation strategy
    - Model selection criteria
    - Experiment tracking guide (MLflow)
  - ML Model Serving Documentation:
    - KServe deployment guide (step-by-step)
    - Model inference API documentation
    - Input/output schema
    - Model versioning strategy
    - A/B testing strategy (if applicable)
    - Model rollback procedures
  - ML Monitoring & Drift Detection:
    - Drift detection configuration
    - Model performance monitoring dashboards
    - Retraining triggers and workflow
    - Alert thresholds
    - Production feedback loop
- **Deliverables:**
  - `docs/ml/feature-engineering.md`
  - `docs/ml/training-pipeline.md`
  - `docs/ml/model-serving.md`
  - `docs/ml/monitoring-drift-detection.md`
- **Testing:** Documentation review, validate procedures

#### [DCMMS-136C] Deployment Runbook (Release 2)
- **Assignee:** DevOps + ML Engineer
- **Specification:** Spec 05 (Deployment)
- **Story Points:** 3
- **Dependencies:** All Release 2 tasks
- **Acceptance Criteria:**
  - Updated deployment runbook for Release 2
  - Include ML services: Feast, MLflow, KServe
  - ML model deployment procedures:
    - How to deploy new model version
    - Model validation before production
    - A/B testing deployment (if applicable)
    - Model rollback procedures
  - Feast feature store deployment
  - Service dependencies and startup order
  - Health checks for all services
  - Data migration procedures (if any)
  - Rollback procedures
  - Post-deployment smoke tests
- **Deliverables:**
  - `docs/deployment/runbook-release-2.md`
  - ML deployment checklist
- **Testing:** Dry-run deployment with ML components

#### [DCMMS-136D] Release Notes (Release 2)
- **Assignee:** Product Manager
- **Specification:** N/A
- **Story Points:** 2
- **Dependencies:** All Release 2 tasks
- **Acceptance Criteria:**
  - Release notes for Release 2 (v0.3.0 or v3.0.0)
  - Summary: AI/ML, cost management, internationalization
  - Features implemented:
    - ML predictive maintenance (10% of WOs ML-driven)
    - Anomaly detection and automated WO creation
    - Model explainability (SHAP)
    - Work order costing and budget management
    - Cost analytics and forecasting
    - Multi-language support (5+ languages)
    - RTL support for Arabic
    - Multi-language notifications
  - Specifications covered: List all 3 P2 specs (22-24)
  - Performance achievements (all targets met)
  - ML model performance metrics
  - Breaking changes (if any)
  - Migration guide
  - Known issues and future roadmap
  - Contributors and acknowledgments
- **Deliverables:**
  - `RELEASE_NOTES_v0.3.0.md`
  - Published to documentation site
- **Testing:** Review with stakeholders

### User & Admin Documentation

#### [DCMMS-137] Release 2 Documentation
- **Assignee:** Product Manager + QA Engineer
- **Specification:** Spec 19 (Documentation)
- **Story Points:** 3
- **Dependencies:** All Release 2 tasks
- **Acceptance Criteria:**
  - User guide updates: ML predictions, cost management, multi-language
  - Admin guide: ML model management, budget setup
  - API documentation: updated OpenAPI spec
  - Changelog: Release 2 features
  - Training materials (videos or slides)
  - Migration guide (if schema changes)
  - i18n guide: how to add new language
- **Testing:** Documentation review

#### [DCMMS-138] Release 2 Performance Testing
- **Assignee:** QA Engineer + Backend Developer
- **Specification:** Spec 18 (Performance)
- **Story Points:** 5
- **Dependencies:** All Release 2 tasks
- **Acceptance Criteria:**
  - Load test: 100 concurrent users
  - API p95 latency: <200ms (maintained)
  - Telemetry pipeline: 72K events/sec (production plan verified)
  - ML inference: <500ms p95 for 100 assets
  - Cost calculation: <2s for 10K WOs
  - Lighthouse score: >90 (performance)
  - Database optimization: slow query analysis
  - Load test report with graphs
- **Testing:** Performance tests passing

#### [DCMMS-139] User Acceptance Testing (UAT) - Release 2
- **Assignee:** QA Engineer + Product Manager
- **Specification:** All Release 2 specs (22-24)
- **Story Points:** 5
- **Dependencies:** DCMMS-136, DCMMS-137, DCMMS-138
- **Acceptance Criteria:**
  - UAT test plan for Release 2 features
  - UAT test cases executed:
    - ML predictive maintenance workflows (anomaly detection → WO creation, model explainability)
    - Cost management workflows (WO costing, budget tracking, cost analytics)
    - Internationalization workflows (language switching, RTL support, multi-language notifications)
    - End-to-end platform validation (all 24 specifications)
    - Performance validation (all targets met: API latency, telemetry throughput, ML inference)
    - Cross-browser testing (Chrome, Firefox, Safari, Edge)
    - Mobile app testing (Android, iOS)
  - Defects logged and prioritized
  - Critical and high-priority defects resolved
  - UAT sign-off obtained from Product Manager
  - Production readiness checklist completed
  - UAT report generated (final release report)
- **Testing:** Formal UAT execution with stakeholders, production readiness review

**Sprint 17 Total:** 54 points
- Backend & Frontend: 21 points
- Bug Fixes & Stabilization: 8 points
- ML Documentation: 15 points (Model cards, ML pipeline docs, deployment runbook, release notes)
- User & Admin Documentation: 3 points
- Performance Testing: 5 points
- UAT: 5 points

**Sprint Review / Release 2 Demo:**
- Full platform demonstration (all features across all 24 specifications)
- Switch language (English → Spanish → Arabic RTL)
- Show ML-driven predictive WOs (10% of corrective actions)
- Show cost management (budget tracking, cost analytics)
- Show multi-language notifications
- Present performance metrics (all targets met)
- Present UAT results and production readiness sign-off
- Present Release 2 metrics: 100% specification coverage, 75%+ test coverage, production-ready
- Roadmap to cloud migration and production deployment

---

## Post-Sprint 17: Cloud Migration & Production (Weeks 37+)

**Note:** This is not part of the 17-sprint plan but provides guidance for the next phase.

### Tasks for Cloud Migration

1. **Cloud Infrastructure Setup** (DevOps lead)
   - Provision AWS/Azure/GCP account
   - Set up VPC, subnets, security groups
   - Deploy managed services: RDS, MSK, ElastiCache, S3
   - Set up EKS cluster with node groups

2. **Application Deployment** (All team)
   - Containerize all services (Dockerfile for each)
   - Kubernetes manifests (Deployment, Service, Ingress)
   - Helm charts for easy deployment
   - Deploy to staging environment
   - Smoke tests, E2E tests, load tests

3. **Data Migration** (Backend + DevOps)
   - Export data from local PostgreSQL
   - Import to cloud RDS
   - Verify data integrity
   - Migrate telemetry data to cloud QuestDB/TimescaleDB

4. **DNS & SSL** (DevOps)
   - Configure DNS (Route 53)
   - SSL certificates (Let's Encrypt or ACM)
   - CloudFront CDN setup

5. **Monitoring & Alerts** (DevOps)
   - CloudWatch/Stackdriver integration
   - Prometheus + Grafana in cloud
   - PagerDuty/Opsgenie for on-call alerts
   - Set up dashboards for production monitoring

6. **Go-Live Checklist**
   - [ ] All services deployed and healthy
   - [ ] Database migrations complete
   - [ ] DNS pointing to production
   - [ ] Monitoring and alerts configured
   - [ ] Backup and disaster recovery tested
   - [ ] Load testing passed (100+ concurrent users)
   - [ ] Security audit complete (pen test)
   - [ ] User training complete
   - [ ] Runbooks documented
   - [ ] Stakeholder sign-off

---

## Summary

**Total Sprints:** 17 (34 weeks / ~8.5 months to Release 2)

**Sprint 0:** Foundation setup
**Sprints 1-5:** MVP (Release 0) - Month 3
**Sprints 6-11:** Release 1 (Telemetry, Notifications, Analytics) - Month 6
**Sprints 12-17:** Release 2 (AI/ML, Cost, i18n) - Month 9

**Key Metrics:**
- 24 specifications: 100% implemented
- Test coverage: ≥75% across all modules
- API p95 latency: <200ms
- Telemetry: 72K events/sec
- ML-driven WOs: 10% of corrective actions
- Multi-language: 5+ languages
- Mobile offline: 90%+ WOs closed offline

**Team Velocity:** ~40 story points per 2-week sprint

**Risks:**
- Complexity of ML infrastructure (Sprints 12-15)
- Telemetry performance at scale (Sprints 6-7)
- Mobile offline sync edge cases (Sprint 4)

**Mitigation:**
- Flexible sprint sizing (can extend to 3 weeks if needed)
- Early prototyping for risky features
- Continuous testing and integration

---

**Document End**

**Status:** Ready for Sprint Planning
**Next Action:** Review with team, refine tasks, begin Sprint 0
**Owner:** Product Manager + Tech Leads

---

## APPENDIX: Stakeholder Decision Implementation Notes

**Date Added:** November 15, 2025
**Based on:** STAKEHOLDER_DECISIONS.md

This appendix documents changes required throughout the task list based on stakeholder decisions. Task owners should reference this when planning sprints.

### Sprint 0 (Weeks 1-4) - EXTENDED

**NEW TASKS TO ADD:**

**Week 3: High-Fidelity UI Mockups**
- [DCMMS-001M] Design System Creation (UI/UX Designer, 8 points)
  - Create color palette, typography scale, spacing system
  - Define component specifications (buttons, forms, tables, cards, modals)
  - Document design tokens
  - Ensure WCAG 2.1 AA compliance

- [DCMMS-001N] High-Fidelity Mockup Design - Dashboard (UI/UX Designer, 5 points)
  - Dashboard with KPIs, work order backlog, asset availability
  - Responsive layouts (desktop 1920px, tablet 768px, mobile 375px)
  - Interactive Figma/Sketch prototype

- [DCMMS-001O] High-Fidelity Mockup Design - Asset Management (UI/UX Designer, 5 points)
  - Asset list, details, hierarchy view
  - Search and filtering UI
  - Asset creation forms

- [DCMMS-001P] High-Fidelity Mockup Design - Work Order Management (UI/UX Designer, 8 points)
  - Work order list, creation, details, execution flows
  - State machine visualization
  - Task management UI

- [DCMMS-001Q] High-Fidelity Mockup Design - Mobile App (UI/UX Designer, 8 points)
  - Login, work order list, offline execution
  - Photo capture, barcode scanning
  - Sync status indicators

- [DCMMS-001R] High-Fidelity Mockup Design - User Management (UI/UX Designer, 3 points)
  - User list, roles, permissions
  - Settings and preferences

**Week 4: Design Review & Token Extraction**
- [DCMMS-001S] Stakeholder Mockup Review (Product Manager + UI/UX Designer, 3 points)
  - Present mockups to stakeholders
  - Collect feedback and prioritize revisions
  - Obtain final approval and sign-off

- [DCMMS-001T] Design Token Extraction (Frontend Developer, 5 points)
  - Extract CSS variables from approved mockups
  - Create Tailwind configuration
  - Set up shadcn/ui component customization
  - Create developer handoff documentation

- [DCMMS-001U] Component Library Setup (Frontend Developer, 5 points)
  - Implement base components based on mockups
  - Create Storybook for component documentation
  - Set up Figma developer mode for asset export

### IdP Adapter Pattern Implementation

**Sprint 1-2 (Weeks 5-8) - ADD THESE TASKS:**

- [DCMMS-020] IdP Adapter Interface Design (Backend Developer, 3 points)
  - Design adapter interface for authentication providers
  - Support Auth0/Okta, Azure AD, Keycloak
  - Factory pattern for provider selection

- [DCMMS-021] Auth0/Okta Adapter Implementation (Backend Developer, 5 points)
  - Implement Auth0/Okta adapter as initial provider
  - OAuth2/OIDC flow implementation
  - Token validation and refresh
  - User info retrieval

- [DCMMS-022] IdP Adapter Testing (Backend Developer + QA, 3 points)
  - Unit tests for adapter interface
  - Integration tests with Auth0/Okta
  - Mock adapters for testing

### ERP Integration - DEFERRED

**Sprint 3 (Weeks 9-10) - REMOVE/DEFER THESE TASKS:**
- All ERP integration tasks **MOVED TO RELEASE 3+**
- Inventory and procurement modules will operate **standalone** without ERP
- Maintain clean integration points for future ERP connectivity

**Note:** If any tasks reference ERP integration in Sprint 3-4, mark them as "ERP integration points designed but not implemented (deferred to Release 3+)"

### CEA/MNRE Compliance Focus

**Sprint 11 (Weeks 25-26) - UPDATE THESE TASKS:**

**REMOVE/DEFER:**
- NERC compliance report templates
- AEMO compliance workflows
- NESO/UK Grid Code compliance
- All tasks related to FERC, OSHA compliance reporting

**KEEP AND ENHANCE:**
- CEA (Central Electricity Authority) compliance:
  - Grid Standards Regulations 2010
  - Technical Standards for Connectivity 2007
  - Monthly generation reports
  - Annual performance reports

- MNRE (Ministry of New and Renewable Energy) compliance:
  - Solar Park Scheme progress reports
  - REC (Renewable Energy Certificate) Mechanism compliance
  - Performance-Based Incentive reporting

**ADD NEW TASKS:**
- [DCMMS-TBD] CEA Grid Standards Compliance Report Template (Backend Developer, 3 points)
- [DCMMS-TBD] MNRE REC Mechanism Compliance Workflow (Backend Developer, 5 points)
- [DCMMS-TBD] CEA Monthly Generation Report Automation (Backend Developer, 3 points)

### Interactive Tutorials

**Sprint 11 (Weeks 25-26) - ADD THESE TASKS:**

- [DCMMS-TBD] In-App Tutorial Framework (Frontend Developer, 5 points)
  - Implement tooltip system
  - Create walkthrough component
  - Contextual help integration

- [DCMMS-TBD] Onboarding Tutorial (Frontend Developer, 3 points)
  - First-time user 5-step walkthrough
  - Product tour with key features

- [DCMMS-TBD] Work Order Tutorial (Frontend Developer, 3 points)
  - How to create a work order (in-app guide)
  - Work order execution flow tutorial

- [DCMMS-TBD] Mobile Offline Mode Tutorial (Mobile Developer, 3 points)
  - How to work offline tutorial
  - Sync status explanation
  - Conflict resolution guidance

### Hindi i18n (Not 15+ Languages)

**Sprint 17 (Weeks 37-38) - UPDATE SCOPE:**

**REMOVE/DEFER:**
- Spanish, French, German, Chinese, Arabic (and other languages)
- RTL (Right-to-Left) support for Arabic
- Multi-currency beyond INR/USD
- Complex locale-specific formatting for multiple regions

**KEEP AND UPDATE:**
- English (primary language)
- **Hindi only** (secondary language)
- Basic locale formatting (dates, numbers for India)
- Timezone support (IST focus)

**UPDATED TASKS:**
- [DCMMS-TBD] Hindi Translation Files (Frontend/Mobile Developer, 5 points)
  - Translate all UI strings to Hindi
  - Create Hindi translation JSON files
  - Test Hindi language switching

- [DCMMS-TBD] Hindi i18n Testing (QA, 3 points)
  - Verify Hindi translations
  - Test language switching
  - Ensure proper rendering of Devanagari script

**Story Points Saved:** ~20-25 points (can be reallocated to ML model cards or other features)

### ML Model Cards (NEW)

**Sprint 17 (Weeks 37-38) - ADD THESE TASKS:**

- [DCMMS-TBD] Anomaly Detection Model Card (ML/AI Expert, 5 points)
  - Model description and use case
  - Performance metrics (precision, recall, F1-score)
  - Training data characteristics
  - Limitations and ethical considerations
  - Monitoring and retraining procedures

- [DCMMS-TBD] Predictive Maintenance Model Card (ML/AI Expert, 5 points)
  - Model description and use case
  - Performance metrics (accuracy, RMSE)
  - Feature importance documentation
  - Limitations and ethical considerations
  - Monitoring and retraining procedures

- [DCMMS-TBD] ML Model Card Template System (Frontend Developer, 3 points)
  - Create UI for displaying model cards
  - Model card versioning
  - Model card approval workflow

### Multi-Protocol SCADA Support

**Sprint 6-7 (Weeks 15-18) - ENSURE COVERAGE:**

**Protocols to Support from Beginning:**
- OPC-UA (industrial automation standard)
- Modbus TCP/RTU (legacy SCADA)
- IEC 61850 (electrical substation automation)
- DNP3 (utilities and SCADA)

**ADD TASKS IF MISSING:**
- [DCMMS-TBD] OPC-UA Protocol Adapter (Backend Developer, 5 points)
- [DCMMS-TBD] Modbus TCP/RTU Protocol Adapter (Backend Developer, 5 points)
- [DCMMS-TBD] IEC 61850 Protocol Adapter (Backend Developer, 5 points)
- [DCMMS-TBD] DNP3 Protocol Adapter (Backend Developer, 5 points)
- [DCMMS-TBD] Multi-Protocol SCADA Testing (QA, 5 points)
  - Protocol simulators setup
  - Integration testing for each protocol
  - Performance validation

### MDM-Optional Mobile Security

**Sprint 3-4 (Weeks 9-12) - REMOVE MDM DEPENDENCIES:**

**REMOVE/DEFER:**
- Microsoft Intune integration
- Jamf Pro integration
- VMware Workspace ONE integration
- Any hard MDM dependency

**ADD COMPENSATING CONTROLS:**
- [DCMMS-TBD] Biometric Authentication (Mobile Developer, 3 points)
  - Face ID / Touch ID / Fingerprint
  - Fallback to PIN

- [DCMMS-TBD] App-Level Security Controls (Mobile Developer, 5 points)
  - 6-digit PIN with lockout
  - Session timeout (15 minutes)
  - Local database encryption (SQLCipher)
  - Secure keychain/keystore for tokens

- [DCMMS-TBD] Server-Side Device Management (Backend Developer, 5 points)
  - Device registry
  - Remote wipe API
  - Device blacklist
  - Jailbreak/root detection

### Sprint 18 (Weeks 39-40) - NEW SPRINT

**ADD ENTIRE SPRINT:**

**Goal:** Final integration, performance validation, production readiness

**Capacity:** 70 points

**Key Tasks:**
- [DCMMS-TBD] Production Readiness Checklist (All Team, 13 points)
- [DCMMS-TBD] Performance Validation (QA, 8 points)
- [DCMMS-TBD] Security Audit (Backend + DevOps, 8 points)
- [DCMMS-TBD] Disaster Recovery Plan (DevOps, 5 points)
- [DCMMS-TBD] Incident Response Plan (DevOps, 5 points)
- [DCMMS-TBD] Cloud Provider Final Selection (DevOps, 3 points)
- [DCMMS-TBD] Production Deployment Runbook (DevOps, 5 points)
- [DCMMS-TBD] Release 2 Demo Preparation (Product Manager, 3 points)
- [DCMMS-TBD] User Documentation Final Review (All Team, 5 points)
- [DCMMS-TBD] Training Material Finalization (Product Manager, 5 points)

### Cloud-Agnostic Architecture - Throughout All Sprints

**Global Change:** Replace all AWS-specific references with cloud-agnostic alternatives

**Examples:**
- EKS → Kubernetes (any provider: EKS/AKS/GKE)
- MSK → Apache Kafka (managed or self-hosted)
- RDS → PostgreSQL (managed or on K8s)
- ElastiCache → Redis (managed or on K8s)
- S3 → S3-compatible storage (S3/Azure Blob/GCS)
- CloudFront → Multi-CDN (Cloudflare/Fastly)
- ALB → Kubernetes Ingress (NGINX/Traefik)
- CloudWatch → Prometheus + Grafana
- AWS KMS → Cloud KMS (provider-specific) or HashiCorp Vault

**Infrastructure Tasks to Update:**
- All Terraform tasks: Use multi-cloud modules
- All deployment tasks: Target Kubernetes, not provider-specific services
- All monitoring tasks: Use Prometheus/Grafana, not CloudWatch

---

## Change Summary by Sprint

| Sprint | Original Weeks | New Weeks | Key Changes |
|--------|---------------|-----------|-------------|
| **0** | 1-2 | 1-4 | +2 weeks for high-fidelity mockups, cloud-agnostic arch, IdP adapter |
| **1** | 3-4 | 5-6 | +IdP adapter implementation |
| **2** | 5-6 | 7-8 | No major changes |
| **3** | 7-8 | 9-10 | **Remove ERP integration**, add MDM-optional security |
| **4** | 9-10 | 11-12 | No major changes |
| **5** | 11-12 | 13-14 | No major changes |
| **6** | 13-14 | 15-16 | +Multi-protocol SCADA adapters |
| **7** | 15-16 | 17-18 | No major changes |
| **8** | 17-18 | 19-20 | No major changes |
| **9** | 19-20 | 21-22 | No major changes |
| **10** | 21-22 | 23-24 | No major changes |
| **11** | 23-24 | 25-26 | **CEA/MNRE only** (remove NERC/AEMO/NESO), +Interactive tutorials |
| **12** | 25-26 | 27-28 | No major changes |
| **13** | 27-28 | 29-30 | No major changes |
| **14** | 29-30 | 31-32 | No major changes |
| **15** | 31-32 | 33-34 | No major changes |
| **16** | 33-34 | 35-36 | No major changes |
| **17** | 35-36 | 37-38 | **Hindi only** (not 15+ languages), +ML model cards |
| **18** | N/A | 39-40 | **NEW SPRINT:** Production readiness, final integration |

---

## Action Items for Sprint Planning

1. **Before Sprint 0:**
   - Confirm UI/UX designer availability for Weeks 3-4
   - Review and approve extended Sprint 0 timeline
   - Update sprint capacity planning (140 points vs 70 points)

2. **During Sprint 0:**
   - Add new mockup tasks (DCMMS-001M through DCMMS-001U)
   - Update architecture tasks with cloud-agnostic requirements

3. **Before Sprint 1-2:**
   - Add IdP adapter tasks (DCMMS-020 through DCMMS-022)

4. **Before Sprint 3:**
   - Remove/defer all ERP integration tasks
   - Add MDM-optional security tasks

5. **Before Sprint 6-7:**
   - Ensure multi-protocol SCADA adapter tasks are included

6. **Before Sprint 11:**
   - Update compliance tasks to CEA/MNRE only
   - Add interactive tutorial tasks

7. **Before Sprint 17:**
   - Reduce i18n scope to Hindi only
   - Add ML model card tasks

8. **Before Sprint 18:**
   - Create all Sprint 18 tasks (new sprint)
   - Prepare production readiness checklist

---

**Last Updated:** November 15, 2025
**Maintained By:** Product Manager
**Review Frequency:** Before each sprint planning session

