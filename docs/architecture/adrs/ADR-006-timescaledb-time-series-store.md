# ADR-006: TimescaleDB is the time-series store; ClickHouse is retired and QuestDB is removed from the backend

- **Status:** **Proposed** — records the decision Deepak Purandare took on 2026-11-17. It becomes **Accepted** on his sign-off. One part (QuestDB, below) needs his **reconfirmation**: it was decided on incomplete information.
- **Date:** 2026-11-17
- **Task:** REV-043 (the decision), REV-066 (the work)
- **Deciders:** Deepak Purandare
- **Supersedes, in part:** [ADR-001](./ADR-001-cloud-agnostic-architecture.md) (the "Database" row of its stack table) and [ADR-003](./ADR-003-multi-protocol-scada-support.md) (QuestDB as the cloud raw-telemetry store)
- **Related:** `specs/10_DATA_INGESTION_ARCHITECTURE.md`, [ADR-004](./ADR-004-migration-strategy.md)

## Context

### What the documents say — and they disagree

| Source | Time-series store(s) it names |
| :----- | :---------------------------- |
| `specs/10_DATA_INGESTION_ARCHITECTURE.md` | **TimescaleDB only**: Flink sink, hypertables (1-day chunks), continuous aggregates (1 and 5 minute), compression after 7 days, 90-day raw / 5-year aggregated retention, "REST APIs ← TimescaleDB (< 5 s queries)", its own connection pool and a "Scale TimescaleDB" procedure |
| ADR-003 (Accepted 2025-11-18) | **QuestDB for raw telemetry** and **TimescaleDB for aggregates** in the cloud; **QuestDB as a 24-hour local buffer at the edge** |
| ADR-001 (Accepted 2025-11-18) | Database row: PostgreSQL, QuestDB, TimescaleDB; QuestDB at the edge (K3s) and in the cloud |
| `specs/21_EDGE_COMPUTING.md` | Edge: SQLite, "TimescaleDB Edge (optional)"; cloud: TimescaleDB |
| Any spec or ADR | **ClickHouse: not mentioned anywhere.** The team added it in code. |

### What the code does (verified against the running stack, 2026-11-17)

| Store | Running | Used by | State |
| :---- | :------ | :------ | :---- |
| **TimescaleDB** | yes (`timescale/timescaledb:latest-pg16`) | **0** backend files | Unused |
| **QuestDB** | yes | 2 files: the telemetry read route, env config | Connected but has **no tables at all** (the schema was never created), so `GET /api/v1/telemetry` returns 500. Nothing writes to it. The route also still contains `Math.random()`. |
| **ClickHouse** | yes | ~10 files: KPI analytics, the report builder, compliance auto-populate, asset health scoring (which has **no callers**), the ETL | Schema exists, **every table has 0 rows** (the ETL scheduler is off unless `CLICKHOUSE_ETL_ENABLED=true`). `GET /analytics/kpis` returns 500. |

And the pipeline in front of them is a dead end: `POST /api/v1/telemetry` publishes to the Kafka topic `"raw_telemetry"` (hardcoded; `.env.example` declares a different, unread name), and **no consumer reads it** — nothing is ever stored or evaluated. Both the ClickHouse and QuestDB containers also report *unhealthy* because their healthchecks are broken (ClickHouse's `wget` is refused; QuestDB's uses `curl`, which is not in the image), although the databases themselves answer.

### A security finding that is part of this decision

The ClickHouse query builders paste values into SQL: 26 interpolated values and no parameterized query across five services. The report builder takes stored, user-authored filter fields and values this way. **Proven end to end on 2026-11-17**: an injected subquery executed inside ClickHouse and the error echoed the generated SQL, including the `tenant_id` clause. It was latent for tenant data (ClickHouse is empty; the ETL is off) but would have become a cross-tenant read the day the ETL was enabled. Mitigated the same day by disabling `POST /reports/:id/execute` (503) and making the ETL scheduler refuse to boot when enabled (REV-066).

## Decision

1. **TimescaleDB is the single time-series store** — raw telemetry and aggregates — as `specs/10` says.
2. **As a separate Timescale instance, not the main operational Postgres.** At pilot scale the spec expects ~26 GB/day, about 2.3 TB of raw data over the 90-day window, against an operational database measured in megabytes (11 MB today). A separate instance gives independent tuning, scaling and backups, keeps telemetry write load away from the operational data, matches `specs/10` and the deployment runbooks (which list the two databases separately) and what `docker-compose.yml` already runs, and leaves the operational database free to use a managed Postgres service later. The Timescale image *does* include `pgvector`, so a merge was technically possible; it was rejected on operational grounds, not capability.
3. **ClickHouse is retired — by porting, not by deleting.** It backs five real features. They are ported to PostgreSQL / TimescaleDB with **parameterized SQL and allow-listed columns**, and only then is ClickHouse removed. (The ETL is probably unnecessary once the data lives in Postgres/Timescale.)
4. **QuestDB is removed from the backend and the cloud stack.** TimescaleDB takes over raw telemetry. See *Open points* — this reverses a part of ADR-003.
5. **Revisit trigger (Deepak): if a performance bottleneck appears with TimescaleDB, reopen this decision.** The untested conditions that are most likely to matter are listed under *Evidence*.

## Evidence

Run on 2026-11-17 in scratch schemas on the development machine (single node, Docker, synthetic data), then dropped. Same shape for both: 20,000,000 rows, 20 sites × 1,000 assets × 4 metrics over one day; a day-partitioned table ordered by (site, asset, metric, time); 90-day raw retention; a 1-minute rolled-up aggregate with 5-year retention. TimescaleDB 2.30.1 (`timescaledb.license = timescale`, the community licence). The value generators differed slightly between the two, so treat the numbers as capability evidence, not a controlled benchmark.

| | ClickHouse | TimescaleDB |
| :-- | :--------- | :---------- |
| Ingest, 20M rows in one statement | **10.7 s ≈ 1.9M rows/s**, no duplicate protection | **168 s ≈ 119k rows/s**, with a unique key enforced |
| Headroom over the spec's Year-3 target (72,000 events/s) | ~26× | **~1.7×** |
| Spec pilot target (800 events/s) | ample | ample |
| Queries, wall clock including client start-up of ~50–60 ms (spec limit 5,000 ms): one asset 24 h from raw / from the aggregate / site hourly / latest value per asset / full scan of 20M rows | 72 / 70 / 69 / 74 / 96 ms | 78 / 57 / 57 / 73 / 240 ms |
| Size on disk for the raw 20M rows | 153 MiB | 162 MB (after compressing 2,663 MB: 16.5×) |
| Re-inserting 1M duplicate rows | row count became 21,000,000: **no dedupe**; needs a `ReplacingMergeTree` or an idempotent consumer | row count stayed 20,000,000 with `ON CONFLICT DO NOTHING`, **even into compressed chunks** |
| Continuous aggregate / retention / compression | materialized view + TTL + codecs: all worked | continuous aggregate with policy, retention policy, compression policy: all worked |
| Joins to operational tables | separate store, needs an ETL copy | same engine family (but a separate instance here — see Decision 2) |
| In the specs | no | yes (spec 10) |

Compare **bytes on disk**, not the compression ratios: the uncompressed formats differ (a Postgres heap carries far more per-row overhead), and the final sizes are nearly equal.

**Not tested, and the likeliest sources of a future bottleneck:** batched `COPY` instead of one `INSERT … SELECT`; concurrent dashboard reads *during* ingest; a multi-day dataset (compression and aggregate refresh over 90 days); bigger or production-class hardware; Timescale's multi-node story. TimescaleDB's headroom over the Year-3 target on this machine is thin (~1.7×), which is exactly what the revisit trigger is for.

## Alternatives considered

- **ClickHouse as the single store.** Capable and far faster to ingest, and it is where the code already pointed. Rejected: it is in no spec or ADR, none of the code written for it works, it carries the SQL injection above, it needs a duplicate-handling design, and Deepak judged it "does not make any sense" for this product. The sunk cost is small (the code is broken and injectable).
- **ClickHouse for analytics + a separate telemetry store.** Two stores to operate, secure and back up for no evidenced need at the spec's pilot volume.
- **TimescaleDB inside the main Postgres** (swap the image). Feasible (pgvector is present) and gives direct joins, one backup and one migration track. Rejected on volume asymmetry, isolation of write load, backup size, and departing from spec 10 and the runbooks; it would also tie the operational database to a Timescale-capable host.
- **Keep all three.** Rejected: two of them hold no data and run broken.

## Consequences

- **The spec stops being fiction here:** `specs/10` was the only document describing something close to what will now be built.
- **No cross-database joins.** The application resolves assets and sites and then queries telemetry by id. Telemetry rows must carry `tenant_id`, and the tenant sweep (`tests/security/tenant-sweep.spec.ts`) must cover telemetry reads and writes.
- **A second migration track** for the telemetry schema (hypertables, continuous aggregates, retention and compression policies), with a test equivalent to `tests/critical-paths/migrations.spec.ts`, and a second connection configuration (`TIMESCALE_*`, secret rules in `config/env.ts`).
- **Licence:** compression and continuous aggregates are under the Timescale (community) licence. Self-hosting is fine; **confirm it fits the product's commercial and deployment model** (offering it as a managed service is not covered).
- **Ingest design:** the consumer (REV-056) should use a unique key plus `ON CONFLICT DO NOTHING`, which was verified to work on compressed chunks; and the Kafka topic name must stop being hardcoded.
- **Porting effort:** KPI analytics, the report builder, compliance auto-populate, asset health scoring (decide keep or delete: no callers) and the ETL. Until then report execution stays disabled.
- **Infrastructure:** pin the Timescale image (not `latest-pg16`), give it a working healthcheck, and remove QuestDB and ClickHouse from `docker-compose.yml`, `scripts/dev.sh`, `.env*`, `config/env.ts` and the docs that name them.

## Open points

1. **QuestDB — needs Deepak's reconfirmation.** The decision to remove it was taken while it was described as appearing in no specification. In fact **ADR-001 and ADR-003 (both Accepted) name it**: as the cloud raw-telemetry store and as a 24-hour edge buffer. Removing it from the backend reverses the first role (Timescale's ingest headroom over the Year-3 target is the thing to watch). The **edge-buffer role is a separate question** this ADR does not decide: no edge component exists in this repository, `specs/21` itself says the edge uses SQLite / "TimescaleDB Edge (optional)", and the documents contradict each other. It should be settled when the edge work is scoped (REV-056).
2. **Licence confirmation** (above).
3. **Placement is decided** (separate instance), but the sizing of that instance is not.

## Appendix: how to reproduce the evidence

ClickHouse (in a scratch database):

```sql
CREATE TABLE raw (ts DateTime64(3) CODEC(Delta, ZSTD), site_id UInt16, asset_id UInt32,
  metric LowCardinality(String), value Float64 CODEC(Gorilla, ZSTD))
  ENGINE = MergeTree PARTITION BY toYYYYMMDD(ts) ORDER BY (site_id, asset_id, metric, ts)
  TTL toDateTime(ts) + INTERVAL 90 DAY;
CREATE TABLE agg_1m (bucket DateTime, site_id UInt16, asset_id UInt32, metric LowCardinality(String),
  n AggregateFunction(count), a AggregateFunction(avg, Float64), mn AggregateFunction(min, Float64),
  mx AggregateFunction(max, Float64)) ENGINE = AggregatingMergeTree PARTITION BY toYYYYMM(bucket)
  ORDER BY (site_id, asset_id, metric, bucket) TTL bucket + INTERVAL 5 YEAR;
CREATE MATERIALIZED VIEW mv_1m TO agg_1m AS SELECT toStartOfMinute(ts) AS bucket, site_id, asset_id,
  metric, countState() n, avgState(value) a, minState(value) mn, maxState(value) mx FROM raw
  GROUP BY bucket, site_id, asset_id, metric;
INSERT INTO raw SELECT toDateTime64(now() - toIntervalSecond(number % 86400), 3), toUInt16(number % 20),
  toUInt32(number % 1000), arrayElement(['power','temp','volt','amps'], 1 + (number % 4)), rand() / 1e9
  FROM numbers(20000000);
```

TimescaleDB:

```sql
CREATE TABLE raw (ts timestamptz NOT NULL, site_id int, asset_id int, metric text, value double precision);
SELECT create_hypertable('raw', 'ts', chunk_time_interval => INTERVAL '1 day');
CREATE UNIQUE INDEX ON raw (site_id, asset_id, metric, ts);
ALTER TABLE raw SET (timescaledb.compress, timescaledb.compress_segmentby = 'site_id,asset_id,metric',
  timescaledb.compress_orderby = 'ts DESC');
SELECT add_retention_policy('raw', INTERVAL '90 days');
SELECT add_compression_policy('raw', INTERVAL '7 days');
CREATE MATERIALIZED VIEW agg_1m WITH (timescaledb.continuous) AS
  SELECT time_bucket('1 minute', ts) AS bucket, site_id, asset_id, metric, count(*) n, avg(value) a,
         min(value) mn, max(value) mx FROM raw GROUP BY 1,2,3,4 WITH NO DATA;
INSERT INTO raw SELECT now() - ((n / 4000) * 17) * INTERVAL '1 second', (n % 20)::int, (n % 1000)::int,
  (ARRAY['power','temp','volt','amps'])[1 + ((n / 1000) % 4)], random() * 1000
  FROM generate_series(0, 19999999) AS n;
-- duplicates:   INSERT INTO raw SELECT * FROM raw LIMIT 1000000 ON CONFLICT DO NOTHING;
```
