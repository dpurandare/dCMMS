# Webhook Configuration UI Specification (DCMMS-077)

User interface for managing webhook integrations.

## Overview

The webhook configuration UI allows users to register, configure, test, and monitor webhook endpoints for receiving notifications from dCMMS.

## Location

**Path:** `/settings/webhooks`

**Navigation:** Settings → Webhooks tab

## Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                         │
│  ┌──────────┬──────────────────────────────────────────────┐   │
│  │ Profile  │                                               │   │
│  │ Security │  Webhooks                               [+ New] │   │
│  │ Notifications │                                          │   │
│  │ Webhooks │  Receive notifications via HTTP callbacks    │   │
│  └──────────┴──────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Critical Alarm Webhook              🟢 Active          │    │
│  │  https://api.example.com/webhooks/alarms                │    │
│  │  Events: alarm_critical                                 │    │
│  │  Last triggered: 5 minutes ago                          │    │
│  │  Success rate: 98.5% (197/200 deliveries)              │    │
│  │  [Test] [Edit] [View Logs] [Delete]                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Work Order Notifications            🔴 Inactive        │    │
│  │  https://hooks.slack.com/services/...                   │    │
│  │  Events: work_order_assigned, work_order_completed      │    │
│  │  Last triggered: Never                                  │    │
│  │  [Test] [Edit] [View Logs] [Delete]                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Webhooks List

Display all registered webhooks with:
- Name and description
- URL (truncated if long)
- Active status indicator
- Event types subscribed to
- Last triggered timestamp
- Success rate and delivery statistics
- Quick action buttons

**Empty State:**
```
┌────────────────────────────────────────┐
│                                        │
│            📡 No Webhooks              │
│                                        │
│  Set up webhooks to receive            │
│  real-time notifications from dCMMS    │
│                                        │
│           [+ Create Webhook]           │
│                                        │
└────────────────────────────────────────┘
```

### 2. Create/Edit Webhook Modal

**Form Fields:**

1. **Name** (required)
   - Text input
   - Max 100 characters
   - Example: "Critical Alarms to PagerDuty"

2. **Description** (optional)
   - Textarea
   - Max 500 characters

3. **URL** (required)
   - Text input (type=url)
   - Must start with `https://` (recommended) or `http://`
   - Validation: Valid URL format
   - Example: `https://api.example.com/webhooks/alarms`

4. **Authentication Type**
   - Radio buttons:
     - ⚪ None
     - ⚪ Bearer Token
     - ⚪ Basic Auth
     - ⚪ HMAC Signature

5. **Authentication Details** (conditional)
   - **Bearer Token:** Text input for token
   - **Basic Auth:** Username + Password inputs
   - **HMAC Signature:** Auto-generated secret key (displayed once)

6. **Custom Headers** (optional)
   - Key-value pairs
   - Add/remove rows
   - Example:
     ```
     X-Custom-Header: custom-value
     User-Agent: dCMMS-Webhook/1.0
     ```

7. **Event Types** (required)
   - Multi-select checkboxes:
     - ☐ All Events (wildcard)
     - ☐ Critical Alarms (`alarm_critical`)
     - ☐ Warning Alarms (`alarm_warning`)
     - ☐ Work Order Assigned (`work_order_assigned`)
     - ☐ Work Order Overdue (`work_order_overdue`)
     - ☐ Inventory Low (`inventory_low`)
     - ☐ Asset Maintenance Due (`asset_maintenance_due`)

8. **Advanced Settings** (collapsible)
   - **Timeout:** Number input (1-60 seconds, default: 10)
   - **Max Retries:** Number input (0-5, default: 3)
   - **Active:** Toggle switch (default: ON)

**Buttons:**
- **Save:** Save webhook configuration
- **Save & Test:** Save and immediately send test webhook
- **Cancel:** Close modal without saving

### 3. Webhook Detail/Stats Modal

**Triggered by:** Clicking "View Logs" or webhook row

**Tabs:**
1. **Overview**
   - URL, auth type, event types
   - Active status
   - Created date
   - Last triggered date

2. **Statistics**
   - Total deliveries
   - Successful deliveries
   - Failed deliveries
   - Average response time
   - Success rate chart (last 7 days)

3. **Delivery Logs**
   - Table of recent deliveries:
     - Timestamp
     - Event type
     - HTTP status code
     - Response time
     - Status (success/failed)
     - Retry count
   - Expandable rows showing request/response details
   - Filters: Status, Event type, Date range
   - Pagination (50 per page)

4. **Configuration**
   - Secret key (for HMAC)
   - Copy button
   - Regenerate button (with confirmation)

### 4. Test Webhook Dialog

**Triggered by:** Clicking "Test" button

**Content:**
```
┌────────────────────────────────────────┐
│  Test Webhook                    [✕]   │
│  ────────────────────────────────────  │
│                                        │
│  Send a test payload to verify your   │
│  webhook endpoint is configured        │
│  correctly.                            │
│                                        │
│  Test Event Type:                      │
│  [webhook_test ▼]                      │
│                                        │
│  Sample Payload:                       │
│  ┌──────────────────────────────────┐ │
│  │ {                                │ │
│  │   "event": "webhook.test",       │ │
│  │   "timestamp": "2025-01-15...",  │ │
│  │   "data": {                      │ │
│  │     "message": "Test webhook"    │ │
│  │   }                              │ │
│  │ }                                │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Send Test Webhook]                   │
│                                        │
└────────────────────────────────────────┘
```

**After sending:**
```
✅ Success! (200 OK, 245ms)

Response:
{
  "received": true,
  "timestamp": "2025-01-15T10:30:00Z"
}

[Close]
```

**Or on failure:**
```
❌ Failed (500 Internal Server Error, 1023ms)

Error: Connection timeout

Response body:
{
  "error": "Internal server error"
}

[Retry]  [Close]
```

### 5. Delete Confirmation Dialog

```
┌────────────────────────────────────────┐
│  Delete Webhook?                 [✕]   │
│  ────────────────────────────────────  │
│                                        │
│  Are you sure you want to delete this │
│  webhook?                              │
│                                        │
│  Name: Critical Alarm Webhook          │
│  URL: https://api.example.com/...      │
│                                        │
│  This action cannot be undone.         │
│                                        │
│  [Cancel]  [Delete Webhook]            │
│                                        │
└────────────────────────────────────────┘
```

## Implementation

### React Component Structure

```typescript
// app/settings/webhooks/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit, Play, BarChart } from 'lucide-react';

interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  authType: 'none' | 'bearer' | 'basic' | 'hmac';
  eventTypes: string[];
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  stats?: {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
  };
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/webhooks');
      const data = await response.json();

      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = () => {
    setSelectedWebhook(null);
    setIsEditModalOpen(true);
  };

  const editWebhook = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setIsEditModalOpen(true);
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Webhook deleted',
        });
        fetchWebhooks();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Test webhook sent (${data.delivery.status || 'OK'})`,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.delivery?.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test webhook',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading webhooks...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-gray-600">Receive notifications via HTTP callbacks</p>
        </div>
        <Button onClick={createWebhook}>
          <Plus className="mr-2 h-4 w-4" />
          New Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-xl font-semibold mb-2">No Webhooks</h2>
            <p className="text-gray-600 mb-6">
              Set up webhooks to receive real-time notifications from dCMMS
            </p>
            <Button onClick={createWebhook}>
              <Plus className="mr-2 h-4 w-4" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{webhook.name}</h3>
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          webhook.active ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      ></span>
                      <span className="text-sm text-gray-500">
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{webhook.url}</div>
                    <div className="text-sm text-gray-500">
                      Events: {webhook.eventTypes.join(', ')}
                    </div>
                    {webhook.lastTriggeredAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        Last triggered:{' '}
                        {new Date(webhook.lastTriggeredAt).toLocaleString()}
                      </div>
                    )}
                    {webhook.stats && (
                      <div className="text-xs text-gray-500 mt-1">
                        Success rate: {webhook.stats.successRate}% (
                        {webhook.stats.successfulDeliveries}/
                        {webhook.stats.totalDeliveries} deliveries)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testWebhook(webhook.id)}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editWebhook(webhook)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Open stats modal
                    }}
                  >
                    <BarChart className="mr-1 h-3 w-3" />
                    View Logs
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteWebhook(webhook.id)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <WebhookFormModal
        webhook={selectedWebhook}
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={fetchWebhooks}
      />
    </div>
  );
}

// Webhook Form Modal (simplified)
function WebhookFormModal({ webhook, open, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    name: webhook?.name || '',
    description: webhook?.description || '',
    url: webhook?.url || '',
    authType: webhook?.authType || 'none',
    authToken: '',
    eventTypes: webhook?.eventTypes || [],
    timeoutSeconds: webhook?.timeoutSeconds || 10,
    maxRetries: webhook?.maxRetries || 3,
    active: webhook?.active ?? true,
  });

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        webhook ? `/api/v1/webhooks/${webhook.id}` : '/api/v1/webhooks',
        {
          method: webhook ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: webhook ? 'Webhook updated' : 'Webhook created',
        });
        onSave();
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save webhook',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{webhook ? 'Edit' : 'Create'} Webhook</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields here */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
          </div>

          {/* More fields... */}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Webhook</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## API Integration

### GET /api/v1/webhooks
Get all webhooks for tenant.

### POST /api/v1/webhooks
Create new webhook.

### PUT /api/v1/webhooks/:id
Update webhook configuration.

### DELETE /api/v1/webhooks/:id
Delete webhook.

### POST /api/v1/webhooks/:id/test
Send test webhook.

### GET /api/v1/webhooks/:id/deliveries
Get delivery logs.

### GET /api/v1/webhooks/:id/stats
Get webhook statistics.

## Testing Checklist

- [ ] Page loads without errors
- [ ] Webhooks list displays correctly
- [ ] Empty state shows when no webhooks
- [ ] Create webhook modal opens and validates inputs
- [ ] URL validation works (https required, valid format)
- [ ] Authentication types work correctly
- [ ] Event type selection works (multi-select)
- [ ] Save webhook creates new webhook
- [ ] Edit webhook updates existing webhook
- [ ] Test webhook sends test payload
- [ ] Test webhook shows success/failure feedback
- [ ] Delete webhook confirmation works
- [ ] Delete webhook removes webhook
- [ ] Webhook stats/logs modal displays data
- [ ] Success rate calculation is correct
- [ ] Responsive design works on mobile

## Security Considerations

1. **HTTPS Only:** Strongly recommend HTTPS URLs
2. **Secret Key:** Display HMAC secret key only once after creation
3. **Token Masking:** Mask bearer tokens in UI (show last 4 chars)
4. **Validation:** Server-side URL and input validation
5. **Rate Limiting:** Limit webhook creation per tenant

## Future Enhancements

1. **Webhook Templates:** Pre-configured webhooks for popular services (Slack, Discord, Teams)
2. **Payload Customization:** Custom JSON templates for webhook payload
3. **Conditional Triggers:** Only send webhook if conditions met
4. **Batch Webhooks:** Send multiple events in single webhook
5. **Webhook Playground:** Test webhooks with custom payloads
6. **Delivery Retry UI:** Manual retry for failed deliveries
7. **Webhook Analytics:** Detailed charts and reports
