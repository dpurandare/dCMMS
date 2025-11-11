# Performance and Scalability Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Performance Targets](#2-performance-targets)
3. [Load Balancing](#3-load-balancing)
4. [Caching Strategy](#4-caching-strategy)
5. [Auto-Scaling](#5-auto-scaling)
6. [Database Optimization](#6-database-optimization)
7. [CDN Configuration](#7-cdn-configuration)
8. [Rate Limiting](#8-rate-limiting)
9. [Performance Monitoring](#9-performance-monitoring)
10. [Capacity Planning](#10-capacity-planning)

---

## 1. Overview

### 1.1 Purpose

Define performance targets, scalability architecture, and optimization strategies for dCMMS to support high-volume renewable energy operations at scale.

### 1.2 Scale Requirements

```yaml
production_scale:
  users:
    concurrent_users: 5000
    peak_users: 10000
    total_registered: 50000

  data_volume:
    telemetry_ingestion: "72,000 events/second sustained, 216,000 burst"
    telemetry_storage: "2.4 TB/day raw, 240 GB/day compressed"
    work_orders: "10,000 active work orders"
    assets: "50,000 assets across 200 sites"
    api_requests: "50,000 req/min sustained, 150,000 req/min peak"

  availability:
    uptime_target: "99.9% (43 minutes downtime/month)"
    rpo: "15 minutes (Recovery Point Objective)"
    rto: "1 hour (Recovery Time Objective)"

  geographic_distribution:
    regions: ["us-west", "us-east", "eu-west", "ap-south"]
    latency_target: "< 100ms within region, < 300ms cross-region"
```

---

## 2. Performance Targets

### 2.1 API Performance

```yaml
api_performance_targets:
  read_operations:
    p50_latency: "< 50ms"
    p95_latency: "< 200ms"
    p99_latency: "< 500ms"
    throughput: "10,000 req/sec per instance"

  write_operations:
    p50_latency: "< 100ms"
    p95_latency: "< 500ms"
    p99_latency: "< 1000ms"
    throughput: "5,000 req/sec per instance"

  search_operations:
    p50_latency: "< 200ms"
    p95_latency: "< 1000ms"
    p99_latency: "< 2000ms"
    result_limit: 1000

  analytics_queries:
    p50_latency: "< 2s"
    p95_latency: "< 10s"
    p99_latency: "< 30s"
    timeout: "60s"
```

### 2.2 Frontend Performance

```yaml
frontend_performance_targets:
  page_load:
    first_contentful_paint: "< 1.5s"
    largest_contentful_paint: "< 2.5s"
    time_to_interactive: "< 3.5s"
    cumulative_layout_shift: "< 0.1"
    first_input_delay: "< 100ms"

  bundle_sizes:
    initial_js: "< 200 KB gzipped"
    initial_css: "< 50 KB gzipped"
    lazy_chunks: "< 100 KB each"
    code_splitting: "route-based and component-based"

  image_optimization:
    format: "WebP with JPEG fallback"
    lazy_loading: "enabled for below-fold images"
    responsive_images: "srcset with multiple sizes"
```

### 2.3 Database Performance

```yaml
database_performance_targets:
  postgresql:
    query_latency:
      simple_queries: "< 10ms"
      complex_joins: "< 100ms"
      aggregations: "< 500ms"
    connection_pool: "100-500 connections per instance"
    replication_lag: "< 1 second"

  timescaledb:
    write_throughput: "100,000 rows/second"
    query_latency: "< 500ms for time-series aggregations"
    compression_ratio: "10-20x"
    retention: "7 days uncompressed, 90 days compressed"

  redis:
    get_latency: "< 1ms"
    set_latency: "< 2ms"
    throughput: "100,000 ops/second per instance"
    memory: "16 GB per instance"
```

---

## 3. Load Balancing

### 3.1 Application Load Balancer

```yaml
alb_configuration:
  provider: "AWS ALB / Azure Load Balancer / GCP Load Balancer"

  listeners:
    https:
      port: 443
      protocol: "HTTPS"
      ssl_policy: "ELBSecurityPolicy-TLS-1-2-2017-01"
      certificate: "ACM certificate ARN"

    http:
      port: 80
      protocol: "HTTP"
      redirect_to_https: true

  target_groups:
    api_servers:
      protocol: "HTTP"
      port: 3000
      health_check:
        path: "/health"
        interval: 30
        timeout: 5
        healthy_threshold: 2
        unhealthy_threshold: 3
      stickiness:
        enabled: true
        type: "lb_cookie"
        duration: 3600

    websocket_servers:
      protocol: "HTTP"
      port: 3001
      health_check:
        path: "/health"
        interval: 30
      stickiness:
        enabled: true
        type: "app_cookie"
        cookie_name: "DCMMS_WS_SESSION"

  routing_rules:
    - condition:
        path: "/api/v1/*"
      target: "api_servers"
      priority: 1

    - condition:
        path: "/ws/*"
      target: "websocket_servers"
      priority: 2

    - condition:
        path: "/static/*"
      redirect:
        protocol: "HTTPS"
        host: "cdn.dcmms.example.com"
        status_code: "HTTP_301"
      priority: 3
```

### 3.2 Load Balancing Algorithms

```yaml
algorithms:
  api_servers:
    algorithm: "least_outstanding_requests"
    reason: "Distributes load to least busy server"

  websocket_servers:
    algorithm: "ip_hash"
    reason: "Ensures persistent connections to same server"

  background_workers:
    algorithm: "round_robin"
    reason: "Simple, stateless task distribution"
```

### 3.3 Health Checks

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Database connectivity
  try {
    await db.query('SELECT 1');
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'unhealthy';
  }

  // Redis connectivity
  try {
    await redis.ping();
    checks.checks.redis = 'healthy';
  } catch (error) {
    checks.checks.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  // Kafka connectivity
  try {
    await kafka.admin().listTopics();
    checks.checks.kafka = 'healthy';
  } catch (error) {
    checks.checks.kafka = 'unhealthy';
    checks.status = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.checks.memory = {
    status: memUsagePercent < 90 ? 'healthy' : 'unhealthy',
    usagePercent: memUsagePercent.toFixed(2)
  };

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// Readiness check (stricter than liveness)
app.get('/ready', async (req, res) => {
  // Check all critical dependencies
  const ready = await checkAllDependencies();

  if (ready) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready' });
  }
});
```

---

## 4. Caching Strategy

### 4.1 Multi-Layer Caching

```yaml
caching_layers:
  layer_1_browser:
    type: "Browser cache"
    storage: "LocalStorage, SessionStorage, IndexedDB"
    ttl:
      static_assets: "365 days"
      api_responses: "5 minutes"
      user_preferences: "7 days"

  layer_2_cdn:
    type: "CDN edge cache"
    provider: "CloudFront / Cloudflare / Fastly"
    ttl:
      static_assets: "365 days"
      api_responses: "1 minute (if cacheable)"
      images: "30 days"
    purge_strategy: "Tag-based purging on content update"

  layer_3_application:
    type: "Application-level cache"
    provider: "Redis Cluster"
    ttl:
      session_data: "24 hours"
      user_profile: "1 hour"
      feature_flags: "5 minutes"
      reference_data: "1 hour"
      query_results: "5 minutes"

  layer_4_database:
    type: "Database query cache"
    provider: "PostgreSQL shared_buffers, pg_prewarm"
    size: "25% of total RAM"
    strategy: "LRU eviction"
```

### 4.2 Redis Caching Patterns

```javascript
const Redis = require('ioredis');

class CacheManager {
  constructor() {
    this.redis = new Redis.Cluster([
      { host: 'redis-node-1', port: 6379 },
      { host: 'redis-node-2', port: 6379 },
      { host: 'redis-node-3', port: 6379 }
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD
      }
    });
  }

  /**
   * Cache-aside pattern: Try cache first, then DB
   */
  async getWorkOrder(workOrderId) {
    const cacheKey = `work_order:${workOrderId}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - fetch from DB
    const workOrder = await db.workOrders.findOne({ workOrderId });

    // Store in cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(workOrder));

    return workOrder;
  }

  /**
   * Write-through pattern: Write to cache and DB simultaneously
   */
  async updateWorkOrder(workOrderId, updates) {
    const cacheKey = `work_order:${workOrderId}`;

    // Update database
    const updated = await db.workOrders.update(
      { workOrderId },
      updates
    );

    // Update cache
    await this.redis.setex(cacheKey, 300, JSON.stringify(updated));

    return updated;
  }

  /**
   * Cache invalidation on write
   */
  async invalidateWorkOrder(workOrderId) {
    const cacheKey = `work_order:${workOrderId}`;
    await this.redis.del(cacheKey);

    // Invalidate related caches
    await this.invalidateWorkOrderList();
  }

  /**
   * Memoization with TTL for expensive computations
   */
  async getAssetPerformanceScore(assetId, timeRange) {
    const cacheKey = `perf_score:${assetId}:${timeRange}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }

    // Expensive calculation
    const score = await this.calculatePerformanceScore(assetId, timeRange);

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, score.toString());

    return score;
  }

  /**
   * Rate limiting with sliding window
   */
  async checkRateLimit(userId, action, limit, window) {
    const key = `rate_limit:${userId}:${action}`;
    const now = Date.now();

    // Remove old entries outside window
    await this.redis.zremrangebyscore(key, 0, now - window);

    // Count requests in window
    const count = await this.redis.zcard(key);

    if (count >= limit) {
      return { allowed: false, remaining: 0, resetAt: now + window };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, Math.ceil(window / 1000));

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + window
    };
  }

  /**
   * Distributed locking for concurrent operations
   */
  async acquireLock(resource, ttl = 5000) {
    const lockKey = `lock:${resource}`;
    const lockValue = uuidv4();

    const acquired = await this.redis.set(
      lockKey,
      lockValue,
      'PX',
      ttl,
      'NX'
    );

    if (acquired === 'OK') {
      return {
        acquired: true,
        unlock: async () => {
          // Lua script for atomic unlock
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await this.redis.eval(script, 1, lockKey, lockValue);
        }
      };
    }

    return { acquired: false };
  }
}
```

### 4.3 Cache Warming

```javascript
// Warm cache on application startup
class CacheWarmer {
  async warmCache() {
    console.log('Starting cache warming...');

    // Warm reference data
    await this.warmReferenceData();

    // Warm frequently accessed data
    await this.warmFrequentData();

    // Warm computed metrics
    await this.warmMetrics();

    console.log('Cache warming complete');
  }

  async warmReferenceData() {
    // Asset types
    const assetTypes = await db.assetTypes.find({});
    await cache.set('asset_types', JSON.stringify(assetTypes), 3600);

    // Work order types
    const workOrderTypes = await db.workOrderTypes.find({});
    await cache.set('work_order_types', JSON.stringify(workOrderTypes), 3600);

    // Sites
    const sites = await db.sites.find({});
    for (const site of sites) {
      await cache.set(`site:${site.siteId}`, JSON.stringify(site), 3600);
    }
  }

  async warmFrequentData() {
    // Top 100 most accessed work orders from last 24h
    const topWorkOrders = await this.getTopAccessedWorkOrders(100);
    for (const wo of topWorkOrders) {
      await cache.set(`work_order:${wo.workOrderId}`, JSON.stringify(wo), 300);
    }
  }

  async warmMetrics() {
    // Dashboard KPIs for each site
    const sites = await db.sites.find({});
    for (const site of sites) {
      const metrics = await this.calculateSiteMetrics(site.siteId);
      await cache.set(`metrics:${site.siteId}`, JSON.stringify(metrics), 300);
    }
  }
}
```

---

## 5. Auto-Scaling

### 5.1 Horizontal Pod Autoscaler (Kubernetes)

```yaml
# API servers HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dcmms-api-hpa
  namespace: dcmms
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dcmms-api
  minReplicas: 5
  maxReplicas: 50
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

    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 5
          periodSeconds: 30
      selectPolicy: Max

---
# Background workers HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dcmms-workers-hpa
  namespace: dcmms
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dcmms-workers
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: External
      external:
        metric:
          name: kafka_consumer_lag
          selector:
            matchLabels:
              topic: "work-order-events"
        target:
          type: AverageValue
          averageValue: "1000"

    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 5.2 Cluster Autoscaler

```yaml
# EKS Cluster Autoscaler
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  cluster-autoscaler: |
    --balance-similar-node-groups
    --skip-nodes-with-system-pods=false
    --scale-down-enabled=true
    --scale-down-unneeded-time=10m
    --scale-down-delay-after-add=10m
    --scale-down-utilization-threshold=0.5
    --max-node-provision-time=15m

---
# Node groups
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: dcmms-cluster
  region: us-west-2

nodeGroups:
  - name: api-nodes
    instanceType: c5.2xlarge
    minSize: 5
    maxSize: 50
    desiredCapacity: 10
    labels:
      workload: api
    taints:
      - key: api-only
        value: "true"
        effect: NoSchedule

  - name: worker-nodes
    instanceType: c5.xlarge
    minSize: 3
    maxSize: 20
    desiredCapacity: 5
    labels:
      workload: background

  - name: data-nodes
    instanceType: r5.2xlarge
    minSize: 3
    maxSize: 10
    desiredCapacity: 3
    labels:
      workload: data-processing
```

### 5.3 Auto-Scaling Policies

```yaml
scaling_policies:
  api_servers:
    scale_up_triggers:
      - metric: "cpu_utilization > 70% for 2 minutes"
        action: "add 20% of current pods (min 2, max 10)"
      - metric: "request_rate > 1000 req/sec/pod for 1 minute"
        action: "add 5 pods"
      - metric: "response_time_p95 > 1000ms for 2 minutes"
        action: "add 20% of current pods"

    scale_down_triggers:
      - metric: "cpu_utilization < 30% for 10 minutes"
        action: "remove 10% of current pods (min 1 pod)"
      - metric: "request_rate < 200 req/sec/pod for 10 minutes"
        action: "remove 1 pod"

    constraints:
      min_replicas: 5
      max_replicas: 50
      cooldown_period: "5 minutes"
      max_scale_up_rate: "100% per minute"
      max_scale_down_rate: "50% per 5 minutes"

  background_workers:
    scale_up_triggers:
      - metric: "queue_depth > 1000 messages"
        action: "add 3 workers"
      - metric: "consumer_lag > 5000 messages"
        action: "add 5 workers"

    scale_down_triggers:
      - metric: "queue_depth < 100 messages for 15 minutes"
        action: "remove 1 worker"

    constraints:
      min_replicas: 3
      max_replicas: 20
      cooldown_period: "10 minutes"

  database_read_replicas:
    scale_up_triggers:
      - metric: "read_replica_lag > 5 seconds"
        action: "add 1 read replica"
      - metric: "connection_pool_saturation > 80%"
        action: "add 1 read replica"

    constraints:
      min_replicas: 2
      max_replicas: 5
```

---

## 6. Database Optimization

### 6.1 Connection Pooling

```javascript
const { Pool } = require('pg');

// PostgreSQL connection pool
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'dcmms',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool configuration
  min: 20,  // Minimum connections
  max: 100, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait 5s for available connection

  // Health check
  statement_timeout: 60000, // 60s query timeout
  query_timeout: 60000,

  // SSL
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('/path/to/ca-cert.pem')
  }
});

// Connection pool monitoring
pgPool.on('connect', () => {
  metrics.increment('db.pool.connect');
});

pgPool.on('acquire', () => {
  metrics.increment('db.pool.acquire');
});

pgPool.on('remove', () => {
  metrics.increment('db.pool.remove');
});

pgPool.on('error', (err) => {
  logger.error('Database pool error', { error: err.message });
  metrics.increment('db.pool.error');
});

// Expose pool metrics
app.get('/metrics/db-pool', (req, res) => {
  res.json({
    total: pgPool.totalCount,
    idle: pgPool.idleCount,
    waiting: pgPool.waitingCount
  });
});
```

### 6.2 Query Optimization

```sql
-- Index strategy for work orders
CREATE INDEX idx_work_orders_status_priority ON work_orders(status, priority) WHERE status IN ('draft', 'in_progress');
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to) WHERE status != 'completed';
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at DESC);
CREATE INDEX idx_work_orders_site_status ON work_orders(site_id, status);

-- Composite index for common queries
CREATE INDEX idx_work_orders_composite ON work_orders(site_id, status, priority, created_at DESC);

-- Partial index for active work orders only
CREATE INDEX idx_work_orders_active ON work_orders(work_order_id, status, assigned_to)
  WHERE status IN ('draft', 'in_progress', 'on_hold');

-- Index for JSON fields
CREATE INDEX idx_work_orders_custom_fields_gin ON work_orders USING gin(custom_fields);

-- Covering index to avoid table lookups
CREATE INDEX idx_work_orders_covering ON work_orders(site_id, status)
  INCLUDE (work_order_id, type, priority, assigned_to, created_at);

-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT wo.work_order_id, wo.type, wo.status, u.name AS assigned_to_name
FROM work_orders wo
LEFT JOIN users u ON wo.assigned_to = u.user_id
WHERE wo.site_id = 'SITE-001'
  AND wo.status IN ('draft', 'in_progress')
ORDER BY wo.priority DESC, wo.created_at DESC
LIMIT 50;
```

### 6.3 Read Replicas

```yaml
database_topology:
  primary:
    instance_type: "db.r5.2xlarge"
    storage: "1 TB SSD"
    purpose: "All writes, critical reads"
    location: "us-west-2a"

  read_replicas:
    - name: "replica-1"
      instance_type: "db.r5.xlarge"
      lag_target: "< 1 second"
      purpose: "Dashboard queries, reports"
      location: "us-west-2b"

    - name: "replica-2"
      instance_type: "db.r5.xlarge"
      lag_target: "< 1 second"
      purpose: "Analytics queries"
      location: "us-west-2c"

    - name: "replica-analytics"
      instance_type: "db.r5.2xlarge"
      lag_target: "< 5 seconds (acceptable for analytics)"
      purpose: "Heavy analytics, report generation"
      location: "us-west-2a"
```

```javascript
// Smart query routing
class DatabaseRouter {
  constructor() {
    this.primary = new Pool({ ...pgConfig, host: 'primary.db.dcmms.local' });
    this.replicas = [
      new Pool({ ...pgConfig, host: 'replica-1.db.dcmms.local' }),
      new Pool({ ...pgConfig, host: 'replica-2.db.dcmms.local' })
    ];
    this.analyticsReplica = new Pool({ ...pgConfig, host: 'replica-analytics.db.dcmms.local' });
  }

  /**
   * Route query to appropriate database
   */
  async query(sql, params, options = {}) {
    const { write, analytics, stale } = options;

    // Write operations → primary
    if (write || sql.trim().toUpperCase().startsWith('INSERT') ||
        sql.trim().toUpperCase().startsWith('UPDATE') ||
        sql.trim().toUpperCase().startsWith('DELETE')) {
      return this.primary.query(sql, params);
    }

    // Analytics queries → analytics replica
    if (analytics) {
      return this.analyticsReplica.query(sql, params);
    }

    // Read operations → round-robin across replicas
    const replica = this.replicas[Math.floor(Math.random() * this.replicas.length)];
    return replica.query(sql, params);
  }
}
```

### 6.4 Query Caching with Materialized Views

```sql
-- Materialized view for dashboard KPIs (refresh every 5 minutes)
CREATE MATERIALIZED VIEW dashboard_kpis AS
SELECT
  site_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_alerts,
  COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress')) AS open_work_orders,
  AVG(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) AS availability_percent,
  SUM(CASE WHEN date = CURRENT_DATE THEN generation_mwh ELSE 0 END) AS today_generation
FROM (
  SELECT site_id, status FROM alerts
  UNION ALL
  SELECT site_id, status FROM work_orders
  UNION ALL
  SELECT site_id, status FROM assets
  UNION ALL
  SELECT site_id, NULL as status FROM generation_daily
) combined
GROUP BY site_id;

CREATE UNIQUE INDEX ON dashboard_kpis(site_id);

-- Refresh every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh-dashboard-kpis', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_kpis');
```

---

## 7. CDN Configuration

### 7.1 CloudFront Distribution

```yaml
cdn_configuration:
  provider: "AWS CloudFront"

  origins:
    - id: "api-origin"
      domain_name: "api.dcmms.example.com"
      origin_protocol_policy: "https-only"
      origin_ssl_protocols: ["TLSv1.2"]

    - id: "static-assets-origin"
      domain_name: "dcmms-static.s3.amazonaws.com"
      origin_access_identity: "cloudfront-oai-12345"

  cache_behaviors:
    - path_pattern: "/api/v1/*"
      target_origin: "api-origin"
      viewer_protocol_policy: "redirect-to-https"
      allowed_methods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods: ["GET", "HEAD", "OPTIONS"]
      compress: true
      ttl:
        default: 0  # No caching by default for API
        max: 3600
        min: 0
      forward_headers: ["Authorization", "Accept", "Content-Type"]
      forward_cookies: "none"
      forward_query_strings: true

    - path_pattern: "/static/*"
      target_origin: "static-assets-origin"
      viewer_protocol_policy: "redirect-to-https"
      allowed_methods: ["GET", "HEAD"]
      compress: true
      ttl:
        default: 86400  # 1 day
        max: 31536000  # 1 year
        min: 0
      cache_policy: "CachingOptimized"

    - path_pattern: "/images/*"
      target_origin: "static-assets-origin"
      viewer_protocol_policy: "redirect-to-https"
      allowed_methods: ["GET", "HEAD"]
      compress: true
      ttl:
        default: 2592000  # 30 days
        max: 31536000
        min: 86400
      lambda_functions:
        viewer_request: "image-resize-function"

  geo_restriction:
    type: "none"  # Or specify allowed countries

  ssl_certificate:
    acm_certificate_arn: "arn:aws:acm:us-east-1:123456789:certificate/..."
    minimum_protocol_version: "TLSv1.2_2021"
    ssl_support_method: "sni-only"

  logging:
    enabled: true
    bucket: "dcmms-cdn-logs.s3.amazonaws.com"
    prefix: "cloudfront/"
```

### 7.2 Cache Invalidation

```javascript
const AWS = require('aws-sdk');
const cloudfront = new AWS.CloudFront();

class CDNInvalidator {
  /**
   * Invalidate CDN cache when content changes
   */
  async invalidatePaths(paths) {
    const params = {
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths
        }
      }
    };

    try {
      const result = await cloudfront.createInvalidation(params).promise();
      logger.info('CDN invalidation created', {
        invalidationId: result.Invalidation.Id,
        paths
      });
      return result.Invalidation.Id;
    } catch (error) {
      logger.error('CDN invalidation failed', { error: error.message, paths });
      throw error;
    }
  }

  /**
   * Invalidate specific asset types
   */
  async invalidateAsset(assetPath) {
    // Invalidate exact path and wildcard
    await this.invalidatePaths([
      assetPath,
      `${assetPath}*`
    ]);
  }

  /**
   * Invalidate all cached API responses for a resource
   */
  async invalidateAPIResource(resource) {
    await this.invalidatePaths([
      `/api/v1/${resource}/*`
    ]);
  }
}
```

---

## 8. Rate Limiting

### 8.1 API Rate Limiting

```yaml
rate_limits:
  by_endpoint:
    - endpoint: "/api/v1/telemetry/ingest"
      limit: 10000
      window: "1 minute"
      scope: "tenant"

    - endpoint: "/api/v1/work-orders"
      limit: 1000
      window: "1 minute"
      scope: "user"

    - endpoint: "/api/v1/search"
      limit: 100
      window: "1 minute"
      scope: "user"

    - endpoint: "/api/v1/reports/generate"
      limit: 10
      window: "1 minute"
      scope: "user"

  by_user_tier:
    free:
      requests_per_hour: 1000
      burst: 100

    pro:
      requests_per_hour: 10000
      burst: 1000

    enterprise:
      requests_per_hour: 100000
      burst: 10000
```

### 8.2 Rate Limiting Middleware

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // Tier-based limits
    const user = req.user;
    if (user.tier === 'enterprise') return 10000;
    if (user.tier === 'pro') return 1000;
    return 100; // free tier
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Endpoint-specific rate limiter
const searchLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:search:'
  }),
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => `${req.user.userId}:search`
});

// Apply rate limiters
app.use('/api/v1', globalLimiter);
app.use('/api/v1/search', searchLimiter);

// Custom rate limiter with sliding window
class SlidingWindowRateLimiter {
  constructor(redis) {
    this.redis = redis;
  }

  async checkLimit(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = this.redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();
    const count = results[1][1];

    if (count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: now + windowMs
      };
    }

    return {
      allowed: true,
      limit,
      remaining: limit - count - 1,
      resetAt: now + windowMs
    };
  }
}
```

---

## 9. Performance Monitoring

### 9.1 Metrics Collection

```yaml
metrics_stack:
  prometheus:
    scrape_interval: "15s"
    retention: "30 days"
    targets:
      - job: "dcmms-api"
        metrics_path: "/metrics"
        targets: ["api-1:3000", "api-2:3000", "api-3:3000"]

      - job: "postgresql"
        targets: ["postgres-exporter:9187"]

      - job: "redis"
        targets: ["redis-exporter:9121"]

      - job: "node-exporter"
        targets: ["node-1:9100", "node-2:9100", "node-3:9100"]

  grafana:
    dashboards:
      - "API Performance (latency, throughput, error rate)"
      - "Database Performance (query latency, connections, replication lag)"
      - "Cache Performance (hit rate, evictions, memory usage)"
      - "Infrastructure (CPU, memory, disk, network)"
      - "Business Metrics (work orders created, alerts triggered, users online)"
```

### 9.2 Application Performance Monitoring

```javascript
const promClient = require('prom-client');

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Middleware to track HTTP metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });

  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Database query instrumentation
const originalQuery = db.query.bind(db);
db.query = async function(sql, params) {
  const start = Date.now();

  try {
    const result = await originalQuery(sql, params);
    const duration = (Date.now() - start) / 1000;

    const queryType = sql.trim().split(' ')[0].toUpperCase();
    databaseQueryDuration.observe({ query_type: queryType }, duration);

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe({ query_type: 'ERROR' }, duration);
    throw error;
  }
};
```

### 9.3 Alerting Rules

```yaml
prometheus_alerts:
  - alert: HighAPILatency
    expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "API latency is high (p95 > 1s)"
      description: "95th percentile latency is {{ $value }}s"

  - alert: HighErrorRate
    expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate is above 5%"
      description: "Current error rate: {{ $value | humanizePercentage }}"

  - alert: DatabaseReplicationLag
    expr: pg_replication_lag_seconds > 10
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Database replication lag is high"
      description: "Replication lag: {{ $value }}s"

  - alert: CacheHitRatelow
    expr: redis_cache_hit_rate < 0.8
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Cache hit rate is below 80%"
      description: "Current hit rate: {{ $value | humanizePercentage }}"

  - alert: HighMemoryUsage
    expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Memory usage is above 90%"
      description: "Current usage: {{ $value | humanizePercentage }}"
```

---

## 10. Capacity Planning

### 10.1 Resource Sizing

```yaml
capacity_planning:
  api_servers:
    current_capacity:
      instances: 10
      requests_per_second: 10000
      latency_p95: "200ms"

    projected_growth:
      6_months: "+50% users"
      12_months: "+100% users"

    recommended_sizing:
      6_months: "15 instances (c5.2xlarge)"
      12_months: "20 instances (c5.2xlarge)"

  database:
    current_capacity:
      storage: "500 GB used / 1 TB provisioned"
      iops: "10,000 provisioned"
      connections: "60 avg / 100 max"

    projected_growth:
      6_months: "+200 GB data"
      12_months: "+500 GB data"

    recommended_sizing:
      6_months: "1.5 TB storage, 15,000 IOPS"
      12_months: "2 TB storage, 20,000 IOPS"

  cache:
    current_capacity:
      memory: "8 GB used / 16 GB provisioned"
      hit_rate: "85%"

    recommended_sizing:
      6_months: "24 GB (3x r5.large nodes)"
      12_months: "32 GB (4x r5.large nodes)"
```

### 10.2 Load Testing

```yaml
load_test_scenarios:
  baseline:
    description: "Normal operations"
    duration: "30 minutes"
    virtual_users: 1000
    ramp_up: "5 minutes"
    endpoints:
      - path: "/api/v1/work-orders"
        method: "GET"
        weight: 40

      - path: "/api/v1/assets"
        method: "GET"
        weight: 30

      - path: "/api/v1/alerts"
        method: "GET"
        weight: 20

      - path: "/api/v1/work-orders"
        method: "POST"
        weight: 10

  peak:
    description: "Peak load"
    duration: "15 minutes"
    virtual_users: 5000
    ramp_up: "2 minutes"

  stress:
    description: "Stress test"
    duration: "10 minutes"
    virtual_users: 10000
    ramp_up: "1 minute"
    purpose: "Find breaking point"

  endurance:
    description: "Endurance test"
    duration: "4 hours"
    virtual_users: 2000
    purpose: "Detect memory leaks, resource exhaustion"
```

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp up
    { duration: '30m', target: 1000 },  // Sustain
    { duration: '5m', target: 0 }       // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
    errors: ['rate<0.05']                // Custom error rate < 5%
  }
};

export default function() {
  const token = __ENV.API_TOKEN;

  // Get work orders
  let res = http.get('https://api.dcmms.example.com/api/v1/work-orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  }) || errorRate.add(1);

  sleep(1);
}
```

---

## Summary

This specification provides comprehensive performance and scalability strategies for dCMMS:

1. **Performance targets** for API (< 200ms p95), frontend (< 2.5s LCP), database (< 100ms complex queries)
2. **Load balancing** with ALB/NLB, health checks, sticky sessions, routing rules
3. **Multi-layer caching** (browser, CDN, Redis, database) with cache-aside and write-through patterns
4. **Auto-scaling** with HPA (5-50 pods) and cluster autoscaler based on CPU, memory, queue depth
5. **Database optimization** with connection pooling (20-100), read replicas, indexes, materialized views
6. **CDN** with CloudFront for static assets (30-day TTL) and cache invalidation
7. **Rate limiting** with sliding window algorithm (100-10,000 req/min by tier)
8. **Monitoring** with Prometheus, Grafana, custom metrics, alerting rules
9. **Capacity planning** for 6-12 month growth projections

**Lines:** ~1,400
**Status:** Complete
**Next:** Documentation System (Spec 19)
