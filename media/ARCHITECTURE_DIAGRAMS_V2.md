# dCMMS Architecture Diagrams v2.0

This document contains comprehensive architecture diagrams that represent the complete dCMMS system based on all 24 detailed specifications.

## Diagram 1: Complete System Architecture (High-Level)

```mermaid
graph TB
    subgraph "User Layer"
        WebApp["Web Application<br/>(React + TypeScript)"]
        MobileApp["Mobile Apps<br/>(React Native + SQLite)"]
        PWA["Progressive Web App"]
    end

    subgraph "CDN & Edge Delivery"
        CloudFront["CloudFront CDN<br/>- Static assets<br/>- Translations<br/>- Documents"]
    end

    subgraph "API Gateway Layer"
        ALB["Application Load Balancer<br/>- Health checks<br/>- Sticky sessions"]
        APIGateway["API Gateway<br/>- Rate limiting<br/>- Request validation<br/>- JWT verification"]
    end

    subgraph "Caching Layer"
        RedisCacheApp["Redis Cache<br/>- Application data<br/>- Sessions<br/>- Rate limits"]
        RedisCacheML["Redis Online Store<br/>- Feature store<br/>- Real-time features"]
    end

    subgraph "Application Services (Kubernetes)"
        AuthService["Auth Service<br/>(OAuth2/OIDC)"]
        WorkOrderService["Work Order Service<br/>- State machines<br/>- Lifecycle mgmt"]
        AssetService["Asset Service<br/>- Hierarchy<br/>- Telemetry linking"]
        NotificationService["Notification Service<br/>- Email, SMS, Push<br/>- Escalation"]
        ComplianceService["Compliance Service<br/>- NERC/CEA/MNRE<br/>- Auto reporting"]
        AnalyticsService["Analytics Service<br/>- Report builder<br/>- Dashboards"]
        VendorService["Vendor/Procurement<br/>- PO management<br/>- Contract tracking"]
        CostService["Cost Management<br/>- WO costing<br/>- Budget tracking"]
        I18nService["i18n Service<br/>- Translation mgmt<br/>- Locale handling"]
        SyncService["Mobile Sync Service<br/>- Conflict resolution<br/>- Delta sync"]
    end

    subgraph "Integration Layer"
        ERPIntegration["ERP Integration<br/>(SAP/Oracle/Dynamics)"]
        WeatherAPI["Weather API<br/>(OpenWeatherMap)"]
        IdPIntegration["IdP Integration<br/>(Okta/Azure AD)"]
        EmailProvider["Email Service<br/>(SendGrid)"]
        SMSProvider["SMS Service<br/>(Twilio)"]
        PushProvider["Push Notifications<br/>(FCM/APNS)"]
    end

    subgraph "Data Pipeline"
        EdgeCollectors["Edge Collectors<br/>- OPC-UA/Modbus<br/>- Local buffer"]
        MQTT["EMQX MQTT Broker<br/>- mTLS<br/>- Topic routing"]
        Kafka["Kafka Cluster (MSK)<br/>- Raw topics<br/>- Validated topics<br/>- Alarm topics"]
        Flink["Apache Flink<br/>- Stream validation<br/>- Enrichment<br/>- Alerting"]
        SchemaRegistry["Schema Registry<br/>(Avro/Protobuf)"]
    end

    subgraph "Storage Layer"
        PostgreSQL["PostgreSQL<br/>- Transactional data<br/>- OLTP operations"]
        TimescaleDB["TimescaleDB<br/>- Time-series data<br/>- Telemetry"]
        S3Iceberg["S3 + Iceberg<br/>- Bronze/Silver/Gold<br/>- ACID semantics"]
        S3Documents["S3 Documents<br/>- Attachments<br/>- Photos<br/>- Reports"]
        AuditLogs["Audit Log Storage<br/>- Immutable logs<br/>- 7-year retention"]
    end

    subgraph "Batch Processing"
        Spark["Apache Spark<br/>- ETL<br/>- Deduplication<br/>- Heavy transforms"]
        Airflow["Apache Airflow<br/>- Job orchestration<br/>- Scheduling"]
    end

    subgraph "Analytics & BI"
        Trino["Trino<br/>(SQL Query Engine)"]
        BITools["BI Tools<br/>- Custom dashboards<br/>- Reports"]
    end

    subgraph "ML/AI Platform"
        FeastOffline["Feast Offline Store<br/>(S3/Iceberg)"]
        FeastMaterialize["Feature<br/>Materialization"]
        MLflow["MLflow Registry<br/>- Model versioning<br/>- Experiments"]
        Kubeflow["Kubeflow Pipelines<br/>- Training workflows<br/>- Hyperparameter tuning"]
        KServe["KServe/Seldon<br/>- Model serving<br/>- Auto-scaling"]
    end

    subgraph "Edge Computing"
        EdgeGateway["Edge Gateway<br/>- K3s<br/>- Local analytics<br/>- 24h buffer"]
        EdgeDB["SQLite Edge DB<br/>- Local storage<br/>- Offline ops"]
        EdgeML["Edge ML Inference<br/>(TensorFlow Lite)"]
    end

    subgraph "Security & Compliance"
        Vault["HashiCorp Vault<br/>- Secrets mgmt<br/>- Dynamic secrets"]
        KMS["AWS KMS<br/>- Encryption keys<br/>- Key rotation"]
        CertManager["Cert Manager<br/>- TLS certificates<br/>- Auto renewal"]
    end

    subgraph "Observability"
        Prometheus["Prometheus<br/>- Metrics collection<br/>- Alerting"]
        Grafana["Grafana<br/>- Dashboards<br/>- Visualization"]
        Loki["Loki<br/>- Log aggregation"]
        Jaeger["Jaeger<br/>- Distributed tracing"]
    end

    %% User to CDN/Gateway
    WebApp --> CloudFront
    MobileApp --> CloudFront
    PWA --> CloudFront
    CloudFront --> ALB
    ALB --> APIGateway

    %% API Gateway to Services
    APIGateway --> RedisCacheApp
    APIGateway --> AuthService
    APIGateway --> WorkOrderService
    APIGateway --> AssetService
    APIGateway --> NotificationService
    APIGateway --> ComplianceService
    APIGateway --> AnalyticsService
    APIGateway --> VendorService
    APIGateway --> CostService
    APIGateway --> I18nService
    APIGateway --> SyncService

    %% Services to Integrations
    NotificationService --> EmailProvider
    NotificationService --> SMSProvider
    NotificationService --> PushProvider
    VendorService --> ERPIntegration
    AssetService --> WeatherAPI
    AuthService --> IdPIntegration

    %% Services to Storage
    WorkOrderService --> PostgreSQL
    AssetService --> PostgreSQL
    VendorService --> PostgreSQL
    CostService --> PostgreSQL
    AuthService --> AuditLogs
    WorkOrderService --> S3Documents

    %% Edge to Cloud
    EdgeGateway --> MQTT
    EdgeDB --> EdgeGateway
    EdgeML --> EdgeGateway

    %% Data Pipeline Flow
    MQTT --> Kafka
    Kafka --> SchemaRegistry
    Kafka --> Flink
    Flink --> Kafka
    Flink --> TimescaleDB
    Flink --> S3Iceberg

    %% Batch Processing
    S3Iceberg --> Spark
    Spark --> S3Iceberg
    Airflow --> Spark

    %% Analytics
    S3Iceberg --> Trino
    Trino --> BITools
    PostgreSQL --> AnalyticsService

    %% ML Pipeline
    S3Iceberg --> FeastOffline
    FeastOffline --> FeastMaterialize
    FeastMaterialize --> RedisCacheML
    RedisCacheML --> KServe
    Kubeflow --> MLflow
    MLflow --> KServe
    KServe --> AssetService

    %% Security
    Vault --> AuthService
    KMS --> S3Documents
    CertManager --> APIGateway

    %% Observability
    APIGateway --> Prometheus
    WorkOrderService --> Prometheus
    Prometheus --> Grafana
    APIGateway --> Loki
    APIGateway --> Jaeger

    style WebApp fill:#e1f5ff
    style MobileApp fill:#e1f5ff
    style PWA fill:#e1f5ff
    style APIGateway fill:#fff4e1
    style AuthService fill:#f0f4ff
    style NotificationService fill:#f0f4ff
    style EdgeGateway fill:#e8f5e9
```

## Diagram 2: Layered Architecture with Technology Stack

```mermaid
graph TB
    subgraph "Presentation Layer"
        A1["Web App (React 18 + TypeScript)<br/>Tailwind CSS + Design System<br/>react-i18next"]
        A2["Mobile (React Native)<br/>iOS + Android<br/>Offline-first with SQLite"]
        A3["PWA<br/>Service Workers<br/>Background Sync"]
    end

    subgraph "CDN & Edge Delivery"
        B1["CloudFront CDN<br/>Static Assets<br/>Translations (15+ languages)<br/>Cache: max-age=3600"]
    end

    subgraph "API & Gateway Layer"
        C1["Application Load Balancer<br/>Health Checks<br/>Sticky Sessions<br/>SSL/TLS Termination"]
        C2["API Gateway<br/>Rate Limiting: 100-10K req/min<br/>JWT Verification<br/>Request Validation"]
    end

    subgraph "Application Cache"
        D1["Redis Cluster<br/>Session Store<br/>Rate Limit Counters<br/>Application Cache<br/>TTL: 5-60 min"]
    end

    subgraph "Microservices Layer (Kubernetes)"
        E1["Auth & Authorization<br/>OAuth2/OIDC<br/>JWT Tokens<br/>RBAC/ABAC (17 roles)"]
        E2["Work Order Management<br/>State Machines<br/>Lifecycle: Draft→Complete<br/>SLA Tracking"]
        E3["Asset Management<br/>Hierarchical Registry<br/>Telemetry Integration<br/>Maintenance History"]
        E4["Notification System<br/>Email (SendGrid)<br/>SMS (Twilio)<br/>Push (FCM/APNS)<br/>Voice + Escalation"]
        E5["Compliance & Regulatory<br/>NERC/CEA/MNRE<br/>Automated Workflows<br/>Report Generation"]
        E6["Analytics & Reporting<br/>Report Builder<br/>Custom Dashboards<br/>Scheduled Exports"]
        E7["Vendor & Procurement<br/>PO Management<br/>3-way Matching<br/>Contract Tracking"]
        E8["Cost Management<br/>WO Costing<br/>Budget Tracking<br/>Billing Integration"]
        E9["Mobile Sync Service<br/>Conflict Resolution<br/>Delta Sync<br/>Offline Queue"]
    end

    subgraph "Integration Services"
        F1["ERP Integration<br/>SAP/Oracle/Dynamics<br/>Procurement/Finance"]
        F2["Weather API<br/>OpenWeatherMap<br/>Forecasting"]
        F3["IdP Integration<br/>Okta/Azure AD/Keycloak<br/>SSO"]
    end

    subgraph "Stream Processing Layer"
        G1["Edge Collectors<br/>OPC-UA/Modbus<br/>Protocol Translation<br/>Local Buffer"]
        G2["EMQX MQTT Broker<br/>mTLS Authentication<br/>Topic Routing<br/>QoS 0-2"]
        G3["Kafka Cluster (MSK)<br/>Topics: raw, validated, alarms<br/>Retention: 7-30 days<br/>Partitions: site-based"]
        G4["Apache Flink<br/>Validation + Enrichment<br/>Alarm Detection<br/>Aggregation<br/>72K events/sec"]
        G5["Schema Registry<br/>Avro/Protobuf<br/>Version Control"]
    end

    subgraph "Storage Layer"
        H1["PostgreSQL (RDS)<br/>Transactional OLTP<br/>Connection Pool: 20-100<br/>Multi-AZ"]
        H2["TimescaleDB<br/>Time-series Telemetry<br/>Hypertables<br/>Retention: 2 years"]
        H3["S3 + Iceberg<br/>Data Lake<br/>Bronze/Silver/Gold<br/>ACID Transactions"]
        H4["S3 Document Store<br/>Attachments, Photos<br/>Lifecycle: Glacier after 1yr<br/>Versioning Enabled"]
        H5["Audit Log Store<br/>S3 + Object Lock<br/>Immutable<br/>Retention: 7 years"]
    end

    subgraph "Batch & Orchestration"
        I1["Apache Spark<br/>ETL Pipelines<br/>Deduplication<br/>Historical Analysis"]
        I2["Apache Airflow<br/>DAG Orchestration<br/>Scheduling<br/>Retry Logic"]
    end

    subgraph "Analytics & BI Layer"
        J1["Trino (Distributed SQL)<br/>Query Engine<br/>Gold Tables<br/>Ad-hoc Analytics"]
        J2["BI Tools<br/>Tableau/Looker/PowerBI<br/>Custom Dashboards"]
    end

    subgraph "ML/AI Platform"
        K1["Feast Feature Store<br/>Offline: S3/Iceberg<br/>Online: Redis<br/>Feature Versioning"]
        K2["Kubeflow Pipelines<br/>Training Workflows<br/>Optuna (HPO)<br/>Distributed Training"]
        K3["MLflow Registry<br/>Model Versioning<br/>Experiment Tracking<br/>Staging/Production"]
        K4["Model Serving<br/>FastAPI<br/>Seldon Core<br/>Auto-scaling (HPA)<br/>A/B Testing"]
    end

    subgraph "Edge Computing Layer"
        L1["Edge Gateway<br/>Hardware: ARM/x86<br/>OS: Ubuntu Server<br/>Orchestration: K3s<br/>24-hour buffer"]
        L2["Edge Storage<br/>SQLite<br/>Local Analytics<br/>Offline Operation"]
        L3["Edge ML Inference<br/>TensorFlow Lite<br/>ONNX Models<br/>Real-time Predictions"]
    end

    subgraph "Security Infrastructure"
        M1["HashiCorp Vault<br/>Secrets Management<br/>Dynamic DB Credentials<br/>KV Store v2"]
        M2["AWS KMS<br/>Encryption Keys<br/>Envelope Encryption<br/>Automatic Rotation"]
        M3["Cert Manager<br/>TLS Certificates<br/>Let's Encrypt<br/>Auto Renewal"]
        M4["WAF & DDoS<br/>AWS WAF<br/>Shield Standard<br/>Rate-based Rules"]
    end

    subgraph "Observability Stack"
        N1["Prometheus<br/>Metrics Collection<br/>Alert Manager<br/>15s scrape interval"]
        N2["Grafana<br/>Dashboards<br/>Visualization<br/>Alerting"]
        N3["Loki<br/>Log Aggregation<br/>LogQL Queries"]
        N4["Jaeger<br/>Distributed Tracing<br/>OpenTelemetry"]
    end

    %% Flow connections
    A1 --> B1
    A2 --> B1
    A3 --> B1
    B1 --> C1
    C1 --> C2
    C2 --> D1
    C2 --> E1
    C2 --> E2
    C2 --> E3
    C2 --> E4
    C2 --> E5
    C2 --> E6
    C2 --> E7
    C2 --> E8
    C2 --> E9

    E2 --> H1
    E3 --> H1
    E7 --> H1
    E8 --> H1
    E1 --> H5

    E4 --> F1
    E7 --> F1
    E3 --> F2
    E1 --> F3

    L1 --> G2
    G2 --> G3
    G3 --> G5
    G3 --> G4
    G4 --> G3
    G4 --> H2
    G4 --> H3

    H3 --> I1
    I1 --> H3
    I2 --> I1

    H3 --> J1
    J1 --> J2

    H3 --> K1
    K1 --> K2
    K2 --> K3
    K3 --> K4
    K4 --> E3

    M1 --> E1
    M2 --> H4
    M3 --> C2
    M4 --> C1

    E2 --> N1
    N1 --> N2
    E2 --> N3
    E2 --> N4

    style A1 fill:#e1f5ff
    style A2 fill:#e1f5ff
    style A3 fill:#e1f5ff
    style B1 fill:#fff9c4
    style C2 fill:#fff4e1
    style E1 fill:#f3e5f5
    style E4 fill:#f3e5f5
    style E5 fill:#f3e5f5
    style G4 fill:#e8f5e9
    style K4 fill:#fce4ec
    style L1 fill:#e0f2f1
    style M1 fill:#ffebee
    style N1 fill:#e3f2fd
```

## Diagram 3: Data Flow Architecture

```mermaid
flowchart TB
    subgraph "Data Sources"
        DS1["Solar Inverters<br/>OPC-UA"]
        DS2["Wind Turbines<br/>Modbus"]
        DS3["BESS<br/>MQTT"]
        DS4["Weather Stations<br/>API"]
        DS5["User Actions<br/>Web/Mobile"]
    end

    subgraph "Edge Layer"
        EC1["Edge Collector 1<br/>Site A"]
        EC2["Edge Collector 2<br/>Site B"]
        EC3["Edge Gateway<br/>- Local DB<br/>- Edge Analytics<br/>- ML Inference"]
    end

    subgraph "Ingestion"
        MQTT["EMQX Broker<br/>Topic: sites/+/telemetry"]
        KafkaRaw["Kafka: raw_telemetry<br/>Retention: 7 days"]
    end

    subgraph "Stream Processing"
        FlinkValidate["Flink Job: Validation<br/>- Schema check<br/>- Range validation<br/>- Deduplication"]
        FlinkEnrich["Flink Job: Enrichment<br/>- Asset lookup<br/>- Geo tagging<br/>- Unit conversion"]
        FlinkAlarm["Flink Job: Alarm<br/>- Threshold check<br/>- Anomaly detection<br/>- Pattern matching"]
    end

    subgraph "Message Topics"
        KafkaValidated["Kafka: validated_telemetry"]
        KafkaAlarms["Kafka: alarms"]
        KafkaDLQ["Kafka: dead_letter_queue"]
    end

    subgraph "Storage - Hot Path"
        TimescaleDB["TimescaleDB<br/>- Continuous aggregates<br/>- Retention: 2 years<br/>- Compression after 7 days"]
        PostgreSQL["PostgreSQL<br/>- Assets<br/>- Work Orders<br/>- Users"]
        RedisCache["Redis Cache<br/>- Recent data (1 hour)<br/>- Alert state<br/>- Feature store online"]
    end

    subgraph "Storage - Cold Path"
        S3Bronze["S3 Iceberg Bronze<br/>Raw validated data<br/>Partitioned: site/date"]
        S3Silver["S3 Iceberg Silver<br/>Cleaned & deduplicated<br/>Partitioned: site/month"]
        S3Gold["S3 Iceberg Gold<br/>Aggregated metrics<br/>Business KPIs"]
    end

    subgraph "Batch Processing"
        SparkETL["Spark ETL Jobs<br/>- Deduplication<br/>- Quality checks<br/>- Aggregation"]
        AirflowScheduler["Airflow DAGs<br/>- Daily: Bronze→Silver<br/>- Weekly: Silver→Gold<br/>- Monthly: Reporting"]
    end

    subgraph "Consumption"
        API["REST API<br/>- Real-time queries<br/>- Historical data<br/>- Aggregates"]
        TrinoSQL["Trino<br/>- Ad-hoc SQL<br/>- BI queries<br/>- Data exploration"]
        FeastServing["Feast Feature Serving<br/>- Online features (Redis)<br/>- Model inference"]
        MLModels["ML Models<br/>- Predictive maintenance<br/>- Generation forecast<br/>- Anomaly detection"]
    end

    subgraph "Actions"
        AutoWO["Auto Work Order<br/>Creation"]
        Notifications["Multi-channel<br/>Notifications"]
        Dashboard["Real-time<br/>Dashboards"]
    end

    %% Flow: Sources to Edge
    DS1 --> EC1
    DS2 --> EC1
    DS3 --> EC2
    EC1 --> MQTT
    EC2 --> MQTT
    EC3 --> MQTT

    %% Flow: Ingestion
    MQTT --> KafkaRaw

    %% Flow: Stream Processing
    KafkaRaw --> FlinkValidate
    FlinkValidate --> FlinkEnrich
    FlinkEnrich --> FlinkAlarm

    %% Flow: To Topics
    FlinkEnrich --> KafkaValidated
    FlinkAlarm --> KafkaAlarms
    FlinkValidate --> KafkaDLQ

    %% Flow: Hot Path Storage
    KafkaValidated --> TimescaleDB
    KafkaValidated --> RedisCache
    KafkaAlarms --> PostgreSQL

    %% Flow: Cold Path Storage
    KafkaValidated --> S3Bronze
    S3Bronze --> SparkETL
    SparkETL --> S3Silver
    S3Silver --> SparkETL
    SparkETL --> S3Gold
    AirflowScheduler --> SparkETL

    %% Flow: Consumption
    TimescaleDB --> API
    PostgreSQL --> API
    S3Gold --> TrinoSQL
    S3Gold --> FeastServing
    RedisCache --> FeastServing
    FeastServing --> MLModels

    %% Flow: Actions
    KafkaAlarms --> AutoWO
    KafkaAlarms --> Notifications
    RedisCache --> Dashboard
    MLModels --> AutoWO

    style DS1 fill:#e3f2fd
    style DS2 fill:#e3f2fd
    style DS3 fill:#e3f2fd
    style EC3 fill:#e8f5e9
    style FlinkAlarm fill:#fff3e0
    style KafkaAlarms fill:#ffebee
    style AutoWO fill:#f3e5f5
    style MLModels fill:#fce4ec
```

## Diagram 4: Mobile Offline Sync Architecture

```mermaid
sequenceDiagram
    participant User
    participant MobileApp
    participant SQLite
    participant ServiceWorker
    participant SyncQueue
    participant APIGateway
    participant SyncService
    participant PostgreSQL
    participant ConflictResolver

    Note over User,PostgreSQL: Offline Period Starts

    User->>MobileApp: Create Work Order
    MobileApp->>SQLite: Store locally (pendingSync=true)
    SQLite-->>MobileApp: Stored with localId
    MobileApp-->>User: Work Order created (offline)

    User->>MobileApp: Add photo to WO
    MobileApp->>SQLite: Store photo blob
    SQLite-->>MobileApp: Photo stored

    User->>MobileApp: Update asset status
    MobileApp->>SQLite: Update with timestamp
    SQLite-->>MobileApp: Updated locally

    Note over User,PostgreSQL: Network Connection Restored

    MobileApp->>ServiceWorker: Detect network online
    ServiceWorker->>SyncQueue: Trigger background sync

    SyncQueue->>SQLite: Get all pendingSync=true records
    SQLite-->>SyncQueue: Return delta (work orders, updates, photos)

    SyncQueue->>APIGateway: POST /sync/delta<br/>[workOrders, updates, photos]
    APIGateway->>SyncService: Forward sync request

    SyncService->>PostgreSQL: Check for conflicts<br/>(compare timestamps)
    PostgreSQL-->>SyncService: Server versions

    alt No Conflicts
        SyncService->>PostgreSQL: Apply changes
        PostgreSQL-->>SyncService: Success
        SyncService-->>APIGateway: Sync complete with serverIds
        APIGateway-->>SyncQueue: 200 OK + serverIds
        SyncQueue->>SQLite: Update localId→serverId mapping<br/>Set pendingSync=false
    else Conflicts Detected
        SyncService->>ConflictResolver: Resolve conflicts<br/>(last-write-wins strategy)
        ConflictResolver-->>SyncService: Resolved data
        SyncService->>PostgreSQL: Apply resolved changes
        PostgreSQL-->>SyncService: Success
        SyncService-->>APIGateway: Sync with conflict resolution
        APIGateway-->>SyncQueue: 200 OK + conflicts resolved
        SyncQueue->>SQLite: Merge resolved data<br/>Set pendingSync=false
        SyncQueue->>MobileApp: Show conflict notification
        MobileApp-->>User: "Sync completed with conflicts"
    end

    SyncQueue->>APIGateway: GET /sync/changes?since=lastSyncTime
    APIGateway->>SyncService: Fetch server changes
    SyncService->>PostgreSQL: Query changes since timestamp
    PostgreSQL-->>SyncService: Changed records
    SyncService-->>APIGateway: Server delta
    APIGateway-->>SyncQueue: Changed data
    SyncQueue->>SQLite: Update with server changes
    SQLite-->>MobileApp: Sync complete
    MobileApp-->>User: "All changes synced"
```

## Diagram 5: Notification & Alerting Flow

```mermaid
flowchart TD
    subgraph "Trigger Sources"
        T1["Telemetry Alarm<br/>(Kafka)"]
        T2["Manual User Action<br/>(API)"]
        T3["Scheduled Alert<br/>(Cron Job)"]
        T4["ML Prediction<br/>(Model Serving)"]
    end

    subgraph "Notification Service"
        RuleEngine["Alert Rule Engine<br/>- Evaluate conditions<br/>- Check throttling<br/>- Priority routing"]

        TemplateEngine["Template Engine<br/>- Load template<br/>- Merge data<br/>- Localization (i18n)"]

        ChannelRouter["Channel Router<br/>- User preferences<br/>- Severity mapping<br/>- Multi-channel"]
    end

    subgraph "Notification Channels"
        EmailChannel["Email Channel<br/>SendGrid API<br/>Template: HTML/Plain"]
        SMSChannel["SMS Channel<br/>Twilio API<br/>160 char limit"]
        PushChannel["Push Notifications<br/>FCM (Android)<br/>APNS (iOS)"]
        VoiceChannel["Voice Call<br/>Twilio Voice API<br/>TTS message"]
        WebhookChannel["Webhook<br/>Custom endpoints<br/>Retry: 3 attempts"]
    end

    subgraph "Escalation Engine"
        EscCheck{{"Acknowledged<br/>in time?"}}
        EscLevel1["Level 1: Assignee<br/>Email + Push"]
        EscLevel2["Level 2: Supervisor<br/>Email + SMS"]
        EscLevel3["Level 3: Manager<br/>Email + SMS + Voice"]
        EscLevel4["Level 4: On-call Team<br/>All channels"]
    end

    subgraph "Tracking & Analytics"
        NotificationLog["Notification Log<br/>PostgreSQL<br/>- Status tracking<br/>- Delivery confirmation"]
        Analytics["Analytics<br/>- Delivery rate<br/>- Response time<br/>- Escalation metrics"]
    end

    subgraph "Storage"
        PostgreSQL["PostgreSQL<br/>- Alert rules<br/>- User preferences<br/>- On-call schedule"]
        Redis["Redis<br/>- Throttle state<br/>- Active alerts<br/>- Ack status"]
    end

    %% Trigger flows
    T1 --> RuleEngine
    T2 --> RuleEngine
    T3 --> RuleEngine
    T4 --> RuleEngine

    %% Rule engine
    RuleEngine --> PostgreSQL
    RuleEngine --> Redis
    RuleEngine --> TemplateEngine

    %% Template & routing
    TemplateEngine --> ChannelRouter
    ChannelRouter --> EmailChannel
    ChannelRouter --> SMSChannel
    ChannelRouter --> PushChannel
    ChannelRouter --> VoiceChannel
    ChannelRouter --> WebhookChannel

    %% Delivery tracking
    EmailChannel --> NotificationLog
    SMSChannel --> NotificationLog
    PushChannel --> NotificationLog
    VoiceChannel --> NotificationLog
    WebhookChannel --> NotificationLog

    %% Escalation flow
    NotificationLog --> EscCheck
    EscCheck -->|No - 15min| EscLevel1
    EscLevel1 --> NotificationLog
    NotificationLog --> EscCheck
    EscCheck -->|No - 30min| EscLevel2
    EscLevel2 --> NotificationLog
    NotificationLog --> EscCheck
    EscCheck -->|No - 1hr| EscLevel3
    EscLevel3 --> NotificationLog
    NotificationLog --> EscCheck
    EscCheck -->|No - 2hr| EscLevel4
    EscLevel4 --> NotificationLog
    EscCheck -->|Yes| Analytics

    %% Analytics
    NotificationLog --> Analytics

    style T1 fill:#ffebee
    style T4 fill:#fce4ec
    style RuleEngine fill:#fff3e0
    style ChannelRouter fill:#e1f5fe
    style EscLevel4 fill:#ffcdd2
    style Analytics fill:#e8f5e9
```

---

## Key Improvements in V2 Diagrams

### Compared to Original Diagrams (Arch1.png & Arch2.png):

**Added Components:**
1. ✅ Complete frontend layer (Web, Mobile, PWA)
2. ✅ CDN and edge delivery infrastructure
3. ✅ API Gateway with rate limiting
4. ✅ Application caching layer (Redis)
5. ✅ All business microservices (10+ services)
6. ✅ Integration layer with external providers
7. ✅ Mobile offline sync architecture with conflict resolution
8. ✅ Notification system with multi-channel delivery and escalation
9. ✅ Security infrastructure (Vault, KMS, Cert Manager)
10. ✅ Internationalization service
11. ✅ Cost management service
12. ✅ Vendor/procurement service
13. ✅ Compliance service details
14. ✅ Document storage and lifecycle
15. ✅ Audit log infrastructure

**Better Representation:**
- Edge computing with K3s and local analytics
- Complete ML pipeline (Feast → Kubeflow → MLflow → KServe)
- Observability stack (Prometheus, Grafana, Loki, Jaeger)
- Data flow from edge to consumption with all intermediate steps
- Mobile offline-first architecture with sync service
- Multi-layer caching strategy (Browser → CDN → Redis → DB)

**Specification Coverage:**
- Diagram 1: Complete system (covers all 24 specs)
- Diagram 2: Technology stack details (specs 01, 03, 04, 10, 17, 18, 22, 24)
- Diagram 3: Data flow (specs 10, 21, 22)
- Diagram 4: Mobile sync (spec 04)
- Diagram 5: Notifications (spec 14)

---

**Version**: 2.0
**Last Updated**: November 11, 2025
**Based on**: 24 detailed technical specifications
**Specification Coverage**: 100%
