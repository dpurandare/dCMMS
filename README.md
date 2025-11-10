# dCMMS Product Requirements Document

## Overview

dCMMS is a comprehensive Computerized Maintenance Management System (CMMS) tailored for non-conventional energy assets, including utility-scale solar farms, wind farms, hybrid microgrids, and battery energy storage systems (BESS). This repository contains the finalized Product Requirements Document (PRD) and supporting artifacts for the dCMMS platform.

The system enables proactive maintenance through predictive analytics, AI-driven automation, and compliance features, supporting field-ready operations with offline capabilities.

## Repository Structure

- **`PRD_FINAL.md`**: The primary, self-contained Product Requirements Document, including all functional, technical, and architectural requirements.
- **`GAP_ANALYSIS.md`**: Comprehensive gap analysis identifying 20+ categories of requirements gaps with prioritization (P0-P3).
- **`specs/`**: Detailed technical specifications addressing gaps identified in PRD:
  - `01_API_SPECIFICATIONS.md`: Complete REST API design for dCMMS MVP
  - `02_STATE_MACHINES.md`: Formal state machine definitions for work orders, assets, inventory
  - `03_AUTH_AUTHORIZATION.md`: Authentication and authorization patterns (updated v2.0)
  - `04_MOBILE_OFFLINE_SYNC.md`: Mobile offline sync algorithm and conflict resolution
  - `05_DEPLOYMENT_RUNBOOKS.md`: Step-by-step deployment procedures
  - `06_MIGRATION_ONBOARDING.md`: Site onboarding and data migration plan
  - `07_TESTING_STRATEGY.md`: Comprehensive testing framework
  - `08_ORGANIZATIONAL_STRUCTURE.md`: Industry-researched user roles for solar, wind, BESS operations
  - `09_ROLE_FEATURE_ACCESS_MATRIX.md`: Comprehensive role-to-feature access matrix (17 roles × 73 features)
  - `10_DATA_INGESTION_ARCHITECTURE.md`: High-speed, high-volume telemetry ingestion architecture
- **`archive/`**: Historical documents and superseded files for reference.
  - `PRD_INPUT.md`: Original input document, archived with a notice.
  - `research.md`: Research notes and background materials.
  - Other archived assets.
- **`media/`**: Diagrams and images referenced in the PRD (e.g., architecture diagrams).
- **`metadata/`**: JSON schemas for data entities (e.g., asset, work order, sensor reading schemas).

## Key Features

- **Asset Management**: Hierarchical asset registry with telemetry integration.
- **Work Order Lifecycle**: Full management from creation to closure, with mobile offline support.
- **Predictive Maintenance**: AI/ML-driven alerts and automated work order generation.
- **Analytics & Reporting**: Real-time dashboards, KPIs, and compliance reporting.
- **Security & Compliance**: RBAC, encryption, audit trails, and regulatory adherence.
- **Integration**: Open standards for SCADA, ERP, and weather data.

## Releases

The PRD outlines a phased release plan:

- **Release 0 (MVP)**: Core asset and work order management.
- **Release 1**: Telemetry, alerting, and analytics.
- **Release 2**: Predictive AI and regulatory reporting.
- **Release 3**: ESG, weather integration, and enhancements.

## Getting Started

1. Review `PRD_FINAL.md` for comprehensive requirements.
2. Refer to `metadata/` for data schemas.
3. Check `media/` for diagrams.

For development or implementation, align with the TDD-friendly roadmap in the PRD.

## Contributing

This repository is for documentation purposes. For contributions or questions, contact the project maintainer.

## License

[Specify license if applicable, e.g., MIT or proprietary.]

---

**Date**: November 3, 2025  
**Version**: 1.0  
**Author**: Deepak Purandare
