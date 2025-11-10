# dCMMS Testing Strategy & Framework

**Version:** 1.0
**Date:** November 8, 2025
**Status:** Draft - For Review
**Priority:** P0 (Critical for MVP)

---

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [Contract Testing](#4-contract-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Performance Testing](#6-performance-testing)
7. [Security Testing](#7-security-testing)
8. [Mobile Testing](#8-mobile-testing)
9. [User Acceptance Testing](#9-user-acceptance-testing)
10. [Test Data Management](#10-test-data-management)
11. [CI/CD Integration](#11-cicd-integration)

---

## 1. Testing Pyramid

### 1.1 Test Distribution

```
           /\
          /  \  E2E Tests (5%)
         /    \  - Critical user journeys
        /------\  - Smoke tests
       /        \
      /  API/UI  \ Integration Tests (25%)
     /Integration \ - API contracts
    /--------------\ - Database interactions
   /                \ - External service mocks
  /   Unit Tests     \
 /      (70%)         \ - Business logic
/______________________\ - Pure functions
                         - Component tests
```

**Target Coverage:**
- Unit Tests: 80% code coverage
- Integration Tests: All API endpoints
- E2E Tests: Top 20 user flows
- Performance Tests: Critical paths
- Security Tests: OWASP Top 10

---

## 2. Unit Testing

### 2.1 Scope

**What to Test:**
- Business logic functions
- Data transformations
- Validators
- Utility functions
- React components (isolated)
- State management (reducers, actions)

**What NOT to Test:**
- Third-party library code
- Framework boilerplate
- Trivial getters/setters

### 2.2 Tools & Frameworks

**Backend (Node.js/TypeScript):**
- **Jest** - Test runner, assertions, mocking
- **Supertest** - HTTP assertions
- **ts-jest** - TypeScript support

**Frontend (React):**
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **Mock Service Worker (MSW)** - API mocking

**Python (if used for ML/data):**
- **pytest** - Test framework
- **pytest-cov** - Coverage reporting

### 2.3 Unit Test Example

**Backend Service:**
```typescript
// src/services/workOrderService.ts
export function canTransitionStatus(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus
): boolean {
  const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    'draft': ['submitted', 'cancelled'],
    'submitted': ['approved', 'draft', 'cancelled'],
    'approved': ['scheduled', 'cancelled'],
    // ... (from state machine spec)
  };
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// src/services/workOrderService.test.ts
import { canTransitionStatus } from './workOrderService';

describe('WorkOrderService', () => {
  describe('canTransitionStatus', () => {
    it('allows valid transition from draft to submitted', () => {
      expect(canTransitionStatus('draft', 'submitted')).toBe(true);
    });

    it('denies invalid transition from draft to completed', () => {
      expect(canTransitionStatus('draft', 'completed')).toBe(false);
    });

    it('allows cancellation from any non-terminal state', () => {
      expect(canTransitionStatus('scheduled', 'cancelled')).toBe(true);
      expect(canTransitionStatus('in-progress', 'cancelled')).toBe(true);
    });

    it('denies transition from terminal state', () => {
      expect(canTransitionStatus('closed', 'in-progress')).toBe(false);
    });
  });
});
```

**Frontend Component:**
```tsx
// src/components/WorkOrderCard.test.tsx
import { render, screen } from '@testing-library/react';
import { WorkOrderCard } from './WorkOrderCard';

describe('WorkOrderCard', () => {
  const mockWorkOrder = {
    workOrderId: 'WO-001',
    title: 'Replace contactor',
    status: 'scheduled',
    priority: 'high',
  };

  it('displays work order title', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);
    expect(screen.getByText('Replace contactor')).toBeInTheDocument();
  });

  it('shows high priority badge for high priority WOs', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('shows scheduled status indicator', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);
    expect(screen.getByTestId('status-badge')).toHaveClass('status-scheduled');
  });
});
```

### 2.4 Unit Test Standards

**Naming Convention:**
- Test file: `{filename}.test.ts` or `{filename}.spec.ts`
- Test suite: `describe('<ComponentName> | <FunctionName>')`
- Test case: `it('should <expected behavior> when <condition>')`

**Structure (AAA Pattern):**
```typescript
it('should return error when work order not found', () => {
  // Arrange
  const workOrderId = 'WO-NONEXISTENT';
  const mockRepo = { findById: jest.fn().mockResolvedValue(null) };

  // Act
  const result = await workOrderService.getWorkOrder(workOrderId, mockRepo);

  // Assert
  expect(result.error).toBe('RESOURCE_NOT_FOUND');
  expect(mockRepo.findById).toHaveBeenCalledWith(workOrderId);
});
```

---

## 3. Integration Testing

### 3.1 Scope

**API Integration Tests:**
- Full request/response cycle through API layer
- Database interactions (using test database)
- Authentication/authorization
- Error handling
- State transitions

**Database Integration Tests:**
- CRUD operations
- Complex queries
- Transactions
- Foreign key constraints
- Triggers

### 3.2 Tools

- **Jest + Supertest** (API testing)
- **Testcontainers** (Dockerized test dependencies)
- **Database fixtures** (seed data)

### 3.3 API Integration Test Example

```typescript
// tests/integration/workOrders.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

describe('Work Orders API', () => {
  let authToken: string;
  let testSiteId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test@example.com', password: 'test123' });
    authToken = authResponse.body.accessToken;
    testSiteId = 'SITE-TEST-001';
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/v1/work-orders', () => {
    it('creates a new work order with valid data', async () => {
      const newWO = {
        type: 'corrective',
        title: 'Test WO',
        siteId: testSiteId,
        priority: 'high',
        status: 'draft',
      };

      const response = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newWO)
        .expect(201);

      expect(response.body.data.workOrderId).toMatch(/^WO-/);
      expect(response.body.data.title).toBe('Test WO');
      expect(response.body.data.status).toBe('draft');
    });

    it('returns 400 for invalid priority', async () => {
      const invalidWO = {
        type: 'corrective',
        title: 'Test WO',
        siteId: testSiteId,
        priority: 'INVALID',  // Invalid value
        status: 'draft',
      };

      const response = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWO)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without auth token', async () => {
      await request(app)
        .post('/api/v1/work-orders')
        .send({})
        .expect(401);
    });
  });

  describe('PATCH /api/v1/work-orders/:id', () => {
    it('updates work order status with valid transition', async () => {
      // Create a WO first
      const createResponse = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'corrective', title: 'Test', siteId: testSiteId, priority: 'low', status: 'draft' });

      const workOrderId = createResponse.body.data.workOrderId;

      // Update status
      const updateResponse = await request(app)
        .patch(`/api/v1/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'submitted' })
        .expect(200);

      expect(updateResponse.body.data.status).toBe('submitted');
    });

    it('returns 422 for invalid status transition', async () => {
      // Create WO in 'draft' status
      const createResponse = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'corrective', title: 'Test', siteId: testSiteId, priority: 'low', status: 'draft' });

      const workOrderId = createResponse.body.data.workOrderId;

      // Try invalid transition: draft -> completed (not allowed)
      const updateResponse = await request(app)
        .patch(`/api/v1/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(422);

      expect(updateResponse.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
```

---

## 4. Contract Testing

### 4.1 Purpose

Ensure API providers and consumers agree on API contracts (request/response formats).

### 4.2 Tool: Pact

**Provider (Backend API):**
```typescript
// tests/pact/provider.test.ts
import { Verifier } from '@pact-foundation/pact';
import { app } from '../../src/app';

describe('Pact Provider Verification', () => {
  it('validates against consumer pacts', async () => {
    const verifier = new Verifier({
      provider: 'dCMMS-API',
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['./pacts/mobile-app-dcmms-api.json'],
      stateHandlers: {
        'work order WO-001 exists': async () => {
          // Set up test data for this state
          await seedWorkOrder({ workOrderId: 'WO-001', status: 'scheduled' });
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

**Consumer (Mobile App):**
```typescript
// mobile-app/tests/pact/workOrders.test.ts
import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'MobileApp',
  provider: 'dCMMS-API',
});

describe('Work Orders API Contract', () => {
  it('retrieves work order by ID', async () => {
    await provider
      .given('work order WO-001 exists')
      .uponReceiving('a request to get work order WO-001')
      .withRequest({
        method: 'GET',
        path: '/api/v1/work-orders/WO-001',
        headers: { Authorization: 'Bearer token' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: {
            workOrderId: 'WO-001',
            status: like('scheduled'),
            priority: like('high'),
          },
        },
      });

    await provider.executeTest(async (mockServer) => {
      const client = new WorkOrderClient(mockServer.url);
      const wo = await client.getWorkOrder('WO-001');
      expect(wo.workOrderId).toBe('WO-001');
    });
  });
});
```

---

## 5. End-to-End Testing

### 5.1 Scope

**Critical User Journeys:**
1. Technician executes work order (login → view assigned WOs → execute → complete)
2. Supervisor creates and assigns work order
3. Manager views dashboards and reports
4. Technician works offline and syncs

### 5.2 Tools

- **Playwright** or **Cypress** (web E2E)
- **Detox** or **Appium** (mobile E2E)

### 5.3 E2E Test Example (Playwright)

```typescript
// tests/e2e/workOrderExecution.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Work Order Execution Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as technician
    await page.goto('https://app.dcmms.io/login');
    await page.fill('input[name="email"]', 'tech@example.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('technician completes assigned work order', async ({ page }) => {
    // Navigate to work orders
    await page.click('text=My Work Orders');

    // Find and click on a scheduled work order
    await page.click('text=WO-TEST-001');

    // Start work
    await page.click('button:has-text("Start Work")');
    await expect(page.locator('.status-badge')).toHaveText('In Progress');

    // Complete tasks
    await page.check('input[type="checkbox"][data-task-id="task-1"]');
    await page.check('input[type="checkbox"][data-task-id="task-2"]');

    // Upload photo
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-photo.jpg');
    await expect(page.locator('.attachment-thumbnail')).toBeVisible();

    // Add completion notes
    await page.fill('textarea[name="completionNotes"]', 'Replaced contactor successfully');

    // Complete work order
    await page.click('button:has-text("Complete Work Order")');

    // Verify status changed
    await expect(page.locator('.status-badge')).toHaveText('Completed');

    // Verify appears in completed list
    await page.click('text=Completed Work Orders');
    await expect(page.locator('text=WO-TEST-001')).toBeVisible();
  });

  test('technician cannot complete WO without finishing all tasks', async ({ page }) => {
    await page.click('text=My Work Orders');
    await page.click('text=WO-TEST-002');
    await page.click('button:has-text("Start Work")');

    // Try to complete without finishing tasks
    await page.click('button:has-text("Complete Work Order")');

    // Should show error
    await expect(page.locator('.error-message')).toContainText('All tasks must be completed');

    // Status should still be in-progress
    await expect(page.locator('.status-badge')).toHaveText('In Progress');
  });
});
```

---

## 6. Performance Testing

### 6.1 Scope

**Load Tests:**
- API throughput (requests/second)
- Database query performance
- Dashboard load time
- Mobile sync performance

**Stress Tests:**
- System behavior under peak load
- Graceful degradation
- Recovery after load spike

### 6.2 Tools

- **k6** (load testing)
- **Artillery** (load testing alternative)
- **Lighthouse** (frontend performance)

### 6.3 Load Test Example (k6)

```javascript
// tests/performance/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 min
    { duration: '1m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 min
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% of requests under 300ms
    http_req_failed: ['rate<0.01'],    // Less than 1% errors
  },
};

export default function () {
  const authToken = 'test-token';  // Use long-lived test token

  // GET work orders list
  const listResponse = http.get('https://api.dcmms.io/api/v1/work-orders', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  check(listResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);

  // GET single work order
  const detailResponse = http.get('https://api.dcmms.io/api/v1/work-orders/WO-TEST-001', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  check(detailResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(2);
}
```

**Run Load Test:**
```bash
k6 run tests/performance/api-load.js

# Output:
# ✓ status is 200
# ✓ response time < 300ms
#
# http_req_duration..........: avg=145ms min=89ms med=132ms max=289ms p(95)=245ms
# http_req_failed............: 0.12% (12 of 10000)
# iterations..................: 10000
```

---

## 7. Security Testing

### 7.1 Scope

- Authentication bypass attempts
- Authorization boundary testing (access control)
- SQL injection
- XSS (cross-site scripting)
- CSRF (cross-site request forgery)
- Sensitive data exposure
- API rate limiting

### 7.2 Tools

- **OWASP ZAP** (automated security scanner)
- **Burp Suite** (manual penetration testing)
- **npm audit** / **Snyk** (dependency vulnerability scanning)

### 7.3 Security Test Examples

**Authentication Test:**
```typescript
describe('Authentication Security', () => {
  it('denies access without auth token', async () => {
    const response = await request(app)
      .get('/api/v1/work-orders')
      .expect(401);
    expect(response.body.error.code).toBe('AUTH_MISSING_TOKEN');
  });

  it('denies access with invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/work-orders')
      .set('Authorization', 'Bearer INVALID_TOKEN')
      .expect(401);
    expect(response.body.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('denies access with expired token', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/v1/work-orders')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    expect(response.body.error.code).toBe('AUTH_EXPIRED_TOKEN');
  });
});
```

**Authorization Test:**
```typescript
describe('Authorization Security', () => {
  it('field technician cannot delete work orders', async () => {
    const techToken = await getTokenForRole('field-technician');
    const response = await request(app)
      .delete('/api/v1/work-orders/WO-001')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(403);
    expect(response.body.error.code).toBe('AUTHZ_INSUFFICIENT_PERMISSIONS');
  });

  it('technician cannot access work orders from other sites', async () => {
    const techToken = await getTokenForRole('field-technician', { siteIds: ['SITE-A'] });
    const response = await request(app)
      .get('/api/v1/work-orders?filter[siteId]=SITE-B')  // Different site
      .set('Authorization', `Bearer ${techToken}`)
      .expect(403);
  });
});
```

**SQL Injection Test:**
```typescript
it('prevents SQL injection in search parameter', async () => {
  const maliciousInput = "'; DROP TABLE work_orders; --";
  const response = await request(app)
    .get(`/api/v1/work-orders?filter[title][contains]=${encodeURIComponent(maliciousInput)}`)
    .set('Authorization', `Bearer ${validToken}`)
    .expect(200);  // Should handle safely

  // Verify table still exists
  const checkResponse = await request(app)
    .get('/api/v1/work-orders')
    .set('Authorization', `Bearer ${validToken}`)
    .expect(200);
});
```

---

## 8. Mobile Testing

### 8.1 Scope

- UI rendering on different screen sizes
- Offline functionality
- Sync behavior
- Camera/GPS integration
- Background tasks
- Battery usage
- Network conditions (2G, 3G, 4G, offline, flaky)

### 8.2 Tools

- **Detox** (React Native E2E testing)
- **Appium** (Cross-platform mobile testing)
- **Android Emulator** / **iOS Simulator**
- **Firebase Test Lab** / **BrowserStack** (real device testing)

### 8.3 Mobile Test Example (Detox)

```typescript
// mobile-app/e2e/workOrderExecution.e2e.ts
describe('Work Order Execution (Mobile)', () => {
  beforeAll(async () => {
    await device.launchApp();
    await login('tech@example.com', 'test123');
  });

  it('should execute work order offline', async () => {
    // Go to work order list
    await element(by.id('tab-work-orders')).tap();

    // Tap on assigned work order
    await element(by.text('WO-TEST-001')).tap();

    // Enable airplane mode (simulate offline)
    await device.setOfflineMode(true);

    // Start work
    await element(by.id('btn-start-work')).tap();

    // Complete task 1
    await element(by.id('task-1-checkbox')).tap();

    // Add photo
    await element(by.id('btn-add-photo')).tap();
    // (Camera interaction would be mocked)

    // Complete work
    await element(by.id('btn-complete-work')).tap();

    // Verify queued for sync
    await expect(element(by.id('sync-status'))).toHaveText('Queued (Offline)');

    // Go back online
    await device.setOfflineMode(false);

    // Wait for sync
    await waitFor(element(by.id('sync-status'))).toHaveText('Synced').withTimeout(10000);

    // Verify work order marked as completed on server
    // (Would query API to verify)
  });

  it('should handle sync conflict gracefully', async () => {
    // Setup: Same WO updated by supervisor while tech is offline

    await element(by.id('tab-work-orders')).tap();
    await element(by.text('WO-CONFLICT-001')).tap();

    // Go offline
    await device.setOfflineMode(true);

    // Update completion notes
    await element(by.id('input-completion-notes')).typeText('Offline notes');

    // Go online (server has different notes)
    await device.setOfflineMode(false);

    // Sync should detect conflict
    await waitFor(element(by.id('conflict-dialog'))).toBeVisible();

    // Resolve conflict (choose to keep local changes)
    await element(by.id('btn-keep-mine')).tap();

    // Verify sync completed
    await expect(element(by.id('sync-status'))).toHaveText('Synced');
  });
});
```

---

## 9. User Acceptance Testing (UAT)

### 9.1 UAT Process

**Timeline:** Week before production release

**Participants:**
- Product Owner
- Site Managers (2-3 from pilot sites)
- Maintenance Supervisors (2-3)
- Field Technicians (3-5)

**Environment:** Staging (with production-like data)

### 9.2 UAT Test Scenarios

**Scenario 1: Supervisor Creates & Assigns Work Order**
```
Given: I am logged in as a Maintenance Supervisor
When: I navigate to "Create Work Order"
  And I fill in:
    - Type: Corrective
    - Title: Test - Replace inverter fuse
    - Asset: Inverter 3A
    - Priority: High
  And I click "Create"
  And I assign it to Technician John Smith
  And I schedule it for tomorrow at 8am
Then: The work order should be created
  And John Smith should receive a notification
  And The work order should appear in John's mobile app
```

**Scenario 2: Technician Executes Work Order (Mobile)**
```
Given: I am logged in on mobile app as Technician
  And I have an assigned work order "Replace inverter fuse"
When: I tap on the work order
  And I tap "Start Work"
  And I complete the safety checklist
  And I take a photo of the old fuse
  And I mark Task 1 "Isolate inverter" as complete
  And I mark Task 2 "Replace fuse" as complete
  And I take a photo of the new fuse
  And I record parts used: "Fuse 1000A" quantity 1
  And I add completion notes: "Fuse replaced successfully"
  And I tap "Complete Work"
Then: The work order status should change to "Completed"
  And The photos should be uploaded
  And The supervisor should see the completed work order
```

### 9.3 UAT Sign-Off Criteria

- All critical scenarios passed (100%)
- No P0 or P1 bugs found
- Performance acceptable (subjective, based on user feedback)
- Usability acceptable (no major pain points)
- All UAT participants sign-off

---

## 10. Test Data Management

### 10.1 Test Data Strategy

**Approaches:**
1. **Synthetic Data Generation** - Generate fake but realistic data
2. **Production Data Anonymization** - Copy production data with PII scrubbed
3. **Fixtures** - Hardcoded test data for specific scenarios

### 10.2 Synthetic Data Generation

**Tool:** Faker.js

```typescript
// tests/helpers/generators.ts
import { faker } from '@faker-js/faker';

export function generateAsset() {
  return {
    assetId: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
    siteId: 'SITE-TEST-001',
    type: 'inverter',
    category: 'inverter',
    manufacturer: faker.helpers.arrayElement(['SMA', 'SolarEdge', 'Huawei']),
    model: `Model-${faker.number.int({ min: 1000, max: 9999 })}`,
    serialNumber: faker.string.alphanumeric(12).toUpperCase(),
    status: faker.helpers.arrayElement(['operational', 'degraded', 'failed']),
    location: {
      lat: faker.location.latitude({ min: 32, max: 42 }),  // US range
      lon: faker.location.longitude({ min: -120, max: -70 }),
    },
  };
}

export function generateWorkOrder(overrides = {}) {
  return {
    workOrderId: `WO-${faker.date.recent().toISOString().slice(0, 10).replace(/-/g, '')}-${faker.string.numeric(4)}`,
    type: faker.helpers.arrayElement(['preventive', 'corrective', 'inspection']),
    title: faker.helpers.arrayElement([
      'Replace inverter contactor',
      'Clean solar panels',
      'Inspect transformer oil levels',
    ]),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
    status: faker.helpers.arrayElement(['draft', 'scheduled', 'in-progress', 'completed']),
    siteId: 'SITE-TEST-001',
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}
```

**Usage:**
```typescript
beforeEach(async () => {
  // Seed test database with 100 assets
  const assets = Array.from({ length: 100 }, () => generateAsset());
  await db.assets.insertMany(assets);

  // Seed with 50 work orders
  const workOrders = Array.from({ length: 50 }, () => generateWorkOrder());
  await db.workOrders.insertMany(workOrders);
});
```

### 10.3 Test Database Isolation

**Strategy:** Each test suite gets a fresh database

```typescript
// tests/helpers/database.ts
import { Client } from 'pg';

export async function setupTestDatabase() {
  const testDbName = `test_db_${Date.now()}`;
  const adminClient = new Client({ database: 'postgres' });
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE ${testDbName}`);
  await adminClient.end();

  // Run migrations on test database
  process.env.DATABASE_URL = `postgresql://localhost/${testDbName}`;
  await runMigrations();

  return testDbName;
}

export async function teardownTestDatabase(testDbName: string) {
  const adminClient = new Client({ database: 'postgres' });
  await adminClient.connect();
  await adminClient.query(`DROP DATABASE ${testDbName}`);
  await adminClient.end();
}
```

---

## 11. CI/CD Integration

### 11.1 CI Pipeline (GitHub Actions Example)

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3  # Upload coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
        env:
          BASE_URL: https://staging.dcmms.io

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 11.2 Quality Gates

**Conditions to Merge PR:**
- ✅ All tests pass (unit, integration, E2E)
- ✅ Code coverage ≥ 80%
- ✅ No critical security vulnerabilities
- ✅ Linting passes
- ✅ At least 1 approval from code owner

**Conditions to Deploy to Production:**
- ✅ All quality gates above
- ✅ UAT sign-off
- ✅ Performance tests pass (p95 latency within SLA)
- ✅ Manual approval from Product Owner + Tech Lead

---

## Test Metrics & Reporting

### Key Metrics

- **Code Coverage:** Target 80%+
- **Test Execution Time:** Unit <5min, Integration <10min, E2E <20min
- **Defect Density:** <0.5 bugs per 1000 lines of code
- **Mean Time to Detect (MTTD):** Time from bug introduction to detection
- **Mean Time to Repair (MTTR):** Time from bug detection to fix deployed

### Reporting Tools

- **Allure** - Test reporting dashboard
- **Codecov** - Coverage tracking
- **SonarQube** - Code quality & coverage

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-08 | System | Initial testing strategy and framework |

