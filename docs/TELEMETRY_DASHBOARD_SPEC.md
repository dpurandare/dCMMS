# Telemetry Dashboard Specification (DCMMS-061)

Real-time telemetry visualization dashboard for dCMMS web application.

## Overview

The telemetry dashboard provides real-time monitoring of IoT sensor data with interactive charts and historical trend analysis.

## Features

### 1. Asset Selector
- **Component**: Dropdown menu
- **Data Source**: `/api/v1/assets` (filtered by site and permissions)
- **Features**:
  - Searchable dropdown
  - Grouped by site
  - Favorites/recent assets at top
  - Multi-select for comparison (future)

### 2. Sensor Type Selector
- **Component**: Button group or tabs
- **Options**: TEMPERATURE, VOLTAGE, CURRENT, POWER, FREQUENCY, PRESSURE, HUMIDITY, VIBRATION
- **Features**:
  - Icon for each sensor type
  - Badge showing current value
  - Color-coded by status (good/warning/critical)

### 3. Time Range Picker
- **Component**: Preset buttons + custom date range
- **Presets**:
  - Last Hour (1hour)
  - Last 6 Hours (6hours)
  - Last 24 Hours (24hours)
  - Last 7 Days (7days)
  - Last 30 Days (30days)
  - Custom Range (date picker)
- **Auto-aggregation Selection**:
  - <1 hour: raw data
  - 1-6 hours: 1min aggregation
  - 6-24 hours: 5min aggregation
  - 1-7 days: 15min aggregation
  - >7 days: 1hour aggregation

### 4. Line Chart
- **Library**: Recharts (shadcn/ui compatible)
- **Features**:
  - Responsive container
  - X-axis: Time (formatted based on range)
  - Y-axis: Value with unit
  - Tooltip: Timestamp, value, quality flag
  - Legend: Sensor ID, statistics (min/max/avg)
  - Zoom: Mouse wheel or pinch
  - Pan: Click and drag
  - Export: PNG, CSV buttons
- **Styling**:
  - Line color based on quality:
    - GOOD: Blue (#3b82f6)
    - WARNING: Yellow (#eab308)
    - OUT_OF_RANGE: Orange (#f97316)
    - BAD: Red (#ef4444)
  - Grid lines: Subtle gray
  - Threshold lines: Dashed red (if alarm rules exist)

### 5. Statistics Cards
- **Layout**: Grid of 4 cards above chart
- **Metrics**:
  1. Current Value (latest reading)
  2. Average (time range)
  3. Minimum (time range)
  4. Maximum (time range)
- **Design**: Card with icon, value, unit, trend indicator

### 6. Real-time Updates
- **Method**: WebSocket or polling every 10 seconds
- **Behavior**:
  - New data points added to right side of chart
  - Chart auto-scrolls if viewing latest data
  - Pause button to stop auto-refresh
  - Visual indicator when data is updating

### 7. Loading & Error States
- **Loading**:
  - Skeleton loaders for cards and chart
  - Spinner with "Loading telemetry data..."
- **Error**:
  - Alert component with error message
  - Retry button
  - Fallback to cached data if available
- **Empty State**:
  - Illustration or icon
  - "No telemetry data available for selected time range"
  - Suggestion to select different asset or time range

## Component Structure

```
/app/telemetry/page.tsx
  - TelemetryDashboard (main component)
    - PageHeader (breadcrumbs, title)
    - FilterBar
      - AssetSelector
      - SensorTypeSelector
      - TimeRangePicker
      - RefreshButton
    - StatisticsCards (4 cards)
    - TelemetryChart (Recharts)
    - DataTable (optional, toggle view)
```

## API Integration

### Fetch Telemetry Data

```typescript
// GET /api/v1/telemetry
const fetchTelemetryData = async (params: {
  asset_id: string;
  sensor_type: string;
  start_time: string;  // ISO 8601
  end_time: string;
  aggregation?: '1min' | '5min' | '15min' | '1hour';
  limit?: number;
}) => {
  const response = await fetch(`/api/v1/telemetry?${new URLSearchParams(params)}`);
  const data = await response.json();
  return data;
};
```

### Example Response

```json
{
  "data": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "value": 72.5,
      "value_min": 71.2,
      "value_max": 73.8,
      "unit": "celsius",
      "sensor_id": "temp-001",
      "good_count": 60,
      "bad_count": 0,
      "out_of_range_count": 0
    }
  ],
  "count": 144,
  "aggregation": "1min",
  "table_used": "sensor_readings_1min",
  "query_duration_ms": 125
}
```

## Implementation Example

```typescript
// app/telemetry/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function TelemetryDashboard() {
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedSensorType, setSelectedSensorType] = useState('TEMPERATURE');
  const [timeRange, setTimeRange] = useState('24hours');
  const [telemetryData, setTelemetryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        asset_id: selectedAsset,
        sensor_type: selectedSensorType,
        start_time: getStartTime(timeRange),
        end_time: new Date().toISOString(),
        aggregation: getAggregationLevel(timeRange),
      };

      const response = await fetch(`/api/v1/telemetry?${new URLSearchParams(params)}`);
      const data = await response.json();
      setTelemetryData(data.data);
    } catch (error) {
      console.error('Failed to fetch telemetry:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAsset) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [selectedAsset, selectedSensorType, timeRange]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Telemetry Dashboard</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Asset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asset-001">Pump #1</SelectItem>
            <SelectItem value="asset-002">Motor #2</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSensorType} onValueChange={setSelectedSensorType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEMPERATURE">Temperature</SelectItem>
            <SelectItem value="VOLTAGE">Voltage</SelectItem>
            <SelectItem value="CURRENT">Current</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1hour">Last Hour</SelectItem>
            <SelectItem value="6hours">Last 6 Hours</SelectItem>
            <SelectItem value="24hours">Last 24 Hours</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchData}>Refresh</Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Current" value={telemetryData[0]?.value} unit="°C" icon={Activity} />
        <StatCard title="Average" value={calculateAvg(telemetryData)} unit="°C" icon={Minus} />
        <StatCard title="Minimum" value={calculateMin(telemetryData)} unit="°C" icon={TrendingDown} />
        <StatCard title="Maximum" value={calculateMax(telemetryData)} unit="°C" icon={TrendingUp} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedSensorType} Trend</CardTitle>
          <CardDescription>Real-time sensor data visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={telemetryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Testing Checklist

- [ ] Asset dropdown loads and filters correctly
- [ ] Sensor type selector shows all sensor types
- [ ] Time range picker updates chart data range
- [ ] Chart renders with correct data
- [ ] Real-time updates work (WebSocket or polling)
- [ ] Zoom and pan functionality works
- [ ] Loading states display correctly
- [ ] Error states show retry option
- [ ] Empty state displays when no data
- [ ] Statistics cards calculate correctly
- [ ] Export to PNG/CSV works
- [ ] Responsive design works on mobile
- [ ] Performance: chart renders <1s for 1000 data points

## Future Enhancements

1. **Multi-sensor comparison**: Overlay multiple sensors on same chart
2. **Anomaly detection visualization**: Highlight anomalies with markers
3. **Alarm overlay**: Show alarm thresholds as horizontal lines
4. **Predictive trends**: ML-based forecasting
5. **Custom dashboards**: Save and share dashboard configurations
6. **Export to PDF**: Generate reports
7. **WebSocket live updates**: Replace polling with WebSocket
8. **Dark mode support**: Toggle theme
