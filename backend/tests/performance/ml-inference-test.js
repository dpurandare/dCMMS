/**
 * k6 ML Inference Performance Test for dCMMS
 *
 * Run with: k6 run ml-inference-test.js
 *
 * Target: p95 latency < 500ms for ML predictions
 *
 * This test validates the performance of ML model inference endpoints:
 * - Anomaly detection predictions
 * - Predictive maintenance forecasts
 * - Energy production predictions
 * - Fault classification
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const mlInferenceLatency = new Trend('ml_inference_latency');
const anomalyDetectionLatency = new Trend('anomaly_detection_latency');
const predictiveMaintenanceLatency = new Trend('predictive_maintenance_latency');
const energyPredictionLatency = new Trend('energy_prediction_latency');
const mlErrorRate = new Rate('ml_errors');
const mlRequestCount = new Counter('ml_requests');

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const ML_SERVICE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:5000';
const API_VERSION = '/api/v1';

// Test options
export const options = {
  scenarios: {
    ml_inference_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp-up to 10 VUs
        { duration: '1m', target: 25 },   // Ramp-up to 25 VUs
        { duration: '1m', target: 50 },   // Ramp-up to 50 VUs
        { duration: '5m', target: 50 },   // Sustained load
        { duration: '1m', target: 0 },    // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ml_inference_latency: ['p(95)<500', 'p(99)<1000'],           // Target: p95 < 500ms
    anomaly_detection_latency: ['p(95)<400', 'p(99)<800'],       // Faster for anomaly detection
    predictive_maintenance_latency: ['p(95)<600', 'p(99)<1200'], // Slower for complex models
    energy_prediction_latency: ['p(95)<500', 'p(99)<1000'],      // Medium complexity
    ml_errors: ['rate<0.05'],                                     // < 5% error rate (ML can have occasional failures)
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

// Authentication
let authToken = null;

export function setup() {
  const res = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
    email: 'admin@dcmms.local',
    password: 'admin123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 200) {
    return { token: res.json('token') };
  }
  console.error('Setup failed: Could not authenticate');
  return { token: null };
}

// Generate realistic feature data for ML inference
function generateInverterFeatures(siteId, assetId) {
  return {
    siteId,
    assetId,
    deviceType: 'inverter',
    features: {
      // Recent telemetry features (last 24 hours aggregated)
      avg_dc_voltage: 650 + Math.random() * 50,
      avg_dc_current: 6 + Math.random() * 2,
      avg_ac_voltage: 235 + Math.random() * 5,
      avg_ac_current: 12 + Math.random() * 3,
      avg_active_power: 2500 + Math.random() * 500,
      avg_temperature: 42 + Math.random() * 8,
      avg_efficiency: 0.96 + Math.random() * 0.03,

      // Statistical features
      std_dc_voltage: 5 + Math.random() * 5,
      std_temperature: 2 + Math.random() * 3,
      max_temperature: 50 + Math.random() * 10,
      min_efficiency: 0.92 + Math.random() * 0.04,

      // Operational features
      operating_hours: 8000 + Math.random() * 2000,
      fault_count_7d: Math.floor(Math.random() * 5),
      restart_count_7d: Math.floor(Math.random() * 3),
      last_maintenance_days: Math.floor(Math.random() * 180),

      // Environmental context
      avg_irradiance: 600 + Math.random() * 300,
      avg_ambient_temp: 25 + Math.random() * 10,
      avg_panel_temp: 40 + Math.random() * 15,
    },
    timestamp: new Date().toISOString(),
  };
}

function generateBatteryFeatures(siteId, assetId) {
  return {
    siteId,
    assetId,
    deviceType: 'battery',
    features: {
      // Recent telemetry features
      avg_voltage: 50 + Math.random() * 2,
      avg_current: Math.random() * 10 - 5, // -5 to +5A
      avg_soc: 50 + Math.random() * 30,
      avg_temperature: 25 + Math.random() * 10,
      current_soh: 96 + Math.random() * 4,

      // Cycle features
      cycle_count: 800 + Math.floor(Math.random() * 500),
      deep_discharge_count: Math.floor(Math.random() * 50),
      overcharge_count: Math.floor(Math.random() * 10),

      // Degradation indicators
      capacity_fade_rate: 0.02 + Math.random() * 0.03, // 2-5% per year
      resistance_increase_rate: 0.01 + Math.random() * 0.02,
      voltage_variance: 0.5 + Math.random() * 1.5,

      // Usage patterns
      avg_charge_rate: 0.3 + Math.random() * 0.4, // 0.3-0.7C
      avg_discharge_rate: 0.2 + Math.random() * 0.3,
      time_at_high_soc_pct: 20 + Math.random() * 30, // % of time SOC > 80%
    },
    timestamp: new Date().toISOString(),
  };
}

function generateSiteEnergyFeatures(siteId) {
  const date = new Date();
  const hour = date.getHours();

  return {
    siteId,
    features: {
      // Time features
      hour_of_day: hour,
      day_of_week: date.getDay(),
      month: date.getMonth() + 1,
      is_weekend: date.getDay() === 0 || date.getDay() === 6,

      // Historical production (last 7 days, same hour)
      historical_production_7d: [
        2500 + Math.random() * 500,
        2400 + Math.random() * 600,
        2600 + Math.random() * 400,
        2300 + Math.random() * 700,
        2550 + Math.random() * 450,
        2450 + Math.random() * 550,
        2500 + Math.random() * 500,
      ],

      // Weather forecast features
      forecast_irradiance: hour >= 6 && hour <= 18 ? 700 + Math.random() * 300 : 0,
      forecast_cloud_cover: Math.random() * 100,
      forecast_temperature: 20 + Math.random() * 15,
      forecast_wind_speed: Math.random() * 10,
      forecast_precipitation: Math.random() * 5,

      // Site characteristics
      installed_capacity_kw: 100 + Math.random() * 400,
      panel_count: 200 + Math.floor(Math.random() * 800),
      panel_age_years: 1 + Math.random() * 5,
      degradation_rate: 0.005 + Math.random() * 0.01, // 0.5-1.5% per year
    },
    timestamp: new Date().toISOString(),
  };
}

// Main test function
export default function (data) {
  if (!data.token) {
    console.error('No authentication token available');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  const siteId = `SITE-${String(__VU).padStart(4, '0')}`;
  const inverterAssetId = `INV-${siteId}-001`;
  const batteryAssetId = `BAT-${siteId}-001`;

  // Test 1: Anomaly Detection (most frequent, should be fastest)
  group('Anomaly Detection Inference', () => {
    const features = generateInverterFeatures(siteId, inverterAssetId);

    const start = Date.now();
    const res = http.post(
      `${BASE_URL}${API_VERSION}/ml/predict/anomaly`,
      JSON.stringify(features),
      { headers }
    );
    const duration = Date.now() - start;

    anomalyDetectionLatency.add(duration);
    mlInferenceLatency.add(duration);
    mlRequestCount.add(1);

    const checkRes = check(res, {
      'anomaly detection status is 200': (r) => r.status === 200,
      'has prediction': (r) => {
        const body = r.json();
        return body.prediction !== undefined || body.anomaly_score !== undefined;
      },
      'response time < 400ms': (r) => r.timings.duration < 400,
    });

    if (!checkRes) {
      mlErrorRate.add(1);
      if (res.status !== 200) {
        console.error(`Anomaly detection failed: Status ${res.status}, Body: ${res.body}`);
      }
    } else {
      mlErrorRate.add(0);
    }
  });

  sleep(1);

  // Test 2: Predictive Maintenance (less frequent, can be slower)
  if (__ITER % 3 === 0) { // Every 3rd iteration
    group('Predictive Maintenance Inference', () => {
      const features = Math.random() > 0.5
        ? generateInverterFeatures(siteId, inverterAssetId)
        : generateBatteryFeatures(siteId, batteryAssetId);

      const start = Date.now();
      const res = http.post(
        `${BASE_URL}${API_VERSION}/ml/predict/maintenance`,
        JSON.stringify(features),
        { headers }
      );
      const duration = Date.now() - start;

      predictiveMaintenanceLatency.add(duration);
      mlInferenceLatency.add(duration);
      mlRequestCount.add(1);

      const checkRes = check(res, {
        'predictive maintenance status is 200': (r) => r.status === 200,
        'has prediction': (r) => {
          const body = r.json();
          return body.failure_probability !== undefined || body.days_to_failure !== undefined;
        },
        'response time < 600ms': (r) => r.timings.duration < 600,
      });

      if (!checkRes) {
        mlErrorRate.add(1);
      } else {
        mlErrorRate.add(0);
      }
    });

    sleep(1);
  }

  // Test 3: Energy Production Prediction
  if (__ITER % 5 === 0) { // Every 5th iteration
    group('Energy Production Prediction', () => {
      const features = generateSiteEnergyFeatures(siteId);

      const start = Date.now();
      const res = http.post(
        `${BASE_URL}${API_VERSION}/ml/predict/energy-production`,
        JSON.stringify(features),
        { headers }
      );
      const duration = Date.now() - start;

      energyPredictionLatency.add(duration);
      mlInferenceLatency.add(duration);
      mlRequestCount.add(1);

      const checkRes = check(res, {
        'energy prediction status is 200': (r) => r.status === 200,
        'has prediction': (r) => {
          const body = r.json();
          return body.predicted_kwh !== undefined || Array.isArray(body.hourly_forecast);
        },
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      if (!checkRes) {
        mlErrorRate.add(1);
      } else {
        mlErrorRate.add(0);
      }
    });

    sleep(1);
  }

  // Test 4: Batch Predictions (more efficient for multiple assets)
  if (__ITER % 10 === 0) { // Every 10th iteration
    group('Batch Anomaly Detection', () => {
      const batchFeatures = [];
      for (let i = 1; i <= 5; i++) {
        batchFeatures.push(generateInverterFeatures(siteId, `INV-${siteId}-${String(i).padStart(3, '0')}`));
      }

      const start = Date.now();
      const res = http.post(
        `${BASE_URL}${API_VERSION}/ml/predict/anomaly/batch`,
        JSON.stringify({ assets: batchFeatures }),
        { headers }
      );
      const duration = Date.now() - start;

      mlInferenceLatency.add(duration);
      mlRequestCount.add(batchFeatures.length);

      const checkRes = check(res, {
        'batch prediction status is 200': (r) => r.status === 200,
        'has predictions array': (r) => {
          const body = r.json();
          return Array.isArray(body.predictions) && body.predictions.length === batchFeatures.length;
        },
        'batch response time reasonable': (r) => r.timings.duration < 1000, // 5 assets in < 1 second
      });

      if (!checkRes) {
        mlErrorRate.add(1);
      } else {
        mlErrorRate.add(0);
      }
    });

    sleep(2);
  }

  // Test 5: Feature Health Check
  if (__ITER % 20 === 0) { // Every 20th iteration
    group('ML Service Health Check', () => {
      const res = http.get(`${BASE_URL}${API_VERSION}/ml/health`, { headers });

      check(res, {
        'ML service healthy': (r) => r.status === 200,
        'has model info': (r) => {
          const body = r.json();
          return body.models !== undefined || body.status === 'healthy';
        },
      });
    });
  }

  sleep(0.5);
}

// Teardown
export function teardown(data) {
  console.log('ML inference load test completed');
  console.log('Target: p95 latency < 500ms for ML predictions');
}

/**
 * Expected Results:
 *
 * ML Inference Performance Targets:
 * ✅ Anomaly Detection: p95 < 400ms, p99 < 800ms
 * ✅ Predictive Maintenance: p95 < 600ms, p99 < 1200ms
 * ✅ Energy Prediction: p95 < 500ms, p99 < 1000ms
 * ✅ Overall ML Inference: p95 < 500ms
 * ✅ Error Rate: < 5% (ML models can occasionally fail on edge cases)
 *
 * Performance Optimization Tips:
 * 1. Model optimization:
 *    - Use quantized models (INT8 instead of FP32)
 *    - Model pruning to reduce size
 *    - Use TensorRT or ONNX Runtime for inference
 *
 * 2. Caching:
 *    - Cache feature engineering results
 *    - Cache model predictions for identical inputs (rare but possible)
 *
 * 3. Batching:
 *    - Batch multiple predictions together
 *    - Use async inference with queuing
 *
 * 4. Model serving:
 *    - Use dedicated ML serving infrastructure (TensorFlow Serving, KServe)
 *    - GPU acceleration for deep learning models
 *    - Multiple model replicas for horizontal scaling
 *
 * 5. Feature engineering:
 *    - Pre-compute features in background jobs
 *    - Use Feast Feature Store for fast feature retrieval
 */
