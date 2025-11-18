# Testing Strategy

## Overview

The dCMMS project follows a comprehensive testing strategy with multiple testing layers to ensure code quality, reliability, and maintainability.

## Testing Pyramid

```
           /\
          /  \
         / E2E \
        /--------\
       / Integration \
      /--------------\
     /   Unit Tests   \
    /------------------\
```

### Unit Tests (70% of tests)
- Test individual functions/classes in isolation
- Fast execution (milliseconds)
- No external dependencies
- High coverage requirement: >80%

### Integration Tests (20% of tests)
- Test component interactions
- Includes database, API, external services
- Medium execution time (seconds)
- Focus on critical paths

### E2E Tests (10% of tests)
- Test complete user workflows
- Browser automation (Playwright)
- Slow execution (minutes)
- Cover main user journeys

## Backend Testing

### Framework
- **Test Runner:** Jest
- **Assertion Library:** Jest expect
- **Coverage Tool:** Istanbul (via Jest)
- **HTTP Testing:** Fastify inject
- **Database:** PostgreSQL (test instance)

### Test Structure
```
backend/
├── tests/
│   ├── setup.ts                    # Global test setup
│   ├── global-setup.ts             # Pre-test initialization
│   ├── global-teardown.ts          # Post-test cleanup
│   ├── helpers/
│   │   ├── test-server.ts          # Test server utility
│   │   └── database.ts             # Database helpers
│   ├── factories/
│   │   ├── user.factory.ts         # User test data
│   │   ├── work-order.factory.ts   # Work order test data
│   │   └── asset.factory.ts        # Asset test data
│   ├── unit/
│   │   └── *.spec.ts               # Unit tests
│   └── integration/
│       └── *.spec.ts               # Integration tests
└── jest.config.js                  # Jest configuration
```

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific file
npm test path/to/file.spec.ts
```

### Coverage Requirements
- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 80%
- **Statements:** 80%

### Custom Matchers
- `toBeValidUUID()` - Validates UUID format
- `toBeISO8601DateString()` - Validates ISO date format
- `toHaveStatus(code)` - Validates HTTP status code

### Example Unit Test
```typescript
describe('WorkOrderService', () => {
  describe('calculateEstimatedCost', () => {
    it('should calculate total cost from parts and labor', () => {
      const parts = [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ];
      const laborHours = 5;
      const laborRate = 75;

      const result = WorkOrderService.calculateEstimatedCost(
        parts,
        laborHours,
        laborRate
      );

      expect(result).toBe(625); // (2*100 + 1*50) + (5*75)
    });
  });
});
```

### Example Integration Test
```typescript
describe('POST /api/v1/work-orders', () => {
  it('should create a work order and return 201', async () => {
    const tenant = await db.seedDefaultTenant();
    const user = await UserFactory.buildAdmin({ tenantId: tenant.id });
    const token = generateToken(user);

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/work-orders',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: 'Test Work Order',
        type: 'corrective',
        priority: 'high',
      },
    });

    expect(response).toHaveStatus(201);
    const body = JSON.parse(response.body);
    expect(body.workOrderId).toBeValidUUID();
  });
});
```

## Frontend Testing

### Framework
- **Test Runner:** Vitest
- **Component Testing:** React Testing Library
- **E2E Testing:** Playwright
- **Coverage Tool:** V8 (via Vitest)

### Test Structure
```
frontend/
├── tests/
│   ├── setup.ts                # Global test setup
│   ├── unit/
│   │   └── components/         # Component tests
│   └── e2e/
│       └── *.spec.ts           # Playwright E2E tests
├── vitest.config.ts            # Vitest configuration
└── playwright.config.ts        # Playwright configuration
```

### Running Tests
```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Specific browser
npm run test:e2e -- --project=chromium
```

### Component Testing Best Practices
1. **User-centric queries:** Use `getByRole`, `getByLabelText`
2. **Avoid implementation details:** Don't test internal state
3. **Test accessibility:** Use semantic HTML and ARIA
4. **Mock external dependencies:** API calls, navigation

### Example Component Test
```typescript
describe('WorkOrderCard', () => {
  it('should display work order details', () => {
    const workOrder = {
      id: '123',
      title: 'Fix inverter',
      status: 'open',
      priority: 'high',
    };

    render(<WorkOrderCard workOrder={workOrder} />);

    expect(screen.getByText('Fix inverter')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
  });

  it('should call onStatusChange when status button clicked', () => {
    const handleStatusChange = vi.fn();
    render(
      <WorkOrderCard
        workOrder={mockWorkOrder}
        onStatusChange={handleStatusChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));

    expect(handleStatusChange).toHaveBeenCalledWith('completed');
  });
});
```

### Example E2E Test
```typescript
test('should complete work order workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'technician@dcmms.local');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to work orders
  await page.click('text=Work Orders');
  await expect(page).toHaveURL(/.*work-orders/);

  // Create new work order
  await page.click('text=New Work Order');
  await page.fill('[name="title"]', 'Test Work Order');
  await page.selectOption('[name="type"]', 'corrective');
  await page.selectOption('[name="priority"]', 'high');
  await page.click('button[type="submit"]');

  // Verify created
  await expect(page.locator('text=Work order created')).toBeVisible();
  await expect(page.locator('text=Test Work Order')).toBeVisible();
});
```

## Mobile Testing

### Framework
- **Test Runner:** Flutter Test
- **Widget Testing:** flutter_test package
- **Integration Testing:** integration_test package
- **Mocking:** mockito

### Test Structure
```
mobile/
├── test/
│   ├── widget_test.dart            # Widget tests
│   ├── unit/
│   │   └── *.dart                  # Unit tests
│   └── helpers/
│       └── test_helpers.dart       # Test utilities
├── integration_test/
│   └── app_test.dart               # Integration tests
└── test_driver/
    └── integration_test.dart       # Test driver
```

### Running Tests
```bash
# Unit and widget tests
flutter test

# With coverage
flutter test --coverage

# Integration tests
flutter drive \
  --driver=test_driver/integration_test.dart \
  --target=integration_test/app_test.dart

# Specific test file
flutter test test/widgets/work_order_card_test.dart
```

### Example Widget Test
```dart
testWidgets('WorkOrderCard displays title and status', (tester) async {
  final workOrder = WorkOrder(
    id: '123',
    title: 'Fix inverter',
    status: WorkOrderStatus.open,
    priority: WorkOrderPriority.high,
  );

  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: WorkOrderCard(workOrder: workOrder),
      ),
    ),
  );

  expect(find.text('Fix inverter'), findsOneWidget);
  expect(find.text('Open'), findsOneWidget);
  expect(find.byIcon(Icons.priority_high), findsOneWidget);
});
```

### Example Integration Test
```dart
testWidgets('Should create work order offline and sync', (tester) async {
  app.main();
  await tester.pumpAndSettle();

  // Navigate to work orders
  await tester.tap(find.byIcon(Icons.work));
  await tester.pumpAndSettle();

  // Create new work order
  await tester.tap(find.byIcon(Icons.add));
  await tester.pumpAndSettle();

  await tester.enterText(find.byKey(Key('title_field')), 'Test WO');
  await tester.tap(find.text('Corrective'));
  await tester.tap(find.text('Save'));
  await tester.pumpAndSettle();

  // Verify saved locally
  expect(find.text('Saved locally'), findsOneWidget);

  // Go online and sync
  await mockOnline();
  await tester.tap(find.byIcon(Icons.sync));
  await tester.pumpAndSettle();

  // Verify synced
  expect(find.text('Synced'), findsOneWidget);
});
```

## Test Data Management

### Factories
Use factory pattern for generating test data:

```typescript
// Backend
const user = await UserFactory.build({
  email: 'test@example.com',
  role: 'technician',
});

// Create multiple
const users = await UserFactory.buildList(10);
```

### Fixtures
Static test data for complex scenarios:

```typescript
// tests/fixtures/work-orders.ts
export const workOrderFixtures = {
  openCorrectiveWO: {
    id: 'wo-001',
    title: 'Fix inverter malfunction',
    type: 'corrective',
    status: 'open',
    priority: 'high',
  },
  completedPreventiveWO: {
    // ...
  },
};
```

## Continuous Integration

### GitHub Actions
All tests run automatically on:
- Pull requests
- Pushes to main/develop branches
- Nightly builds

### Required Checks
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Coverage > 80%
- ✅ No security vulnerabilities
- ✅ Linting passes

## Best Practices

### General
1. **AAA Pattern:** Arrange, Act, Assert
2. **One assertion per test:** Focus tests on single behavior
3. **Descriptive names:** `should <expected behavior> when <condition>`
4. **Independent tests:** No test should depend on another
5. **Fast tests:** Keep tests quick (<10s per test)

### Backend
1. **Clean database:** Reset state between tests
2. **Use factories:** Generate test data dynamically
3. **Mock external services:** Don't hit real APIs
4. **Test edge cases:** Null, empty, invalid inputs
5. **Test errors:** Verify error handling

### Frontend
1. **Test user interactions:** Not implementation details
2. **Use accessibility queries:** `getByRole`, `getByLabelText`
3. **Avoid snapshots:** They break easily
4. **Test loading states:** Async operations
5. **Mock API calls:** Use MSW (Mock Service Worker)

### Mobile
1. **Test offline scenarios:** Critical for mobile
2. **Test sync conflicts:** Version resolution
3. **Test gestures:** Swipe, drag, long-press
4. **Test navigation:** Screen transitions
5. **Test permissions:** Camera, location, etc.

## Performance Testing

### Load Testing (Backend)
```bash
# Artillery load test
npm run test:load

# 5,000 concurrent users for 5 minutes
artillery run tests/load/api-load-test.yml
```

### Performance Budget (Frontend)
- Lighthouse score: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Bundle size: < 200KB (initial)

## Security Testing

### Static Analysis
- **CodeQL:** Security vulnerabilities
- **Snyk:** Dependency vulnerabilities
- **npm audit:** Known security issues

### Dynamic Testing
- **OWASP ZAP:** API security scanning
- **Penetration testing:** Manual security audit

## Monitoring

### Test Metrics
- **Pass rate:** > 99%
- **Coverage:** > 80%
- **Execution time:** < 5 minutes (unit + integration)
- **Flakiness:** < 1% (retry failures)

### Reporting
- **Codecov:** Coverage reports with trends
- **GitHub Actions:** Test result annotations
- **Slack notifications:** Failed test alerts

## Future Enhancements

- [ ] Visual regression testing (Chromatic/Percy)
- [ ] Mutation testing (Stryker)
- [ ] Contract testing (Pact)
- [ ] Chaos engineering
- [ ] Performance regression tests
