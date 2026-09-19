> **Review input, 2026-09-19.** Written by a second developer at Deepak's request
> as an independent survey of how data enters the system. It is an input to
> REV-009 (verified feature inventory), not a status document.
>
> Three of its load-bearing claims were re-checked against the code on
> 2026-09-19 and all three hold:
>
> | Claim | Check | Result |
> | :---- | :---- | :----- |
> | No Kafka consumer persists `raw_telemetry` | `grep -rln "eachMessage\|consumer.run" backend/src` | no matches — confirmed |
> | The weather route is not registered | `grep -n weather backend/src/server.ts` | no matches — confirmed |
> | Telemetry reaches Kafka | `routes/telemetry.ts:164` publishes to `"raw_telemetry"` | confirmed |
>
> One thing this document does not mention, found while checking it: the topic
> name is the **hardcoded string** `"raw_telemetry"` at `routes/telemetry.ts:164`,
> while `.env.example` declares `KAFKA_TOPIC_TELEMETRY_RAW=telemetry.raw`. That
> variable is read nowhere. Anyone configuring topics through the environment
> would be configuring a topic that does not exist.

# Data Ingestion

## Overview

The system currently ingests data through authenticated REST APIs, a REST-to-Kafka telemetry path, document and attachment uploads, external weather APIs, and scheduled database extraction. The repository also documents a larger MQTT/Flink streaming architecture, but that path is not fully implemented in the backend.

## Implemented Ingestion Paths

### 1. Operational data through REST

Assets, sites, work orders, users, alerts, permits, and related entities are submitted through Fastify REST routes. Requests are authenticated and authorized with JWT/RBAC, protected against CSRF for mutations, validated against route schemas, and persisted to PostgreSQL.

Relevant implementation:

- `backend/src/routes/assets.ts`
- `backend/src/server.ts`
- Other domain route modules under `backend/src/routes/`

Alert creation also invokes the alert notification handler, which can enqueue notifications and trigger outbound webhooks.

### 2. Telemetry and sensor events

`POST /api/v1/telemetry` accepts a batch of sensor events. Each event requires:

- `timestamp`
- `site_id`
- `asset_id`
- `sensor_type`
- `sensor_id`
- `value`
- `unit`

The handler:

1. Authenticates and authorizes the request.
2. Generates an `event_id` when needed.
3. Adds `tenant_id`, `source`, `schema_version`, and `ingested_at`.
4. Applies basic value validation and defaults `quality_flag` to `GOOD`.
5. Returns accepted and rejected counts with per-event errors.
6. Publishes accepted events to Kafka topic `raw_telemetry`.

Kafka messages are keyed by `site_id:asset_id:sensor_id`, serialized as JSON, and produced with retries/idempotence and LZ4 compression.

Relevant implementation:

- `backend/src/routes/telemetry.ts`
- `backend/src/services/kafka.service.ts`

Telemetry query routes expect raw and aggregated readings in QuestDB tables such as `sensor_readings`, `sensor_readings_1min`, `sensor_readings_5min`, `sensor_readings_15min`, and `sensor_readings_1hour`.

**Current gap:** the repository contains the Kafka producer, but no implemented Kafka consumer loop that persists `raw_telemetry` messages into QuestDB or TimescaleDB. The REST ingestion endpoint therefore hands events off to Kafka but does not directly persist them.

### 3. GenAI document ingestion

`POST /api/v1/genai/upload` accepts a multipart document with site, asset, type, and category metadata. The upload is placed on the Redis-backed BullMQ `ingestion-queue`.

The worker:

1. Reconstructs the uploaded buffer.
2. Extracts text from plain text or PDF files.
3. Normalizes whitespace.
4. Splits content into 1,000-character chunks with 200-character overlap.
5. Generates Gemini `text-embedding-004` embeddings.
6. Stores chunks, metadata, and vectors in PostgreSQL `document_embeddings`.
7. Reports progress and supports partial-success results.

Relevant implementation:

- `backend/src/routes/genai.routes.ts`
- `backend/src/services/queue.service.ts`

The current MVP passes the file buffer through Redis job data. The worker notes that production should pass a storage path or URL instead.

### 4. Work-order attachments

`POST /api/v1/work-orders/:workOrderId/attachments` accepts common image, PDF/Office, text, and CSV attachments. Files are limited to 10 MB, checked against the work order's tenant, and stored on the local filesystem by default. Attachment metadata is persisted in PostgreSQL.

This is file attachment storage, not a structured CSV/Excel bulk-import pipeline.

Relevant implementation:

- `backend/src/routes/attachments.ts`
- `backend/src/services/file-storage.service.ts`

### 5. Weather API data

The weather service fetches current conditions and forecasts from OpenWeatherMap, with optional solar irradiation forecasts from Solcast. It transforms and stores forecasts in PostgreSQL `weather_forecasts`.

Relevant implementation:

- `backend/src/services/weather-api.service.ts`
- `backend/src/routes/weather.ts`

The weather route module appears not to be registered in the current `backend/src/server.ts`, so this ingestion path may not be reachable at runtime. Historical weather ingestion is not implemented.

### 6. Scheduled analytics ETL

The ClickHouse ETL service reads operational records from PostgreSQL, transforms them, and inserts analytics rows into ClickHouse tables including:

- `wo_metrics`
- `asset_metrics`
- `alarm_metrics`

The scheduler runs incremental ETL on a configurable cron schedule, defaulting to 2 AM daily, and calculates KPI snapshots at 3 AM. Development mode can also trigger an initial sync at startup.

Relevant implementation:

- `backend/src/services/clickhouse-etl.service.ts`
- `backend/src/services/etl-scheduler.service.ts`

### 7. ML training and feature ingestion

ML dataset jobs read assets, health scores, alarms, and work orders from PostgreSQL and telemetry data from ClickHouse. They create versioned training and test datasets, including Parquet output and failure labels based on corrective/emergency work orders.

Feast materialization reads PostgreSQL operational features and rolling telemetry aggregates from ClickHouse, writes offline Parquet data, and materializes online features into Redis. The backend retrieves online features through Feast's API.

Relevant implementation:

- `ml/datasets/create_training_dataset.py`
- `ml/feast/materialize_features.py`
- `ml/feast/features/`
- `backend/src/services/feast-feature.service.ts`
- `backend/src/routes/ml-features.ts`

## Event and Notification Processing

Alerts created through the REST API are passed to `AlertNotificationHandler`. It loads related alert, asset, site, and tenant records, selects recipients, and sends email/push notifications or outbound webhooks. Notification work is persisted in PostgreSQL queues and history tables, with retries and rate limiting.

Relevant implementation:

- `backend/src/routes/alerts.ts`
- `backend/src/services/alert-notification-handler.service.ts`
- `backend/src/services/notification.service.ts`
- `backend/src/services/webhook.service.ts`

There is Kafka-oriented alert event handling in the code, but no Kafka consumer was found that invokes it. The concrete alert path is the direct REST route invocation.

## Documented but Not Fully Implemented

The architecture describes this target streaming pipeline:

```text
SCADA/protocol adapters
    -> MQTT/EMQX
    -> Kafka
    -> Flink validation and aggregation
    -> QuestDB raw telemetry
    -> TimescaleDB aggregates
    -> alerts, work orders, and ML features
```

The design supports OPC-UA, Modbus, IEC 61850, and DNP3 protocol adapters, edge buffering, schema validation, and real-time processing. These components are described in:

- `docs/architecture/system-architecture.md`
- `docs/architecture/adrs/ADR-003-multi-protocol-scada-support.md`
- `docs/flows/sequence-diagrams.md`

However, the repository does not currently contain a complete MQTT consumer, Kafka consumer, Flink processing job, generic feed-ingestion endpoint, or structured CSV/Excel importer.

## Summary

The active ingestion model is:

```text
REST clients -> Fastify validation/authentication -> PostgreSQL

REST telemetry -> validation/enrichment -> Kafka raw_telemetry

Document upload -> Redis/BullMQ -> text extraction/chunking/embeddings -> PostgreSQL

External weather APIs -> transformation -> PostgreSQL

PostgreSQL operational data -> scheduled ETL -> ClickHouse analytics

PostgreSQL + ClickHouse -> ML dataset/Feast materialization -> Parquet + Redis
```

The largest ingestion completeness issue is the missing Kafka consumer and downstream telemetry persistence path. The documented MQTT/EMQX/Flink pipeline should be treated as target architecture rather than confirmed runtime behavior until those consumers and processors are implemented and wired.
