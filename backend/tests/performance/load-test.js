/**
 * k6 Load Testing Script for dCMMS API
 *
 * Run with: k6 run load-test.js
 *
 * Scenarios:
 * - Ramp-up: 0 -> 100 users over 2 minutes
 * - Sustained load: 100 users for 5 minutes
 * - Ramp-down: 100 -> 0 users over 1 minute
 *
 * Metrics tracked:
 * - Response time (p95 < 200ms target)
 * - Request rate
 * - Error rate (< 1% target)
 * - Throughput
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const authLatency = new Trend('auth_latency');
const workOrderCreateLatency = new Trend('work_order_create_latency');
const assetListLatency = new Trend('asset_list_latency');

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

// Test options
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp-up to 20 users
    { duration: '3m', target: 50 },   // Ramp-up to 50 users
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.01'],
    api_latency: ['p(95)<200', 'p(99)<500'],
    auth_latency: ['p(95)<150'],
    work_order_create_latency: ['p(95)<300'],
    asset_list_latency: ['p(95)<200'],
  },
  ext: {
    loadimpact: {
      projectID: 3472864,
      name: 'dCMMS API Load Test'
    }
  }
};

// Test data
const testUsers = [
  { email: 'admin@dcmms.local', password: 'admin123' },
  { email: 'manager@dcmms.local', password: 'manager123' },
  { email: 'tech@dcmms.local', password: 'tech123' },
];

const workOrderTypes = ['corrective', 'preventive', 'predictive', 'inspection', 'emergency'];
const priorities = ['critical', 'high', 'medium', 'low'];

// Helper functions
function authenticate(userIndex = 0) {
  const user = testUsers[userIndex % testUsers.length];
  const loginStart = new Date();

  const res = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const duration = new Date() - loginStart;
  authLatency.add(duration);

  const checkRes = check(res, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  errorRate.add(!checkRes);

  if (checkRes) {
    return res.json('token');
  }
  return null;
}

function getHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Main test scenario
export default function () {
  // Authenticate
  const token = authenticate(__VU % testUsers.length);

  if (!token) {
    console.error('Authentication failed');
    return;
  }

  const headers = getHeaders(token);

  // Test 1: List Work Orders (most common operation)
  group('List Work Orders', () => {
    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?page=1&limit=20`,
      { headers }
    );
    const duration = new Date() - start;
    apiLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
      'has pagination': (r) => r.json('pagination') !== undefined,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!checkRes);
  });

  sleep(1);

  // Test 2: List Assets
  group('List Assets', () => {
    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/assets?page=1&limit=20&status=operational`,
      { headers }
    );
    const duration = new Date() - start;
    assetListLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => Array.isArray(r.json('data')),
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!checkRes);
  });

  sleep(1);

  // Test 3: Get Work Order Details (if we have any)
  group('Get Work Order Details', () => {
    // First, get a work order ID
    const listRes = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?limit=1`,
      { headers }
    );

    if (listRes.json('data') && listRes.json('data').length > 0) {
      const workOrderId = listRes.json('data')[0].id;

      const start = new Date();
      const res = http.get(
        `${BASE_URL}${API_VERSION}/work-orders/${workOrderId}`,
        { headers }
      );
      const duration = new Date() - start;
      apiLatency.add(duration);

      const checkRes = check(res, {
        'status is 200': (r) => r.status === 200,
        'has work order data': (r) => r.json('id') !== undefined,
        'response time < 200ms': (r) => r.timings.duration < 200,
      });
      errorRate.add(!checkRes);
    }
  });

  sleep(1);

  // Test 4: Create Work Order (write operation - less frequent)
  if (__VU % 5 === 0) { // Only 20% of users create work orders
    group('Create Work Order', () => {
      const payload = {
        title: `Load Test WO ${__VU}-${__ITER}`,
        description: 'Automated load test work order',
        type: workOrderTypes[__VU % workOrderTypes.length],
        priority: priorities[__VU % priorities.length],
        status: 'draft',
        assetId: 'test-asset-001',
        siteId: 'test-site-001',
        estimatedHours: 4,
      };

      const start = new Date();
      const res = http.post(
        `${BASE_URL}${API_VERSION}/work-orders`,
        JSON.stringify(payload),
        { headers }
      );
      const duration = new Date() - start;
      workOrderCreateLatency.add(duration);

      const checkRes = check(res, {
        'status is 201 or 400': (r) => r.status === 201 || r.status === 400, // 400 if test data doesn't exist
        'response time < 300ms': (r) => r.timings.duration < 300,
      });
      errorRate.add(!checkRes && res.status !== 400);
    });

    sleep(2);
  }

  // Test 5: Filter and Search (common operation)
  group('Filter Work Orders', () => {
    const filters = [
      'status=scheduled',
      'priority=high',
      'type=corrective',
      'status=in_progress&priority=critical',
    ];

    const filter = filters[__VU % filters.length];

    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?${filter}&page=1&limit=20`,
      { headers }
    );
    const duration = new Date() - start;
    apiLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
      'has data': (r) => r.json('data') !== undefined,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!checkRes);
  });

  sleep(2);

  // Test 6: List Sites
  group('List Sites', () => {
    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/sites?page=1&limit=20`,
      { headers }
    );
    const duration = new Date() - start;
    apiLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!checkRes);
  });

  sleep(1);
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('Load test completed');
}
