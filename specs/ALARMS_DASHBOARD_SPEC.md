# Alarms Dashboard Specification (DCMMS-076)

Frontend dashboard for monitoring and managing alarms with real-time updates.

## Overview

The alarms dashboard provides a real-time view of all alarms in the system, with filtering, sorting, and bulk actions. Users can acknowledge, resolve, and comment on alarms directly from the dashboard.

## Location

**Path:** `/alarms`

**Navigation:** Main navigation → Alarms

## Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Alarms                                                   [Refresh]│
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Active Alarms                                            │   │
│  │  ┌──────┬──────┬──────┐                                  │   │
│  │  │  🔴 5 │ ⚠️ 12 │ ℹ️ 3  │                                  │   │
│  │  │Critical│Warning│ Info │                                │   │
│  │  └──────┴──────┴──────┘                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Filters: [All Sites ▼] [All Severities ▼] [Status: Active ▼]  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ☐ │ 🔴 │ Asset-001  │ Temperature    │ 2min ago │ [Ack] │   │
│  │ ☐ │ 🔴 │ Pump #5    │ Vibration      │ 5min ago │ [Ack] │   │
│  │ ☐ │ ⚠️ │ Motor-12   │ Power Draw     │ 10min ago│ [Ack] │   │
│  │ ☐ │ ⚠️ │ Sensor-77  │ Connection Lost│ 15min ago│ [Ack] │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Selected: 0  [Acknowledge Selected]  [Export CSV]              │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Summary Cards

Display real-time count of active alarms by severity:

```typescript
interface AlarmSummary {
  critical: number;
  warning: number;
  info: number;
}
```

**Visual:**
- Critical: Red background, white text
- Warning: Orange background, white text
- Info: Blue background, white text
- Shows count and severity label
- Updates in real-time via WebSocket

### 2. Filters Bar

Filters to narrow down alarm list:

- **Site Filter:** Dropdown of all sites (multi-select)
- **Severity Filter:** Critical | Warning | Info | All
- **Status Filter:** Active | Acknowledged | Resolved | All
- **Time Range:** Last hour | Last 24h | Last 7 days | Custom
- **Asset Type Filter:** Dropdown of asset types

### 3. Alarms Table

**Columns:**
1. **Checkbox:** Bulk selection
2. **Severity:** Icon (🔴 🟠 🔵) + badge
3. **Asset:** Asset name with link to asset detail
4. **Alarm Type:** Sensor type or alarm category
5. **Message:** Alarm description
6. **Value:** Current value and threshold
7. **Time:** Relative time (e.g., "5 min ago")
8. **Status:** Badge (Active | Acknowledged | Resolved)
9. **Actions:** Quick action buttons

**Row States:**
- **Active Critical:** Red left border, white background
- **Active Warning:** Orange left border, white background
- **Acknowledged:** Gray background
- **Resolved:** Light green background, strike-through text

**Sorting:**
- Default: Severity (critical first), then time (newest first)
- Clickable column headers
- Multi-column sort support

### 4. Row Actions

**Quick Actions:**
- ✓ **Acknowledge:** Mark alarm as acknowledged
- ✅ **Resolve:** Mark alarm as resolved
- 💬 **Comment:** Add comment to alarm
- 🔗 **View Details:** Open alarm detail modal

### 5. Bulk Actions

Actions for selected alarms:
- **Acknowledge Selected:** Bulk acknowledge
- **Resolve Selected:** Bulk resolve
- **Export Selected:** Export to CSV
- **Assign To:** Assign to user/team

### 6. Alarm Detail Modal

**Triggered by:** Clicking alarm row or "View Details" button

**Content:**
```
┌────────────────────────────────────────────────┐
│  🔴 Critical Alarm                       [✕]  │
│  ────────────────────────────────────────────  │
│                                                │
│  Asset: Pump #5 (Site A, Building 1)         │
│  Sensor: Vibration Sensor #12                │
│  Type: Threshold Exceeded                    │
│                                                │
│  Current Value: 85 Hz                        │
│  Threshold: > 75 Hz                          │
│                                                │
│  First Occurred: Jan 15, 2025 10:30 AM      │
│  Last Occurred: Jan 15, 2025 10:35 AM       │
│  Occurrence Count: 5                         │
│                                                │
│  Status: Active                              │
│  Acknowledged: No                            │
│                                                │
│  ─── Actions ───                             │
│  [✓ Acknowledge]  [✅ Resolve]  [💬 Comment] │
│                                                │
│  ─── Comments (2) ───                        │
│  • John Doe (10:32 AM): Investigating...    │
│  • Jane Smith (10:34 AM): Team dispatched   │
│                                                │
│  [Add Comment...]                            │
│  [Post Comment]                              │
└────────────────────────────────────────────────┘
```

### 7. Real-Time Updates

**WebSocket Integration:**
- Connect to `/ws/alarms` on page load
- Listen for events:
  - `alarm.created` - New alarm triggered
  - `alarm.updated` - Alarm status changed
  - `alarm.acknowledged` - Alarm acknowledged
  - `alarm.resolved` - Alarm resolved
- Update table and summary cards automatically
- Show toast notification for new critical alarms

**Visual Feedback:**
- Flash animation when new alarm appears
- Sound alert for critical alarms (optional, user preference)
- Browser notification (if permissions granted)

## Implementation

### React Component Structure

```typescript
// app/alarms/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Bell, CheckCircle, MessageCircle, AlertTriangle } from 'lucide-react';

interface Alarm {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  assetId: string;
  assetName: string;
  sensorType: string;
  value: number;
  unit: string;
  thresholdViolated: number;
  message: string;
  firstOccurrence: string;
  lastOccurrence: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedAlarms, setSelectedAlarms] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    site: 'all',
    severity: 'all',
    status: 'active',
  });
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const { toast } = useToast();

  // WebSocket connection
  const { data: wsData, connected } = useWebSocket('/ws/alarms');

  // Fetch alarms
  useEffect(() => {
    fetchAlarms();
  }, [filters]);

  // Handle WebSocket messages
  useEffect(() => {
    if (wsData) {
      handleWebSocketMessage(wsData);
    }
  }, [wsData]);

  const fetchAlarms = async () => {
    try {
      const params = new URLSearchParams({
        status: filters.status,
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.site !== 'all' && { siteId: filters.site }),
      });

      const response = await fetch(`/api/v1/alarms?${params}`);
      const data = await response.json();

      if (data.success) {
        setAlarms(data.alarms);
      }
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alarms',
        variant: 'destructive',
      });
    }
  };

  const handleWebSocketMessage = (message: any) => {
    const { type, data } = message;

    switch (type) {
      case 'alarm.created':
        // Add new alarm to list
        setAlarms((prev) => [data, ...prev]);

        // Show notification for critical alarms
        if (data.severity === 'CRITICAL') {
          toast({
            title: '🔴 Critical Alarm',
            description: `${data.assetName}: ${data.message}`,
          });

          // Play sound (optional)
          playAlarmSound();
        }
        break;

      case 'alarm.updated':
      case 'alarm.acknowledged':
      case 'alarm.resolved':
        // Update existing alarm
        setAlarms((prev) =>
          prev.map((alarm) => (alarm.id === data.id ? data : alarm))
        );
        break;
    }
  };

  const acknowledgeAlarm = async (alarmId: string) => {
    try {
      const response = await fetch(`/api/v1/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Alarm acknowledged',
        });
        fetchAlarms();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alarm',
        variant: 'destructive',
      });
    }
  };

  const acknowledgeSelected = async () => {
    for (const alarmId of selectedAlarms) {
      await acknowledgeAlarm(alarmId);
    }
    setSelectedAlarms(new Set());
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const playAlarmSound = () => {
    // Optional: play alarm sound
    const audio = new Audio('/sounds/alarm.mp3');
    audio.play().catch(() => {
      // Ignore if autoplay is blocked
    });
  };

  // Calculate summary
  const summary = alarms.reduce(
    (acc, alarm) => {
      if (alarm.status === 'ACTIVE') {
        if (alarm.severity === 'CRITICAL') acc.critical++;
        else if (alarm.severity === 'WARNING') acc.warning++;
        else if (alarm.severity === 'INFO') acc.info++;
      }
      return acc;
    },
    { critical: 0, warning: 0, info: 0 }
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Alarms</h1>
        <Button onClick={fetchAlarms} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-red-500 text-white">
          <CardContent className="p-6">
            <div className="text-4xl font-bold">{summary.critical}</div>
            <div className="text-sm">Critical Alarms</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500 text-white">
          <CardContent className="p-6">
            <div className="text-4xl font-bold">{summary.warning}</div>
            <div className="text-sm">Warning Alarms</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500 text-white">
          <CardContent className="p-6">
            <div className="text-4xl font-bold">{summary.info}</div>
            <div className="text-sm">Info Alarms</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}
        >
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(value) => setFilters({ ...filters, severity: value })}
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedAlarms.size > 0 && (
        <div className="mb-4 flex gap-4 items-center">
          <span className="text-sm text-gray-600">
            {selectedAlarms.size} selected
          </span>
          <Button onClick={acknowledgeSelected} size="sm">
            Acknowledge Selected
          </Button>
        </div>
      )}

      {/* Alarms Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedAlarms.size === alarms.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAlarms(new Set(alarms.map((a) => a.id)));
                      } else {
                        setSelectedAlarms(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-16">Severity</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alarms.map((alarm) => (
                <TableRow
                  key={alarm.id}
                  className={`cursor-pointer hover:bg-gray-50 border-l-4 ${
                    alarm.severity === 'CRITICAL' && alarm.status === 'ACTIVE'
                      ? 'border-l-red-500'
                      : alarm.severity === 'WARNING' && alarm.status === 'ACTIVE'
                      ? 'border-l-orange-500'
                      : 'border-l-transparent'
                  } ${alarm.status === 'ACKNOWLEDGED' ? 'bg-gray-100' : ''} ${
                    alarm.status === 'RESOLVED' ? 'bg-green-50' : ''
                  }`}
                  onClick={() => setSelectedAlarm(alarm)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedAlarms.has(alarm.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedAlarms);
                        if (checked) {
                          newSelected.add(alarm.id);
                        } else {
                          newSelected.delete(alarm.id);
                        }
                        setSelectedAlarms(newSelected);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-2xl">{getSeverityIcon(alarm.severity)}</span>
                  </TableCell>
                  <TableCell className="font-medium">{alarm.assetName}</TableCell>
                  <TableCell>{alarm.sensorType}</TableCell>
                  <TableCell>
                    {alarm.value} {alarm.unit}
                    <span className="text-gray-500 text-sm"> / {alarm.thresholdViolated}</span>
                  </TableCell>
                  <TableCell>{getRelativeTime(alarm.firstOccurrence)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        alarm.status === 'ACTIVE'
                          ? 'destructive'
                          : alarm.status === 'ACKNOWLEDGED'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {alarm.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {alarm.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlarm(alarm.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {alarms.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No alarms found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alarm Detail Modal */}
      <AlarmDetailModal
        alarm={selectedAlarm}
        onClose={() => setSelectedAlarm(null)}
        onUpdate={fetchAlarms}
      />
    </div>
  );
}

// Alarm Detail Modal Component (simplified)
function AlarmDetailModal({ alarm, onClose, onUpdate }: any) {
  if (!alarm) return null;

  return (
    <Dialog open={!!alarm} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {getSeverityIcon(alarm.severity)} {alarm.severity} Alarm
          </DialogTitle>
        </DialogHeader>

        {/* Modal content here */}
        <div className="space-y-4">
          <div>
            <strong>Asset:</strong> {alarm.assetName}
          </div>
          <div>
            <strong>Sensor:</strong> {alarm.sensorType}
          </div>
          <div>
            <strong>Current Value:</strong> {alarm.value} {alarm.unit}
          </div>
          <div>
            <strong>Threshold:</strong> {alarm.thresholdViolated} {alarm.unit}
          </div>
          <div>
            <strong>First Occurred:</strong> {new Date(alarm.firstOccurrence).toLocaleString()}
          </div>
          <div>
            <strong>Status:</strong> {alarm.status}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {alarm.status === 'ACTIVE' && (
              <>
                <Button onClick={() => acknowledgeAlarm(alarm.id)}>
                  Acknowledge
                </Button>
                <Button variant="secondary" onClick={() => resolveAlarm(alarm.id)}>
                  Resolve
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## API Integration

### GET /api/v1/alarms

Fetch alarms with filters.

### POST /api/v1/alarms/:id/acknowledge

Acknowledge alarm.

### POST /api/v1/alarms/:id/resolve

Resolve alarm.

### WebSocket /ws/alarms

Real-time alarm updates.

## Testing Checklist

- [ ] Page loads without errors
- [ ] Alarms are fetched and displayed correctly
- [ ] Summary cards show accurate counts
- [ ] Filters work correctly
- [ ] Bulk selection and actions work
- [ ] Acknowledge button updates alarm status
- [ ] Resolve button updates alarm status
- [ ] WebSocket connection established
- [ ] Real-time updates reflect in UI
- [ ] Toast notifications for critical alarms
- [ ] Alarm detail modal opens and displays data
- [ ] Responsive design works on mobile
- [ ] Table sorting works correctly
- [ ] Export functionality works

## Future Enhancements

1. **Alarm Trends:** Chart showing alarm trends over time
2. **Predictive Alerts:** ML-based prediction of future alarms
3. **Alarm Correlation:** Group related alarms together
4. **Custom Views:** Save and share custom filter combinations
5. **Alarm Rules UI:** Visual editor for alarm rules
6. **Mobile App:** Push notifications for critical alarms
7. **Voice Alerts:** Text-to-speech for critical alarms
8. **Escalation Path:** Automated escalation workflow
