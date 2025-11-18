# dCMMS System Architecture

**Version:** 1.0 (Cloud-Agnostic)
**Date:** 2025-11-18
**Status:** ✅ Approved for Sprint 0
**Based on:** 24 Technical Specifications, TECHNOLOGY_STACK_EVALUATION.md v2.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Architecture](#component-architecture)
5. [Data Architecture](#data-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Scalability & Performance](#scalability--performance)
9. [References](#references)

---

## Executive Summary

dCMMS (Distributed Computerized Maintenance Management System) is a cloud-agnostic, microservices-based platform for renewable energy asset management. The system is designed to:

- **Support 72,000 events/second** sustained telemetry ingestion
- **Handle 5,000 concurrent users** with API response <200ms (p95)
- **Enable offline-first mobile** operations with conflict resolution
- **Process real-time ML predictions** for predictive maintenance
- **Operate across multiple cloud providers** (AWS, Azure, GCP) without vendor lock-in

### Key Architectural Decisions

- **[ADR-001](./adrs/ADR-001-cloud-agnostic-architecture.md):** Cloud-agnostic architecture using Kubernetes
- **[ADR-002](./adrs/ADR-002-idp-adapter-pattern.md):** Identity provider adapter pattern
- **[ADR-003](./adrs/ADR-003-multi-protocol-scada-support.md):** Multi-protocol SCADA integration at edge

---

## Architectural Principles

### 1. Cloud Agnostic
- **No vendor lock-in:** Use Kubernetes and open-source technologies
- **Portable:** Deploy on AWS, Azure, GCP, or on-premises
- **Consistent:** Same architecture from edge (K3s) to cloud (K8s)

### 2. Offline-First
- **Mobile resilience:** Operate without connectivity for extended periods
- **Edge autonomy:** 24-hour local buffering at renewable sites
- **Conflict resolution:** Deterministic sync with version tokens

### 3. Microservices
- **Independently deployable:** Each service can be deployed separately
- **Technology diversity:** Use best tool for each job (Node.js, Python, Go)
- **Fault isolation:** Failures contained to individual services

### 4. Event-Driven
- **Asynchronous:** Kafka for inter-service communication
- **Real-time:** MQTT for telemetry ingestion
- **Scalable:** Horizontal scaling of event processors

### 5. Security by Design
- **Zero trust:** Authenticate and authorize every request
- **Encryption:** TLS in transit, AES-256 at rest
- **Least privilege:** RBAC with fine-grained permissions

### 6. Observable
- **Metrics:** Prometheus + Grafana
- **Logs:** Loki + Promtail
- **Traces:** Jaeger (OpenTelemetry)
- **Alerts:** PagerDuty/Opsgenie integration

---

## High-Level Architecture

### System Context Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ACTORS                                │
├────────────────────────────────────────────────────────────────────────┤
│  Users:                    External Systems:                           │
│  - Administrators          - SCADA/DCS (OPC-UA, Modbus, IEC 61850)    │
│  - Supervisors             - Weather APIs (OpenWeatherMap)             │
│  - Technicians             - IdP (Auth0, Azure AD, Keycloak)          │
│  - Viewers                 - Email/SMS Providers (SendGrid, Twilio)   │
│                            - ERP Systems (future: SAP, Oracle)         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         EDGE TIER (SITE LEVEL)                         │
├────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │ K3s Cluster (Lightweight Kubernetes)                          │    │
│  │  - Protocol Adapters (Modbus, OPC-UA, IEC 61850, DNP3)       │    │
│  │  - EMQX MQTT Broker (local)                                   │    │
│  │  - QuestDB (24-hour buffer)                                   │    │
│  │  - Edge Analytics & Local Alerting                            │    │
│  │  - Sync Agent (bidirectional cloud sync)                      │    │
│  └───────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                        MQTT over TLS (compressed)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       CLOUD TIER (KUBERNETES)                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Presentation Layer                                          │      │
│  │  - Web App (Next.js 14+, TypeScript, Tailwind, shadcn/ui)  │      │
│  │  - Mobile App (Flutter, Drift, Isar)                       │      │
│  │  - PWA (Service Workers, Background Sync)                  │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ API Gateway Layer                                           │      │
│  │  - NGINX Ingress Controller                                │      │
│  │  - Rate Limiting, JWT Verification                         │      │
│  │  - TLS Termination (Let's Encrypt)                         │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Application Services (Microservices)                        │      │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐            │      │
│  │  │ Auth       │ │ Work Order │ │ Asset Mgmt  │            │      │
│  │  │ (Fastify)  │ │ (Fastify)  │ │ (Fastify)   │            │      │
│  │  └────────────┘ └────────────┘ └─────────────┘            │      │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐            │      │
│  │  │Notification│ │ Compliance │ │ Analytics   │            │      │
│  │  │ (Node.js)  │ │ (Fastify)  │ │ (FastAPI)   │            │      │
│  │  └────────────┘ └────────────┘ └─────────────┘            │      │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐            │      │
│  │  │ Mobile Sync│ │ Cost Mgmt  │ │ i18n        │            │      │
│  │  │ (Fastify)  │ │ (Fastify)  │ │ (Fastify)   │            │      │
│  │  └────────────┘ └────────────┘ └─────────────┘            │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Data Pipeline (Event Streaming)                             │      │
│  │  - EMQX MQTT Broker (cluster)                              │      │
│  │  - Apache Kafka 3.6+ (KRaft mode)                          │      │
│  │  - Apache Flink 1.18+ (stream processing)                  │      │
│  │  - Schema Registry (Avro/Protobuf)                         │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Storage Layer                                               │      │
│  │  - PostgreSQL 16 (transactional, OLTP)                     │      │
│  │  - QuestDB (raw telemetry, 72K events/sec)                 │      │
│  │  - TimescaleDB (aggregated telemetry)                      │      │
│  │  - S3 + Iceberg (lakehouse: bronze/silver/gold)            │      │
│  │  - Redis 7.2+ (caching, sessions, feature store)           │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ ML/AI Platform                                              │      │
│  │  - Feast (feature store: offline S3, online Redis)         │      │
│  │  - Metaflow (model training)                               │      │
│  │  - MLflow (model registry)                                 │      │
│  │  - KServe (model serving, auto-scaling)                    │      │
│  │  - Optuna (hyperparameter tuning)                          │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                              │                                          │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │ Infrastructure Services                                     │      │
│  │  - HashiCorp Vault (secrets management)                    │      │
│  │  - Cert Manager (TLS certificates)                         │      │
│  │  - Prometheus (metrics)                                    │      │
│  │  - Grafana (visualization)                                 │      │
│  │  - Loki (logging)                                          │      │
│  │  - Jaeger (tracing)                                        │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Web** | Next.js 14+, TypeScript, Tailwind, shadcn/ui | 50% faster LCP than CRA, excellent SEO |
| **Frontend Mobile** | Flutter (Dart), Drift (SQLite), Isar | Superior offline performance vs React Native |
| **Backend API** | Fastify (Node.js), FastAPI (Python) | 3x faster than Express, excellent TypeScript |
| **API Gateway** | NGINX Ingress | Cloud-agnostic, battle-tested |
| **Message Broker** | EMQX (MQTT), Apache Kafka | MQTT for IoT, Kafka for event streaming |
| **Stream Processing** | Apache Flink 1.18+ | Exactly-once semantics, complex CEP |
| **OLTP Database** | PostgreSQL 16 | ACID, mature, excellent extensions |
| **Time-Series (Raw)** | QuestDB | 10x faster writes than TimescaleDB |
| **Time-Series (Agg)** | TimescaleDB | Excellent for pre-aggregated data |
| **Lakehouse** | S3 + Apache Iceberg | ACID semantics, schema evolution |
| **Caching** | Redis 7.2+ | Fast, versatile, cluster mode |
| **Feature Store** | Feast | Open-source, offline + online stores |
| **ML Training** | Metaflow + Optuna | Simpler than Kubeflow, Netflix-proven |
| **ML Serving** | KServe | Kubernetes-native, auto-scaling |
| **Orchestration** | Kubernetes 1.28+ (K8s/K3s) | Industry standard, cloud-agnostic |
| **IaC** | Terraform | Multi-cloud support |
| **Secrets** | HashiCorp Vault | Dynamic secrets, rotation |
| **Monitoring** | Prometheus + Grafana | CNCF standard, excellent ecosystem |

---

## Component Architecture

### 1. Presentation Layer

#### Web Application (Next.js 14+)
- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4+
- **Component Library:** shadcn/ui
- **State Management:** React Query (server state) + Zustand (client state)
- **Authentication:** NextAuth.js with IdP adapter
- **Deployment:** Vercel or Kubernetes

**Key Features:**
- Server-side rendering (SSR) for SEO
- Incremental Static Regeneration (ISR)
- API routes for BFF (Backend for Frontend)
- Optimistic updates for better UX
- Progressive Web App (PWA) capabilities

#### Mobile Application (Flutter)
- **Framework:** Flutter 3.16+ (Dart)
- **State Management:** Riverpod or BLoC
- **Local Database:** Drift (relational), Isar (documents)
- **Navigation:** GoRouter
- **Offline Sync:** Custom sync engine with conflict resolution
- **Push Notifications:** Firebase Cloud Messaging (FCM)

**Offline-First Architecture:**
```
┌─────────────────────────────────────────────────────┐
│ Flutter App                                         │
│  ┌───────────────────────────────────────────────┐ │
│  │ UI Layer (Widgets)                            │ │
│  └───────────────┬───────────────────────────────┘ │
│  ┌───────────────▼───────────────────────────────┐ │
│  │ State Management (Riverpod/BLoC)              │ │
│  └───────────────┬───────────────────────────────┘ │
│  ┌───────────────▼───────────────────────────────┐ │
│  │ Repository Layer (Data Access)                │ │
│  └──┬────────────────────────────────────────┬───┘ │
│     │                                        │      │
│  ┌──▼──────────────┐           ┌────────────▼───┐ │
│  │ Local DB        │           │ Sync Service   │ │
│  │ (Drift + Isar)  │◄──────────┤ - Queue        │ │
│  │                 │           │ - Conflict Res │ │
│  └─────────────────┘           └────────┬───────┘ │
│                                          │         │
└──────────────────────────────────────────┼─────────┘
                                           │
                                  REST API (when online)
```

**Sync Algorithm:**
- **Version Tokens:** Last-write-wins with timestamp + user ID
- **Conflict Detection:** Compare local vs server version tokens
- **Resolution Strategy:**
  - Server wins: Read-only data (assets, sites)
  - Client wins: Work order updates (technician has latest info)
  - Merge: Work order task completion (combine both)

### 2. API Gateway Layer

**NGINX Ingress Controller:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dcmms-ingress
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.dcmms.example.com
    secretName: dcmms-tls
  rules:
  - host: api.dcmms.example.com
    http:
      paths:
      - path: /api/v1/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3000
      - path: /api/v1/workorders
        pathType: Prefix
        backend:
          service:
            name: workorder-service
            port:
              number: 3000
      # ... additional services
```

**Features:**
- Rate limiting (100 req/min per IP)
- JWT validation (via auth service)
- TLS termination (Let's Encrypt)
- Request routing
- Load balancing (round-robin)
- Health check proxying

### 3. Application Services (Microservices)

#### Service Communication Patterns

**Synchronous (REST API):**
- Client → API Gateway → Service
- Service → Service (for queries)
- Protocol: HTTP/2 (gRPC for internal high-throughput)

**Asynchronous (Events):**
- Service → Kafka → Service
- Protocol: Avro/Protobuf over Kafka
- Use cases: State changes, notifications, audit logs

#### Core Services

##### Auth Service (Fastify + TypeScript)
- **Responsibility:** Authentication, authorization, session management
- **IdP Integration:** Adapter pattern (Auth0, Azure AD, Keycloak)
- **Token Management:** JWT (RS256), 15-min access + 7-day refresh
- **RBAC:** 17 roles × 73 features (See Spec 09)
- **API:**
  - `POST /api/v1/auth/login` - Authenticate user
  - `POST /api/v1/auth/refresh` - Refresh access token
  - `POST /api/v1/auth/logout` - Revoke tokens
  - `GET /api/v1/auth/me` - Get current user profile

##### Work Order Service (Fastify + TypeScript)
- **Responsibility:** Work order lifecycle, state machine, tasks, parts
- **State Machine:** 7 states, 10+ transitions (See Spec 02)
- **Business Logic:** Validation, assignments, scheduling
- **Events Published:**
  - `workorder.created`
  - `workorder.state_changed`
  - `workorder.assigned`
  - `workorder.completed`
- **API:**
  - `POST /api/v1/workorders` - Create work order
  - `GET /api/v1/workorders` - List work orders (with filters)
  - `GET /api/v1/workorders/:id` - Get work order details
  - `PATCH /api/v1/workorders/:id` - Update work order
  - `POST /api/v1/workorders/:id/transitions/:transition` - State transition
  - `POST /api/v1/workorders/:id/tasks` - Add task
  - `POST /api/v1/workorders/:id/parts` - Consume parts

##### Asset Service (Fastify + TypeScript)
- **Responsibility:** Asset hierarchy, metadata, telemetry linking
- **Hierarchy:** Site → Asset → Component (5 levels max)
- **Telemetry:** Link to QuestDB queries
- **API:**
  - `POST /api/v1/assets` - Create asset
  - `GET /api/v1/assets` - List assets (paginated, filtered)
  - `GET /api/v1/assets/:id` - Get asset details
  - `GET /api/v1/assets/:id/hierarchy` - Get full hierarchy tree
  - `GET /api/v1/assets/:id/telemetry` - Get telemetry data
  - `POST /api/v1/assets/:id/tags` - Add tags

##### Notification Service (Node.js + Fastify)
- **Responsibility:** Multi-channel notifications, escalation
- **Channels:** Email (SendGrid), SMS (Twilio), Push (FCM), In-app
- **Escalation:** Retry + escalate to supervisor if no ack
- **Templates:** Handlebars templates with i18n support
- **Events Consumed:** `alert.critical`, `workorder.assigned`, `compliance.violation`

##### Mobile Sync Service (Fastify + TypeScript)
- **Responsibility:** Conflict resolution, delta sync
- **Sync Protocol:** Version tokens + last-modified timestamps
- **Conflict Resolution:** Configurable (client-wins, server-wins, merge)
- **API:**
  - `POST /api/v1/sync/pull` - Pull changes from server
  - `POST /api/v1/sync/push` - Push local changes to server
  - `GET /api/v1/sync/status` - Get sync status

##### Analytics Service (FastAPI + Python)
- **Responsibility:** Report builder, dashboards, KPIs
- **Query Engine:** Pandas + Polars for data manipulation
- **Caching:** Redis for expensive queries
- **Exports:** PDF (WeasyPrint), Excel (openpyxl), CSV
- **API:**
  - `POST /api/v1/analytics/reports` - Generate report
  - `GET /api/v1/analytics/dashboards/:id` - Get dashboard
  - `POST /api/v1/analytics/queries` - Execute ad-hoc query

##### Compliance Service (Fastify + TypeScript)
- **Responsibility:** CEA/MNRE compliance, auto-reporting
- **Regulations:** CEA (Central Electricity Authority), MNRE (Ministry of New and Renewable Energy)
- **Auto-Reports:** Generate and submit compliance reports
- **Violations:** Track violations, remediation plans
- **API:**
  - `GET /api/v1/compliance/reports` - List compliance reports
  - `POST /api/v1/compliance/reports` - Generate compliance report
  - `GET /api/v1/compliance/violations` - List violations

##### Cost Management Service (Fastify + TypeScript)
- **Responsibility:** Work order costing, budgets, billing
- **Costing:** Labor + parts + external services
- **Budgets:** Track budget allocations, alerts on overrun
- **API:**
  - `GET /api/v1/costs/workorders/:id` - Get work order costs
  - `POST /api/v1/costs/budgets` - Create budget
  - `GET /api/v1/costs/budgets/:id/variance` - Get budget variance

### 4. Data Pipeline

#### MQTT Ingestion (EMQX)
```
Edge Sites (MQTT Publishers)
    │
    ├─ Site-001: 5,000 tags × 5 sec poll = 1,000 msg/sec
    ├─ Site-002: 3,000 tags × 5 sec poll = 600 msg/sec
    └─ ... (72 sites total = 72,000 msg/sec peak)
    │
    ▼
EMQX Cluster (3 nodes)
    ├─ Topic: telemetry/+site_id/+asset_id/+tag
    ├─ QoS 1 (at least once)
    ├─ Payload: Avro binary (compressed)
    └─ Authentication: X.509 client certificates
    │
    ▼
Kafka Bridge (EMQX Plugin)
    └─ Kafka Topic: telemetry.raw
```

#### Stream Processing (Apache Flink)

**Flink Jobs:**

1. **Telemetry Validation Job:**
   - Input: Kafka `telemetry.raw`
   - Processing:
     - Schema validation (Avro)
     - Range validation (min/max)
     - Quality checks (GOOD/BAD/UNCERTAIN)
   - Output:
     - Kafka `telemetry.validated` (good data)
     - Kafka `telemetry.invalid` (bad data → alerts)

2. **Aggregation Job:**
   - Input: Kafka `telemetry.validated`
   - Processing:
     - Tumbling windows (1-min, 5-min, 15-min, 1-hour)
     - Aggregations: AVG, MIN, MAX, SUM, STDDEV
   - Output:
     - TimescaleDB (aggregated data)

3. **Alerting Job (Complex Event Processing):**
   - Input: Kafka `telemetry.validated`
   - Rules:
     - Threshold violations (e.g., temp > 85°C)
     - Pattern detection (e.g., 3 consecutive failures)
     - Anomaly detection (statistical + ML)
   - Output:
     - Kafka `alerts.critical` → Notification Service
     - Kafka `workorders.auto_created` → Work Order Service

#### Storage Strategy

**QuestDB (Raw Telemetry):**
- **Purpose:** High-speed ingestion (72K events/sec)
- **Retention:** 90 days (hot data)
- **Schema:**
  ```sql
  CREATE TABLE telemetry (
    timestamp TIMESTAMP,
    site_id SYMBOL,
    asset_id SYMBOL,
    tag SYMBOL,
    value DOUBLE,
    quality SYMBOL,
    INDEX(site_id),
    INDEX(asset_id),
    INDEX(tag)
  ) TIMESTAMP(timestamp) PARTITION BY DAY;
  ```

**TimescaleDB (Aggregated Telemetry):**
- **Purpose:** Pre-computed aggregations for dashboards
- **Retention:** 5 years (compressed)
- **Continuous Aggregates:**
  ```sql
  CREATE MATERIALIZED VIEW telemetry_1min
  WITH (timescaledb.continuous) AS
  SELECT time_bucket('1 minute', timestamp) AS bucket,
         site_id, asset_id, tag,
         AVG(value) AS avg_value,
         MIN(value) AS min_value,
         MAX(value) AS max_value,
         COUNT(*) AS count
  FROM telemetry_raw
  GROUP BY bucket, site_id, asset_id, tag;
  ```

**PostgreSQL (Transactional):**
- **Purpose:** Work orders, assets, users, etc.
- **Connection Pooling:** PgBouncer (transaction mode)
- **Replication:** Synchronous (1 standby for HA)

**S3 + Iceberg (Lakehouse):**
- **Bronze Layer:** Raw telemetry (Parquet, partitioned by date)
- **Silver Layer:** Cleaned, validated, enriched
- **Gold Layer:** Business aggregates, ML features
- **Retention:** 7 years (compliance)

---

## Security Architecture

### 1. Authentication & Authorization

**Identity Provider Adapter Pattern (ADR-002):**
- Supports: Auth0, Azure AD, Keycloak, Okta, SAML
- OAuth 2.0 / OIDC flows
- JWT tokens (RS256, 15-min expiry)
- Refresh tokens (7-day expiry)

**RBAC (Role-Based Access Control):**
- 17 roles: Admin, Supervisor, Technician, Viewer, etc.
- 73 features with permissions (See Spec 09)
- Middleware enforces permissions on every API request

**Sample Permission Check:**
```typescript
// Fastify middleware
async function requirePermission(permission: string) {
  return async (request, reply) => {
    const user = request.user; // From JWT
    const hasPermission = await authService.checkPermission(
      user.roles,
      permission
    );
    if (!hasPermission) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

// Usage in route
fastify.get('/api/v1/assets',
  { preHandler: requirePermission('asset:read') },
  async (request, reply) => {
    // Handler logic
  }
);
```

### 2. Encryption

**In Transit:**
- TLS 1.3 for all external communication
- mTLS for service-to-service (optional, via Istio)
- MQTT over TLS for edge → cloud

**At Rest:**
- PostgreSQL: Transparent Data Encryption (TDE)
- S3: Server-Side Encryption (SSE-KMS)
- QuestDB/TimescaleDB: Volume encryption (LUKS/dm-crypt)

**Secrets Management:**
- HashiCorp Vault for dynamic secrets
- Kubernetes Secrets (sealed with Vault)
- Rotation: 90 days for IdP client secrets

### 3. Network Security

**Kubernetes Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workorder-service-policy
spec:
  podSelector:
    matchLabels:
      app: workorder-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: kafka
    ports:
    - protocol: TCP
      port: 9092
```

### 4. Audit Logging

**All Critical Actions Logged:**
- Authentication attempts (success/failure)
- Authorization failures
- Data modifications (create/update/delete)
- State transitions (work order status changes)
- Sensitive data access (audit reports, user lists)

**Audit Log Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_id UUID,
  tenant_id UUID,
  action VARCHAR(100) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'READ'
  resource_type VARCHAR(50),      -- 'workorder', 'asset', 'user'
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  changes JSONB,                  -- Before/after values
  metadata JSONB
);

CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
```

**Retention:** 7 years (immutable, append-only)

---

## Deployment Architecture

### Cloud-Agnostic Kubernetes Deployment

**See [ADR-001](./adrs/ADR-001-cloud-agnostic-architecture.md) for full details**

### Environment Tiers

| Environment | Purpose | Infrastructure |
|------------|---------|----------------|
| **Local** | Developer workstations | Docker Compose |
| **Dev** | Integration testing | Kubernetes (1 node) |
| **Staging** | UAT, pre-production | Kubernetes (3 nodes) |
| **Production** | Live customer traffic | Kubernetes (10+ nodes) |

### Deployment Pipeline (CI/CD)

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐
│   Git    │──▶│  Build   │──▶│  Test    │──▶│  Deploy  │──▶│ Production │
│  Commit  │   │ (Docker) │   │ (Jest)   │   │ (ArgoCD) │   │  (K8s)     │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └────────────┘
     │              │              │              │                 │
   GitHub      GitHub Actions   Coverage    GitOps Repo       Kubernetes
   Webhook        Runner         (75%)       (Helm Charts)      Cluster
```

**Tools:**
- **CI:** GitHub Actions or GitLab CI
- **CD:** ArgoCD (GitOps) or FluxCD
- **Image Registry:** Docker Hub or Harbor (private)
- **IaC:** Terraform for cloud resources
- **Config:** Helm charts for Kubernetes

---

## Scalability & Performance

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **API Response Time** | p95 <200ms | Caching, database indexing, connection pooling |
| **Telemetry Ingestion** | 72,000 events/sec | QuestDB, Kafka partitioning, Flink parallelism |
| **Concurrent Users** | 5,000 users | Horizontal pod autoscaling, Redis sessions |
| **Mobile Offline** | 7 days | Local SQLite, 24-hour edge buffer |
| **Database Queries** | p95 <50ms | Indexes, partitioning, read replicas |
| **ML Inference** | p99 <100ms | KServe autoscaling, GPU acceleration |

### Horizontal Scaling

**Kubernetes Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workorder-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workorder-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Caching Strategy

**Redis Cache Layers:**

1. **Application Cache (L1):**
   - User sessions (15-min TTL)
   - API rate limits (1-min sliding window)
   - Feature flags (5-min TTL)

2. **Data Cache (L2):**
   - Asset metadata (1-hour TTL)
   - User profiles (30-min TTL)
   - Site configurations (1-day TTL)

3. **Query Cache (L3):**
   - Dashboard queries (5-min TTL)
   - Report results (1-hour TTL)
   - Analytics aggregates (15-min TTL)

**Cache Invalidation:**
- Event-driven: Kafka events trigger cache invalidation
- TTL-based: Automatic expiration
- Manual: Admin API for emergency purge

---

## References

### Architecture Decision Records
- [ADR-001: Cloud-Agnostic Architecture](./adrs/ADR-001-cloud-agnostic-architecture.md)
- [ADR-002: IdP Adapter Pattern](./adrs/ADR-002-idp-adapter-pattern.md)
- [ADR-003: Multi-Protocol SCADA Support](./adrs/ADR-003-multi-protocol-scada-support.md)

### Technical Specifications
- [Spec 01: API Specifications](../../specs/01_API_SPECIFICATIONS.md)
- [Spec 02: State Machines](../../specs/02_STATE_MACHINES.md)
- [Spec 03: Auth/Authorization](../../specs/03_AUTH_AUTHORIZATION.md)
- [Spec 04: Mobile Offline Sync](../../specs/04_MOBILE_OFFLINE_SYNC.md)
- [Spec 10: Data Ingestion Architecture](../../specs/10_DATA_INGESTION_ARCHITECTURE.md)
- [Spec 11: Complete Data Models](../../specs/11_COMPLETE_DATA_MODELS.md)
- [Spec 13: Security Implementation](../../specs/13_SECURITY_IMPLEMENTATION.md)
- [All 24 Specifications](../../specs/)

### Related Documents
- [Technology Stack Evaluation](../../TECHNOLOGY_STACK_EVALUATION.md)
- [Stakeholder Decisions](../../STAKEHOLDER_DECISIONS.md)
- [Architecture Diagrams v2](../../media/ARCHITECTURE_DIAGRAMS_V2.md)
- [Implementation Plan](../../IMPLEMENTATION_PLAN.md)

---

**Last Updated:** 2025-11-18
**Next Review:** 2025-12-18 (Sprint 5 - MVP Integration)
**Status:** ✅ Approved for Implementation
