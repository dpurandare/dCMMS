# dCMMS Product Requirements Document

## Overview

dCMMS is a comprehensive Computerized Maintenance Management System (CMMS) tailored for non-conventional energy assets, including utility-scale solar farms, wind farms, hybrid microgrids, and battery energy storage systems (BESS). This repository contains the finalized Product Requirements Document (PRD) and supporting artifacts for the dCMMS platform.

The system enables proactive maintenance through predictive analytics, AI-driven automation, and compliance features, supporting field-ready operations with offline capabilities.

## Repository Structure

- **`PRD_FINAL.md`**: The primary, self-contained Product Requirements Document, including all functional, technical, and architectural requirements.
- **`GAP_ANALYSIS.md`**: Comprehensive gap analysis identifying 20+ categories of requirements gaps with prioritization (P0-P3).
- **`GAP_STATUS_REPORT.md`**: Status tracking document showing 100% completion of all gaps across P0, P1, and P2 specifications.
- **`specs/`**: Detailed technical specifications addressing all gaps (24 specifications, ~23,900 lines):

  ### Priority 0 (MVP) - 13 Specifications
  - `01_API_SPECIFICATIONS.md`: Complete REST API design with versioning, error handling, pagination
  - `02_STATE_MACHINES.md`: Formal state machine definitions for work orders, assets, inventory
  - `03_AUTH_AUTHORIZATION.md`: OAuth2/OIDC, JWT, RBAC/ABAC authorization (v2.0)
  - `04_MOBILE_OFFLINE_SYNC.md`: Mobile offline-first architecture with conflict resolution
  - `05_DEPLOYMENT_RUNBOOKS.md`: Step-by-step deployment, rollback, incident response procedures
  - `06_MIGRATION_ONBOARDING.md`: 5-phase site onboarding and data migration plan
  - `07_TESTING_STRATEGY.md`: Comprehensive testing framework (unit, integration, E2E, performance)
  - `08_ORGANIZATIONAL_STRUCTURE.md`: Industry-researched user roles for solar, wind, BESS operations
  - `09_ROLE_FEATURE_ACCESS_MATRIX.md`: Role-to-feature access matrix (17 roles × 73 features)
  - `10_DATA_INGESTION_ARCHITECTURE.md`: High-speed telemetry ingestion (72,000 events/sec)
  - `11_COMPLETE_DATA_MODELS.md`: Complete entity schemas and relationships
  - `12_INTEGRATION_ARCHITECTURE.md`: ERP, weather API, IdP, MDM integration patterns
  - `13_SECURITY_IMPLEMENTATION.md`: Audit logs, encryption, certificate management

  ### Priority 1 (Release 1) - 8 Specifications
  - `14_NOTIFICATION_ALERTING_SYSTEM.md`: Multi-channel notifications (email, SMS, push, voice)
  - `15_COMPLIANCE_REGULATORY_REPORTING.md`: CEA/MNRE compliance workflows (India focus initially, NERC/AEMO/NESO in future releases)
  - `16_ANALYTICS_REPORTING.md`: Advanced analytics, report builder, scheduled reports
  - `17_UX_DESIGN_SYSTEM_TRAINING.md`: Design system, component library, training modules
  - `18_PERFORMANCE_SCALABILITY.md`: Load balancing, caching, auto-scaling strategies
  - `19_DOCUMENTATION_SYSTEM.md`: API docs (OpenAPI), user guides, admin guides
  - `20_VENDOR_PROCUREMENT.md`: Vendor management and procurement workflows
  - `21_EDGE_COMPUTING.md`: Edge analytics, local processing, data aggregation

  ### Priority 2 (Release 2) - 3 Specifications
  - `22_AI_ML_IMPLEMENTATION.md`: Feature store, model training, inference serving, predictive maintenance
  - `23_COST_MANAGEMENT.md`: Work order costing, budget management, billing integration
  - `24_INTERNATIONALIZATION.md`: Hindi as second language initially (15+ languages in future releases), RTL, locale formatting

- **`archive/`**: Historical documents and superseded files for reference.
  - `PRD_INPUT.md`: Original input document, archived with a notice.
  - `research.md`: Research notes and background materials.
  - Other archived assets.
- **`media/`**: Diagrams and images referenced in the PRD:
  - `ARCHITECTURE_DIAGRAMS_V2.md`: Comprehensive architecture diagrams (v2.0) with 5 detailed Mermaid diagrams covering complete system
  - `Arch1.png`, `Arch2.png`: Legacy diagrams focusing on data pipeline
- **`metadata/`**: JSON schemas for data entities (e.g., asset, work order, sensor reading schemas).

## Key Features

### Core Platform (MVP - P0)
- **Asset Management**: Hierarchical asset registry with comprehensive telemetry integration
- **Work Order Lifecycle**: Complete management from creation to closure with state machines
- **Mobile Offline-First**: SQLite-based offline sync with conflict resolution
- **Authentication & Authorization**: OAuth2/OIDC with RBAC/ABAC (17 industry roles)
- **High-Speed Data Ingestion**: 72,000 events/second with Kafka/Flink/QuestDB
- **Integration Architecture**: SCADA, weather API, IdP integration patterns (ERP deferred to post-Release 2)
- **Security**: Audit logs, encryption (TLS 1.3, AES-256), certificate management
- **Deployment**: Cloud-agnostic Kubernetes-based with automated rollback and incident response

### Production Enhancements (Release 1 - P1)
- **Multi-Channel Notifications**: Email, SMS, push notifications, voice calls with escalation
- **Compliance & Regulatory**: CEA/MNRE automated reporting workflows (India focus initially, NERC/AEMO/NESO in future releases)
- **Advanced Analytics**: Report builder, custom dashboards, scheduled exports
- **Design System**: 50+ reusable components with training modules
- **Performance & Scalability**: Load balancing, caching, auto-scaling (5,000 concurrent users)
- **Edge Computing**: Local processing and analytics at remote sites
- **Vendor & Procurement**: Contract management, RFQ/RFP workflows
- **Comprehensive Documentation**: OpenAPI specs, user guides, admin guides

### Advanced Capabilities (Release 2 - P2)
- **AI/ML Implementation**: Predictive maintenance, generation forecasting, anomaly detection
- **Cost Management**: Work order costing, budget tracking, billing integration
- **Internationalization**: Hindi as second language initially (15+ languages in future releases), RTL support, locale-specific formatting

## Releases

The dCMMS platform follows a three-phase release plan with 100% specification coverage:

### Priority 0 (MVP) - 3 Months (Weeks 1-14)
**Target:** Production-ready core platform
- Core asset and work order management with state machines
- Mobile offline-first capabilities
- OAuth2/OIDC authentication with 17 industry roles
- High-speed data ingestion (72,000 events/sec)
- SCADA and weather API integrations (ERP deferred to post-Release 2)
- Security implementation (audit logs, encryption)
- Deployment automation and testing framework
- Cloud-agnostic architecture with IdP adapter pattern
- **Status:** ✅ 13 specifications complete (~10,480 lines)

### Priority 1 (Release 1) - 6 Months Total (Weeks 15-26)
**Target:** Production-ready with enterprise features
- Multi-channel notification system with escalation
- Compliance automation (CEA/MNRE initially, NERC/AEMO/NESO in future releases)
- Advanced analytics and custom report builder
- Design system with 50+ components
- Performance optimization and auto-scaling
- Edge computing for remote sites
- Vendor and procurement workflows
- Comprehensive documentation system
- **Status:** ✅ 8 specifications complete (~10,000 lines)

### Priority 2 (Release 2) - 9 Months Total (Weeks 27-40, includes Sprint 18)
**Target:** AI-powered intelligent platform
- AI/ML for predictive maintenance and forecasting
- Work order costing and budget management
- Hindi as second language initially (15+ languages in future releases)
- Multi-currency and timezone handling
- Advanced cost analytics
- Production readiness (DR, incident response, security operations)
- **Status:** ✅ 3 specifications complete (~3,420 lines)

## Getting Started

### For Product Managers
1. Review **`PRD_FINAL.md`** for comprehensive business and functional requirements
2. Check **`GAP_STATUS_REPORT.md`** to see complete specification coverage (100%)
3. Review **`GAP_ANALYSIS.md`** to understand the original requirements gaps

### For Architects & Tech Leads
1. Review **`media/ARCHITECTURE_DIAGRAMS_V2.md`** for complete system architecture with 5 comprehensive diagrams
2. Start with **`specs/01_API_SPECIFICATIONS.md`** for API design patterns
3. Review **`specs/10_DATA_INGESTION_ARCHITECTURE.md`** for data ingestion architecture
4. Check **`specs/03_AUTH_AUTHORIZATION.md`** for security architecture
5. See **`specs/18_PERFORMANCE_SCALABILITY.md`** for scalability targets

### For Developers
1. Review the relevant specification in **`specs/`** for your feature area
2. Check **`metadata/`** for JSON schemas and data models
3. See **`specs/07_TESTING_STRATEGY.md`** for testing approach
4. Follow **`specs/05_DEPLOYMENT_RUNBOOKS.md`** for deployment procedures

### For DevOps
1. Review **`specs/05_DEPLOYMENT_RUNBOOKS.md`** for deployment automation
2. Check **`specs/18_PERFORMANCE_SCALABILITY.md`** for infrastructure requirements
3. See **`specs/21_EDGE_COMPUTING.md`** for edge deployment

All specifications follow a TDD-friendly approach with clear acceptance criteria.

## Local Development Setup

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- 16GB RAM minimum (32GB recommended for full stack)
- 50GB disk space for Docker volumes

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dCMMS.git
   cd dCMMS
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and update values as needed (defaults work for local dev)
   ```

3. **Start the infrastructure stack**
   ```bash
   docker compose up -d
   ```

   This starts 15 services:
   - **Databases:** PostgreSQL, QuestDB, TimescaleDB, Redis
   - **Message Brokers:** Kafka (KRaft mode), EMQX MQTT
   - **Object Storage:** MinIO (S3-compatible)
   - **Secrets:** HashiCorp Vault (dev mode)
   - **Monitoring:** Prometheus, Grafana, Loki
   - **Dev Tools:** Kafka UI, pgAdmin

4. **Verify services are healthy**
   ```bash
   docker compose ps
   ```

   All services should show "healthy" status after 30-60 seconds.

5. **Access the services**
   - **PostgreSQL:** `postgresql://dcmms_user:dcmms_password_dev@localhost:5432/dcmms`
   - **QuestDB UI:** http://localhost:9000
   - **TimescaleDB:** `postgresql://timescale_user:timescale_password_dev@localhost:5433/timescaledb`
   - **Redis:** `redis://localhost:6379` (password: redis_password_dev)
   - **Kafka:** `localhost:9094` (external) or `kafka:9092` (internal)
   - **EMQX Dashboard:** http://localhost:18083 (admin/public)
   - **MinIO Console:** http://localhost:9001 (minioadmin/minioadmin)
   - **MinIO API:** http://localhost:9002
   - **Vault:** http://localhost:8200 (token: root)
   - **Prometheus:** http://localhost:9090
   - **Grafana:** http://localhost:3000 (admin/admin)
   - **Loki:** http://localhost:3100
   - **Kafka UI:** http://localhost:8080
   - **pgAdmin:** http://localhost:5050 (admin@dcmms.local/admin)

6. **Initialize seed data**

   The PostgreSQL database is automatically initialized with:
   - Default tenant (tenant_id: `default`)
   - Admin user (email: `admin@dcmms.local`, password: `admin123`)
   - Demo site (site_id: `site-001`, name: "Demo Solar Farm")

### Database Schemas

**PostgreSQL (Transactional OLTP)**
- Auto-initialized with complete schema (see `scripts/init-db.sql`)
- 16+ tables including: tenants, users, sites, assets, work_orders, alerts, audit_logs
- Full RBAC with user roles: super_admin, tenant_admin, site_manager, technician, operator, viewer

**TimescaleDB (Time-Series Aggregates)**
- Auto-initialized with hypertables (see `scripts/init-timescaledb.sql`)
- 4 aggregation levels: 1-minute, 5-minute, 1-hour, 1-day
- Compression enabled for older data
- Automatic retention policies (30 days → 5 years depending on granularity)

**QuestDB (Raw Telemetry)**
- Optimized for high-speed ingestion (72,000 events/sec)
- Accessed via HTTP API (port 9000) or PostgreSQL wire protocol (port 8812)
- No initialization script needed - tables created on first data write

### Development Workflow

1. **Stop all services**
   ```bash
   docker compose down
   ```

2. **Stop and remove all data (fresh start)**
   ```bash
   docker compose down -v
   ```

3. **View logs**
   ```bash
   docker compose logs -f [service-name]

   # Examples:
   docker compose logs -f postgres
   docker compose logs -f kafka
   docker compose logs -f emqx
   ```

4. **Restart a specific service**
   ```bash
   docker compose restart [service-name]
   ```

### Monitoring & Observability

**Grafana Dashboards**
- Pre-configured data sources for Prometheus, Loki, PostgreSQL, TimescaleDB, QuestDB
- Access: http://localhost:3000 (admin/admin)

**Prometheus Metrics**
- Scraping metrics from: PostgreSQL, Redis, Kafka, EMQX, MinIO
- Access: http://localhost:9090

**Loki Logs**
- Centralized log aggregation
- Query via Grafana or direct API: http://localhost:3100

### Troubleshooting

**Port Conflicts**
- QuestDB uses port 9000 (HTTP API)
- MinIO uses port 9002 (API) and 9001 (Console)
- If you have port conflicts, edit `docker-compose.yml` and update port mappings

**Service Won't Start**
- Check logs: `docker compose logs [service-name]`
- Verify sufficient memory: `docker stats`
- Check disk space: `df -h`

**Database Connection Issues**
- Wait for health checks to pass: `docker compose ps`
- PostgreSQL takes ~10-15 seconds to initialize
- TimescaleDB takes ~15-20 seconds to initialize

**Kafka Issues**
- Kafka uses KRaft mode (no Zookeeper required)
- Takes ~20-30 seconds to fully start
- Check Kafka UI: http://localhost:8080

### Next Steps

After infrastructure is running:
1. Set up backend API (Sprint 1)
2. Set up frontend web app (Sprint 1)
3. Set up mobile app (Sprint 1)

See `docs/` for detailed architecture and API specifications.

## CI/CD Pipeline

The project uses GitHub Actions for automated testing, security scanning, and deployments.

### Automated Workflows

**Backend CI/CD** (`.github/workflows/backend-ci.yml`)
- Lint, format, and type checking
- Unit and integration tests with PostgreSQL/Redis
- Security scanning (npm audit, Snyk, Trivy)
- Docker image builds and deployments
- Auto-deploy to staging (develop) and production (main)

**Frontend CI/CD** (`.github/workflows/frontend-ci.yml`)
- Lint, format, and type checking
- Unit tests and E2E tests (Playwright)
- Lighthouse performance auditing
- Accessibility testing (axe-core)
- Bundle size checking
- Docker image builds and deployments

**Mobile CI/CD** (`.github/workflows/mobile-ci.yml`)
- Flutter analyzer and format checking
- Unit and integration tests
- Android APK/AAB builds
- iOS IPA builds
- Deploy to Firebase App Distribution (beta)
- Deploy to Play Store and App Store (production)

**Code Quality** (`.github/workflows/code-quality.yml`)
- CodeQL security analysis
- SonarQube code quality checks
- Dependency vulnerability scanning
- Secret scanning (TruffleHog, Gitleaks)
- License compliance checking
- Docker image security scanning
- Infrastructure as Code security (Checkov)

**PR Automation** (`.github/workflows/pr-automation.yml`)
- Auto-labeling based on changed files
- PR size labeling (XS/S/M/L/XL)
- Auto-assign reviewers by team
- Conventional commit validation
- Stale PR management
- Dependabot auto-merge for minor/patch updates

### Branch Strategy
- `main` → Production deployments
- `develop` → Staging deployments
- `feature/**` → Feature branches
- `fix/**` → Bug fix branches
- `claude/**` → Automated changes

### Required Checks
- All tests must pass
- Code coverage > 80%
- No CRITICAL/HIGH security vulnerabilities
- Lighthouse score > 90
- Bundle size within limits

See `docs/devops/ci-cd-pipeline.md` for complete documentation.

## Technology Stack

### Frontend
- React 18 with TypeScript
- React Query for data fetching
- Tailwind CSS + Design System
- react-i18next for internationalization
- Progressive Web App (PWA)

### Backend
- Node.js with Fastify
- PostgreSQL with QuestDB for time-series data
- Redis for caching and rate limiting
- Apache Kafka for event streaming
- Apache Flink for stream processing

### Mobile
- Flutter (iOS/Android)
- SQLite for offline storage (SQLCipher encryption)
- Background sync with delta replication

### AI/ML (Release 2)
- Feast (feature store)
- Metaflow (training pipelines)
- MLflow (model registry)
- FastAPI + KServe (inference serving)
- TensorFlow, PyTorch, Scikit-learn

### Infrastructure (Cloud-Agnostic)
- Kubernetes for orchestration (AWS EKS, Azure AKS, or GCP GKE)
- Object storage (S3-compatible)
- Managed PostgreSQL, Redis, Kafka services
- Multi-CDN support (Cloudflare, Fastly, or cloud provider)
- Terraform for Infrastructure as Code
- Prometheus + Grafana for monitoring
- Loki for log aggregation
- Jaeger for distributed tracing

## Performance Targets

- **API Response Time:** p95 <200ms
- **Data Ingestion:** 72,000 events/second sustained
- **Concurrent Users:** 5,000 simultaneous users
- **Uptime SLA:** 99.9%
- **Frontend Performance:** LCP <2.5s, FID <100ms

## Contributing

This repository is for documentation purposes. For contributions or questions, contact the project maintainer.

## License

[Specify license if applicable, e.g., MIT or proprietary.]

---

## Project Status

**Specification Status:** 🎉 **100% COMPLETE** 🎉

- ✅ P0 (MVP): 13 specifications - 100% complete
- ✅ P1 (Release 1): 8 specifications - 100% complete
- ✅ P2 (Release 2): 3 specifications - 100% complete

**Total:** 24 comprehensive specifications covering ~23,900 lines

All gaps identified in GAP_ANALYSIS.md have been fully addressed. The platform is ready for implementation.

---

## Implementation Notes

**Phased Approach Based on Stakeholder Decisions:**
- **Compliance:** CEA/MNRE (India) in Release 1, NERC/AEMO/NESO in future releases
- **Internationalization:** English + Hindi in Release 2, 15+ languages in future releases
- **Infrastructure:** Cloud-agnostic design (AWS, Azure, or GCP)
- **ERP Integration:** Deferred to post-Release 2
- **IdP Strategy:** Flexible adapter pattern (Auth0, Azure AD, Keycloak)

**Sprint 0 Extended:** 4 weeks (includes high-fidelity UI mockups in Weeks 3-4)

**Production Readiness:** Sprint 18 (Weeks 39-40) includes DR plan, incident response, security operations

---

**Date**: November 15, 2025
**Version**: 2.1
**Author**: Deepak Purandare
