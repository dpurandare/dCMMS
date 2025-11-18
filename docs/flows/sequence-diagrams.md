# dCMMS Critical User Flow Sequence Diagrams

**Version:** 1.0
**Date:** 2025-11-18
**Status:** ✅ Approved for Sprint 0
**Based on:** Spec 01 (API), Spec 02 (State Machines), Spec 03 (Auth), Spec 04 (Mobile Sync)

---

## Table of Contents

1. [User Login Flow](#1-user-login-flow)
2. [Create Work Order Flow](#2-create-work-order-flow)
3. [Mobile Offline Sync Flow](#3-mobile-offline-sync-flow)
4. [Telemetry Ingestion Flow](#4-telemetry-ingestion-flow)
5. [Alert Generation & Work Order Creation Flow](#5-alert-generation--work-order-creation-flow)
6. [Work Order State Transition Flow](#6-work-order-state-transition-flow)
7. [Asset Hierarchy Traversal Flow](#7-asset-hierarchy-traversal-flow)
8. [ML Prediction & Work Order Generation Flow](#8-ml-prediction--work-order-generation-flow)

---

## 1. User Login Flow

**OAuth2/OIDC Authentication with IdP**

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web App<br/>(Next.js)
    participant API as API Gateway<br/>(NGINX)
    participant AuthSvc as Auth Service<br/>(Fastify)
    participant IdPAdapter as IdP Adapter
    participant IdP as Identity Provider<br/>(Auth0/Azure AD)
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    User->>WebApp: Enter email/password
    WebApp->>WebApp: Validate input (Zod)

    WebApp->>API: POST /api/v1/auth/login<br/>{email, password}
    API->>AuthSvc: Forward request

    AuthSvc->>IdPAdapter: authenticate(credentials)
    Note over IdPAdapter: Factory selects adapter<br/>based on tenant config

    IdPAdapter->>IdP: OAuth2/OIDC flow<br/>(Resource Owner Password)
    IdP->>IdP: Validate credentials
    IdP-->>IdPAdapter: Access token + ID token

    IdPAdapter->>IdPAdapter: Validate token signature (JWKS)
    IdPAdapter->>IdPAdapter: Extract user claims

    IdPAdapter->>DB: SELECT user WHERE email=?

    alt User exists
        DB-->>IdPAdapter: User record
    else User not found (First login)
        IdPAdapter->>DB: INSERT INTO users (from IdP claims)
        DB-->>IdPAdapter: New user record
    end

    IdPAdapter->>DB: SELECT roles WHERE user_id=?
    DB-->>IdPAdapter: User roles

    IdPAdapter->>AuthSvc: UserInfo + roles

    AuthSvc->>AuthSvc: Generate JWT<br/>(RS256, 15min expiry)
    AuthSvc->>AuthSvc: Generate refresh token<br/>(7 day expiry)

    AuthSvc->>Redis: SET session:{sessionId}<br/>{userId, refreshToken}
    Redis-->>AuthSvc: OK

    AuthSvc->>DB: INSERT INTO audit_logs<br/>(LOGIN_SUCCESS)

    AuthSvc-->>API: 200 OK<br/>{accessToken, refreshToken}
    API-->>WebApp: {accessToken, refreshToken}

    WebApp->>WebApp: Store tokens (httpOnly cookie)
    WebApp->>WebApp: Redirect to dashboard

    WebApp-->>User: Show dashboard

    Note over User,Redis: Error Handling

    alt Invalid credentials
        IdP-->>IdPAdapter: 401 Unauthorized
        IdPAdapter-->>AuthSvc: AuthenticationError
        AuthSvc->>DB: INSERT INTO audit_logs<br/>(LOGIN_FAILED)
        AuthSvc-->>WebApp: 401 {error: "Invalid credentials"}
        WebApp-->>User: Show error message
    end

    alt IdP unavailable
        IdPAdapter->>IdP: Request (timeout)
        IdP--xIdPAdapter: Timeout/Error
        IdPAdapter-->>AuthSvc: ServiceUnavailableError
        AuthSvc-->>WebApp: 503 {error: "Auth service unavailable"}
        WebApp-->>User: Show retry message
    end
```

**Key Steps:**
1. User submits credentials to web app
2. API gateway forwards to auth service
3. Auth service uses IdP adapter factory to get correct adapter
4. Adapter authenticates with external IdP (OAuth2/OIDC)
5. If successful, create or update user in local DB
6. Fetch user roles from database
7. Generate JWT access token (15 min) and refresh token (7 days)
8. Store session in Redis
9. Log authentication event to audit log
10. Return tokens to client

**Error Cases:**
- Invalid credentials → 401 with error message
- IdP service unavailable → 503 with retry message
- Network timeout → 504 with retry message

---

## 2. Create Work Order Flow

**Frontend → API → Database with State Machine Validation**

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web App<br/>(Next.js)
    participant API as API Gateway
    participant WOSvc as Work Order Service<br/>(Fastify)
    participant AssetSvc as Asset Service
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL
    participant Kafka as Kafka
    participant Redis as Redis Cache

    User->>WebApp: Fill work order form<br/>(asset, title, description, priority)
    WebApp->>WebApp: Validate form (Zod schema)

    WebApp->>API: POST /api/v1/workorders<br/>Authorization: Bearer {jwt}
    API->>API: Verify JWT signature
    API->>Redis: GET user:{userId}
    Redis-->>API: User + roles cached

    API->>WOSvc: Forward request<br/>+ user context

    WOSvc->>AuthSvc: checkPermission(user, 'workorder:create')
    AuthSvc->>AuthSvc: Evaluate RBAC rules
    AuthSvc-->>WOSvc: Permission granted

    WOSvc->>WOSvc: Validate request body<br/>(Zod schema)

    WOSvc->>AssetSvc: GET /assets/{assetId}
    AssetSvc->>DB: SELECT * FROM assets WHERE id=?
    DB-->>AssetSvc: Asset record
    AssetSvc-->>WOSvc: Asset details

    WOSvc->>WOSvc: Validate asset exists<br/>and is operational

    WOSvc->>DB: BEGIN TRANSACTION

    WOSvc->>DB: INSERT INTO work_orders<br/>(status='draft', ...)
    DB-->>WOSvc: work_order_id

    WOSvc->>DB: INSERT INTO audit_logs<br/>(WORKORDER_CREATED)

    WOSvc->>DB: COMMIT TRANSACTION

    WOSvc->>Kafka: Publish event<br/>topic: workorders.events<br/>{type: 'created', workOrderId}
    Kafka-->>WOSvc: Ack

    WOSvc->>Redis: DEL cache:workorders:list:*<br/>(Invalidate list cache)

    WOSvc-->>API: 201 Created<br/>{workOrder}
    API-->>WebApp: {workOrder}

    WebApp->>WebApp: Update UI optimistically
    WebApp-->>User: Show success message<br/>"Work order WO-2025-001 created"

    Note over Kafka: Async event consumers
    Kafka->>NotificationSvc: workorder.created event
    NotificationSvc->>NotificationSvc: Notify assigned user

    Note over User,Redis: Error Handling

    alt Asset not found
        AssetSvc-->>WOSvc: 404 Not Found
        WOSvc-->>WebApp: 400 {error: "Asset not found"}
        WebApp-->>User: Show error
    end

    alt Permission denied
        AuthSvc-->>WOSvc: PermissionDenied
        WOSvc-->>WebApp: 403 {error: "Insufficient permissions"}
        WebApp-->>User: Show error
    end

    alt Validation error
        WOSvc->>WOSvc: Schema validation fails
        WOSvc-->>WebApp: 400 {errors: [{field, message}]}
        WebApp-->>User: Show field errors
    end
```

**Key Steps:**
1. User fills work order form in web app
2. Client-side validation (Zod schema)
3. API gateway verifies JWT
4. Work order service checks user permissions (RBAC)
5. Validate asset exists and is operational
6. Begin database transaction
7. Insert work order (status='draft')
8. Insert audit log entry
9. Commit transaction
10. Publish event to Kafka
11. Invalidate relevant caches
12. Return created work order

**Validation Checks:**
- JWT signature valid
- User has 'workorder:create' permission
- Request body matches schema
- Referenced asset exists
- Asset is in valid state for maintenance

---

## 3. Mobile Offline Sync Flow

**Conflict Resolution with Version Tokens**

```mermaid
sequenceDiagram
    participant Mobile as Mobile App<br/>(Flutter)
    participant LocalDB as Local DB<br/>(Drift/SQLite)
    participant API as API Gateway
    participant SyncSvc as Mobile Sync Service
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    Note over Mobile,Redis: PULL (Download changes from server)

    Mobile->>LocalDB: SELECT last_sync_timestamp
    LocalDB-->>Mobile: 2025-11-18T10:00:00Z

    Mobile->>API: POST /api/v1/sync/pull<br/>{lastSyncTimestamp, entities: ['workOrders', 'assets']}
    API->>SyncSvc: Forward request

    SyncSvc->>DB: SELECT * FROM work_orders<br/>WHERE updated_at > ?<br/>AND tenant_id = ?
    DB-->>SyncSvc: 15 work orders

    SyncSvc->>DB: SELECT * FROM assets<br/>WHERE updated_at > ?<br/>AND tenant_id = ?
    DB-->>SyncSvc: 5 assets

    SyncSvc->>SyncSvc: Build sync response<br/>with delta changes

    SyncSvc-->>Mobile: 200 OK<br/>{workOrders: [...], assets: [...],<br/>syncTimestamp: '2025-11-18T12:00:00Z'}

    Mobile->>LocalDB: BEGIN TRANSACTION

    loop For each work order
        Mobile->>LocalDB: UPSERT work_order<br/>(merge with local)
    end

    loop For each asset
        Mobile->>LocalDB: UPSERT asset
    end

    Mobile->>LocalDB: UPDATE sync_metadata<br/>SET last_pull = '2025-11-18T12:00:00Z'

    Mobile->>LocalDB: COMMIT TRANSACTION

    Mobile->>Mobile: Update UI with fresh data

    Note over Mobile,Redis: PUSH (Upload local changes to server)

    Mobile->>LocalDB: SELECT * FROM sync_queue<br/>WHERE synced = false
    LocalDB-->>Mobile: 3 pending changes

    Mobile->>API: POST /api/v1/sync/push<br/>{changes: [{entity, id, operation, data, version}]}
    API->>SyncSvc: Forward request

    SyncSvc->>DB: BEGIN TRANSACTION

    loop For each change
        SyncSvc->>DB: SELECT version FROM work_orders<br/>WHERE id = ?
        DB-->>SyncSvc: server_version = 5

        alt No conflict (versions match)
            SyncSvc->>DB: UPDATE work_orders<br/>SET ..., version = version + 1<br/>WHERE id = ? AND version = ?
            DB-->>SyncSvc: 1 row updated
            SyncSvc->>SyncSvc: Mark as accepted
        else Conflict detected (versions differ)
            SyncSvc->>SyncSvc: Apply conflict resolution<br/>(strategy: server_wins/client_wins/merge)

            alt Strategy: server_wins
                SyncSvc->>SyncSvc: Discard client changes<br/>Mark as conflict
            else Strategy: client_wins
                SyncSvc->>DB: UPDATE work_orders<br/>SET ..., version = version + 1
                SyncSvc->>SyncSvc: Mark as accepted
            else Strategy: merge
                SyncSvc->>SyncSvc: Merge server + client data
                SyncSvc->>DB: UPDATE work_orders<br/>SET merged_data, version = version + 1
                SyncSvc->>SyncSvc: Mark as merged
            end
        end
    end

    SyncSvc->>DB: COMMIT TRANSACTION

    SyncSvc-->>Mobile: 200 OK<br/>{accepted: [...], conflicts: [...], errors: [...]}

    Mobile->>LocalDB: BEGIN TRANSACTION

    loop For accepted changes
        Mobile->>LocalDB: DELETE FROM sync_queue<br/>WHERE id = ?
        Mobile->>LocalDB: UPDATE local record<br/>SET version = server_version
    end

    loop For conflicts
        Mobile->>LocalDB: UPDATE sync_queue<br/>SET conflict = true
        Mobile->>LocalDB: UPSERT with server data
    end

    Mobile->>LocalDB: COMMIT TRANSACTION

    Mobile->>Mobile: Update UI
    Mobile->>Mobile: Show conflict notifications

    Note over Mobile,Redis: Error Handling

    alt Network unavailable
        Mobile->>API: Request
        API--xMobile: Timeout
        Mobile->>Mobile: Queue for later retry
        Mobile->>LocalDB: Keep in sync_queue
    end

    alt Server validation error
        SyncSvc-->>Mobile: 400 {errors: [...]}
        Mobile->>Mobile: Show validation errors
        Mobile->>LocalDB: Mark change as failed
    end
```

**Key Steps (Pull):**
1. Mobile app queries last sync timestamp from local DB
2. Request delta changes from server since last sync
3. Server queries updated records (WHERE updated_at > lastSync)
4. Server returns delta changes + new sync timestamp
5. Mobile upserts records into local SQLite database
6. Update last sync timestamp

**Key Steps (Push):**
1. Mobile queries pending changes from sync queue
2. Send changes to server with version tokens
3. Server compares client version vs server version
4. If versions match → accept change (optimistic locking)
5. If versions differ → conflict detected
6. Apply conflict resolution strategy:
   - **server_wins**: Discard client changes
   - **client_wins**: Accept client changes
   - **merge**: Merge both (field-level resolution)
7. Return results to mobile
8. Mobile updates local DB based on results

**Conflict Resolution Strategies:**
- **Read-only data (assets, sites):** Server wins
- **Work order updates:** Client wins (technician has latest info)
- **Work order tasks:** Merge (combine both)

---

## 4. Telemetry Ingestion Flow

**Edge → MQTT → Kafka → Flink → QuestDB**

```mermaid
sequenceDiagram
    participant Edge as Edge Gateway<br/>(K3s)
    participant MQTT as EMQX MQTT Broker
    participant Kafka as Kafka Cluster
    participant SchemaReg as Schema Registry
    participant Flink as Apache Flink
    participant QuestDB as QuestDB
    participant TimescaleDB as TimescaleDB
    participant AlertSvc as Alert Service

    Note over Edge,AlertSvc: Real-time telemetry ingestion (72K events/sec)

    Edge->>Edge: Poll SCADA<br/>(Modbus/OPC-UA)<br/>5-second interval
    Edge->>Edge: Normalize data<br/>Convert to Avro schema

    Edge->>MQTT: Publish (QoS 1)<br/>topic: telemetry/SITE-001/INV-001/Power<br/>payload: Avro binary

    MQTT->>MQTT: Authenticate client<br/>(X.509 certificate)
    MQTT->>MQTT: Validate topic ACL

    MQTT->>Kafka: Bridge to Kafka<br/>topic: telemetry.raw
    Kafka->>Kafka: Partition by site_id<br/>(for parallelism)

    Kafka-->>MQTT: Ack
    MQTT-->>Edge: Ack (message delivered)

    Note over Flink: Stream Processing Job #1: Validation

    Flink->>Kafka: Consume telemetry.raw<br/>(parallelism=12)

    Flink->>SchemaReg: Validate Avro schema
    SchemaReg-->>Flink: Schema valid

    Flink->>Flink: Validate data quality:<br/>- Range check (min/max)<br/>- Quality flag (GOOD/BAD)<br/>- Timestamp sanity

    alt Valid data
        Flink->>Kafka: Publish to telemetry.validated
        Flink->>QuestDB: INSERT INTO telemetry_data<br/>(timestamp, site_id, asset_id, tag, value, quality)
    else Invalid data
        Flink->>Kafka: Publish to telemetry.invalid
        Flink->>AlertSvc: Send data quality alert
    end

    Note over Flink: Stream Processing Job #2: Aggregation

    Flink->>Kafka: Consume telemetry.validated
    Flink->>Flink: Tumbling window (1 minute)<br/>Compute: AVG, MIN, MAX, STDDEV

    Flink->>TimescaleDB: INSERT INTO telemetry_aggregates<br/>(time_bucket, avg_value, min_value, ...)

    Note over Flink: Stream Processing Job #3: Complex Event Processing

    Flink->>Kafka: Consume telemetry.validated
    Flink->>Flink: Pattern detection:<br/>- Threshold violations<br/>- Consecutive failures<br/>- Anomaly detection

    alt Critical pattern detected
        Flink->>Kafka: Publish to alerts.critical<br/>{alert_type, severity, asset_id}
        Flink->>AlertSvc: Trigger alert
    end

    Note over Edge,AlertSvc: Error Handling & Buffering

    alt Network interruption
        Edge->>MQTT: Publish (retry)
        MQTT--xEdge: Connection refused
        Edge->>Edge: Buffer locally<br/>(QuestDB 24h buffer)
        Edge->>Edge: Retry with backoff<br/>(2s, 4s, 8s, 16s)
    end

    alt MQTT broker down
        MQTT--xKafka: Connection lost
        MQTT->>MQTT: Queue messages in memory
        MQTT->>MQTT: Reconnect to Kafka
    end

    alt Flink job failure
        Flink--xFlink: Exception in processing
        Flink->>Flink: Restart from last checkpoint<br/>(exactly-once semantics)
        Flink->>Kafka: Resume consumption<br/>(committed offset)
    end
```

**Key Steps:**
1. Edge gateway polls SCADA devices (5-second interval)
2. Normalize data to Avro schema
3. Publish to MQTT broker (QoS 1 for reliability)
4. MQTT broker bridges to Kafka topic `telemetry.raw`
5. **Flink Job #1 (Validation):**
   - Validate Avro schema
   - Range checks and quality validation
   - Write to QuestDB (raw data)
   - Invalid data → alert
6. **Flink Job #2 (Aggregation):**
   - Tumbling windows (1-min, 5-min, 15-min)
   - Compute aggregations (AVG, MIN, MAX, STDDEV)
   - Write to TimescaleDB
7. **Flink Job #3 (CEP - Complex Event Processing):**
   - Pattern detection (thresholds, anomalies)
   - Critical patterns → trigger alerts

**Performance:**
- **Target:** 72,000 events/second
- **Kafka partitions:** 24 (3,000 events/sec per partition)
- **Flink parallelism:** 12 task managers
- **QuestDB write speed:** 100,000+ rows/sec (measured)

**Reliability:**
- Edge local buffer: 24 hours (QuestDB)
- MQTT QoS 1: At least once delivery
- Kafka replication: 3 replicas
- Flink checkpointing: Exactly-once semantics

---

## 5. Alert Generation & Work Order Creation Flow

**Anomaly Detection → Alert → Notification → Auto Work Order**

```mermaid
sequenceDiagram
    participant Flink as Apache Flink<br/>(CEP)
    participant Kafka as Kafka
    participant AlertSvc as Alert Service
    participant WOSvc as Work Order Service
    participant NotifSvc as Notification Service
    participant DB as PostgreSQL
    participant SendGrid as SendGrid<br/>(Email)
    participant Twilio as Twilio<br/>(SMS)

    Note over Flink,Twilio: Critical alert triggers automated response

    Flink->>Flink: Detect pattern:<br/>Inverter temp > 85°C<br/>for 3 consecutive readings

    Flink->>Kafka: Publish to alerts.critical<br/>{alertType, severity, assetId, metric, value}

    AlertSvc->>Kafka: Consume alerts.critical

    AlertSvc->>DB: BEGIN TRANSACTION

    AlertSvc->>DB: INSERT INTO alerts<br/>(type='TEMPERATURE_HIGH', severity='CRITICAL', asset_id, ...)
    DB-->>AlertSvc: alert_id

    AlertSvc->>DB: SELECT alert_rules<br/>WHERE type = 'TEMPERATURE_HIGH'
    DB-->>AlertSvc: Rule: auto_create_workorder=true

    AlertSvc->>WOSvc: POST /api/v1/workorders<br/>{title: "Inverter overheating",<br/>type: "emergency", priority: "critical"}

    WOSvc->>DB: INSERT INTO work_orders<br/>(status='open', type='emergency', ...)
    DB-->>WOSvc: work_order_id

    WOSvc->>DB: INSERT INTO audit_logs<br/>(WORKORDER_CREATED_BY_ALERT)

    WOSvc->>Kafka: Publish workorder.created

    WOSvc-->>AlertSvc: 201 Created {workOrderId}

    AlertSvc->>DB: UPDATE alerts<br/>SET work_order_id = ?

    AlertSvc->>DB: COMMIT TRANSACTION

    AlertSvc->>NotifSvc: Send notification<br/>{alertId, workOrderId, severity, recipients}

    NotifSvc->>DB: SELECT notification_preferences<br/>WHERE user_id IN (supervisors, oncall)
    DB-->>NotifSvc: User preferences:<br/>- User1: email + sms<br/>- User2: email only

    NotifSvc->>DB: SELECT notification_templates<br/>WHERE type = 'ALERT_CRITICAL'
    DB-->>NotifSvc: Template (Handlebars)

    NotifSvc->>NotifSvc: Render template<br/>with alert data

    par Send to multiple channels
        NotifSvc->>SendGrid: Send email<br/>to: supervisor@example.com<br/>subject: "🚨 Critical Alert: Inverter Overheating"
        SendGrid-->>NotifSvc: Message ID

        NotifSvc->>Twilio: Send SMS<br/>to: +1234567890<br/>body: "Critical alert: INV-001 temp 87°C. WO-2025-042 created."
        Twilio-->>NotifSvc: Message SID
    end

    NotifSvc->>DB: INSERT INTO notifications<br/>(alert_id, user_id, channel, status='sent')

    NotifSvc->>Kafka: Publish notification.sent

    Note over NotifSvc: Escalation if no acknowledgment

    NotifSvc->>NotifSvc: Schedule escalation<br/>(15 minutes)

    alt No acknowledgment after 15 min
        NotifSvc->>DB: SELECT escalation_rules
        DB-->>NotifSvc: Escalate to: manager@example.com

        NotifSvc->>SendGrid: Send escalation email
        NotifSvc->>Twilio: Send escalation SMS

        NotifSvc->>DB: INSERT INTO notifications<br/>(type='ESCALATION')
    end

    Note over Flink,Twilio: Error Handling

    alt Email send fails
        SendGrid-->>NotifSvc: 5xx Error
        NotifSvc->>NotifSvc: Retry with backoff<br/>(3 attempts)
        NotifSvc->>DB: UPDATE notifications<br/>SET status='failed'
    end

    alt SMS send fails
        Twilio-->>NotifSvc: Error (invalid number)
        NotifSvc->>DB: UPDATE notifications<br/>SET status='failed', error_message
        NotifSvc->>SendGrid: Fallback to email only
    end
```

**Key Steps:**
1. Flink CEP detects critical pattern (e.g., high temperature)
2. Publish alert to Kafka `alerts.critical`
3. Alert service consumes event
4. Insert alert record to database
5. Check alert rules (auto-create work order?)
6. If yes → call work order service to create emergency WO
7. Update alert with work order ID
8. Send notification to configured recipients
9. Query user notification preferences
10. Render notification template
11. Send via multiple channels (email, SMS, push)
12. Schedule escalation if no acknowledgment
13. After 15 minutes → escalate to manager

**Escalation Logic:**
- **Level 1 (0 min):** Assigned technician + on-call supervisor
- **Level 2 (15 min):** Escalate to manager if no ack
- **Level 3 (30 min):** Escalate to director

**Notification Channels:**
- **Email:** SendGrid (critical alerts)
- **SMS:** Twilio (critical only)
- **Push:** Firebase Cloud Messaging (all alerts)
- **In-app:** WebSocket notification

---

## 6. Work Order State Transition Flow

**State Machine Validation with Audit Trail**

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web App
    participant API as API Gateway
    participant WOSvc as Work Order Service
    participant StateMachine as State Machine<br/>Validator
    participant DB as PostgreSQL
    participant Kafka as Kafka
    participant Redis as Redis Cache

    User->>WebApp: Click "Start Work Order"
    WebApp->>API: POST /api/v1/workorders/{id}/transitions/start<br/>Authorization: Bearer {jwt}

    API->>API: Verify JWT
    API->>WOSvc: Forward request

    WOSvc->>DB: SELECT * FROM work_orders<br/>WHERE id = ? FOR UPDATE<br/>(pessimistic lock)
    DB-->>WOSvc: work_order {status: 'open', version: 5}

    WOSvc->>StateMachine: validateTransition<br/>(currentStatus='open', transition='start')

    StateMachine->>StateMachine: Check state machine rules:<br/>open → in_progress (allowed)

    alt Transition allowed
        StateMachine-->>WOSvc: Valid transition

        WOSvc->>WOSvc: Apply business rules:<br/>- Technician must be assigned<br/>- Prerequisites complete?

        WOSvc->>DB: BEGIN TRANSACTION

        WOSvc->>DB: UPDATE work_orders<br/>SET status = 'in_progress',<br/>    actual_start = NOW(),<br/>    version = version + 1<br/>WHERE id = ? AND version = 5

        DB-->>WOSvc: 1 row updated

        WOSvc->>DB: INSERT INTO work_order_state_history<br/>(work_order_id, from_status, to_status,<br/> transitioned_by, timestamp)

        WOSvc->>DB: INSERT INTO audit_logs<br/>(action='WORKORDER_STATE_CHANGED')

        WOSvc->>DB: COMMIT TRANSACTION

        WOSvc->>Kafka: Publish workorder.state_changed<br/>{workOrderId, fromStatus, toStatus}

        WOSvc->>Redis: DEL cache:workorder:{id}
        WOSvc->>Redis: DEL cache:workorders:list:*

        WOSvc-->>API: 200 OK {workOrder}
        API-->>WebApp: {workOrder}

        WebApp->>WebApp: Update UI<br/>Show "In Progress" badge
        WebApp-->>User: Success message

    else Transition not allowed
        StateMachine-->>WOSvc: InvalidTransitionError<br/>"Cannot transition from 'open' to 'start'"

        WOSvc-->>API: 400 Bad Request<br/>{error: "Invalid transition", allowedTransitions: ['cancel']}
        API-->>WebApp: 400 {error, allowedTransitions}

        WebApp-->>User: Error message:<br/>"Cannot start work order.<br/>Allowed actions: Cancel"
    end

    Note over User,Redis: Concurrent Update Prevention

    alt Optimistic locking conflict
        WOSvc->>DB: UPDATE work_orders<br/>WHERE id = ? AND version = 5
        DB-->>WOSvc: 0 rows updated<br/>(version mismatch)

        WOSvc-->>API: 409 Conflict<br/>{error: "Work order was modified by another user"}
        API-->>WebApp: 409 {error}

        WebApp->>WebApp: Refresh work order data
        WebApp-->>User: "Data changed. Please retry."
    end
```

**State Machine Rules (See Spec 02):**

```
Valid Transitions:
- draft → open (submit)
- open → in_progress (start)
- open → cancelled (cancel)
- in_progress → on_hold (pause)
- in_progress → completed (complete)
- in_progress → cancelled (cancel)
- on_hold → in_progress (resume)
- on_hold → cancelled (cancel)
```

**Key Steps:**
1. User triggers state transition (e.g., "Start")
2. Work order service fetches current record (with pessimistic lock)
3. Validate transition using state machine rules
4. Check business rules (e.g., technician assigned?)
5. If valid:
   - Update work order status
   - Increment version (optimistic locking)
   - Insert state history record
   - Insert audit log
   - Publish event to Kafka
   - Invalidate caches
6. If invalid:
   - Return error with allowed transitions

**Concurrency Control:**
- **Pessimistic locking:** `SELECT ... FOR UPDATE` during transition
- **Optimistic locking:** Version field checked on UPDATE
- **Conflict resolution:** 409 Conflict → user must refresh

**Audit Trail:**
- `work_order_state_history` table tracks all transitions
- `audit_logs` table records who/when/what changed
- Kafka events for downstream consumers

---

## 7. Asset Hierarchy Traversal Flow

**Recursive Query with Tree Structure**

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web App
    participant API as API Gateway
    participant AssetSvc as Asset Service
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    User->>WebApp: View asset detail page<br/>(Asset: INV-001)
    WebApp->>API: GET /api/v1/assets/{id}/hierarchy
    API->>AssetSvc: Forward request

    AssetSvc->>Redis: GET cache:asset:{id}:hierarchy

    alt Cache hit
        Redis-->>AssetSvc: Cached hierarchy JSON
        AssetSvc-->>WebApp: 200 OK {hierarchy}
    else Cache miss
        Redis-->>AssetSvc: null

        AssetSvc->>DB: Recursive CTE query:<br/>WITH RECURSIVE asset_tree AS (<br/>  -- Anchor: get current asset<br/>  SELECT * FROM assets WHERE id = ?<br/>  UNION ALL<br/>  -- Recursive: get parents<br/>  SELECT a.* FROM assets a<br/>  JOIN asset_tree t ON a.id = t.parent_id<br/>)<br/>SELECT * FROM asset_tree

        DB-->>AssetSvc: Parents: [Site, Zone, String]

        AssetSvc->>DB: WITH RECURSIVE asset_tree AS (<br/>  -- Anchor: get current asset<br/>  SELECT * FROM assets WHERE id = ?<br/>  UNION ALL<br/>  -- Recursive: get children<br/>  SELECT a.* FROM assets a<br/>  JOIN asset_tree t ON a.parent_id = t.id<br/>)<br/>SELECT * FROM asset_tree

        DB-->>AssetSvc: Children: [Module1, Module2, ...]

        AssetSvc->>AssetSvc: Build hierarchy tree:<br/>{<br/>  asset: current,<br/>  parents: [Site → Zone → String],<br/>  children: [Module1, Module2]<br/>}

        AssetSvc->>Redis: SET cache:asset:{id}:hierarchy<br/>TTL: 1 hour

        AssetSvc-->>API: 200 OK {hierarchy}
    end

    API-->>WebApp: {hierarchy}

    WebApp->>WebApp: Render tree visualization:<br/>Site → Zone → String → INV-001 → Modules
    WebApp-->>User: Show hierarchy tree

    Note over User,Redis: Cache Invalidation

    alt Asset updated/moved
        AssetSvc->>AssetSvc: Asset parent changed
        AssetSvc->>Redis: DEL cache:asset:*:hierarchy<br/>(Invalidate entire hierarchy cache)
    end
```

**Hierarchy Example:**
```
Site: Desert Solar Farm (SITE-001)
  └─ Zone: Zone A
      └─ String: String 1
          └─ Inverter: INV-001 (CURRENT)
              ├─ Module: MOD-001
              ├─ Module: MOD-002
              └─ Module: MOD-003
```

**PostgreSQL Recursive CTE:**
```sql
-- Get parent hierarchy (bottom-up)
WITH RECURSIVE asset_tree AS (
  SELECT id, asset_id, name, parent_id, 0 AS level
  FROM assets
  WHERE id = 'INV-001-UUID'

  UNION ALL

  SELECT a.id, a.asset_id, a.name, a.parent_id, t.level + 1
  FROM assets a
  INNER JOIN asset_tree t ON a.id = t.parent_id
)
SELECT * FROM asset_tree ORDER BY level DESC;

-- Get children hierarchy (top-down)
WITH RECURSIVE asset_tree AS (
  SELECT id, asset_id, name, parent_id, 0 AS level
  FROM assets
  WHERE id = 'INV-001-UUID'

  UNION ALL

  SELECT a.id, a.asset_id, a.name, a.parent_id, t.level + 1
  FROM assets a
  INNER JOIN asset_tree t ON a.parent_id = t.id
  WHERE t.level < 5  -- Prevent infinite loops
)
SELECT * FROM asset_tree ORDER BY level ASC;
```

**Performance Optimization:**
- **Caching:** 1-hour TTL for hierarchy data (rarely changes)
- **Max depth:** 5 levels to prevent infinite loops
- **Indexing:** B-tree index on `parent_id` column
- **Materialized path (future):** Store full path for faster queries

---

## 8. ML Prediction & Work Order Generation Flow

**Predictive Maintenance with Feature Store**

```mermaid
sequenceDiagram
    participant Scheduler as Airflow<br/>(Scheduler)
    participant FeaturePipeline as Feature Pipeline<br/>(Spark)
    participant Feast as Feast<br/>(Feature Store)
    participant MLService as ML Service<br/>(KServe)
    participant Model as ML Model<br/>(Scikit-learn)
    participant DB as PostgreSQL
    participant WOSvc as Work Order Service
    participant Kafka as Kafka

    Note over Scheduler,Kafka: Daily batch prediction (predictive maintenance)

    Scheduler->>Scheduler: Cron trigger:<br/>Run at 2 AM daily

    Scheduler->>FeaturePipeline: Trigger feature extraction job

    FeaturePipeline->>DB: SELECT assets<br/>WHERE type = 'inverter'<br/>AND status = 'operational'
    DB-->>FeaturePipeline: 1,000 inverters

    loop For each asset
        FeaturePipeline->>TimescaleDB: SELECT<br/>  AVG(power_output) as avg_power,<br/>  MAX(temperature) as max_temp,<br/>  STDDEV(voltage) as voltage_stddev<br/>FROM telemetry_aggregates<br/>WHERE asset_id = ? AND time > NOW() - INTERVAL '7 days'

        TimescaleDB-->>FeaturePipeline: Aggregated features

        FeaturePipeline->>FeaturePipeline: Calculate additional features:<br/>- Days since last maintenance<br/>- Operating hours<br/>- Failure count (last 30 days)
    end

    FeaturePipeline->>Feast: Materialize features<br/>to online store (Redis)
    Feast->>Redis: SET feature:{asset_id}<br/>{features: {...}, timestamp}

    FeaturePipeline-->>Scheduler: Feature extraction complete

    Scheduler->>MLService: Trigger batch prediction

    loop For each asset
        MLService->>Feast: GET features(asset_id)
        Feast->>Redis: GET feature:{asset_id}
        Redis-->>Feast: Feature vector
        Feast-->>MLService: {avg_power, max_temp, ...}

        MLService->>Model: predict(features)
        Model->>Model: Run inference:<br/>- Random Forest classifier<br/>- Input: 15 features<br/>- Output: failure probability

        Model-->>MLService: {<br/>  failure_probability: 0.78,<br/>  failure_type: 'COMPONENT_DEGRADATION',<br/>  confidence: 0.85<br/>}

        alt High failure probability (>= 0.7)
            MLService->>DB: INSERT INTO predictions<br/>(asset_id, prediction_type, probability,<br/> confidence, metadata)

            MLService->>WOSvc: POST /api/v1/workorders<br/>{<br/>  title: "Predicted failure: INV-001",<br/>  type: "predictive",<br/>  priority: "high",<br/>  description: "ML model predicts 78% failure risk"<br/>}

            WOSvc->>DB: INSERT INTO work_orders<br/>(status='open', type='predictive', ...)
            WOSvc->>Kafka: Publish workorder.created
            WOSvc-->>MLService: 201 Created {workOrderId}

            MLService->>DB: UPDATE predictions<br/>SET work_order_id = ?
        else Low failure probability
            MLService->>MLService: No action required
        end
    end

    MLService->>DB: INSERT INTO ml_batch_jobs<br/>(job_id, assets_processed, predictions_made,<br/> workorders_created, duration)

    MLService-->>Scheduler: Batch prediction complete:<br/>- 1,000 assets processed<br/>- 23 high-risk predictions<br/>- 23 work orders created

    Scheduler->>Scheduler: Send summary email to ops team

    Note over Scheduler,Kafka: Real-time prediction (on-demand)

    WebApp->>API: GET /api/v1/assets/{id}/prediction
    API->>MLService: Forward request

    MLService->>Feast: GET features(asset_id)
    Feast-->>MLService: Feature vector

    MLService->>Model: predict(features)
    Model-->>MLService: {failure_probability, confidence}

    MLService-->>WebApp: 200 OK<br/>{prediction, explanation, confidence}

    WebApp->>WebApp: Render prediction UI:<br/>"78% risk of failure in next 7 days"
```

**Key Steps:**
1. **Feature Engineering:**
   - Airflow scheduler triggers daily at 2 AM
   - Spark job extracts features from telemetry data (7-day window)
   - Calculate derived features (operating hours, failure history)
   - Materialize to Feast feature store (Redis)

2. **Batch Prediction:**
   - For each operational asset:
     - Fetch features from Feast
     - Run ML model inference (Random Forest)
     - Get failure probability (0.0-1.0)
   - If probability >= 0.7:
     - Create prediction record in DB
     - Auto-generate predictive work order
     - Link prediction to work order

3. **Real-time Prediction (on-demand):**
   - User requests prediction via API
   - Fetch latest features from Feast
   - Run model inference
   - Return prediction with explanation

**ML Model Details:**
- **Algorithm:** Random Forest Classifier (150 trees)
- **Features:** 15 engineered features
  - Telemetry aggregates (avg, max, stddev)
  - Temporal features (days since maintenance)
  - Historical features (failure count)
- **Output:** Failure probability (0.0-1.0) + failure type
- **Retraining:** Weekly (new data from completed work orders)
- **Model registry:** MLflow
- **Serving:** KServe (Kubernetes)

**Performance:**
- **Batch processing:** 1,000 assets in ~5 minutes
- **Real-time inference:** <100ms p99 latency
- **Feature retrieval:** <10ms (Redis)

---

## Summary

These 8 sequence diagrams cover the critical user flows in dCMMS:

1. ✅ **User Login Flow** - OAuth2/OIDC with IdP adapter pattern
2. ✅ **Create Work Order Flow** - RBAC validation, state machine
3. ✅ **Mobile Offline Sync Flow** - Conflict resolution with version tokens
4. ✅ **Telemetry Ingestion Flow** - Edge → MQTT → Kafka → Flink → QuestDB
5. ✅ **Alert Generation Flow** - Anomaly detection → auto work order → notifications
6. ✅ **Work Order State Transition Flow** - State machine validation with audit
7. ✅ **Asset Hierarchy Traversal Flow** - Recursive CTE queries
8. ✅ **ML Prediction Flow** - Feature store → model inference → predictive WO

**Common Patterns:**
- **Authentication:** JWT Bearer tokens on all protected endpoints
- **Authorization:** RBAC checks via auth service
- **Transactions:** Database transactions for multi-step operations
- **Events:** Kafka events for async communication
- **Caching:** Redis for frequently accessed data
- **Audit:** All critical actions logged to audit_logs table
- **Error Handling:** Graceful degradation with retries

---

**Last Updated:** 2025-11-18
**Next Review:** Sprint 2 (after MVP implementation)
**Status:** ✅ Approved for Implementation
