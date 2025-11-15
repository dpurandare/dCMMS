# dCMMS Stakeholder Decisions Record

**Date:** November 15, 2025
**Status:** Approved
**Source:** Response to Implementation Readiness Assessment Questions (Section 9)

---

## Table of Contents

1. [Strategic Decisions](#1-strategic-decisions)
2. [Technical Decisions](#2-technical-decisions)
3. [Implementation & Timeline Decisions](#3-implementation--timeline-decisions)
4. [Documentation & Training Decisions](#4-documentation--training-decisions)
5. [Impact Analysis](#5-impact-analysis)
6. [Required Architecture Updates](#6-required-architecture-updates)
7. [Implementation Plan Adjustments](#7-implementation-plan-adjustments)

---

## 1. Strategic Decisions

### 1.1 Cloud Provider Strategy

**Question:** Do you have a preferred cloud provider (AWS, Azure, GCP)?

**Decision:** ✅ **Cloud-Agnostic Architecture**
- No preferred cloud provider
- Architecture must support AWS, Azure, and GCP
- Use cloud-agnostic technologies and abstractions

**Impact:**
- 🔧 **Architecture Change Required:** Use Kubernetes, Terraform, and cloud-agnostic services
- ✅ **Benefit:** Maximum flexibility and vendor negotiation power
- ⚠️ **Consideration:** Slightly more complex abstraction layer needed
- 💰 **Cost:** Minimal impact, enables competitive pricing

**Action Items:**
- [ ] Update architecture to use cloud-agnostic services only
- [ ] Avoid cloud-specific services (e.g., AWS Lambda → Kubernetes jobs)
- [ ] Use Terraform with multi-cloud modules
- [ ] Document cloud provider selection criteria for final decision

**Timeline Impact:** None - Actually simplifies vendor selection in Month 2-3

---

### 1.2 Regulatory Compliance Focus

**Question:** Which regulatory frameworks are mandatory for your operations?

**Decision:** ✅ **Start with CEA/MNRE (India) Only**
- Focus on Indian regulatory requirements initially
- NERC, AEMO, NESO support postponed to future releases

**Impact:**
- 🎯 **Scope Reduction:** Can deprioritize NERC/AEMO/NESO compliance templates
- ✅ **Benefit:** Focused implementation, faster time-to-market
- 📋 **Specification Adjustment:** Spec 15 remains comprehensive but implementation prioritizes India
- ⏱️ **Timeline:** Accelerates Release 1 compliance module delivery

**Action Items:**
- [ ] Prioritize CEA/MNRE report templates in Sprint 8-9
- [ ] Implement extensible compliance framework for future jurisdictions
- [ ] Create India-specific compliance test cases
- [ ] Document CEA Grid Standards Regulations 2010 requirements
- [ ] Document MNRE REC Mechanism compliance workflows

**Timeline Impact:** ✅ **Positive** - Reduced scope for Release 1

---

### 1.3 ERP Integration Strategy

**Question:** Which ERP system will dCMMS integrate with?

**Decision:** ⚠️ **Postpone ERP Integration**
- Make it a placeholder for now
- Move ERP integration to later sprints (post-MVP, possibly post-Release 1)

**Impact:**
- 🎯 **Major Scope Change:** Remove ERP integration from MVP and potentially Release 1
- ✅ **Benefit:** Focus on core CMMS functionality first
- 🔧 **Architecture:** Maintain ERP integration architecture (Spec 12) but defer implementation
- 📦 **Deliverable:** Inventory/procurement workflows will be standalone initially

**Action Items:**
- [ ] Move ERP integration tasks to Release 2 or Release 3
- [ ] Update IMPLEMENTATION_TASK_LIST.md to reflect new priority
- [ ] Ensure inventory/procurement modules work independently
- [ ] Design clean integration points for future ERP connectivity
- [ ] Update DELIVERABLES_MATRIX.md to reflect deferred timeline

**Timeline Impact:** ⚠️ **Significant** - Frees up 2-3 weeks in Sprint 3-4 for other features

---

## 2. Technical Decisions

### 2.1 Identity Provider (IdP) Strategy

**Question:** Which IdP does your organization use?

**Decision:** ✅ **Flexible IdP Design with Okta/Auth0 as Initial Implementation**
- Support all major IdPs (Okta, Azure AD, Keycloak) with adapter pattern
- Start implementation with Okta → Auth0
- Use API Gateway pattern for IdP abstraction

**Impact:**
- 🔧 **Architecture Enhancement:** Create IdP adapter/strategy pattern
- ✅ **Benefit:** Customer can choose their preferred IdP
- 📋 **Specification:** Aligns perfectly with Spec 03 (OAuth2/OIDC support)
- 🧪 **Testing:** Test with Auth0 initially, ensure adapter pattern works

**Action Items:**
- [ ] Design IdP adapter interface (Sprint 0)
- [ ] Implement Auth0 adapter as first implementation (Sprint 1-2)
- [ ] Document IdP integration guide for future adapters
- [ ] Create ADR documenting IdP abstraction strategy
- [ ] Plan Azure AD and Keycloak adapters for future releases

**Timeline Impact:** ✅ **Neutral** - Design pattern adds ~2 days to Sprint 0, but enables flexibility

**Implementation Notes:**
```typescript
// IdP Adapter Pattern
interface IdPAdapter {
  authenticate(credentials: Credentials): Promise<AuthToken>;
  validateToken(token: string): Promise<TokenPayload>;
  getUserInfo(token: string): Promise<UserInfo>;
  refreshToken(refreshToken: string): Promise<AuthToken>;
}

// Implementations
class Auth0Adapter implements IdPAdapter { /* ... */ }
class AzureADAdapter implements IdPAdapter { /* ... */ }
class KeycloakAdapter implements IdPAdapter { /* ... */ }
```

---

### 2.2 SCADA/HMI Protocol Support

**Question:** Which SCADA protocols are used in your facilities?

**Decision:** ✅ **Multi-Protocol Support from Beginning**
- Support as many protocols as possible from the start
- OPC-UA, Modbus TCP/RTU, IEC 61850, DNP3

**Impact:**
- 📋 **Specification:** Aligns with Spec 10 (comprehensive protocol support)
- ✅ **Benefit:** Maximum facility compatibility
- ⚠️ **Complexity:** More testing required for each protocol
- 🧪 **Testing:** Need protocol simulators for testing

**Action Items:**
- [ ] Implement protocol adapters for OPC-UA, Modbus, IEC 61850, DNP3 (Sprint 6-7)
- [ ] Create protocol simulator for testing (Sprint 6)
- [ ] Document protocol configuration guide
- [ ] Test with simulated SCADA data for each protocol
- [ ] Plan field validation with real SCADA systems

**Timeline Impact:** ⚠️ **Moderate** - Adds ~1 week to Sprint 6-7 for multi-protocol testing

---

### 2.3 Mobile Device Management (MDM)

**Question:** Do you have an existing MDM solution?

**Decision:** ✅ **Work Without MDM Initially**
- Implement mobile security without MDM dependency
- Optional MDM integration for future

**Impact:**
- 🔧 **Architecture Simplification:** Remove hard MDM dependency from Spec 04
- ✅ **Benefit:** Simpler deployment, lower barrier to entry
- 🔐 **Security:** Rely on app-level security (biometric auth, encryption, remote wipe via backend)
- 📋 **Specification Update:** Spec 04 mobile security remains robust without MDM

**Action Items:**
- [ ] Implement in-app security controls (biometric, encryption, PIN)
- [ ] Implement server-side device management (device registry, remote wipe API)
- [ ] Document manual device enrollment process
- [ ] Design MDM integration points for future (optional)
- [ ] Update Spec 04 to clarify MDM is optional, not required

**Timeline Impact:** ✅ **Positive** - Saves ~1 week in Sprint 3-4 (no MDM integration)

**Security Compensating Controls:**
```yaml
mobile_security_without_mdm:
  authentication:
    - biometric_auth: "Face ID / Touch ID / Fingerprint"
    - device_pin: "6-digit PIN for app access"
    - session_timeout: "15 minutes inactivity"

  encryption:
    - local_db: "SQLCipher for offline data"
    - keychain: "Secure storage for tokens"
    - certificate_pinning: "Prevent MITM attacks"

  device_management:
    - device_registration: "Backend device registry"
    - remote_wipe: "Server-initiated data wipe API"
    - device_blacklist: "Block compromised devices"
    - jailbreak_detection: "Prevent compromised devices"
```

---

### 2.4 Notification Service Providers

**Question:** Do you have existing contracts with email/SMS providers?

**Decision:** ⚠️ **No Existing Contracts - Acquire When Needed**
- No contracts currently
- Will acquire notification services in due course

**Impact:**
- ⏱️ **Timeline:** Can use free/trial tiers for MVP and Release 1 development
- 💰 **Budget:** Need budget approval before Release 1 production deployment
- 🧪 **Testing:** Use sandbox/test accounts during development
- 📋 **Specification:** Spec 14 design remains valid, implementation uses test credentials

**Action Items:**
- [ ] Use free tier SendGrid for development (MVP)
- [ ] Use free tier Twilio for development (MVP)
- [ ] Document production notification provider selection criteria
- [ ] Budget approval process for production notification services (before Release 1 deployment)
- [ ] Test with real SMS/email in UAT using trial accounts

**Timeline Impact:** ✅ **Neutral** - Can develop with free tiers, production budget needed by Month 6

**Recommended Providers for Production:**
| Service | Provider | Free Tier | Production Cost |
|---------|----------|-----------|-----------------|
| **Email** | SendGrid | 100 emails/day | $19.95/mo (40K emails) |
| **SMS** | Twilio | Trial credits | ~$0.0075/SMS (India) |
| **Push** | Firebase (FCM) | Free | Free |
| **Voice** | Twilio | Trial credits | ~$0.02/min (India) |

---

### 2.5 Data Residency & Local Processing

**Question:** Are there data residency or sovereignty requirements?

**Decision:** ✅ **No Residency Requirements - Prioritize Local Processing for High-Speed Data**
- No legal data residency requirements
- Physical constraints: High-speed data acquisition easier locally
- Edge processing for telemetry data

**Impact:**
- 🔧 **Architecture:** Strong emphasis on edge computing (Spec 21)
- ✅ **Benefit:** Aligns with edge-first architecture for telemetry
- 📋 **Specification:** Validates edge computing approach in Spec 10 and 21
- 🌍 **Deployment:** Can deploy in any cloud region for best performance/cost

**Action Items:**
- [ ] Prioritize edge computing implementation (Release 1)
- [ ] Implement local buffering (24-hour) at edge gateways (Sprint 6-7)
- [ ] Ensure cloud deployment is region-flexible
- [ ] Optimize for high-speed local data acquisition (72K events/sec)
- [ ] Document edge-to-cloud data flow and buffering strategy

**Timeline Impact:** ✅ **Positive** - Validates existing architecture, no changes needed

---

## 3. Implementation & Timeline Decisions

### 3.1 Team Availability

**Question:** Is the implementation team (6-7 people) confirmed and available?

**Decision:** ✅ **Team Confirmed and Available**

**Impact:**
- ✅ **Timeline:** No hiring delays, can start Sprint 0 immediately
- ✅ **Planning:** Proceed with 2-week sprint planning as documented
- ✅ **Risk:** Low team availability risk

**Action Items:**
- [ ] Schedule Sprint 0 kickoff meeting (Week 1, Day 1)
- [ ] Confirm team member roles and responsibilities
- [ ] Set up team communication channels (Slack/Teams)
- [ ] Onboard team to project documentation

**Timeline Impact:** ✅ **Positive** - Ready to start immediately

---

### 3.2 UAT Resource Availability

**Question:** Will field technicians and operations staff be available for UAT?

**Decision:** ✅ **Available with 1-Week Notice**

**Impact:**
- 📅 **Planning:** Need to schedule UAT sessions 1 week in advance
- ✅ **Benefit:** Real user feedback available for each release
- ⏱️ **Timeline:** No impact if planned properly

**Action Items:**
- [ ] Add 1-week UAT scheduling buffer before each release
- [ ] Update IMPLEMENTATION_PLAN.md with UAT scheduling requirements
- [ ] Create UAT participant recruitment plan
- [ ] Schedule MVP UAT 1 week before Month 3 milestone (Week 11)
- [ ] Schedule Release 1 UAT 1 week before Month 6 milestone (Week 23)
- [ ] Schedule Release 2 UAT 1 week before Month 9 milestone (Week 35)

**Timeline Impact:** ✅ **Neutral** - Already accounted for in sprint buffers

---

### 3.3 Cloud Infrastructure Budget

**Question:** Is budget approved for cloud infrastructure (post-MVP)?

**Decision:** ✅ **Cloud Infrastructure Budget Available When Needed**

**Impact:**
- 💰 **Budget:** Approved, no financial blocker
- ✅ **Timeline:** Can proceed with cloud migration planning post-MVP
- 📋 **Planning:** Cloud provider selection can happen in Month 2-3

**Action Items:**
- [ ] Develop cloud cost estimates for each provider (AWS, Azure, GCP) in Month 2
- [ ] Present cloud provider comparison to stakeholders (Month 3)
- [ ] Finalize cloud provider selection (Month 3)
- [ ] Provision cloud infrastructure (Month 3-4)
- [ ] Execute cloud migration (Month 4-5)

**Timeline Impact:** ✅ **Positive** - No budget delays

---

### 3.4 Deployment Strategy

**Question:** Do you prefer phased rollout (pilot sites first) or full deployment?

**Decision:** ✅ **Phased Rollout**
- Pilot sites first
- Gradual expansion after validation

**Impact:**
- 🎯 **Deployment:** Lower risk deployment strategy
- ✅ **Benefit:** Can validate in production with limited blast radius
- 📋 **Planning:** Need pilot site selection criteria
- 🧪 **Testing:** Real-world validation before full rollout

**Action Items:**
- [ ] Define pilot site selection criteria (Month 3)
- [ ] Identify 2-3 pilot sites for MVP deployment
- [ ] Create phased rollout plan with success metrics
- [ ] Document rollback procedures for pilot sites
- [ ] Plan expansion phases after pilot validation (Month 4-6)

**Timeline Impact:** ✅ **Neutral** - Aligns with best practices

**Phased Rollout Plan:**
```yaml
phase_1_pilot:
  timeline: "Month 3-4 (MVP)"
  sites: "2-3 pilot sites"
  users: "10-20 field technicians"
  success_criteria:
    - "90% work orders completed offline"
    - "API p95 latency <200ms"
    - "Zero critical defects for 2 weeks"

phase_2_expansion:
  timeline: "Month 5-6 (Release 1)"
  sites: "10-15 sites"
  users: "50-100 users"
  success_criteria:
    - "Telemetry ingestion stable (72K events/sec)"
    - "SLA compliance reporting validated"

phase_3_full_rollout:
  timeline: "Month 7+ (Release 2+)"
  sites: "All sites"
  users: "All users"
  success_criteria:
    - "ML models generating 10% of corrective WOs"
    - "99.9% uptime achieved"
```

---

## 4. Documentation & Training Decisions

### 4.1 UI Mockup Strategy

**Question:** Should we create high-fidelity mockups before development, or proceed with wireframes?

**Decision:** ✅ **High-Fidelity Mockups Before Wireframes**
- Create detailed, high-fidelity UI mockups
- Complete mockups before frontend development starts

**Impact:**
- 📅 **Timeline:** Add 1-2 weeks to Sprint 0 for mockup creation
- ✅ **Benefit:** Clearer design direction, fewer frontend rework iterations
- 🎨 **Quality:** Better UX consistency and stakeholder alignment
- ⚠️ **Critical:** This is a REVERSAL from the original plan (wireframes first)

**Action Items:**
- [ ] **URGENT:** Update Sprint 0 Week 1 deliverables in IMPLEMENTATION_PLAN.md
- [ ] Hire/assign UI/UX designer for high-fidelity mockups (if not on team)
- [ ] Create high-fidelity mockups for all MVP screens (20+ screens)
- [ ] Stakeholder review and approval of mockups (before Sprint 1)
- [ ] Export design tokens and component specifications from mockups
- [ ] Update DELIVERABLES_MATRIX.md to reflect high-fidelity mockups as critical deliverable

**Timeline Impact:** ⚠️ **Moderate Negative** - Adds 1-2 weeks to Sprint 0, may extend to Week 3-4

**Revised Sprint 0 Timeline:**
```
Week 1: Architecture design, API contracts, database schema, ADRs
Week 2: Infrastructure setup, CI/CD, project scaffolding
Week 3: HIGH-FIDELITY UI MOCKUPS (NEW)
Week 4: Mockup review, approval, design token extraction (NEW)
```

**Mockup Requirements:**
- 20+ screens for MVP (asset list, asset details, work order list, work order details, dashboard, mobile screens)
- Interactive prototype (Figma/Sketch with clickable flows)
- Design system documentation (colors, typography, spacing, components)
- Responsive layouts (desktop, tablet, mobile)
- Dark mode variants (optional but recommended)

---

### 4.2 Training Strategy

**Question:** Do you prefer video tutorials, live training sessions, or documentation-based training?

**Decision:** ✅ **Interactive Tutorials + Exhaustive User Documentation**
- Provide interactive, in-app tutorials
- Also provide comprehensive written documentation

**Impact:**
- 📋 **Deliverables:** Increases training material scope (Spec 17)
- ✅ **Benefit:** Multiple learning modalities for different user preferences
- ⏱️ **Timeline:** More time needed for training material creation
- 💰 **Cost:** Higher upfront investment, lower training cost long-term

**Action Items:**
- [ ] Design in-app tutorial system (tooltips, walkthroughs, contextual help)
- [ ] Implement interactive tutorial framework (Release 1)
- [ ] Create comprehensive user documentation for all features
- [ ] Create admin documentation for system configuration
- [ ] Create video tutorials for complex workflows (optional enhancement)
- [ ] Update Spec 17 to include interactive tutorial requirements

**Timeline Impact:** ⚠️ **Moderate** - Adds 1-2 weeks to Release 1 for interactive tutorials

**Training Deliverables by Release:**
```yaml
mvp_training:
  interactive_tutorials:
    - "First-time user onboarding (5-step walkthrough)"
    - "How to create a work order (in-app guide)"
    - "How to complete work order offline (mobile tutorial)"

  documentation:
    - "User Guide: Asset Management (20 pages)"
    - "User Guide: Work Order Management (30 pages)"
    - "User Guide: Mobile App Usage (15 pages)"
    - "Admin Guide: User & Role Management (25 pages)"
    - "FAQ (10 pages)"

release_1_training:
  interactive_tutorials:
    - "Understanding telemetry dashboards"
    - "How to configure alert rules"
    - "How to generate compliance reports"

  documentation:
    - "User Guide: Telemetry Monitoring (25 pages)"
    - "User Guide: Alerts & Notifications (20 pages)"
    - "User Guide: Analytics & Reporting (30 pages)"
    - "Admin Guide: SCADA Integration (35 pages)"
    - "Admin Guide: Compliance Configuration (40 pages)"

release_2_training:
  interactive_tutorials:
    - "Understanding ML predictions"
    - "How to review predictive work orders"
    - "Multi-language interface guide"

  documentation:
    - "User Guide: AI/ML Predictions (25 pages)"
    - "User Guide: Cost Management (20 pages)"
    - "Admin Guide: ML Model Management (45 pages)"
```

---

## 5. Impact Analysis

### 5.1 Positive Impacts (Timeline Acceleration)

| Decision | Time Saved | Impact |
|----------|------------|--------|
| **ERP Integration Postponed** | +2-3 weeks | Can focus on core CMMS features |
| **Regulatory: India Only** | +1 week | Reduced compliance template scope |
| **No MDM Requirement** | +1 week | Simpler mobile deployment |
| **Team Confirmed** | +2-4 weeks | No hiring delays |
| **Budget Approved** | +1-2 weeks | No financial approval delays |
| **TOTAL TIME SAVED** | **+7-11 weeks** | **Significant acceleration possible** |

### 5.2 Negative Impacts (Timeline Delays)

| Decision | Time Added | Impact |
|----------|------------|--------|
| **High-Fidelity Mockups** | +1-2 weeks | Better design quality, Sprint 0 extension |
| **Interactive Tutorials** | +1-2 weeks | Better user onboarding, Release 1 extension |
| **Multi-Protocol SCADA** | +1 week | More comprehensive testing needed |
| **Cloud-Agnostic Architecture** | +2-3 days | Additional abstraction layer |
| **IdP Adapter Pattern** | +2 days | Flexible IdP support |
| **TOTAL TIME ADDED** | **+3-4 weeks** | **Manageable with proper planning** |

### 5.3 Net Impact Analysis

**Net Timeline Impact:** ✅ **+3-7 weeks gained** (7-11 weeks saved, 3-4 weeks added)

**Recommendations:**
1. Use time savings from ERP postponement to fund high-fidelity mockups
2. Extend Sprint 0 by 1-2 weeks for comprehensive design work
3. Keep overall timeline targets (MVP Month 3, Release 1 Month 6, Release 2 Month 9)
4. Use buffer time for quality improvements and thorough testing

---

## 6. Required Architecture Updates

### 6.1 Cloud-Agnostic Architecture Changes

**Current State:** Architecture references AWS-specific services
**Required State:** Cloud-agnostic with multi-cloud support

**Changes Required:**

| Layer | Current (AWS-focused) | Cloud-Agnostic Alternative |
|-------|----------------------|----------------------------|
| **Compute** | EKS (Elastic Kubernetes Service) | Kubernetes (any provider) |
| **Object Storage** | S3 | S3-compatible API (S3, Azure Blob, GCS) |
| **Message Queue** | MSK (Managed Kafka) | Apache Kafka (self-hosted on K8s or managed) |
| **Database** | RDS PostgreSQL | PostgreSQL (on K8s or managed) |
| **Cache** | ElastiCache Redis | Redis (on K8s or managed) |
| **CDN** | CloudFront | Multi-CDN (Cloudflare, Fastly) |
| **Secrets** | AWS KMS | HashiCorp Vault (already cloud-agnostic ✅) |
| **Load Balancer** | ALB | Kubernetes Ingress (NGINX/Traefik) |
| **Monitoring** | CloudWatch | Prometheus + Grafana (already cloud-agnostic ✅) |

**Action Items:**
- [ ] Update architecture diagrams to show cloud-agnostic services
- [ ] Create Terraform modules for AWS, Azure, GCP
- [ ] Document cloud provider selection criteria
- [ ] Test deployment on at least 2 cloud providers

---

### 6.2 IdP Abstraction Layer

**New Component:** IdP Adapter Pattern

```typescript
// Core abstraction
interface IdPAdapter {
  // Authentication
  authenticate(credentials: Credentials): Promise<AuthToken>;
  logout(token: string): Promise<void>;

  // Token management
  validateToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<AuthToken>;

  // User management
  getUserInfo(token: string): Promise<UserInfo>;
  updateUserInfo(token: string, info: Partial<UserInfo>): Promise<void>;

  // Group/Role management
  getUserGroups(token: string): Promise<string[]>;
  getUserRoles(token: string): Promise<string[]>;
}

// Factory pattern
class IdPAdapterFactory {
  static create(provider: 'auth0' | 'azure-ad' | 'keycloak'): IdPAdapter {
    switch (provider) {
      case 'auth0': return new Auth0Adapter();
      case 'azure-ad': return new AzureADAdapter();
      case 'keycloak': return new KeycloakAdapter();
    }
  }
}

// Configuration
const idpAdapter = IdPAdapterFactory.create(
  process.env.IDP_PROVIDER as 'auth0'
);
```

**Action Items:**
- [ ] Create IdP adapter interface (Sprint 0)
- [ ] Implement Auth0/Okta adapter (Sprint 1-2)
- [ ] Document IdP adapter development guide
- [ ] Add ADR for IdP abstraction decision

---

### 6.3 MDM-Optional Mobile Security

**Changes to Spec 04:**

Remove hard MDM dependency, add compensating controls:

```yaml
mobile_security_architecture:
  tier_1_app_level:
    - biometric_authentication: "Face ID / Touch ID"
    - device_pin: "6-digit PIN with 3-attempt lockout"
    - session_management: "15-min timeout, auto-lock"
    - local_encryption: "SQLCipher for offline data"
    - secure_storage: "Keychain/Keystore for tokens"

  tier_2_network_level:
    - certificate_pinning: "Prevent MITM attacks"
    - tls_1_3: "Secure communication"
    - vpn_optional: "Optional VPN for high-security deployments"

  tier_3_server_level:
    - device_registry: "Backend device management"
    - remote_wipe: "Server-initiated data wipe API"
    - device_blacklist: "Block compromised devices"
    - anomaly_detection: "Unusual device behavior alerts"

  tier_4_device_level:
    - jailbreak_detection: "Prevent compromised devices"
    - root_detection: "Prevent rooted Android devices"
    - emulator_detection: "Block emulators in production"

  optional_mdm_integration:
    - intune: "Microsoft Intune connector (future)"
    - jamf: "Jamf Pro connector (future)"
    - workspace_one: "VMware connector (future)"
```

**Action Items:**
- [ ] Update Spec 04 to clarify MDM is optional
- [ ] Implement app-level security controls (Sprint 3-4)
- [ ] Implement server-side device management (Sprint 3-4)
- [ ] Document manual device enrollment process
- [ ] Design MDM integration points for future

---

## 7. Implementation Plan Adjustments

### 7.1 Revised Sprint 0 Timeline

**Original Sprint 0:** 2 weeks (Weeks 1-2)
**Revised Sprint 0:** 4 weeks (Weeks 1-4)

**Rationale:** High-fidelity UI mockups require additional time

**Week 1: Architecture & Design**
- System architecture diagrams and ADRs ✅ (unchanged)
- Complete OpenAPI 3.1 specification ✅ (unchanged)
- Complete database ERD ✅ (unchanged)
- Sequence diagrams ✅ (unchanged)
- State machine diagrams ✅ (unchanged)
- Mobile architecture design ✅ (unchanged)
- **NEW:** Cloud-agnostic architecture review
- **NEW:** IdP adapter design

**Week 2: Infrastructure & Foundation**
- Docker Compose stack ✅ (unchanged)
- CI/CD pipeline ✅ (unchanged)
- Test framework configuration ✅ (unchanged)
- API skeleton ✅ (unchanged)
- Frontend boilerplate ✅ (unchanged)
- Mobile app skeleton ✅ (unchanged)
- Developer onboarding docs ✅ (unchanged)

**Week 3: High-Fidelity UI Mockups (NEW)**
- Design system creation (colors, typography, spacing)
- High-fidelity mockups for 20+ MVP screens
- Interactive prototype in Figma/Sketch
- Responsive layouts (desktop, tablet, mobile)
- Component specifications and design tokens

**Week 4: Design Review & Approval (NEW)**
- Stakeholder review of mockups
- Incorporate feedback and revisions
- Final mockup approval
- Design token extraction and documentation
- Frontend component library setup based on mockups

**Revised Timeline:**
```
Month 1: Sprint 0 (Weeks 1-4) - Foundation + High-Fidelity Mockups
Month 2: Sprint 1-2 (Weeks 5-8) - Asset/WO Backend + Frontend Start
Month 3: Sprint 3-4 (Weeks 9-12) - WO Frontend + Mobile App
Month 4: Sprint 5 (Weeks 13-14) - MVP Integration + Demo ← MVP RELEASE
```

**Impact:** MVP delivery shifts from Week 12 to Week 14 (+2 weeks)

---

### 7.2 Revised Implementation Priorities

**Reprioritized Features:**

| Original Priority | Feature | New Priority | Rationale |
|-------------------|---------|--------------|-----------|
| Sprint 3 | ERP Integration | Release 3+ | Postponed per stakeholder decision |
| Sprint 8-9 | NERC/AEMO/NESO Compliance | Release 3+ | Focus on CEA/MNRE only |
| Sprint 14 | Multi-language (15+ languages) | Release 2 (Hindi only) | Reduced i18n scope |
| Sprint 3-4 | MDM Integration | Release 3+ (optional) | Not required, use app-level security |

**New Priorities:**

| Sprint | Feature | Priority | Rationale |
|--------|---------|----------|-----------|
| Sprint 0 (NEW) | High-Fidelity UI Mockups | P0 | Critical for frontend development |
| Sprint 1-2 | IdP Adapter (Auth0) | P0 | Flexible IdP support |
| Sprint 6-7 | Multi-Protocol SCADA | P0 | Support multiple protocols from start |
| Sprint 8-9 | CEA/MNRE Compliance Only | P0 | India-specific regulatory focus |
| Sprint 10-11 | Interactive Tutorials | P1 | Better user onboarding |

---

### 7.3 Updated Milestone Dates

**Original Timeline:**
- Sprint 0: Weeks 1-2
- MVP: Month 3 (Week 12)
- Release 1: Month 6 (Week 24)
- Release 2: Month 9 (Week 36)

**Revised Timeline:**
- Sprint 0: Weeks 1-4 (+2 weeks for mockups)
- MVP: Month 3.5 (Week 14) (+2 weeks)
- Release 1: Month 6.5 (Week 26) (+2 weeks)
- Release 2: Month 10 (Week 40) (+4 weeks for interactive tutorials + ML docs)

**Alternative (Aggressive Timeline - Recommended):**
- Use time savings from ERP postponement to absorb mockup delays
- Sprint 0: Weeks 1-4 (extended for mockups)
- MVP: Month 3 (Week 12) - **MAINTAIN ORIGINAL TARGET**
- Release 1: Month 6 (Week 24) - **MAINTAIN ORIGINAL TARGET**
- Release 2: Month 9 (Week 36) - **MAINTAIN ORIGINAL TARGET**

**Recommendation:** ✅ **Maintain original timeline** by working in parallel where possible and using ERP postponement buffer.

---

## 8. Action Items Summary

### 8.1 Immediate Actions (Before Sprint 0 Start)

**Priority 1 - CRITICAL (Next 3 Days):**
1. ✅ Update IMPLEMENTATION_PLAN.md with revised Sprint 0 (4 weeks)
2. ✅ Update IMPLEMENTATION_TASK_LIST.md to remove ERP integration from Sprint 3
3. ✅ Update DELIVERABLES_MATRIX.md with high-fidelity mockups as P0 deliverable
4. ✅ Confirm UI/UX designer availability for mockup creation
5. ✅ Schedule Sprint 0 kickoff meeting

**Priority 2 - HIGH (Week 1 of Sprint 0):**
6. ⚠️ Create cloud-agnostic architecture documentation
7. ⚠️ Design IdP adapter interface and Auth0 implementation plan
8. ⚠️ Update architecture diagrams to show cloud-agnostic services
9. ⚠️ Create ADR for cloud-agnostic architecture decision
10. ⚠️ Create ADR for IdP abstraction pattern decision

### 8.2 Documentation Updates Required

**Files to Update:**
1. ✅ `IMPLEMENTATION_PLAN.md` - Revise Sprint 0 timeline, update milestones
2. ✅ `IMPLEMENTATION_TASK_LIST.md` - Remove ERP tasks from early sprints, add mockup tasks
3. ✅ `DELIVERABLES_MATRIX.md` - Add high-fidelity mockups, mark ERP as deferred
4. ✅ `media/ARCHITECTURE_DIAGRAMS_V2.md` - Update to cloud-agnostic services
5. ✅ `specs/03_AUTH_AUTHORIZATION.md` - Add IdP adapter pattern documentation
6. ✅ `specs/04_MOBILE_OFFLINE_SYNC.md` - Update to clarify MDM is optional
7. ✅ `specs/12_INTEGRATION_ARCHITECTURE.md` - Mark ERP as future/deferred
8. ✅ `specs/15_COMPLIANCE_REGULATORY_REPORTING.md` - Prioritize CEA/MNRE
9. ✅ `specs/17_UX_DESIGN_TRAINING.md` - Add interactive tutorial requirements
10. ✅ `specs/24_INTERNATIONALIZATION.md` - Update to Hindi-only for Release 2

### 8.3 New Documents to Create

1. ⚠️ **Cloud Provider Selection Criteria** (Month 2)
2. ⚠️ **IdP Adapter Development Guide** (Sprint 0-1)
3. ⚠️ **High-Fidelity UI Mockup Specifications** (Sprint 0 Week 3-4)
4. ⚠️ **Design System Documentation** (Sprint 0 Week 3-4)
5. ⚠️ **Pilot Site Selection Criteria** (Month 3)
6. ⚠️ **Phased Rollout Plan** (Month 3)
7. ⚠️ **CEA/MNRE Compliance Implementation Guide** (Release 1)

---

## 9. Risk Assessment

### 9.1 New Risks Identified

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **High-fidelity mockups delay Sprint 0** | High | Medium | Extend Sprint 0 to 4 weeks, work in parallel where possible |
| **Cloud-agnostic abstraction complexity** | Medium | Low | Use proven patterns (Terraform, Kubernetes), test on 2+ clouds |
| **Multi-protocol SCADA testing complexity** | Medium | Medium | Use protocol simulators, plan field validation carefully |
| **Interactive tutorials development time** | Medium | Low | Start design in Sprint 0, implement incrementally |
| **UAT scheduling with 1-week notice** | Low | Low | Plan UAT dates well in advance, maintain buffer |

### 9.2 Risks Mitigated

| Risk | Original Likelihood | New Likelihood | Mitigation Achieved |
|------|-------------------|----------------|---------------------|
| **Cloud vendor lock-in** | High | Low | Cloud-agnostic architecture |
| **IdP incompatibility** | Medium | Low | IdP adapter pattern supports multiple providers |
| **ERP integration delays MVP** | High | None | ERP postponed to later release |
| **Team availability** | Medium | None | Team confirmed and available |
| **Budget approval delays** | Medium | None | Budget approved |

---

## 10. Sign-Off

**Stakeholder Decisions Recorded:** November 15, 2025

**Approvals Required:**
- [ ] Product Manager: Revised timeline and priorities
- [ ] Technical Lead: Cloud-agnostic architecture changes
- [ ] UI/UX Lead: High-fidelity mockup requirements
- [ ] Operations Manager: Phased rollout plan

**Next Review:** End of Sprint 0 (Week 4)

---

**Document Owner:** Product Manager
**Last Updated:** November 15, 2025
**Status:** Pending Approval

