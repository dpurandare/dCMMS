/*
 * k6 Load Test for dCMMS Telemetry Pipeline (DCMMS-062)
 *
 * Simulates high-volume telemetry ingestion to test production readiness.
 *
 * Target Performance:
 * - Production: 72,000 events/sec
 * - Local: 10,000 events/sec (limited by Docker resources)
 * - End-to-end latency: <5 seconds (99th percentile)
 * - No data loss (verify in QuestDB)
 * - Kafka lag: <10 seconds during peak load
 * - Flink backpressure: <10% during steady state
 *
 * Usage:
 *   # Install k6: https://k6.io/docs/get-started/installation/
 *
 *   # Local test (10K events/sec for 60 seconds)
 *   k6 run --vus 100 --duration 60s k6-load-test.js
 *
 *   # Production simulation (calculate resource requirements)
 *   k6 run --vus 720 --duration 300s k6-load-test.js
 *
 *   # Ramp-up test (gradual increase)
 *   k6 run --stage 1m:100,5m:500,2m:0 k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const eventsPublished = new Counter('events_published');

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test configuration
export const options = {
  // Thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
    errors: ['rate<0.01'],
  },

  // Scenarios
  scenarios: {
    // Scenario 1: Ramp-up test
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 VUs
        { duration: '3m', target: 100 },  // Ramp up to 100 VUs
        { duration: '5m', target: 100 },  // Stay at 100 VUs
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },

    // Scenario 2: Spike test (optional, comment out for normal run)
    // spike: {
    //   executor: 'constant-vus',
    //   vus: 500,
    //   duration: '1m',
    //   startTime: '11m', // After ramp-up completes
    // },
  },
};

// Sites and assets for test data
const SITES = ['site-001', 'site-002', 'site-003'];
const ASSETS_PER_SITE = 10;
const SENSORS_PER_ASSET = 5;

// Sensor types and ranges
const SENSOR_TYPES = [
  { type: 'TEMPERATURE', unit: 'celsius', min: 20, max: 80 },
  { type: 'VOLTAGE', unit: 'volts', min: 220, max: 240 },
  { type: 'CURRENT', unit: 'amperes', min: 5, max: 20 },
  { type: 'POWER', unit: 'kilowatts', min: 1, max: 5 },
  { type: 'FREQUENCY', unit: 'hertz', min: 49, max: 51 },
];

// Generate random sensor reading
function generateTelemetryEvent() {
  const site = SITES[Math.floor(Math.random() * SITES.length)];
  const assetNum = Math.floor(Math.random() * ASSETS_PER_SITE) + 1;
  const assetId = `${site}-asset-${String(assetNum).padStart(3, '0')}`;

  const sensor = SENSOR_TYPES[Math.floor(Math.random() * SENSOR_TYPES.length)];
  const sensorNum = Math.floor(Math.random() * SENSORS_PER_ASSET) + 1;
  const sensorId = `${assetId}-${sensor.type.toLowerCase()}-${String(sensorNum).padStart(3, '0')}`;

  // Generate value with some variation
  const baseValue = (sensor.min + sensor.max) / 2;
  const variation = (sensor.max - sensor.min) * 0.1;
  const value = baseValue + (Math.random() - 0.5) * 2 * variation;

  // Occasionally inject anomalies (2% chance)
  let qualityFlag = 'GOOD';
  let finalValue = value;
  if (Math.random() < 0.02) {
    qualityFlag = 'OUT_OF_RANGE';
    finalValue = sensor.max * 1.5;
  }

  return {
    event_id: `k6-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    site_id: site,
    asset_id: assetId,
    sensor_type: sensor.type,
    sensor_id: sensorId,
    value: Math.round(finalValue * 100) / 100,
    unit: sensor.unit,
    quality_flag: qualityFlag,
    metadata: {
      load_test: 'k6',
      test_run_id: __ENV.TEST_RUN_ID || 'default',
      firmware_version: '1.0.0',
    },
    source: 'LOAD_TEST',
    schema_version: '1.0.0',
  };
}

// Setup function (runs once per VU)
export function setup() {
  console.log('========================================');
  console.log('dCMMS Telemetry Load Test');
  console.log('========================================');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Duration: ${options.scenarios.ramp_up.stages.reduce((sum, s) => sum + parseInt(s.duration), 0)}m`);
  console.log('========================================');

  return {
    startTime: Date.now(),
  };
}

// Main test function (runs for each iteration)
export default function (data) {
  // Generate batch of events (10 events per request for better throughput)
  const batchSize = 10;
  const events = [];

  for (let i = 0; i < batchSize; i++) {
    events.push(generateTelemetryEvent());
  }

  // Send batch to telemetry API
  const url = `${BASE_URL}/api/v1/telemetry`;
  const payload = JSON.stringify(events);
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    timeout: '30s',
  };

  const start = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - start;

  // Record metrics
  requestDuration.add(duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has accepted count': (r) => JSON.parse(r.body).accepted > 0,
    'no rejected events': (r) => JSON.parse(r.body).rejected === 0,
  });

  if (success) {
    eventsPublished.add(batchSize);
  } else {
    errorRate.add(1);
    console.error(`Request failed: ${response.status} ${response.body}`);
  }

  // Calculate appropriate sleep time based on desired throughput
  // Target: 100 events/sec per VU = 10 batches/sec = 100ms sleep
  sleep(0.1);
}

// Teardown function (runs once after test)
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  console.log('\n========================================');
  console.log('Load Test Complete');
  console.log('========================================');
  console.log(`Total Duration: ${duration.toFixed(2)}s`);
  console.log('========================================');
  console.log('\nNext Steps:');
  console.log('1. Check Flink metrics: http://localhost:8082');
  console.log('2. Verify data in QuestDB: http://localhost:9000');
  console.log('3. Run verification script to check data integrity');
  console.log('========================================');
}
