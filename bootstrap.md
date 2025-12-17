# dCMMS Project Bootstrap

> **Note:**
> This document serves as the primary entry point for understanding the dCMMS codebase, its purpose, and development standards. Refer to this file at the start of every session to load context.

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

### 6.1 Local Development
**Option A: Docker (Recommended for Full Stack)**
Use the helper script to build and run everything:
```bash
./scripts/start-local.sh
```

**Option B: Manual (Service by Service)**
1. **Start Infrastructure**:
   ```bash
   docker-compose up -d postgres redis kafka clickhouse timescaledb minio
   ```
2. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```
3. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### 6.2 Infrastructure
-   **IaC**: Terraform is used for provisioning cloud infrastructure (AWS/GCP).
-   **Path**: `infrastructure/terraform/`

### 6.3 CI/CD
-   **Platform**: GitHub Actions.
-   **Workflows**: Automated testing, linting, and docker builds on pull requests.

## 7. Next Steps
-   Deployment Planning for Release 3 (Deep Learning & Mobile Customization).
-   Performance benchmarking for new forecasting models.
-   Mobile app beta testing with field technicians.
