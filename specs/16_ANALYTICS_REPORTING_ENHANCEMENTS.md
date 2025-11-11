# Analytics and Reporting Enhancements Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Report Builder](#2-report-builder)
3. [Custom Dashboards](#3-custom-dashboards)
4. [Pre-Built Report Templates](#4-pre-built-report-templates)
5. [Scheduled Reports](#5-scheduled-reports)
6. [Export Formats](#6-export-formats)
7. [Data Visualization](#7-data-visualization)
8. [Ad-Hoc Query Builder](#8-ad-hoc-query-builder)
9. [Report Distribution](#9-report-distribution)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. Overview

### 1.1 Purpose

Enhance dCMMS analytics and reporting capabilities with self-service report building, custom dashboards, scheduled report generation, and advanced data visualization for operational insights.

### 1.2 Key Requirements

- **Self-service report builder:** Drag-and-drop interface for creating custom reports
- **Custom dashboards:** Personalized dashboards with widgets and KPIs
- **Pre-built templates:** Library of industry-standard reports for solar, wind, BESS operations
- **Scheduled reports:** Automated generation and distribution (daily, weekly, monthly)
- **Multi-format export:** CSV, PDF, Excel, JSON with custom formatting
- **Interactive visualizations:** Charts, graphs, heatmaps, trend analysis
- **Ad-hoc queries:** SQL-like query builder for data exploration
- **Role-based access:** Report visibility based on user roles and data permissions

### 1.3 User Personas

```yaml
personas:
  operations_manager:
    needs:
      - "Daily production summary dashboard"
      - "Weekly maintenance KPIs"
      - "Monthly availability reports for asset owners"
    technical_skill: medium

  field_technician:
    needs:
      - "My assigned work orders"
      - "Equipment history for troubleshooting"
      - "Safety checklist completion status"
    technical_skill: low

  asset_owner:
    needs:
      - "Monthly generation and revenue reports"
      - "Performance ratio trends"
      - "Compliance status dashboard"
    technical_skill: low

  data_analyst:
    needs:
      - "Ad-hoc data queries"
      - "Custom metric calculations"
      - "Raw data exports for external analysis"
    technical_skill: high

  compliance_officer:
    needs:
      - "Regulatory submission reports"
      - "Audit trail summaries"
      - "Document retention status"
    technical_skill: medium
```

---

## 2. Report Builder

### 2.1 Report Builder UI

```
┌─────────────────────────────────────────────────────────────────┐
│ dCMMS - Report Builder                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┬─────────────────────────────────────────┐ │
│  │ Data Sources    │ Report Canvas                           │ │
│  ├─────────────────┤                                         │ │
│  │ 📊 Work Orders  │  [Report Title]                         │ │
│  │ ⚡ Assets       │  Monthly Work Order Summary             │ │
│  │ 📈 Telemetry    │                                         │ │
│  │ 👤 Users        │  Filters:                               │ │
│  │ 📍 Sites        │  [Site: All ▼] [Status: All ▼]         │ │
│  │ 📋 Inventory    │  [Date Range: Last 30 Days ▼]          │ │
│  │ 🔔 Alerts       │                                         │ │
│  │ 📄 Compliance   │  Columns:                               │ │
│  └─────────────────┤  ┌─────────────────────────────────┐   │ │
│                    │  │ Work Order ID                   │   │ │
│  Fields:           │  │ Type                            │   │ │
│  ┌───────────────┐ │  │ Status                          │   │ │
│  │ Work Order ID │ │  │ Priority                        │   │ │
│  │ Type          │ │  │ Assigned To                     │   │ │
│  │ Status        │ │  │ Created Date                    │   │ │
│  │ Priority      │ │  │ Completed Date                  │   │ │
│  │ Assigned To   │ │  └─────────────────────────────────┘   │ │
│  │ Created Date  │ │                                         │ │
│  │ Completed Date│ │  Grouping: [Type ▼]                    │ │
│  └───────────────┘ │  Sorting: [Created Date ▼] [Desc ▼]   │ │
│  (Drag to canvas) │                                         │ │
│                    │  Visualization:                         │ │
│  Calculations:     │  [○ Table  ○ Chart  ○ Both]            │ │
│  ┌───────────────┐ │                                         │ │
│  │ + Add Formula │ │  Chart Type: [Bar Chart ▼]             │ │
│  │ SUM           │ │  X-Axis: [Type]                         │ │
│  │ AVG           │ │  Y-Axis: [Count]                        │ │
│  │ COUNT         │ │                                         │ │
│  │ MIN/MAX       │ │                                         │ │
│  └───────────────┘ │                                         │ │
│                    │  [Preview Report] [Save] [Schedule]     │ │
│  └─────────────────┴─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Report Definition Schema

```json
{
  "reportId": "RPT-CUSTOM-001",
  "name": "Monthly Work Order Summary",
  "description": "Summary of work orders by type and status for monthly operations review",
  "createdBy": "user-ops-mgr-001",
  "createdAt": "2025-11-11T10:00:00Z",
  "tenantId": "tenant-acme-solar",
  "category": "operations",
  "visibility": "team",

  "dataSource": {
    "primary": "work_orders",
    "joins": [
      {
        "source": "users",
        "type": "left",
        "on": "work_orders.assignedTo = users.userId"
      },
      {
        "source": "assets",
        "type": "left",
        "on": "work_orders.assetId = assets.assetId"
      }
    ]
  },

  "filters": [
    {
      "field": "work_orders.createdAt",
      "operator": "between",
      "value": ["{{report_start_date}}", "{{report_end_date}}"],
      "parameterized": true
    },
    {
      "field": "work_orders.siteId",
      "operator": "in",
      "value": ["{{user_accessible_sites}}"],
      "dynamicValue": true
    },
    {
      "field": "work_orders.status",
      "operator": "in",
      "value": ["completed", "in_progress", "on_hold"],
      "optional": true
    }
  ],

  "columns": [
    {
      "id": "col_1",
      "field": "work_orders.workOrderId",
      "label": "Work Order ID",
      "dataType": "string",
      "visible": true
    },
    {
      "id": "col_2",
      "field": "work_orders.type",
      "label": "Type",
      "dataType": "enum",
      "visible": true
    },
    {
      "id": "col_3",
      "field": "work_orders.status",
      "label": "Status",
      "dataType": "enum",
      "visible": true,
      "formatting": {
        "type": "badge",
        "colorMap": {
          "completed": "green",
          "in_progress": "blue",
          "on_hold": "orange",
          "cancelled": "red"
        }
      }
    },
    {
      "id": "col_4",
      "field": "work_orders.priority",
      "label": "Priority",
      "dataType": "enum",
      "visible": true
    },
    {
      "id": "col_5",
      "field": "users.name",
      "label": "Assigned To",
      "dataType": "string",
      "visible": true
    },
    {
      "id": "col_6",
      "field": "work_orders.createdAt",
      "label": "Created",
      "dataType": "datetime",
      "visible": true,
      "formatting": {
        "type": "date",
        "format": "MMM DD, YYYY"
      }
    },
    {
      "id": "col_7",
      "field": "work_orders.completedAt",
      "label": "Completed",
      "dataType": "datetime",
      "visible": true,
      "formatting": {
        "type": "date",
        "format": "MMM DD, YYYY"
      }
    },
    {
      "id": "col_8",
      "field": "CALCULATED",
      "label": "Days to Complete",
      "dataType": "number",
      "formula": "DATEDIFF(work_orders.completedAt, work_orders.createdAt)",
      "visible": true,
      "formatting": {
        "type": "number",
        "decimals": 1,
        "suffix": " days"
      }
    }
  ],

  "groupBy": ["work_orders.type"],

  "aggregations": [
    {
      "field": "work_orders.workOrderId",
      "function": "count",
      "label": "Total Work Orders"
    },
    {
      "field": "CALCULATED.days_to_complete",
      "function": "avg",
      "label": "Avg Days to Complete"
    }
  ],

  "sorting": [
    {
      "field": "work_orders.createdAt",
      "direction": "desc"
    }
  ],

  "visualization": {
    "type": "table_and_chart",
    "chartType": "bar",
    "chartConfig": {
      "xAxis": "work_orders.type",
      "yAxis": "COUNT(work_orders.workOrderId)",
      "series": [
        {
          "field": "work_orders.status",
          "aggregation": "count",
          "label": "Status"
        }
      ]
    }
  },

  "pagination": {
    "enabled": true,
    "pageSize": 50
  }
}
```

### 2.3 Report Execution Engine

```javascript
class ReportExecutionEngine {
  async executeReport(reportDef, parameters) {
    const startTime = Date.now();

    // Resolve parameters
    const resolvedFilters = await this.resolveParameters(reportDef.filters, parameters);

    // Build SQL query
    const query = this.buildQuery(reportDef, resolvedFilters);

    // Execute query
    const rawData = await this.executeQuery(query);

    // Apply aggregations if grouped
    const processedData = reportDef.groupBy
      ? this.applyAggregations(rawData, reportDef.groupBy, reportDef.aggregations)
      : rawData;

    // Apply calculated columns
    const dataWithCalculations = this.applyCalculations(processedData, reportDef.columns);

    // Apply sorting
    const sortedData = this.applySorting(dataWithCalculations, reportDef.sorting);

    // Generate visualization data
    const vizData = reportDef.visualization
      ? this.generateVisualizationData(sortedData, reportDef.visualization)
      : null;

    const executionTime = Date.now() - startTime;

    return {
      data: sortedData,
      visualization: vizData,
      metadata: {
        reportId: reportDef.reportId,
        executedAt: new Date(),
        executionTimeMs: executionTime,
        rowCount: sortedData.length,
        parameters
      }
    };
  }

  buildQuery(reportDef, resolvedFilters) {
    const { dataSource, columns, groupBy, aggregations } = reportDef;

    let sql = 'SELECT ';

    // Select columns
    const selectClauses = [];

    if (groupBy && groupBy.length > 0) {
      // Grouped query - select group by fields and aggregations
      groupBy.forEach(field => selectClauses.push(field));
      aggregations.forEach(agg => {
        selectClauses.push(`${agg.function}(${agg.field}) AS ${this.sanitizeAlias(agg.label)}`);
      });
    } else {
      // Non-grouped query - select all columns
      columns
        .filter(col => !col.field.startsWith('CALCULATED'))
        .forEach(col => selectClauses.push(`${col.field} AS ${this.sanitizeAlias(col.label)}`));
    }

    sql += selectClauses.join(', ');

    // FROM clause
    sql += ` FROM ${dataSource.primary}`;

    // JOIN clauses
    if (dataSource.joins) {
      dataSource.joins.forEach(join => {
        sql += ` ${join.type.toUpperCase()} JOIN ${join.source} ON ${join.on}`;
      });
    }

    // WHERE clause
    if (resolvedFilters.length > 0) {
      const whereClauses = resolvedFilters.map(filter =>
        this.buildFilterClause(filter)
      );
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    // GROUP BY clause
    if (groupBy && groupBy.length > 0) {
      sql += ' GROUP BY ' + groupBy.join(', ');
    }

    return sql;
  }

  buildFilterClause(filter) {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'equals':
        return `${field} = '${value}'`;
      case 'in':
        return `${field} IN (${value.map(v => `'${v}'`).join(', ')})`;
      case 'between':
        return `${field} BETWEEN '${value[0]}' AND '${value[1]}'`;
      case 'greater_than':
        return `${field} > ${value}`;
      case 'less_than':
        return `${field} < ${value}`;
      case 'contains':
        return `${field} LIKE '%${value}%'`;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  async resolveParameters(filters, parameters) {
    return await Promise.all(filters.map(async filter => {
      if (filter.parameterized && parameters[filter.field]) {
        return { ...filter, value: parameters[filter.field] };
      } else if (filter.dynamicValue) {
        // Resolve dynamic values (e.g., user's accessible sites)
        const resolved = await this.resolveDynamicValue(filter.value, parameters.userId);
        return { ...filter, value: resolved };
      } else {
        return filter;
      }
    }));
  }

  applyCalculations(data, columns) {
    const calculatedCols = columns.filter(col => col.field === 'CALCULATED');

    return data.map(row => {
      const calculated = {};

      calculatedCols.forEach(col => {
        calculated[col.label] = this.evaluateFormula(col.formula, row);
      });

      return { ...row, ...calculated };
    });
  }

  evaluateFormula(formula, row) {
    // Simple formula evaluator
    // Supports: DATEDIFF, SUM, AVG, etc.

    if (formula.startsWith('DATEDIFF')) {
      const match = formula.match(/DATEDIFF\(([^,]+),\s*([^)]+)\)/);
      const date1 = this.resolveFieldValue(match[1], row);
      const date2 = this.resolveFieldValue(match[2], row);

      if (!date1 || !date2) return null;

      return (new Date(date1) - new Date(date2)) / (1000 * 60 * 60 * 24);
    }

    // Add more formula types as needed
  }
}
```

---

## 3. Custom Dashboards

### 3.1 Dashboard Builder

```json
{
  "dashboardId": "DASH-OPS-001",
  "name": "Operations Manager Dashboard",
  "description": "Real-time operational KPIs and alerts",
  "createdBy": "user-ops-mgr-001",
  "tenantId": "tenant-acme-solar",
  "layout": "grid",
  "refreshInterval": 300,

  "widgets": [
    {
      "widgetId": "widget_1",
      "type": "kpi_card",
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
      "title": "Active Alerts",
      "config": {
        "dataSource": "alerts",
        "metric": "count",
        "filters": [{ "field": "status", "operator": "equals", "value": "active" }],
        "threshold": {
          "warning": 5,
          "critical": 10
        },
        "icon": "alert-triangle",
        "color": "dynamic"
      }
    },

    {
      "widgetId": "widget_2",
      "type": "kpi_card",
      "position": { "x": 3, "y": 0, "w": 3, "h": 2 },
      "title": "Open Work Orders",
      "config": {
        "dataSource": "work_orders",
        "metric": "count",
        "filters": [
          { "field": "status", "operator": "in", "value": ["draft", "in_progress"] }
        ],
        "comparison": {
          "type": "previous_period",
          "period": "week"
        },
        "icon": "clipboard",
        "color": "blue"
      }
    },

    {
      "widgetId": "widget_3",
      "type": "chart",
      "position": { "x": 0, "y": 2, "w": 6, "h": 4 },
      "title": "Daily Generation (Last 7 Days)",
      "config": {
        "chartType": "line",
        "dataSource": "telemetry",
        "metric": "active_power",
        "aggregation": {
          "function": "sum",
          "interval": "1 day"
        },
        "timeRange": "last_7_days",
        "xAxis": "timestamp",
        "yAxis": "value",
        "series": [
          {
            "field": "siteId",
            "label": "Site"
          }
        ]
      }
    },

    {
      "widgetId": "widget_4",
      "type": "table",
      "position": { "x": 6, "y": 0, "w": 6, "h": 6 },
      "title": "Recent Critical Alerts",
      "config": {
        "dataSource": "alerts",
        "columns": ["alertId", "ruleName", "assetName", "severity", "triggeredAt"],
        "filters": [
          { "field": "severity", "operator": "equals", "value": "critical" }
        ],
        "sorting": [{ "field": "triggeredAt", "direction": "desc" }],
        "pageSize": 10,
        "actions": [
          {
            "label": "Acknowledge",
            "endpoint": "/api/v1/alerts/{alertId}/acknowledge",
            "method": "POST"
          }
        ]
      }
    },

    {
      "widgetId": "widget_5",
      "type": "gauge",
      "position": { "x": 6, "y": 6, "w": 3, "h": 3 },
      "title": "Overall Equipment Availability",
      "config": {
        "dataSource": "assets",
        "calculation": "(SUM(operational_hours) / SUM(total_hours)) * 100",
        "timeRange": "this_month",
        "unit": "%",
        "ranges": [
          { "min": 0, "max": 80, "color": "red", "label": "Poor" },
          { "min": 80, "max": 95, "color": "orange", "label": "Fair" },
          { "min": 95, "max": 100, "color": "green", "label": "Excellent" }
        ]
      }
    },

    {
      "widgetId": "widget_6",
      "type": "pie",
      "position": { "x": 9, "y": 6, "w": 3, "h": 3 },
      "title": "Work Orders by Type",
      "config": {
        "dataSource": "work_orders",
        "groupBy": "type",
        "metric": "count",
        "filters": [
          { "field": "createdAt", "operator": "between", "value": ["{{this_month_start}}", "{{this_month_end}}"] }
        ]
      }
    }
  ],

  "permissions": {
    "viewRoles": ["operations_manager", "site_manager", "operations_director"],
    "editRoles": ["operations_manager"]
  }
}
```

### 3.2 Dashboard Rendering Engine

```javascript
class DashboardRenderer {
  async renderDashboard(dashboardDef, userId) {
    // Check permissions
    await this.checkPermissions(dashboardDef, userId);

    // Fetch data for all widgets in parallel
    const widgetDataPromises = dashboardDef.widgets.map(widget =>
      this.fetchWidgetData(widget, userId)
    );

    const widgetDataResults = await Promise.all(widgetDataPromises);

    // Combine dashboard definition with data
    const renderedWidgets = dashboardDef.widgets.map((widget, index) => ({
      ...widget,
      data: widgetDataResults[index]
    }));

    return {
      ...dashboardDef,
      widgets: renderedWidgets,
      renderedAt: new Date()
    };
  }

  async fetchWidgetData(widget, userId) {
    const { type, config } = widget;

    switch (type) {
      case 'kpi_card':
        return await this.fetchKPIData(config, userId);

      case 'chart':
      case 'line':
      case 'bar':
      case 'pie':
        return await this.fetchChartData(config, userId);

      case 'table':
        return await this.fetchTableData(config, userId);

      case 'gauge':
        return await this.fetchGaugeData(config, userId);

      default:
        throw new Error(`Unknown widget type: ${type}`);
    }
  }

  async fetchKPIData(config, userId) {
    const { dataSource, metric, filters, comparison } = config;

    // Apply user's data access filters
    const userFilters = await this.getUserDataFilters(userId, dataSource);
    const allFilters = [...filters, ...userFilters];

    // Fetch current value
    const currentValue = await this.executeAggregation(dataSource, metric, allFilters);

    // Fetch comparison value if configured
    let comparisonValue = null;
    let change = null;

    if (comparison) {
      const comparisonFilters = this.adjustFiltersForComparison(allFilters, comparison);
      comparisonValue = await this.executeAggregation(dataSource, metric, comparisonFilters);

      change = {
        absolute: currentValue - comparisonValue,
        percentage: ((currentValue - comparisonValue) / comparisonValue) * 100
      };
    }

    return {
      value: currentValue,
      comparison: comparisonValue,
      change,
      timestamp: new Date()
    };
  }

  async executeAggregation(dataSource, metric, filters) {
    const whereClause = filters.map(f => this.buildFilterClause(f)).join(' AND ');

    let sql;
    if (metric === 'count') {
      sql = `SELECT COUNT(*) as value FROM ${dataSource}`;
    } else if (metric === 'sum') {
      sql = `SELECT SUM(${metric}) as value FROM ${dataSource}`;
    } else if (metric === 'avg') {
      sql = `SELECT AVG(${metric}) as value FROM ${dataSource}`;
    }

    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    const result = await db.query(sql);
    return result[0]?.value || 0;
  }
}
```

---

## 4. Pre-Built Report Templates

### 4.1 Template Library

```yaml
report_templates:
  operations:
    - template_id: "TPL-DAILY-PRODUCTION"
      name: "Daily Production Summary"
      description: "Daily generation, availability, and performance metrics"
      industry: ["solar", "wind", "bess"]
      frequency: "daily"

    - template_id: "TPL-WEEKLY-MAINTENANCE"
      name: "Weekly Maintenance KPIs"
      description: "Work order completion, MTTR, preventive vs corrective ratio"
      industry: ["solar", "wind", "bess"]
      frequency: "weekly"

    - template_id: "TPL-MONTHLY-AVAILABILITY"
      name: "Monthly Availability Report"
      description: "Asset availability, downtime analysis, outage summary"
      industry: ["solar", "wind", "bess"]
      frequency: "monthly"

  asset_management:
    - template_id: "TPL-ASSET-HEALTH"
      name: "Asset Health Scorecard"
      description: "Asset condition, health scores, predictive maintenance alerts"
      industry: ["solar", "wind", "bess"]
      frequency: "weekly"

    - template_id: "TPL-INVENTORY-STATUS"
      name: "Inventory Status Report"
      description: "Stock levels, reorder alerts, consumption trends"
      industry: ["solar", "wind", "bess"]
      frequency: "weekly"

  financial:
    - template_id: "TPL-REVENUE-ANALYSIS"
      name: "Monthly Revenue Analysis"
      description: "Generation revenue, PPA rates, merchant exposure"
      industry: ["solar", "wind", "bess"]
      frequency: "monthly"

    - template_id: "TPL-OPEX-SUMMARY"
      name: "OPEX Summary"
      description: "Operating expenses by category, budget variance"
      industry: ["solar", "wind", "bess"]
      frequency: "monthly"

  compliance:
    - template_id: "TPL-SAFETY-METRICS"
      name: "Safety Metrics Dashboard"
      description: "TRIR, LTIR, near-miss incidents, safety training status"
      industry: ["solar", "wind", "bess"]
      frequency: "monthly"

    - template_id: "TPL-ENVIRONMENTAL"
      name: "Environmental Impact Report"
      description: "CO2 avoided, water usage (CSP), land use"
      industry: ["solar", "wind"]
      frequency: "quarterly"

  performance:
    - template_id: "TPL-PERFORMANCE-RATIO"
      name: "Performance Ratio Analysis"
      description: "PR trends, losses breakdown, underperformance investigation"
      industry: ["solar"]
      frequency: "monthly"

    - template_id: "TPL-WIND-TURBINE-PERF"
      name: "Wind Turbine Performance"
      description: "Capacity factor, power curve analysis, yaw misalignment"
      industry: ["wind"]
      frequency: "monthly"

    - template_id: "TPL-BESS-CYCLING"
      name: "BESS Cycling and Degradation"
      description: "Charge/discharge cycles, SOH, capacity fade"
      industry: ["bess"]
      frequency: "monthly"
```

### 4.2 Example Template: Daily Production Summary

```json
{
  "templateId": "TPL-DAILY-PRODUCTION",
  "name": "Daily Production Summary",
  "category": "operations",
  "industry": ["solar", "wind", "bess"],

  "sections": [
    {
      "sectionId": "summary",
      "title": "Generation Summary",
      "type": "kpi_grid",
      "metrics": [
        {
          "label": "Total Generation",
          "dataSource": "telemetry",
          "metric": "active_power",
          "aggregation": "sum",
          "unit": "MWh",
          "decimals": 2
        },
        {
          "label": "Peak Power",
          "dataSource": "telemetry",
          "metric": "active_power",
          "aggregation": "max",
          "unit": "MW",
          "decimals": 2
        },
        {
          "label": "Average Irradiation",
          "dataSource": "telemetry",
          "metric": "poa_irradiance",
          "aggregation": "avg",
          "unit": "W/m²",
          "decimals": 1
        },
        {
          "label": "Performance Ratio",
          "calculation": "(actual_generation / expected_generation) * 100",
          "unit": "%",
          "decimals": 2
        },
        {
          "label": "Availability",
          "calculation": "(available_hours / 24) * 100",
          "unit": "%",
          "decimals": 2
        }
      ]
    },

    {
      "sectionId": "generation_chart",
      "title": "Hourly Generation Profile",
      "type": "chart",
      "chartType": "line",
      "xAxis": "hour",
      "yAxis": "generation_mw",
      "series": ["actual", "expected"]
    },

    {
      "sectionId": "alerts",
      "title": "Active Alerts",
      "type": "table",
      "dataSource": "alerts",
      "filters": [
        { "field": "status", "operator": "equals", "value": "active" },
        { "field": "triggeredAt", "operator": "between", "value": ["{{report_date_start}}", "{{report_date_end}}"] }
      ],
      "columns": ["alertId", "ruleName", "assetName", "severity", "triggeredAt"],
      "sorting": [{ "field": "severity", "direction": "desc" }]
    },

    {
      "sectionId": "outages",
      "title": "Outages and Downtime",
      "type": "table",
      "dataSource": "outages",
      "columns": ["outageId", "assetName", "startTime", "duration", "cause", "generation_loss_mwh"]
    }
  ],

  "parameters": [
    {
      "name": "report_date",
      "label": "Report Date",
      "type": "date",
      "required": true,
      "default": "{{yesterday}}"
    },
    {
      "name": "siteId",
      "label": "Site",
      "type": "dropdown",
      "dataSource": "sites",
      "required": false
    }
  ],

  "exportFormats": ["pdf", "excel", "csv"]
}
```

---

## 5. Scheduled Reports

### 5.1 Schedule Configuration

```json
{
  "scheduleId": "SCHED-001",
  "reportId": "RPT-DAILY-PROD",
  "name": "Daily Production Report - Auto Send",
  "enabled": true,
  "tenantId": "tenant-acme-solar",

  "schedule": {
    "frequency": "daily",
    "time": "08:00",
    "timezone": "America/Phoenix",
    "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    "daysOfMonth": null,
    "excludeHolidays": false
  },

  "parameters": {
    "report_date": "{{yesterday}}",
    "siteId": "SITE-AZ-001"
  },

  "distribution": {
    "method": "email",
    "recipients": [
      {
        "type": "user",
        "userId": "user-ops-mgr-001"
      },
      {
        "type": "role",
        "role": "site_manager"
      },
      {
        "type": "email",
        "email": "assetowner@example.com"
      }
    ],
    "subject": "Daily Production Report - {{report_date}}",
    "body": "Please find attached the daily production report for {{site_name}} on {{report_date}}.",
    "attachmentFormat": "pdf"
  },

  "retentionDays": 90,

  "failureHandling": {
    "retryCount": 3,
    "retryDelay": "5m",
    "notifyOnFailure": ["user-ops-mgr-001"]
  }
}
```

### 5.2 Scheduled Report Executor

```javascript
class ScheduledReportExecutor {
  constructor() {
    this.scheduler = new CronScheduler();
  }

  async registerSchedule(schedule) {
    const cronExpression = this.toCronExpression(schedule.schedule);

    this.scheduler.schedule(cronExpression, async () => {
      await this.executeScheduledReport(schedule);
    });
  }

  async executeScheduledReport(schedule) {
    const execution = {
      executionId: uuidv4(),
      scheduleId: schedule.scheduleId,
      status: 'running',
      startedAt: new Date()
    };

    await db.reportExecutions.insert(execution);

    try {
      // Resolve parameters
      const resolvedParams = this.resolveParameters(schedule.parameters);

      // Generate report
      const report = await reportEngine.execute(schedule.reportId, resolvedParams);

      // Export to configured format
      const exportedFile = await this.exportReport(report, schedule.distribution.attachmentFormat);

      // Distribute report
      await this.distributeReport(schedule, exportedFile, resolvedParams);

      // Update execution status
      await db.reportExecutions.update(
        { executionId: execution.executionId },
        {
          status: 'completed',
          completedAt: new Date(),
          reportFileUrl: exportedFile.url
        }
      );

      // Clean up old reports based on retention
      await this.cleanupOldReports(schedule.scheduleId, schedule.retentionDays);

    } catch (error) {
      await this.handleExecutionFailure(execution, schedule, error);
    }
  }

  async distributeReport(schedule, exportedFile, parameters) {
    const { distribution } = schedule;

    // Resolve recipients
    const recipients = await this.resolveRecipients(distribution.recipients);

    // Render email template
    const subject = this.renderTemplate(distribution.subject, parameters);
    const body = this.renderTemplate(distribution.body, parameters);

    // Send emails
    for (const recipient of recipients) {
      await emailService.send({
        to: recipient.email,
        subject,
        body,
        attachments: [
          {
            filename: `${schedule.name}_${format(new Date(), 'yyyy-MM-dd')}.${exportedFile.format}`,
            path: exportedFile.url
          }
        ]
      });
    }
  }

  toCronExpression(schedule) {
    const { frequency, time, daysOfWeek, daysOfMonth } = schedule;

    const [hour, minute] = time.split(':');

    if (frequency === 'daily') {
      return `${minute} ${hour} * * *`;
    } else if (frequency === 'weekly') {
      const dayNumbers = daysOfWeek.map(d => this.dayToCronNumber(d)).join(',');
      return `${minute} ${hour} * * ${dayNumbers}`;
    } else if (frequency === 'monthly') {
      const days = daysOfMonth.join(',');
      return `${minute} ${hour} ${days} * *`;
    }
  }
}
```

---

## 6. Export Formats

### 6.1 PDF Export

```javascript
class PDFReportExporter {
  async export(report, template) {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Header
    doc.fontSize(20).text(report.name, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${format(new Date(), 'MMM DD, YYYY HH:mm')}`, { align: 'center' });
    doc.moveDown(2);

    // Render sections
    for (const section of template.sections) {
      if (section.type === 'kpi_grid') {
        this.renderKPIGrid(doc, section, report.data[section.sectionId]);
      } else if (section.type === 'chart') {
        await this.renderChart(doc, section, report.data[section.sectionId]);
      } else if (section.type === 'table') {
        this.renderTable(doc, section, report.data[section.sectionId]);
      }

      doc.moveDown(2);
    }

    // Footer
    doc.fontSize(8).text(`Page ${doc.bufferedPageRange().count}`, { align: 'center' });

    return doc;
  }

  renderKPIGrid(doc, section, data) {
    doc.fontSize(14).text(section.title, { underline: true });
    doc.moveDown();

    const metrics = section.metrics;
    const cols = 3;
    const cellWidth = (doc.page.width - 100) / cols;

    metrics.forEach((metric, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = 50 + (col * cellWidth);
      const y = doc.y + (row === 0 ? 0 : 60);

      doc.fontSize(10).text(metric.label, x, y);
      doc.fontSize(18).text(`${data[metric.label].value} ${metric.unit}`, x, y + 15);

      if (data[metric.label].change) {
        const change = data[metric.label].change.percentage;
        const color = change >= 0 ? 'green' : 'red';
        doc.fontSize(10).fillColor(color).text(`${change > 0 ? '+' : ''}${change.toFixed(1)}%`, x, y + 35);
        doc.fillColor('black');
      }
    });

    doc.moveDown(4);
  }

  async renderChart(doc, section, data) {
    const ChartJSNodeCanvas = require('chartjs-node-canvas');
    const chartCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });

    const chartConfig = {
      type: section.chartType,
      data: {
        labels: data.labels,
        datasets: data.datasets
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: section.title
          }
        }
      }
    };

    const imageBuffer = await chartCanvas.renderToBuffer(chartConfig);

    doc.image(imageBuffer, { fit: [500, 300] });
  }

  renderTable(doc, section, data) {
    doc.fontSize(14).text(section.title, { underline: true });
    doc.moveDown();

    const table = {
      headers: section.columns.map(c => c.label),
      rows: data.rows.map(row => section.columns.map(col => row[col.field]))
    };

    // Simple table rendering
    const cellPadding = 5;
    const cellWidth = (doc.page.width - 100) / table.headers.length;

    // Headers
    doc.fontSize(10).fillColor('#333');
    table.headers.forEach((header, i) => {
      doc.text(header, 50 + (i * cellWidth), doc.y, { width: cellWidth, align: 'left' });
    });

    doc.moveDown();

    // Rows
    table.rows.slice(0, 20).forEach(row => {
      row.forEach((cell, i) => {
        doc.text(String(cell), 50 + (i * cellWidth), doc.y, { width: cellWidth, align: 'left' });
      });
      doc.moveDown(0.5);
    });
  }
}
```

### 6.2 Excel Export

```javascript
class ExcelReportExporter {
  async export(report, template) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Create sheets for each section
    for (const section of template.sections) {
      const worksheet = workbook.addWorksheet(section.title);

      if (section.type === 'kpi_grid') {
        this.renderKPISheet(worksheet, section, report.data[section.sectionId]);
      } else if (section.type === 'table') {
        this.renderTableSheet(worksheet, section, report.data[section.sectionId]);
      } else if (section.type === 'chart') {
        this.renderChartSheet(worksheet, section, report.data[section.sectionId]);
      }
    }

    return workbook;
  }

  renderKPISheet(worksheet, section, data) {
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Change', key: 'change', width: 15 }
    ];

    section.metrics.forEach(metric => {
      worksheet.addRow({
        metric: metric.label,
        value: data[metric.label].value,
        unit: metric.unit,
        change: data[metric.label].change ? `${data[metric.label].change.percentage.toFixed(1)}%` : '-'
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  renderTableSheet(worksheet, section, data) {
    worksheet.columns = section.columns.map(col => ({
      header: col.label,
      key: col.field,
      width: 15
    }));

    data.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }
}
```

---

## 7. Data Visualization

### 7.1 Chart Types

```yaml
chart_types:
  line:
    use_cases: ["time series", "trends", "comparisons over time"]
    best_for: "continuous data"
    examples: ["daily generation", "temperature trends", "voltage profile"]

  bar:
    use_cases: ["categorical comparisons", "rankings"]
    best_for: "discrete categories"
    examples: ["work orders by type", "alerts by severity", "generation by site"]

  pie:
    use_cases: ["part-to-whole relationships", "percentage breakdowns"]
    best_for: "composition (< 7 categories)"
    examples: ["downtime causes", "work order status distribution"]

  scatter:
    use_cases: ["correlation analysis", "outlier detection"]
    best_for: "relationship between two variables"
    examples: ["PR vs irradiation", "temperature vs generation loss"]

  heatmap:
    use_cases: ["time-of-day patterns", "correlation matrices"]
    best_for: "multi-dimensional data"
    examples: ["generation by hour-of-day and month", "asset failure patterns"]

  gauge:
    use_cases: ["single metric status", "threshold visualization"]
    best_for: "KPIs with ranges"
    examples: ["availability %", "performance ratio", "inventory level"]

  area:
    use_cases: ["cumulative totals", "stacked comparisons"]
    best_for: "volume over time"
    examples: ["cumulative generation", "stacked work order backlog"]

  waterfall:
    use_cases: ["sequential changes", "loss analysis"]
    best_for: "bridging start to end values"
    examples: ["PR loss breakdown", "budget variance analysis"]
```

### 7.2 Interactive Charts

```javascript
// Frontend: Chart.js configuration
const generateionChartConfig = {
  type: 'line',
  data: {
    labels: report.data.labels, // Dates
    datasets: [
      {
        label: 'Actual Generation',
        data: report.data.actual,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Expected Generation',
        data: report.data.expected,
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.1
      }
    ]
  },
  options: {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      title: {
        display: true,
        text: 'Daily Generation Comparison'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} MWh`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x'
        },
        pan: {
          enabled: true,
          mode: 'x'
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Generation (MWh)'
        }
      }
    }
  }
};
```

---

## 8. Ad-Hoc Query Builder

### 8.1 Query Builder UI

```
┌─────────────────────────────────────────────────────────────────┐
│ dCMMS - Query Builder                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SELECT                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [work_orders.workOrderId ▼]  Alias: [WO ID      ]      │   │
│  │ [work_orders.type ▼]          Alias: [Type       ]      │   │
│  │ [assets.assetName ▼]          Alias: [Asset      ]      │   │
│  │ [+ Add Column]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FROM                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [work_orders ▼]                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  JOIN                                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LEFT JOIN ▼] [assets ▼]                                │   │
│  │ ON [work_orders.assetId ▼] = [assets.assetId ▼]         │   │
│  │ [+ Add Join]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  WHERE                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [work_orders.status ▼] [IN ▼] [completed, in_progress]  │   │
│  │ AND [work_orders.createdAt ▼] [>= ▼] [2025-11-01]       │   │
│  │ [+ Add Condition]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  GROUP BY  [work_orders.type ▼]                                │
│  ORDER BY  [work_orders.createdAt ▼] [DESC ▼]                  │
│  LIMIT     [100 ]                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SQL Preview:                                             │   │
│  │                                                          │   │
│  │ SELECT                                                   │   │
│  │   work_orders.workOrderId AS "WO ID",                   │   │
│  │   work_orders.type AS "Type",                           │   │
│  │   assets.assetName AS "Asset"                           │   │
│  │ FROM work_orders                                         │   │
│  │ LEFT JOIN assets ON work_orders.assetId = assets.assetId│   │
│  │ WHERE work_orders.status IN ('completed', 'in_progress')│   │
│  │   AND work_orders.createdAt >= '2025-11-01'             │   │
│  │ GROUP BY work_orders.type                                │   │
│  │ ORDER BY work_orders.createdAt DESC                      │   │
│  │ LIMIT 100                                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Execute Query] [Save as Report] [Export Results]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Query Validation and Security

```javascript
class QueryValidator {
  validateQuery(query) {
    const errors = [];

    // Prevent SQL injection
    if (this.containsSQLInjection(query)) {
      errors.push('Query contains potentially malicious SQL');
    }

    // Check table access permissions
    const tables = this.extractTables(query);
    tables.forEach(table => {
      if (!this.userHasTableAccess(table, query.userId)) {
        errors.push(`Access denied to table: ${table}`);
      }
    });

    // Enforce row-level security filters
    const missingFilters = this.checkRowLevelSecurity(query);
    if (missingFilters.length > 0) {
      errors.push(`Missing required filters: ${missingFilters.join(', ')}`);
    }

    // Limit result set size
    if (!query.limit || query.limit > 10000) {
      errors.push('Query must include LIMIT <= 10000');
    }

    // Prevent expensive operations
    if (this.isExpensiveQuery(query)) {
      errors.push('Query may be too expensive to execute');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  containsSQLInjection(query) {
    const dangerousPatterns = [
      /;\s*DROP/i,
      /;\s*DELETE/i,
      /;\s*UPDATE/i,
      /;\s*INSERT/i,
      /;\s*EXEC/i,
      /;\s*EXECUTE/i,
      /UNION.*SELECT/i,
      /--/,
      /\/\*/
    ];

    return dangerousPatterns.some(pattern => pattern.test(query.sql));
  }

  checkRowLevelSecurity(query) {
    const user = query.user;
    const missingFilters = [];

    // Enforce tenant isolation
    if (!query.sql.includes(`tenantId = '${user.tenantId}'`)) {
      missingFilters.push(`tenantId = '${user.tenantId}'`);
    }

    // Enforce site access for non-admins
    if (user.role !== 'system_admin' && !query.sql.includes('siteId IN')) {
      missingFilters.push(`siteId IN (${user.accessibleSites.join(', ')})`);
    }

    return missingFilters;
  }
}
```

---

## 9. Report Distribution

### 9.1 Distribution Channels

```yaml
distribution_channels:
  email:
    formats: ["pdf", "excel", "csv"]
    max_attachment_size: "25 MB"
    recipients: ["users", "roles", "external_emails"]

  slack:
    formats: ["link", "inline_table", "image"]
    channels: ["#operations", "#alerts"]
    mentions: ["@channel", "@user"]

  teams:
    formats: ["adaptive_card", "link"]
    channels: ["Operations Team", "Management"]

  api_webhook:
    formats: ["json", "xml"]
    authentication: ["bearer_token", "api_key", "hmac"]

  shared_folder:
    locations: ["s3", "sharepoint", "google_drive"]
    formats: ["pdf", "excel", "csv"]
    access_control: "role_based"

  portal:
    access: "role_based"
    retention: "configurable"
    notifications: ["new_report", "report_ready"]
```

### 9.2 Report Sharing

```javascript
class ReportSharingService {
  async shareReport(reportId, sharing Config) {
    const report = await db.reports.findOne({ reportId });

    // Generate shareable link
    const shareToken = crypto.randomBytes(32).toString('hex');

    const share = {
      shareId: uuidv4(),
      reportId,
      shareToken,
      sharedBy: sharingConfig.userId,
      sharedAt: new Date(),
      expiresAt: sharingConfig.expiresAt || addDays(new Date(), 7),
      accessType: sharingConfig.accessType, // view, download
      passwordProtected: !!sharingConfig.password,
      password: sharingConfig.password ? await bcrypt.hash(sharingConfig.password, 10) : null,
      maxViews: sharingConfig.maxViews || null,
      viewCount: 0
    };

    await db.reportShares.insert(share);

    const shareUrl = `https://dcmms.company.com/reports/shared/${shareToken}`;

    return {
      shareUrl,
      expiresAt: share.expiresAt,
      shareId: share.shareId
    };
  }

  async accessSharedReport(shareToken, password) {
    const share = await db.reportShares.findOne({ shareToken });

    if (!share) {
      throw new Error('Share not found');
    }

    // Check expiration
    if (new Date() > share.expiresAt) {
      throw new Error('Share expired');
    }

    // Check max views
    if (share.maxViews && share.viewCount >= share.maxViews) {
      throw new Error('Maximum views exceeded');
    }

    // Check password
    if (share.passwordProtected) {
      const validPassword = await bcrypt.compare(password, share.password);
      if (!validPassword) {
        throw new Error('Invalid password');
      }
    }

    // Increment view count
    await db.reportShares.update(
      { shareId: share.shareId },
      { $inc: { viewCount: 1 } }
    );

    // Return report
    return await db.reports.findOne({ reportId: share.reportId });
  }
}
```

---

## 10. Performance Optimization

### 10.1 Query Optimization

```javascript
class ReportQueryOptimizer {
  async optimizeQuery(query) {
    // Use materialized views for common aggregations
    if (this.canUseMaterializedView(query)) {
      return this.rewriteForMaterializedView(query);
    }

    // Add query hints for large tables
    if (this.isLargeTableQuery(query)) {
      query = this.addIndexHints(query);
    }

    // Partition pruning for time-series data
    if (this.isTimeSeriesQuery(query)) {
      query = this.addPartitionPruning(query);
    }

    return query;
  }

  canUseMaterializedView(query) {
    // Check if query matches a materialized view pattern
    const materializedViews = [
      'daily_generation_summary',
      'monthly_availability',
      'work_order_stats_by_type'
    ];

    // Simple pattern matching (can be more sophisticated)
    return materializedViews.some(mv => query.sql.includes(mv));
  }
}
```

### 10.2 Caching Strategy

```yaml
caching:
  report_results:
    enabled: true
    ttl: "15 minutes"
    cache_key: "report:{reportId}:params:{hash(parameters)}"
    invalidation: ["on_data_update", "manual"]

  dashboard_widgets:
    enabled: true
    ttl: "5 minutes"
    cache_key: "widget:{widgetId}:user:{userId}"

  template_library:
    enabled: true
    ttl: "1 hour"
    cache_key: "templates"

  user_permissions:
    enabled: true
    ttl: "10 minutes"
    cache_key: "permissions:user:{userId}"
```

---

## Summary

This specification provides comprehensive analytics and reporting enhancements for dCMMS:

1. **Self-service report builder** with drag-and-drop interface and visual query builder
2. **Custom dashboards** with real-time widgets, KPI cards, charts, and tables
3. **Pre-built templates** for common operational, financial, compliance, and performance reports
4. **Scheduled reports** with automated generation and multi-channel distribution
5. **Multi-format export** (PDF, Excel, CSV) with professional formatting
6. **Interactive visualizations** using Chart.js with zoom, pan, and drill-down
7. **Ad-hoc query builder** with SQL preview and security validation
8. **Report sharing** with expiring links, password protection, and access tracking
9. **Performance optimization** with query hints, materialized views, and caching

**Lines:** ~1,100
**Status:** Complete
**Next:** UX Design System and Training (Spec 17)
