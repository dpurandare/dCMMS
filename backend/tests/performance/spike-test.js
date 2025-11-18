/**
 * k6 Spike Test for dCMMS API
 *
 * Tests system behavior under sudden traffic spikes
 * Run with: k6 run spike-test.js
 *
 * Purpose: Verify system can handle sudden traffic increases and recovers gracefully
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '10s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 200 },   // Sustained spike
    { duration: '30s', target: 10 },   // Recovery
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Relaxed during spike
    errors: ['rate<0.05'],             // Allow 5% error during spike
  },
};

let token = null;

export function setup() {
  // Authenticate once during setup
  const res = http.post(
    `${BASE_URL}${API_VERSION}/auth/login`,
    JSON.stringify({
      email: 'admin@dcmms.local',
      password: 'admin123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status === 200) {
    return { token: res.json('token') };
  }
  return { token: null };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Focus on read operations during spike
  group('Read Work Orders', () => {
    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/work-orders?page=1&limit=20`,
      { headers }
    );
    const duration = new Date() - start;
    apiLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time acceptable': (r) => r.timings.duration < 1000, // 1 second max during spike
    });
    errorRate.add(!checkRes);
  });

  sleep(0.5); // Faster iteration during spike

  group('Read Assets', () => {
    const start = new Date();
    const res = http.get(
      `${BASE_URL}${API_VERSION}/assets?page=1&limit=20`,
      { headers }
    );
    const duration = new Date() - start;
    apiLatency.add(duration);

    const checkRes = check(res, {
      'status is 200': (r) => r.status === 200,
    });
    errorRate.add(!checkRes);
  });

  sleep(0.5);
}

export function teardown(data) {
  console.log('Spike test completed');
}
