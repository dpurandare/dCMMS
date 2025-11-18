# Notification Preferences UI Specification (DCMMS-069)

User interface for managing notification preferences across all channels.

## Overview

The notification preferences UI allows users to control how they receive notifications for different event types across email, SMS, and push channels.

## Location

**Path:** `/settings/notifications`

**Navigation:** Settings → Notification Preferences tab

## Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
│  ┌──────────┬──────────────────────────────────────┐       │
│  │ Profile  │                                       │       │
│  │ Security │  Notification Preferences             │       │
│  │ Notifications │                                  │       │
│  │ Billing  │  Control how you receive notifications │      │
│  └──────────┴──────────────────────────────────────┘       │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Work Order Notifications                      │        │
│  │  ├─ 📧 Email        [✓]                        │        │
│  │  ├─ 📱 SMS          [ ]                        │        │
│  │  └─ 🔔 Push         [✓]                        │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Critical Alarms                               │        │
│  │  ├─ 📧 Email        [✓]                        │        │
│  │  ├─ 📱 SMS          [✓]                        │        │
│  │  └─ 🔔 Push         [✓]                        │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  [Save Changes]                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Page Header
- **Title:** "Notification Preferences"
- **Description:** "Control how you receive notifications for different events"
- **Breadcrumbs:** Settings / Notifications

### 2. Event Type Sections

Each event type has its own card/section:

#### Work Order Notifications
- **Event Types:**
  - `work_order_assigned` - When a work order is assigned to you
  - `work_order_overdue` - When your work order is overdue
  - `work_order_completed` - When someone completes a work order (optional)

#### Alarm Notifications
- **Event Types:**
  - `alarm_critical` - Critical severity alarms
  - `alarm_warning` - Warning severity alarms
  - `alarm_info` - Informational alarms (optional)

#### System Notifications
- **Event Types:**
  - `asset_maintenance_due` - Preventive maintenance reminders
  - `inventory_low` - Low inventory alerts
  - `system_announcement` - System updates and announcements

### 3. Channel Toggles

For each event type, show toggle switches for:

- **📧 Email** - Always available
- **📱 SMS** - Requires phone number verification
- **🔔 Push** - Requires mobile app installation

**Toggle States:**
- ON (blue): Notifications enabled
- OFF (gray): Notifications disabled
- DISABLED (gray + locked icon): Channel not available (e.g., no phone number)

### 4. Channel Setup

If a channel is not available, show setup button:

- **SMS Not Setup:**
  ```
  📱 SMS [ ] ⚠️ Add phone number to enable SMS notifications
                [+ Add Phone Number]
  ```

- **Push Not Setup:**
  ```
  🔔 Push [ ] ⚠️ Install mobile app to enable push notifications
                [Download App]
  ```

### 5. Save Button

- **Position:** Bottom of form
- **Text:** "Save Changes"
- **State:**
  - Disabled (gray) when no changes
  - Enabled (blue) when changes pending
  - Loading (spinner) when saving

### 6. Toast Notifications

- **Success:** "✓ Notification preferences saved successfully"
- **Error:** "✗ Failed to save preferences. Please try again."

## Implementation

### React Component Structure

```typescript
// app/settings/notifications/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface NotificationPreference {
  channel: 'email' | 'sms' | 'push';
  eventType: string;
  enabled: boolean;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch preferences on load
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/users/me/notification-preferences');
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (channel: string, eventType: string, enabled: boolean) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.channel === channel && pref.eventType === eventType
          ? { ...pref, enabled }
          : pref
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/users/me/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Notification preferences saved',
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-gray-600">Control how you receive notifications for different events</p>
      </div>

      {/* Work Orders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Work Order Notifications</CardTitle>
          <CardDescription>Notifications about work order assignments and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceToggle
            eventType="work_order_assigned"
            label="Work Order Assigned"
            preferences={preferences}
            onToggle={handleToggle}
          />
          <PreferenceToggle
            eventType="work_order_overdue"
            label="Work Order Overdue"
            preferences={preferences}
            onToggle={handleToggle}
          />
        </CardContent>
      </Card>

      {/* Alarms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Alarm Notifications</CardTitle>
          <CardDescription>Critical alerts about asset health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceToggle
            eventType="alarm_critical"
            label="Critical Alarms"
            preferences={preferences}
            onToggle={handleToggle}
          />
          <PreferenceToggle
            eventType="alarm_warning"
            label="Warning Alarms"
            preferences={preferences}
            onToggle={handleToggle}
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// Helper component for preference toggles
function PreferenceToggle({ eventType, label, preferences, onToggle }) {
  const getPreference = (channel: string) => {
    return preferences.find(
      (p) => p.channel === channel && p.eventType === eventType
    );
  };

  return (
    <div className="mb-4 pb-4 border-b last:border-0">
      <div className="font-medium mb-3">{label}</div>
      <div className="flex gap-8">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📧</span>
          <Switch
            checked={getPreference('email')?.enabled ?? true}
            onCheckedChange={(checked) => onToggle('email', eventType, checked)}
          />
          <span className="text-sm">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">📱</span>
          <Switch
            checked={getPreference('sms')?.enabled ?? false}
            onCheckedChange={(checked) => onToggle('sms', eventType, checked)}
          />
          <span className="text-sm">SMS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <Switch
            checked={getPreference('push')?.enabled ?? true}
            onCheckedChange={(checked) => onToggle('push', eventType, checked)}
          />
          <span className="text-sm">Push</span>
        </div>
      </div>
    </div>
  );
}
```

## API Integration

### GET /api/v1/users/:id/notification-preferences

**Response:**
```json
{
  "preferences": [
    {
      "channel": "email",
      "eventType": "work_order_assigned",
      "enabled": true
    },
    {
      "channel": "sms",
      "eventType": "work_order_assigned",
      "enabled": false
    },
    {
      "channel": "push",
      "eventType": "work_order_assigned",
      "enabled": true
    },
    {
      "channel": "email",
      "eventType": "alarm_critical",
      "enabled": true
    }
    // ... more preferences
  ]
}
```

### PUT /api/v1/users/:id/notification-preferences

**Request:**
```json
{
  "preferences": [
    {
      "channel": "email",
      "eventType": "work_order_assigned",
      "enabled": true
    }
    // ... more preferences
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

## Testing Checklist

- [ ] Page loads without errors
- [ ] Preferences are fetched correctly
- [ ] Toggle switches work for all channels
- [ ] Save button is disabled when no changes
- [ ] Save button shows loading state
- [ ] Success toast appears on successful save
- [ ] Error toast appears on failed save
- [ ] Disabled channels show setup instructions
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation works (accessibility)

## Future Enhancements

1. **Quiet Hours:** Allow users to set do-not-disturb hours
2. **Digest Mode:** Batch non-critical notifications into daily/weekly digests
3. **Custom Rules:** Advanced users can create custom notification rules
4. **Test Notification:** Button to send test notification per channel
5. **Notification History:** View past notifications
6. **Channel Verification:** Verify email/phone before enabling
7. **Priority Override:** Force critical notifications even during quiet hours
