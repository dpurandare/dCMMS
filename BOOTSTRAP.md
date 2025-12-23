# dCMMS Project Bootstrap

> **Note:**
> This document serves as the primary entry point for understanding the dCMMS codebase, its purpose, and development standards. Refer to this file at the start of every session to load context.

> [!CAUTION]
> ## 🚨 CRITICAL: ALWAYS CHECK FOR EXISTING IMPLEMENTATIONS 🚨
> 
> **Before implementing ANY feature, service, component, or utility:**
> 
> 1. **Search the codebase** using `grep`, `find`, or IDE search
> 2. **Check `backend/src/services/`** for existing service implementations
> 3. **Check `frontend/src/components/`** for existing UI components
> 4. **Check `backend/src/routes/`** for existing API endpoints
> 5. **Review `TasksTracking/` modules** to see what's already implemented
> 6. **Ask yourself**: "Could this already exist under a different name?"
> 
> **We have suffered significant setbacks from duplicate code.**
> 
> **Examples of what to check:**
> - Before creating a new service, search for similar functionality
> - Before adding a new route, check if endpoint exists
> - Before building a component, search for similar UI patterns
> - Before writing a utility function, check if it exists elsewhere
> 
> **When in doubt:**
> - Search the codebase first
> - Review recent commits
> - Check the implementation plan for completed tasks
> - Ask for confirmation before creating "new" functionality
> 
> **This is NOT optional. This is MANDATORY.**

## 1. Project Overview

**dCMMS** (Distributed Computerized Maintenance Management System) is a comprehensive platform tailored for non-conventional energy assets (Solar, Wind, BESS, Microgrids).

-   **Goal**: Enable proactive maintenance through predictive analytics, AI-driven automation, and offline-first mobile capabilities.
-   **Key Features**: Asset Registry, Work Order Lifecycle, Predictive Maintenance (AI/ML), Telemetry Ingestion, and Regulatory Compliance.
-   **Current State**: **Active Development**. Core services are being implemented.

## 2. Repository Structure

The repository is organized as a monorepo:

-   **`backend/`**: Node.js (Fastify) API service with TypeScript and Drizzle ORM.
-   **`frontend/`**: Next.js web application with Tailwind CSS and Radix UI.
-   **`ml/`**: Machine Learning pipelines (Feast, Metaflow, MLflow).
-   **`telemetry/`**: Real-time data processing with Apache Flink.
-   **`infrastructure/`**: IaC and deployment configurations.
-   **`specs/`**: Technical specifications and design documents.
-   **`docs/`**: General project documentation.
-   **`scripts/`**: Utility scripts for development and maintenance.
-   **`config/`**: Shared configuration files.
-   **`PRD_FINAL.md`**: The source of truth for functional requirements.

## 3. Key Resources & Artifacts

| Artifact                  | Path                                                                             | Description                                    |
| :------------------------ | :------------------------------------------------------------------------------- | :--------------------------------------------- |
| **Product Requirements**  | [PRD_FINAL.md](PRD_FINAL.md)                                                     | Detailed specs for all releases.               |
| **Backend README**        | [backend/README.md](backend/README.md)                                           | Setup and architecture for the API.            |
| **Frontend README**       | [frontend/README.md](frontend/README.md)                                         | Setup and architecture for the Web App.        |
| **Telemetry Quickstart**  | [telemetry/QUICKSTART.md](telemetry/QUICKSTART.md)                               | Guide for the Flink-based telemetry system.    |
| **Technical Specs**       | [specs/](specs/)                                                                 | Technical specifications and design docs.      |
| **Project Documentation** | [docs/](docs/)                                                                   | General project documentation.                 |
| **Tasks & Status (New)**  | [TasksTracking/](TasksTracking/)                                                 | **Primary Source of Truth** for tasks.         |
| **Energy Types Guide**    | [docs/guides/ADDING_NEW_ENERGY_TYPES.md](docs/guides/ADDING_NEW_ENERGY_TYPES.md) | Guide for adding support for new energy types. |
| **Implementation Plan**   | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)                                 | Strategic roadmap.                             |

## 4. Technology Stack (Implemented)

The project is actively using the following stack:

-   **Backend**:
    -   Runtime: Node.js (Fastify)
    -   Language: TypeScript
    -   Database: PostgreSQL (via Drizzle ORM), Redis
    -   Messaging: Apache Kafka
-   **Frontend**:
    -   Framework: Next.js (React)
    -   Styling: Tailwind CSS, Radix UI
    -   State Management: Zustand
-   **Machine Learning**:
    -   Feature Store: Feast
    -   Orchestration: Metaflow
    -   Tracking: MLflow
    -   Deep Learning: PyTorch (LSTM/Transformer)
-   **Telemetry**:
    -   Processing: Apache Flink
-   **Infrastructure**:
    -   Containerization: Docker

## 5. Development Guidelines

### 5.1 Principles
-   **TDD (Test-Driven Development)**: Write tests before implementation.
-   **Offline-First**: Mobile workflows must assume no connectivity.
-   **Security-First**: RBAC, MFA, and Encryption are foundational.

### 5.2 Workflow
1.  **Plan**: Review `PRD_FINAL.md` and relevant specs.
2.  **Design**: Update schemas in `backend/src/db/schema.ts` or `metadata/` if needed.
3.  **Test**: Create test cases (Jest/Playwright).
4.  **Implement**: Write code to pass tests.
5.  **Verify**: Run automated tests (`npm test`) and manual verification.

### 5.3 Git Strategy
-   **Main Branch**: Production-ready code.
-   **Feature Branches**: `feat/feature-name`, `fix/bug-name`.
-   **Commits**: Semantic commit messages (e.g., `feat: add asset registry`, `fix: resolve sync conflict`).

## 6. Build & Deployment

### 6.1 Fully Automated Deployment (Recommended)

The project now supports **complete full-stack deployment** with a single command:

```bash
./scripts/deploy.sh
```

This script automatically deploys the **entire application stack**:

**Infrastructure (15 services):**
- Databases: PostgreSQL, QuestDB, TimescaleDB, ClickHouse
- Cache & Queue: Redis, Kafka, EMQX MQTT
- Storage: MinIO (S3-compatible)
- Secrets: HashiCorp Vault
- Monitoring: Prometheus, Grafana, Loki

**Application:**
- Backend API (with auto-migrations and seeding)
- Frontend Web App
- ML Inference Service

**Automation includes:**
1. ✅ Starts complete infrastructure stack
2. ✅ Waits for critical services to be healthy
3. ✅ Builds all application Docker images
4. ✅ Runs database migrations automatically
5. ✅ Auto-seeds database with default data (if empty)
6. ✅ Starts all application services

**No manual steps required!**

### 6.2 Manual Development Setup

**Option A: Docker Compose (Full Stack)**
```bash
docker compose up -d --build
```

The backend container will automatically:
- Wait for PostgreSQL to be ready
- Run migrations
- Auto-seed if `AUTO_SEED=true` and database is empty
- Start the server

**Option B: Local Development (Service by Service)**
1. **Start Infrastructure**:
   ```bash
   docker compose up -d postgres redis kafka clickhouse timescaledb minio
   ```
2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run db:migrate  # Migrations (automatic in Docker)
   npm run dev
   ```
3. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### 6.3 Clean Slate Deployment

To start from a completely clean state:
```bash
# Remove all containers and volumes
docker compose down -v

# Deploy complete application stack fresh
./scripts/deploy.sh
```

**Result:** Complete dCMMS stack with all 15 infrastructure services, application services, migrations applied, and database seeded.

**Deployment time:** ~3-5 minutes for full stack

### 6.4 Infrastructure Details
-   **IaC**: Terraform is used for provisioning cloud infrastructure (AWS/GCP)
-   **Path**: `infrastructure/terraform/`

### 6.5 CI/CD
-   **Platform**: GitHub Actions
-   **Workflows**: Automated testing, linting, and docker builds on pull requests

**See [docs/deployment/DEPLOYMENT_AUTOMATION.md](docs/deployment/DEPLOYMENT_AUTOMATION.md) for detailed deployment documentation.**

## 7. Database Seeding (Dev/Test)

For development and testing, the database  can be automatically populated with default data.

### Quick Start
The system will auto-seed on startup if:
- `AUTO_SEED=true` in `.env`
- `NODE_ENV=development` (or `test`/`local`)
- Database is empty

### Default Credentials
- **Admin**: admin@example.com / Password123!
- **Manager**: manager@example.com / Password123!
- **Technician**: technician@example.com / Password123!

**See [backend/SEEDING.md](backend/SEEDING.md) for complete details.**

## 8. Next Steps
-   Deployment Planning for Release 3 (Deep Learning & Mobile Customization).
-   Performance benchmarking for new forecasting models.
-   Mobile app beta testing with field technicians.
