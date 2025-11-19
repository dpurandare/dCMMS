# dCMMS Performance Testing with k6

This directory contains performance and load testing scripts for the dCMMS API using [k6](https://k6.io/).

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/get-started/installation/

## Test Scripts

### Overview

| Test Script | Purpose | Duration | VUs | When to Run |
|-------------|---------|----------|-----|-------------|
| `smoke-test.js` | Quick endpoint validation | 1 min | 1 | Before every deployment |
| `load-test.js` | Standard load testing | 13 min | 0→100 | Weekly, before releases |
| `spike-test.js` | Traffic spike handling | 2.5 min | 10→200 | Monthly |
| `telemetry-load-test.js` | Telemetry ingestion validation | 16 min | 0→200 | Before production, weekly |
| `ml-inference-test.js` | ML model performance | 9 min | 0→50 | Before ML deployments |
| `final-validation-test.js` | **Comprehensive Release 2 validation** | 22 min | Mixed | Before major releases |

### 1. Smoke Test (`smoke-test.js`)

**Purpose:** Quick validation that all critical endpoints work correctly.

**Usage:**
```bash
k6 run smoke-test.js
```

**Characteristics:**
- 1 virtual user
- 1 minute duration
- Tests basic CRUD operations
- Validates health check, auth, and list endpoints

**When to run:** Before every deployment or major change

### 2. Load Test (`load-test.js`)

**Purpose:** Test system under expected production load.

**Usage:**
```bash
k6 run load-test.js
```

**Characteristics:**
- Ramps up to 100 concurrent users
- 13 minute total duration
- Tests multiple scenarios (read, write, filter)
- Tracks custom metrics (API latency, auth latency, etc.)

**Load Profile:**
- 0-2min: Ramp to 20 users
- 2-5min: Ramp to 50 users
- 5-7min: Ramp to 100 users
- 7-12min: Sustained 100 users
- 12-13min: Ramp down to 0

**Performance Targets:**
- p95 response time < 200ms
- Error rate < 1%
- 100 concurrent users sustained

**When to run:** Weekly, before major releases

### 3. Spike Test (`spike-test.js`)

**Purpose:** Test system behavior during sudden traffic spikes.

**Usage:**
```bash
k6 run spike-test.js
```

**Characteristics:**
- Sudden spike from 10 to 200 users
- Tests recovery after spike
- Focuses on read operations

**Load Profile:**
- 0-30s: 10 users (baseline)
- 30-40s: Spike to 200 users
- 40-100s: Sustained 200 users
- 100-130s: Recovery to 10 users
- 130-160s: Ramp down to 0

**When to run:** Monthly, before major traffic events

### 4. Telemetry Load Test (`telemetry-load-test.js`)

**Purpose:** Validate high-volume telemetry ingestion performance.

**Usage:**
```bash
k6 run telemetry-load-test.js
```

**Characteristics:**
- Ramps up to 200 VUs over 5 minutes
- Sustained load for 10 minutes
- Batch telemetry ingestion (10 events per request)
- Target: 72,000 events/second (combined HTTP + MQTT)

**Load Profile:**
- 0-2min: Ramp to 50 VUs
- 2-4min: Ramp to 100 VUs
- 4-5min: Ramp to 200 VUs
- 5-15min: Sustained 200 VUs
- 15-16min: Ramp down to 0

**Performance Targets:**
- p95 latency < 100ms for batch ingestion
- p99 latency < 200ms
- Error rate < 0.1%
- HTTP API throughput > 2,000 events/second
- Combined system (HTTP + MQTT): > 72,000 events/second

**When to run:** Before production deployment, weekly in staging

### 5. ML Inference Test (`ml-inference-test.js`)

**Purpose:** Validate machine learning model inference performance.

**Usage:**
```bash
k6 run ml-inference-test.js
```

**Characteristics:**
- Ramps up to 50 VUs over 3 minutes
- Sustained load for 5 minutes
- Tests multiple ML endpoints (anomaly detection, predictive maintenance, energy forecasting)
- Includes batch prediction testing

**Load Profile:**
- 0-1min: Ramp to 10 VUs
- 1-2min: Ramp to 25 VUs
- 2-3min: Ramp to 50 VUs
- 3-8min: Sustained 50 VUs
- 8-9min: Ramp down to 0

**Performance Targets:**
- Anomaly Detection: p95 < 400ms, p99 < 800ms
- Predictive Maintenance: p95 < 600ms, p99 < 1200ms
- Energy Prediction: p95 < 500ms, p99 < 1000ms
- Overall ML Inference: p95 < 500ms
- Error rate: < 5% (ML models can occasionally fail on edge cases)

**When to run:** Before ML model deployments, after model updates

### 6. Final Validation Test (`final-validation-test.js`) ⭐

**Purpose:** Comprehensive Release 2 performance validation with mixed workload.

**Usage:**
```bash
k6 run final-validation-test.js
```

**Characteristics:**
- **Multi-scenario test** simulating realistic production load
- Concurrent API operations, telemetry ingestion, and ML predictions
- 3 parallel scenarios:
  1. API Users: 90 concurrent users
  2. Telemetry Devices: 200 iterations/second
  3. ML Requests: 10 predictions/second

**Load Profile:**
- Total duration: 22 minutes
- Ramp-up: 5 minutes to peak load
- Sustained load: 15 minutes
- Ramp-down: 2 minutes

**Performance Targets (Release 2):**
- ✅ API Latency: p95 < 200ms
- ✅ Telemetry: 72,000 events/second (HTTP + MQTT)
- ✅ ML Inference: p95 < 500ms
- ✅ Error Rate: < 1%
- ✅ Concurrent Users: 150+
- ✅ Overall throughput: > 500 requests/second

**When to run:**
- **REQUIRED** before Release 2 production deployment
- Before major releases
- Quarterly performance validation

**This test validates all performance requirements from Sprint 5 (DCMMS-043) and confirms the system is ready for production.**

## Running Tests

### Basic Execution

```bash
# Run smoke test
k6 run smoke-test.js

# Run load test
k6 run load-test.js

# Run spike test
k6 run spike-test.js
```

### Custom Configuration

**Set API base URL:**
```bash
k6 run -e API_BASE_URL=https://api.dcmms.com load-test.js
```

**Adjust virtual users:**
```bash
k6 run --vus 50 --duration 5m smoke-test.js
```

**Save results to JSON:**
```bash
k6 run --out json=results.json load-test.js
```

**Save results to InfluxDB:**
```bash
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

## Understanding Results

### Key Metrics

**http_req_duration:** Time from request start to response end
- p(95): 95th percentile - 95% of requests faster than this
- p(99): 99th percentile - 99% of requests faster than this
- avg: Average response time
- max: Slowest request

**http_req_failed:** Percentage of failed HTTP requests
- Target: < 1%

**http_reqs:** Total number of HTTP requests
- Measures throughput

**vus:** Number of active virtual users

**iterations:** Number of times VU executed the default function

### Sample Output

```
     ✓ login successful
     ✓ token received
     ✓ status is 200
     ✓ response time < 200ms

     checks.........................: 98.50% ✓ 197      ✗ 3
     data_received..................: 2.1 MB 35 kB/s
     data_sent......................: 890 kB 15 kB/s
     http_req_blocked...............: avg=1.2ms    min=2µs     med=7µs     max=183ms   p(95)=14µs    p(99)=20ms
     http_req_connecting............: avg=412µs    min=0s      med=0s      max=91ms    p(95)=0s      p(99)=5ms
     http_req_duration..............: avg=87ms     min=12ms    med=78ms    max=421ms   p(95)=165ms   p(99)=245ms
       { expected_response:true }...: avg=87ms     min=12ms    med=78ms    max=421ms   p(95)=165ms   p(99)=245ms
     http_req_failed................: 0.50%  ✓ 1        ✗ 199
     http_req_receiving.............: avg=128µs    min=25µs    med=102µs   max=2ms     p(95)=256µs   p(99)=589µs
     http_req_sending...............: avg=42µs     min=8µs     med=34µs    max=421µs   p(95)=89µs    p(99)=156µs
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(95)=0s      p(99)=0s
     http_req_waiting...............: avg=86ms     min=12ms    med=77ms    max=420ms   p(95)=164ms   p(99)=244ms
     http_reqs......................: 200    3.33/s
     iteration_duration.............: avg=5.2s     min=5.1s    med=5.2s    max=5.4s    p(95)=5.3s    p(99)=5.4s
     iterations.....................: 40     0.67/s
     vus............................: 100    min=1      max=100
     vus_max........................: 100    min=100    max=100
```

### Interpreting Results

✅ **Good:**
- http_req_duration p(95) < 200ms
- http_req_failed < 1%
- All checks passing (> 95%)

⚠️ **Warning:**
- http_req_duration p(95) 200-500ms
- http_req_failed 1-5%
- Some checks failing (90-95%)

❌ **Critical:**
- http_req_duration p(95) > 500ms
- http_req_failed > 5%
- Many checks failing (< 90%)

## Performance Targets (DCMMS-043)

As specified in Sprint 5:

| Metric | Target |
|--------|--------|
| **Concurrent Users** | 100 |
| **API Latency (p95)** | < 200ms for CRUD operations |
| **Asset List Load Time** | < 1s for 1000 assets |
| **WO List Load Time** | < 1s for 1000 work orders |
| **Error Rate** | < 1% |
| **Availability** | > 99% |

## Optimization Tips

If performance targets are not met:

### Backend Optimizations

1. **Database Indexing:**
   - Add indexes on frequently queried fields (status, priority, siteId, assetId)
   - Add composite indexes for common filter combinations

2. **Query Optimization:**
   - Use `EXPLAIN ANALYZE` to find slow queries
   - Avoid N+1 queries (use joins or batch queries)
   - Add pagination limits (max 100 items)

3. **Caching:**
   - Cache frequently accessed data (sites, asset types)
   - Use Redis for session storage
   - Implement HTTP caching headers

4. **Connection Pooling:**
   - Optimize database connection pool size
   - Adjust Fastify server limits

### Frontend Optimizations

1. **Code Splitting:**
   - Lazy load routes
   - Reduce bundle size

2. **Data Fetching:**
   - Implement virtual scrolling for large lists
   - Add debouncing to search inputs
   - Use SWR or React Query for caching

3. **Asset Optimization:**
   - Optimize images
   - Minify JavaScript/CSS

## Continuous Performance Testing

### CI/CD Integration

Add to GitHub Actions (`.github/workflows/performance.yml`):

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke test
        run: k6 run backend/tests/performance/smoke-test.js
      - name: Run load test
        run: k6 run backend/tests/performance/load-test.js
```

### Monitoring

Set up monitoring dashboards:

1. **Grafana + InfluxDB:**
   - Real-time performance metrics
   - Historical trends
   - Alert on threshold violations

2. **k6 Cloud:**
   - Hosted solution
   - Collaborative results
   - Trend analysis

## Troubleshooting

**Problem: High error rates**
- Check server logs for errors
- Verify test data exists (assets, sites)
- Check database connection limits

**Problem: Slow response times**
- Profile database queries
- Check server CPU/memory usage
- Review network latency

**Problem: Test timeouts**
- Increase k6 timeout: `http.setMaxTimeout('60s')`
- Check server is running
- Verify network connectivity

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://app.k6.io/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
