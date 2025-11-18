# ADR-001: Cloud-Agnostic Architecture Strategy

**Status:** Accepted
**Date:** 2025-11-18
**Decision Makers:** Technical Architecture Team, Product Management
**Related:** STAKEHOLDER_DECISIONS.md (Nov 15, 2025), TECHNOLOGY_STACK_EVALUATION.md

---

## Context

dCMMS is a distributed CMMS platform targeting the renewable energy sector (solar, wind, hydroelectric facilities). The system must:

- Support deployment across multiple cloud providers (AWS, Azure, GCP)
- Avoid vendor lock-in to maintain negotiating leverage and flexibility
- Enable multi-cloud deployments for different customers
- Support hybrid deployments (edge + cloud)
- Scale to 72,000 events/second for telemetry ingestion
- Handle 5,000 concurrent users with <200ms API response time

### Decision Drivers

1. **Customer Requirements:** Different customers have existing commitments to different cloud providers
2. **Risk Mitigation:** Avoid dependency on a single cloud vendor
3. **Cost Optimization:** Ability to leverage competitive pricing across providers
4. **Regulatory Compliance:** Some regions may require specific cloud providers
5. **Edge Computing:** Need consistent architecture from edge (K3s) to cloud (full K8s)

---

## Decision

We will adopt a **cloud-agnostic architecture** using Kubernetes as the abstraction layer, with deliberate avoidance of cloud-specific services.

### Architectural Approach

#### 1. **Container Orchestration**
- **Platform:** Kubernetes (v1.28+)
- **Cloud Implementations:**
  - AWS: Elastic Kubernetes Service (EKS)
  - Azure: Azure Kubernetes Service (AKS)
  - GCP: Google Kubernetes Engine (GKE)
  - Edge: K3s (lightweight Kubernetes)
- **Infrastructure as Code:** Terraform with cloud-agnostic modules

#### 2. **Service Abstraction Layer**
Use open-source, cloud-agnostic technologies for all core services:

| Service Type | Technology | Cloud-Agnostic? |
|-------------|------------|-----------------|
| **Compute** | Kubernetes Pods | ✅ Yes |
| **Storage (Object)** | S3-compatible API (MinIO fallback) | ✅ Yes |
| **Storage (Block)** | Kubernetes PersistentVolumes | ✅ Yes |
| **Database** | PostgreSQL, QuestDB, TimescaleDB | ✅ Yes |
| **Caching** | Redis | ✅ Yes |
| **Message Queue** | Apache Kafka, EMQX MQTT | ✅ Yes |
| **Secrets** | HashiCorp Vault | ✅ Yes |
| **Load Balancing** | Kubernetes Ingress + NGINX | ✅ Yes |
| **Monitoring** | Prometheus + Grafana | ✅ Yes |
| **Logging** | Loki + Promtail | ✅ Yes |
| **Tracing** | Jaeger | ✅ Yes |
| **Service Mesh** | Istio (optional) | ✅ Yes |

#### 3. **Cloud Provider Selection Matrix**

```
┌─────────────────────────────────────────────────────────────┐
│ Service Mapping: Cloud-Agnostic → Provider-Specific        │
├─────────────────────────────────────────────────────────────┤
│ Component      │ K8s Resource    │ AWS       │ Azure  │ GCP │
├────────────────┼─────────────────┼───────────┼────────┼─────┤
│ Cluster        │ Kubernetes      │ EKS       │ AKS    │ GKE │
│ Object Storage │ S3 API          │ S3        │ Blob   │ GCS │
│ Block Storage  │ PersistentVolume│ EBS       │ Disk   │ PD  │
│ Load Balancer  │ Ingress         │ ALB/NLB   │ AppGW  │ GLB │
│ DNS            │ External-DNS    │ Route53   │ DNS    │ DNS │
│ Certificates   │ Cert-Manager    │ ACM       │ KeyV   │ CA  │
└────────────────┴─────────────────┴───────────┴────────┴─────┘
```

#### 4. **Implementation Guidelines**

**DO:**
- ✅ Use Kubernetes-native resources (Deployments, Services, ConfigMaps, Secrets)
- ✅ Use S3-compatible API for object storage
- ✅ Use PostgreSQL wire protocol (compatible across providers)
- ✅ Use Helm charts for package management
- ✅ Use Prometheus metrics format
- ✅ Use OpenTelemetry for tracing

**DON'T:**
- ❌ Use AWS Lambda (use Kubernetes Jobs instead)
- ❌ Use DynamoDB (use PostgreSQL or Redis)
- ❌ Use CloudWatch (use Prometheus + Grafana)
- ❌ Use AWS Secrets Manager (use HashiCorp Vault)
- ❌ Use provider-specific messaging (use Kafka/MQTT)
- ❌ Use proprietary APIs without abstraction layer

#### 5. **Edge-to-Cloud Consistency**

```
┌──────────────────────────────────────────────────────────┐
│ Deployment Tier Architecture                             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  EDGE (Site Level)          CLOUD (Regional/Global)      │
│  ┌─────────────┐            ┌──────────────────┐        │
│  │ K3s Cluster │────────────│ Full K8s Cluster │        │
│  ├─────────────┤            ├──────────────────┤        │
│  │ MQTT Broker │            │ Kafka Cluster    │        │
│  │ Local DB    │            │ PostgreSQL HA    │        │
│  │ QuestDB     │            │ QuestDB Cluster  │        │
│  │ Redis Cache │            │ Redis Cluster    │        │
│  └─────────────┘            └──────────────────┘        │
│       │                              │                   │
│       └──── Same Containers ─────────┘                   │
│             Same Helm Charts                             │
│             Same Configuration (scaled)                  │
└──────────────────────────────────────────────────────────┘
```

---

## Consequences

### Positive

1. **Vendor Independence:** No lock-in to single cloud provider
2. **Cost Flexibility:** Leverage competitive pricing, move workloads
3. **Customer Choice:** Support customer's existing cloud commitments
4. **Portability:** Easy to migrate between providers if needed
5. **Consistent Operations:** Same tools, processes, skills across all environments
6. **Edge Consistency:** Same architecture from edge (K3s) to cloud (K8s)
7. **Risk Mitigation:** Reduced dependency on single vendor's roadmap/pricing

### Negative

1. **Limited Cloud Features:** Cannot use cutting-edge provider-specific services
2. **Operational Complexity:** Must manage more infrastructure ourselves
3. **Learning Curve:** Team must learn Kubernetes and associated tools
4. **Cost (Short-term):** Self-managed services require more DevOps effort initially
5. **Performance Trade-offs:** Managed services might be more optimized

### Neutral

1. **Kubernetes Dependency:** Creates dependency on Kubernetes ecosystem (acceptable trade-off)
2. **Abstraction Overhead:** Additional layer between application and infrastructure
3. **Testing Burden:** Must test on multiple cloud providers (mitigated in Release 3+)

---

## Compliance

This decision aligns with:
- **Spec 01 (API Specifications):** Cloud-agnostic API design
- **Spec 05 (Deployment):** Multi-environment deployment strategy
- **Spec 10 (Data Ingestion):** Kafka/MQTT are cloud-agnostic
- **Spec 13 (Security):** HashiCorp Vault is cloud-agnostic
- **Spec 18 (Performance):** Kubernetes auto-scaling works across clouds
- **Spec 21 (Edge Computing):** K3s → K8s consistency

---

## Implementation

### Phase 1: MVP (Week 14)
- Docker Compose for local development
- AWS EKS deployment (primary target for MVP)
- Kubernetes manifests designed for portability

### Phase 2: Release 1 (Week 26)
- Helm charts created
- Terraform modules for AWS + Azure
- CI/CD supports multi-cloud deployments

### Phase 3: Release 2+ (Week 40+)
- GCP support added
- Multi-cloud deployment tested
- Edge (K3s) to cloud (K8s) sync validated

---

## Notes

- **Cloud Selection Criteria Document:** See `docs/architecture/cloud-provider-selection-criteria.md`
- **Provider Comparison Matrix:** See TECHNOLOGY_STACK_EVALUATION.md
- **Deployment Architecture:** See `docs/deployment/kubernetes-architecture.md` (Sprint 0 Week 2)

---

## References

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/cluster-administration/)
- [CNCF Cloud Native Landscape](https://landscape.cncf.io/)
- [12-Factor App Methodology](https://12factor.net/)
- STAKEHOLDER_DECISIONS.md - Nov 15, 2025
- TECHNOLOGY_STACK_EVALUATION.md v2.0

---

**Last Updated:** 2025-11-18
**Review Date:** 2026-02-18 (3 months)
**Status:** ✅ Accepted
