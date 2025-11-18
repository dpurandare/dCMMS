# Notification System Testing Guide (DCMMS-070)

Comprehensive testing guide for the dCMMS notification system.

## Test Coverage Requirements

- **Unit Tests:** ≥80%
- **Integration Tests:** ≥75%
- **E2E Tests:** Critical paths
- **Manual Tests:** All channels

## 1. Unit Tests

### Notification Service Tests

```typescript
// backend/src/services/__tests__/notification.service.test.ts

describe('NotificationService', () => {
  describe('sendNotification', () => {
    it('should validate required parameters', async () => {
      await expect(
        notificationService.sendNotification({
          tenantId: '',
          templateCode: 'test',
          userId: '123',
          channels: ['email'],
          variables: {},
        })
      ).rejects.toThrow('Missing required notification parameters');
    });

    it('should validate template variables', async () => {
      // Template requires: asset_name, value, unit
      await expect(
        notificationService.sendNotification({
          tenantId: 'tenant-1',
          templateCode: 'alarm_critical',
          userId: '123',
          channels: ['email'],
          variables: { asset_name: 'Pump #1' }, // Missing value and unit
        })
      ).rejects.toThrow('Missing required template variables');
    });

    it('should render templates correctly', async () => {
      const result = await notificationService.sendNotification({
        tenantId: 'tenant-1',
        templateCode: 'alarm_critical',
        userId: '123',
        channels: ['email'],
        variables: {
          asset_name: 'Pump #1',
          value: 85,
          unit: '°C',
          threshold: 80,
          site_name: 'Site A',
          timestamp: '2025-01-15T10:30:00Z',
          alarm_id: 'alarm-123',
          app_url: 'http://localhost:3000',
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeTruthy();
    });

    it('should respect rate limits', async () => {
      // Send 11 notifications (rate limit is 10/min)
      const promises = [];
      for (let i = 0; i < 11; i++) {
        promises.push(
          notificationService.sendNotification({
            tenantId: 'tenant-1',
            templateCode: 'test',
            userId: '123',
            channels: ['email'],
            variables: {},
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const failures = results.filter((r) => r.status === 'rejected');
      expect(failures.length).toBeGreaterThan(0);
    });
  });

  describe('ruleMatches', () => {
    it('should match alarm severity correctly', () => {
      const rule = {
        trigger_conditions: {
          event_type: 'alarm',
          severity: ['CRITICAL', 'WARNING'],
        },
      };

      expect(ruleMatches(rule, 'alarm', { severity: 'CRITICAL' })).toBe(true);
      expect(ruleMatches(rule, 'alarm', { severity: 'INFO' })).toBe(false);
    });
  });
});
```

### Email Service Tests

```typescript
// backend/src/services/__tests__/email.service.test.ts

describe('EmailService', () => {
  it('should validate email addresses', async () => {
    await expect(
      emailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        text: 'Test',
      })
    ).rejects.toThrow('Invalid email address');
  });

  it('should send email via SendGrid', async () => {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test Notification',
      text: 'This is a test',
      html: '<p>This is a test</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeTruthy();
  });

  it('should handle provider errors gracefully', async () => {
    // Mock provider failure
    jest.spyOn(sendgrid, 'send').mockRejectedValue(new Error('API error'));

    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

## 2. Integration Tests

### Alarm → Notification Flow

```python
# telemetry/tests/integration/test_alarm_notifications.py

import pytest
import json
import time
from kafka import KafkaProducer
import psycopg2

def test_critical_alarm_triggers_notification():
    """Test that critical alarm triggers email + SMS + push notification"""

    # 1. Publish critical alarm to Kafka
    producer = KafkaProducer(
        bootstrap_servers='localhost:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    alarm = {
        'alarm_id': 'test-alarm-001',
        'tenant_id': 'tenant-1',
        'severity': 'CRITICAL',
        'alarm_type': 'THRESHOLD_MAX',
        'site_id': 'site-001',
        'asset_id': 'asset-001',
        'sensor_type': 'TEMPERATURE',
        'sensor_id': 'temp-001',
        'trigger_value': 95.5,
        'threshold_max': 80.0,
        'unit': '°C',
        'timestamp': int(time.time() * 1000),
        'message': 'Critical temperature alarm',
    }

    producer.send('alarms', value=alarm)
    producer.flush()

    # 2. Wait for alarm-notification-worker to process
    time.sleep(5)

    # 3. Check notification queue
    conn = psycopg2.connect(...)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT channel, status
        FROM notification_queue
        WHERE metadata->>'alarm_id' = %s
    """, (alarm['alarm_id'],))

    notifications = cursor.fetchall()

    # Should have 3 notifications: email, sms, push
    assert len(notifications) == 3
    channels = [n[0] for n in notifications]
    assert 'email' in channels
    assert 'sms' in channels
    assert 'push' in channels

def test_notification_respects_preferences():
    """Test that notifications respect user preferences"""

    # 1. Disable SMS for user
    conn = psycopg2.connect(...)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE notification_preferences
        SET enabled = false
        WHERE user_id = %s AND channel = 'sms' AND event_type = 'alarm_warning'
    """, ('user-123',))
    conn.commit()

    # 2. Trigger warning alarm
    # ... (similar to above)

    # 3. Verify no SMS notification sent
    cursor.execute("""
        SELECT channel
        FROM notification_queue
        WHERE user_id = %s AND metadata->>'alarm_id' = %s
    """, ('user-123', alarm_id))

    notifications = cursor.fetchall()
    channels = [n[0] for n in notifications]

    assert 'sms' not in channels
    assert 'email' in channels or 'push' in channels
```

### Rate Limiting Tests

```python
def test_rate_limiting():
    """Test that rate limiting prevents spam"""

    # Send 15 notifications rapidly (rate limit is 10/min)
    for i in range(15):
        result = send_notification(
            tenant_id='tenant-1',
            user_id='user-123',
            template_code='test',
            channels=['email'],
            variables={}
        )

    # Check that only 10 were queued
    conn = psycopg2.connect(...)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM notification_queue
        WHERE user_id = 'user-123'
          AND created_at > NOW() - INTERVAL '1 minute'
    """)

    count = cursor.fetchone()[0]
    assert count <= 10
```

## 3. E2E Tests

### Full Notification Flow

```typescript
// e2e/notifications.spec.ts

describe('Notification System E2E', () => {
  it('should send notification when work order is assigned', async () => {
    // 1. Create work order and assign to user
    const wo = await createWorkOrder({
      assetId: 'asset-123',
      assignedTo: 'user-456',
      priority: 'high',
    });

    // 2. Wait for notification worker to process
    await page.waitForTimeout(3000);

    // 3. Check email inbox (using Mailtrap or similar)
    const emails = await getTestEmails();
    const woEmail = emails.find((e) => e.subject.includes(wo.id));

    expect(woEmail).toBeTruthy();
    expect(woEmail.to).toContain('user-456@example.com');
    expect(woEmail.body).toContain('Work Order Assigned');
  });

  it('should escalate unacknowledged critical alarms', async () => {
    // 1. Create critical alarm
    const alarm = await createCriticalAlarm({
      assetId: 'asset-123',
      severity: 'CRITICAL',
    });

    // 2. Wait for escalation delay (30 minutes in production, 1 minute in test)
    await page.waitForTimeout(65000); // 65 seconds

    // 3. Check that supervisor was notified
    const supervisorNotifications = await getNotifications({
      userId: supervisor.id,
      alarmId: alarm.id,
    });

    expect(supervisorNotifications.length).toBeGreaterThan(0);
  });
});
```

## 4. Manual Test Scenarios

### Test Matrix

| Scenario | Email | SMS | Push | Expected Result |
|----------|-------|-----|------|-----------------|
| Critical alarm (all channels enabled) | ✓ | ✓ | ✓ | All 3 received |
| Warning alarm (SMS disabled) | ✓ | ✗ | ✓ | Email + Push only |
| Work order assigned (default) | ✓ | ✗ | ✓ | Email + Push only |
| Rate limit exceeded | ✓ | ✗ | ✗ | Only first 10/min |
| Invalid email address | ✗ | - | - | Error logged, not sent |
| User has no device tokens | ✓ | ✓ | ✗ | Email + SMS only |

### Manual Test Checklist

#### Email Notifications
- [ ] Email received within 30 seconds
- [ ] Subject line is correct
- [ ] Body contains all template variables
- [ ] HTML formatting is correct
- [ ] Unsubscribe link is present
- [ ] Links open correct page in app
- [ ] Images load correctly
- [ ] Works in Gmail, Outlook, Apple Mail

#### SMS Notifications
- [ ] SMS received within 60 seconds
- [ ] Message is <160 characters (or split)
- [ ] Phone number is E.164 format
- [ ] Delivery status is tracked
- [ ] Opt-out (STOP) is handled
- [ ] Cost is logged

#### Push Notifications
- [ ] Notification appears on device
- [ ] Title and body are correct
- [ ] Icon/image loads
- [ ] Tap opens correct screen in app
- [ ] Badge count updates
- [ ] Sound plays (if enabled)
- [ ] Works on iOS and Android

#### Preferences
- [ ] Preferences page loads
- [ ] Toggle switches work
- [ ] Save button is disabled when no changes
- [ ] Changes are persisted
- [ ] Disabling channel prevents notifications
- [ ] Enabling channel resumes notifications

#### Escalation
- [ ] Critical alarm sends initial notification
- [ ] After 30 minutes (or test delay), supervisor notified
- [ ] Acknowledging alarm prevents escalation
- [ ] Escalation email has correct content

## 5. Performance Tests

### Load Testing

```bash
# Test notification throughput
# Goal: 100 notifications/second

ab -n 10000 -c 100 -p notification.json \
  -T application/json \
  http://localhost:3000/api/v1/notifications
```

**Expected Results:**
- Throughput: ≥100 req/sec
- Mean response time: <200ms
- 99th percentile: <500ms
- Error rate: <1%

### Queue Processing Speed

```python
# Test notification worker processing speed

def test_queue_processing_speed():
    # Queue 1000 notifications
    for i in range(1000):
        queue_notification(...)

    start_time = time.time()

    # Wait for all to be processed
    while get_pending_count() > 0:
        time.sleep(1)
        if time.time() - start_time > 60:
            break

    duration = time.time() - start_time
    throughput = 1000 / duration

    # Should process at least 10 notifications/second
    assert throughput >= 10
```

## 6. Error Handling Tests

### Provider Failures

```python
def test_email_provider_failure_retry():
    """Test that failed emails are retried with exponential backoff"""

    # Mock provider to fail first 2 attempts
    attempts = []

    def mock_send_email(*args, **kwargs):
        attempts.append(time.time())
        if len(attempts) < 3:
            raise Exception('Provider error')
        return {'success': True}

    # Send notification
    send_notification(...)

    # Wait for retries
    time.sleep(10)

    # Verify retry attempts with backoff
    assert len(attempts) == 3
    # First retry after ~2 seconds
    # Second retry after ~4 seconds
    assert attempts[1] - attempts[0] > 1.5
    assert attempts[2] - attempts[1] > 3
```

## 7. Security Tests

### Input Validation

- [ ] SQL injection in template variables
- [ ] XSS in HTML email templates
- [ ] SSRF in image URLs
- [ ] Email header injection
- [ ] Phone number validation bypass

### Authorization

- [ ] Users can only view their own preferences
- [ ] Users cannot send notifications as other users
- [ ] Tenants are isolated (no cross-tenant notifications)

## 8. Accessibility Tests

### WCAG 2.1 AA Compliance

- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Color contrast ≥4.5:1
- [ ] Focus indicators visible
- [ ] Form labels present
- [ ] Error messages descriptive

## Test Report Template

### Summary

- **Total Tests:** 125
- **Passed:** 123
- **Failed:** 2
- **Skipped:** 0
- **Coverage:** 82%

### Failed Tests

1. `test_sms_international_numbers` - Twilio test account limitation
2. `test_push_ios_production` - Requires production APNs certificate

### Recommendations

1. Fix SMS international number handling
2. Set up iOS production certificates for full testing
3. Increase test coverage for notification worker
4. Add more edge case tests for template rendering

## Continuous Testing

### Pre-commit Hooks

```bash
# .husky/pre-commit
npm test -- --coverage --watchAll=false
```

### CI/CD Pipeline

```yaml
# .github/workflows/test-notifications.yml
name: Notification System Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run unit tests
        run: npm test
      - name: Run integration tests
        run: npm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Monitoring in Production

### Metrics to Track

- Notification send rate (per channel)
- Delivery success rate
- Average delivery time
- Error rate by provider
- Queue depth
- Rate limit hits

### Alerts

- Delivery success rate < 95%
- Queue depth > 1000
- Error rate > 5%
- Average delivery time > 60s
