/**
 * k6 Smoke Test for dCMMS API
 *
 * Quick test with minimal load to verify functionality
 * Run with: k6 run smoke-test.js
 *
 * Purpose: Verify all critical endpoints work before running full load tests
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

export const options = {
  vus: 1,               // 1 virtual user
  duration: '1m',       // Run for 1 minute
  thresholds: {
    http_req_duration: ['p(95)<500'], // Relaxed threshold for smoke test
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Test 1: Health Check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has status field': (r) => r.json('status') !== undefined,
    });
  });

  sleep(1);

  // Test 2: Authentication
  let token;
  group('Authentication', () => {
    const res = http.post(
      `${BASE_URL}${API_VERSION}/auth/login`,
      JSON.stringify({
        email: 'admin@dcmms.local',
        password: 'admin123',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, {
      'login successful': (r) => r.status === 200,
      'token received': (r) => r.json('token') !== undefined,
    });

    token = res.json('token');
  });

  if (!token) {
    console.error('Authentication failed - aborting test');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  sleep(1);

  // Test 3: Work Orders List
  group('Work Orders - List', () => {
    const res = http.get(`${BASE_URL}${API_VERSION}/work-orders`, { headers });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => r.json('data') !== undefined,
      'has pagination': (r) => r.json('pagination') !== undefined,
    });
  });

  sleep(1);

  // Test 4: Assets List
  group('Assets - List', () => {
    const res = http.get(`${BASE_URL}${API_VERSION}/assets`, { headers });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => r.json('data') !== undefined,
    });
  });

  sleep(1);

  // Test 5: Sites List
  group('Sites - List', () => {
    const res = http.get(`${BASE_URL}${API_VERSION}/sites`, { headers });
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has data array': (r) => r.json('data') !== undefined,
    });
  });

  sleep(1);

  // Test 6: Filtering
  group('Work Orders - Filter', () => {
    const res = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?status=scheduled&priority=high`,
      { headers }
    );
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has data': (r) => r.json('data') !== undefined,
    });
  });

  sleep(1);

  // Test 7: Pagination
  group('Work Orders - Pagination', () => {
    const res = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?page=1&limit=10`,
      { headers }
    );
    check(res, {
      'status is 200': (r) => r.status === 200,
      'correct limit': (r) => r.json('pagination.limit') === 10,
    });
  });

  sleep(2);
}
