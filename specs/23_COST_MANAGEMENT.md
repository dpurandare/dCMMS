# Cost Management Specification

**Version:** 1.0
**Priority:** P2 (Release 2)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Cost Categories](#2-cost-categories)
3. [Work Order Costing](#3-work-order-costing)
4. [Budget Management](#4-budget-management)
5. [Cost Tracking](#5-cost-tracking)
6. [Cost Analytics](#6-cost-analytics)
7. [Billing Integration](#7-billing-integration)
8. [Cost Optimization](#8-cost-optimization)

---

## 1. Overview

### 1.1 Purpose

Track, analyze, and optimize operational costs for renewable energy O&M including labor, materials, contractors, and overhead.

### 1.2 Cost Tracking Scope

```yaml
cost_categories:
  labor:
    - internal_labor
    - contractor_labor
    - overtime
    - travel_time

  materials:
    - spare_parts
    - consumables
    - tools_and_equipment

  services:
    - contractor_services
    - engineering_consulting
    - testing_and_commissioning

  overhead:
    - facility_costs
    - utilities
    - insurance
    - admin_overhead

  downtime:
    - lost_generation_revenue
    - performance_penalties
```

---

## 2. Cost Categories

### 2.1 Cost Category Schema

```json
{
  "categoryId": "COST-CAT-001",
  "name": "Labor - Field Technician",
  "type": "labor",
  "subtype": "internal_labor",
  "glAccount": "6100",
  "costCenter": "OPEX-MAINT",

  "rates": {
    "standard_rate": {
      "amount": 45.00,
      "unit": "hour",
      "currency": "USD",
      "effectiveFrom": "2025-01-01"
    },
    "overtime_rate": {
      "amount": 67.50,
      "unit": "hour",
      "currency": "USD",
      "multiplier": 1.5
    },
    "weekend_rate": {
      "amount": 90.00,
      "unit": "hour",
      "currency": "USD",
      "multiplier": 2.0
    }
  },

  "billable": true,
  "markupPercent": 15
}
```

### 2.2 Rate Card Management

```javascript
class RateCardManager {
  /**
   * Get applicable rate for a resource
   */
  getRate(costCategoryId, date, context) {
    const category = this.getCostCategory(costCategoryId);

    // Determine rate type based on context
    let rateType = 'standard_rate';

    if (context.isWeekend) {
      rateType = 'weekend_rate';
    } else if (context.isOvertime) {
      rateType = 'overtime_rate';
    }

    const rate = category.rates[rateType];

    // Check if rate is effective
    if (new Date(rate.effectiveFrom) > date) {
      throw new Error(`No rate effective for ${costCategoryId} on ${date}`);
    }

    return rate;
  }

  /**
   * Calculate labor cost
   */
  calculateLaborCost(laborEntry) {
    const rate = this.getRate(laborEntry.costCategoryId, laborEntry.date, {
      isWeekend: this.isWeekend(laborEntry.date),
      isOvertime: laborEntry.hours > 8
    });

    const regularHours = Math.min(laborEntry.hours, 8);
    const overtimeHours = Math.max(laborEntry.hours - 8, 0);

    const regularCost = regularHours * rate.amount;
    const overtimeCost = overtimeHours * (rate.amount * 1.5);

    return {
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalCost: regularCost + overtimeCost,
      unit: rate.unit,
      currency: rate.currency
    };
  }
}
```

---

## 3. Work Order Costing

### 3.1 Work Order Cost Schema

```json
{
  "workOrderId": "WO-2025-001",
  "costTracking": {
    "status": "in_progress",
    "budgetedCost": 5000.00,
    "actualCost": 3250.50,
    "variance": -1749.50,
    "variancePercent": -35.0,

    "costBreakdown": {
      "labor": {
        "internal": 1800.00,
        "contractor": 900.00,
        "subtotal": 2700.00
      },
      "materials": {
        "parts": 450.50,
        "consumables": 100.00,
        "subtotal": 550.50
      },
      "services": 0.00,
      "overhead": 0.00,
      "total": 3250.50
    },

    "laborDetails": [
      {
        "userId": "user-tech-001",
        "userName": "John Smith",
        "role": "Field Technician",
        "date": "2025-11-10",
        "hours": 6.5,
        "rate": 45.00,
        "cost": 292.50,
        "billable": true
      },
      {
        "userId": "user-tech-002",
        "userName": "Jane Doe",
        "role": "Senior Technician",
        "date": "2025-11-10",
        "hours": 8.0,
        "rate": 55.00,
        "cost": 440.00,
        "billable": true
      }
    ],

    "materialDetails": [
      {
        "itemId": "INV-FAN-123",
        "description": "Inverter cooling fan",
        "quantity": 3,
        "unitCost": 150.00,
        "totalCost": 450.00,
        "billable": true
      },
      {
        "itemId": "CONS-CABLE-TIES",
        "description": "Cable ties assortment",
        "quantity": 1,
        "unitCost": 50.50,
        "totalCost": 50.50,
        "billable": false
      }
    ],

    "downtimeImpact": {
      "durationHours": 2.5,
      "lostGenerationMWh": 125.0,
      "revenueImpact": 6250.00,
      "currency": "USD"
    }
  }
}
```

### 3.2 Work Order Cost Tracking

```javascript
class WorkOrderCostTracker {
  /**
   * Log labor time against work order
   */
  async logLabor(workOrderId, laborEntry) {
    // Calculate labor cost
    const cost = rateCardManager.calculateLaborCost(laborEntry);

    const laborRecord = {
      laborId: uuidv4(),
      workOrderId,
      userId: laborEntry.userId,
      date: laborEntry.date,
      hours: laborEntry.hours,
      regularHours: cost.regularHours,
      overtimeHours: cost.overtimeHours,
      rate: cost.rate,
      cost: cost.totalCost,
      billable: laborEntry.billable !== false,
      notes: laborEntry.notes,
      createdAt: new Date()
    };

    await db.laborEntries.insert(laborRecord);

    // Update work order cost
    await this.updateWorkOrderCost(workOrderId);

    return laborRecord;
  }

  /**
   * Add material consumption
   */
  async logMaterial(workOrderId, materialEntry) {
    // Get material cost from inventory
    const item = await db.inventory.findOne({ itemId: materialEntry.itemId });

    const materialRecord = {
      materialId: uuidv4(),
      workOrderId,
      itemId: materialEntry.itemId,
      description: item.description,
      quantity: materialEntry.quantity,
      unitCost: item.unitCost,
      totalCost: materialEntry.quantity * item.unitCost,
      billable: materialEntry.billable !== false,
      notes: materialEntry.notes,
      createdAt: new Date()
    };

    await db.materialEntries.insert(materialRecord);

    // Update inventory
    await inventoryService.consume({
      itemId: materialEntry.itemId,
      quantity: materialEntry.quantity,
      workOrderId
    });

    // Update work order cost
    await this.updateWorkOrderCost(workOrderId);

    return materialRecord;
  }

  /**
   * Calculate total work order cost
   */
  async updateWorkOrderCost(workOrderId) {
    // Get all cost entries
    const laborEntries = await db.laborEntries.find({ workOrderId });
    const materialEntries = await db.materialEntries.find({ workOrderId });
    const serviceEntries = await db.serviceEntries.find({ workOrderId });

    // Calculate totals
    const laborCost = laborEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const materialCost = materialEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
    const serviceCost = serviceEntries.reduce((sum, entry) => sum + entry.cost, 0);

    // Apply overhead (e.g., 10%)
    const overheadRate = 0.10;
    const overheadCost = (laborCost + materialCost + serviceCost) * overheadRate;

    const totalCost = laborCost + materialCost + serviceCost + overheadCost;

    // Get budgeted cost
    const workOrder = await db.workOrders.findOne({ workOrderId });
    const budgetedCost = workOrder.budgetedCost || 0;
    const variance = budgetedCost - totalCost;
    const variancePercent = budgetedCost > 0 ? (variance / budgetedCost) * 100 : 0;

    // Update work order
    await db.workOrders.update(
      { workOrderId },
      {
        'costTracking.actualCost': totalCost,
        'costTracking.variance': variance,
        'costTracking.variancePercent': variancePercent,
        'costTracking.costBreakdown': {
          labor: { subtotal: laborCost },
          materials: { subtotal: materialCost },
          services: serviceCost,
          overhead: overheadCost,
          total: totalCost
        }
      }
    );

    // Alert if over budget
    if (variance < 0) {
      await this.notifyOverBudget(workOrderId, variance);
    }

    return totalCost;
  }

  /**
   * Calculate downtime cost
   */
  async calculateDowntimeCost(workOrderId, downtimeDuration) {
    const workOrder = await db.workOrders.findOne({ workOrderId });
    const asset = await db.assets.findOne({ assetId: workOrder.assetId });

    // Average generation rate (MW)
    const avgGenerationMW = asset.ratedCapacity * 0.3; // 30% capacity factor

    // Lost generation
    const lostGenerationMWh = avgGenerationMW * downtimeDuration;

    // Revenue impact (assuming $50/MWh)
    const pricePerMWh = 50;
    const revenueImpact = lostGenerationMWh * pricePerMWh;

    await db.workOrders.update(
      { workOrderId },
      {
        'costTracking.downtimeImpact': {
          durationHours: downtimeDuration,
          lostGenerationMWh,
          revenueImpact,
          currency: 'USD'
        }
      }
    );

    return revenueImpact;
  }
}
```

---

## 4. Budget Management

### 4.1 Budget Schema

```json
{
  "budgetId": "BUDGET-2025-OPEX",
  "fiscalYear": 2025,
  "type": "opex",
  "status": "active",

  "allocations": [
    {
      "category": "labor",
      "budgeted": 500000.00,
      "committed": 120000.00,
      "actual": 98500.00,
      "available": 381500.00,
      "utilizationPercent": 19.7
    },
    {
      "category": "materials",
      "budgeted": 300000.00,
      "committed": 45000.00,
      "actual": 38200.00,
      "available": 261800.00,
      "utilizationPercent": 12.7
    },
    {
      "category": "contractor_services",
      "budgeted": 200000.00,
      "committed": 80000.00,
      "actual": 60000.00,
      "available": 140000.00,
      "utilizationPercent": 30.0
    }
  ],

  "totalBudget": 1000000.00,
  "totalCommitted": 245000.00,
  "totalActual": 196700.00,
  "totalAvailable": 754300.00,

  "approvers": ["user-cfo-001", "user-ops-director-001"],
  "createdBy": "user-finance-001",
  "createdAt": "2024-12-01T10:00:00Z"
}
```

### 4.2 Budget Tracking

```javascript
class BudgetManager {
  /**
   * Check budget availability before creating work order
   */
  async checkBudgetAvailability(workOrder) {
    const budget = await this.getActiveBudget(workOrder.fiscalYear, 'opex');

    const category = this.mapWorkOrderToCategory(workOrder.type);
    const allocation = budget.allocations.find(a => a.category === category);

    if (!allocation) {
      throw new Error(`No budget allocation for category: ${category}`);
    }

    const estimatedCost = workOrder.estimatedCost || 0;

    if (allocation.available < estimatedCost) {
      return {
        available: false,
        allocation: allocation.category,
        budgeted: allocation.budgeted,
        available: allocation.available,
        requested: estimatedCost,
        shortfall: estimatedCost - allocation.available
      };
    }

    return {
      available: true,
      allocation: allocation.category,
      availableAmount: allocation.available
    };
  }

  /**
   * Commit budget when work order is created
   */
  async commitBudget(workOrder) {
    const category = this.mapWorkOrderToCategory(workOrder.type);
    const amount = workOrder.estimatedCost || 0;

    await db.budgets.update(
      {
        fiscalYear: workOrder.fiscalYear,
        type: 'opex',
        'allocations.category': category
      },
      {
        $inc: {
          'allocations.$.committed': amount,
          'allocations.$.available': -amount
        }
      }
    );

    // Record commitment
    await db.budgetCommitments.insert({
      commitmentId: uuidv4(),
      budgetId: `BUDGET-${workOrder.fiscalYear}-OPEX`,
      workOrderId: workOrder.workOrderId,
      category,
      amount,
      committedAt: new Date()
    });
  }

  /**
   * Release committed budget and record actual cost
   */
  async recordActualCost(workOrder) {
    const category = this.mapWorkOrderToCategory(workOrder.type);
    const committedAmount = workOrder.estimatedCost || 0;
    const actualAmount = workOrder.costTracking.actualCost;

    const difference = committedAmount - actualAmount;

    await db.budgets.update(
      {
        fiscalYear: workOrder.fiscalYear,
        type: 'opex',
        'allocations.category': category
      },
      {
        $inc: {
          'allocations.$.committed': -committedAmount,
          'allocations.$.actual': actualAmount,
          'allocations.$.available': difference
        }
      }
    );
  }

  /**
   * Generate budget utilization report
   */
  async generateUtilizationReport(budgetId, asOfDate) {
    const budget = await db.budgets.findOne({ budgetId });

    const report = {
      budgetId,
      fiscalYear: budget.fiscalYear,
      asOfDate: asOfDate || new Date(),
      allocations: budget.allocations.map(allocation => ({
        category: allocation.category,
        budgeted: allocation.budgeted,
        committed: allocation.committed,
        actual: allocation.actual,
        available: allocation.available,
        utilizationPercent: (allocation.actual / allocation.budgeted) * 100,
        projectedYearEnd: this.projectYearEnd(allocation, asOfDate),
        status: this.getBudgetStatus(allocation)
      })),
      totalBudget: budget.totalBudget,
      totalActual: budget.totalActual,
      overallUtilization: (budget.totalActual / budget.totalBudget) * 100
    };

    return report;
  }

  getBudgetStatus(allocation) {
    const utilizationPercent = (allocation.actual / allocation.budgeted) * 100;

    if (utilizationPercent > 100) return 'over_budget';
    if (utilizationPercent > 90) return 'at_risk';
    if (utilizationPercent > 75) return 'on_track';
    return 'under_budget';
  }
}
```

---

## 5. Cost Tracking

### 5.1 Cost Hierarchy

```yaml
cost_hierarchy:
  level_1_enterprise:
    aggregation: "All sites, all cost centers"
    users: ["CFO", "CEO"]

  level_2_site:
    aggregation: "Single site, all cost centers"
    users: ["Site Manager", "Operations Director"]

  level_3_cost_center:
    aggregation: "Single site, single cost center (e.g., OPEX-MAINT)"
    users: ["Maintenance Manager"]

  level_4_work_order:
    aggregation: "Individual work order"
    users: ["All users with work order access"]
```

### 5.2 Cost Allocation Rules

```javascript
class CostAllocator {
  /**
   * Allocate shared costs across sites
   */
  allocateSharedCosts(sharedCost, sites) {
    // Allocation based on capacity (MW)
    const totalCapacity = sites.reduce((sum, site) => sum + site.capacityMW, 0);

    return sites.map(site => ({
      siteId: site.siteId,
      allocation: (site.capacityMW / totalCapacity) * sharedCost,
      allocationPercent: (site.capacityMW / totalCapacity) * 100
    }));
  }

  /**
   * Allocate overhead costs
   */
  allocateOverhead(directCosts, overheadRate = 0.15) {
    return directCosts * overheadRate;
  }

  /**
   * Calculate cost per MWh
   */
  calculateCostPerMWh(totalCost, generationMWh) {
    return generationMWh > 0 ? totalCost / generationMWh : 0;
  }
}
```

---

## 6. Cost Analytics

### 6.1 Cost Dashboards

```yaml
cost_dashboards:
  executive_dashboard:
    metrics:
      - "Total OPEX (MTD, YTD)"
      - "Cost per MWh"
      - "Budget utilization"
      - "Cost variance vs budget"
      - "Top 10 cost drivers"

  operations_dashboard:
    metrics:
      - "Labor cost breakdown"
      - "Material consumption"
      - "Contractor spending"
      - "Work order cost variance"
      - "Downtime cost impact"

  maintenance_dashboard:
    metrics:
      - "Cost per work order type"
      - "Preventive vs corrective cost ratio"
      - "Mean Time To Repair (MTTR) cost"
      - "Spare parts consumption"
```

### 6.2 Cost Analytics Queries

```javascript
class CostAnalytics {
  /**
   * Calculate total OPEX for period
   */
  async getTotalOPEX(startDate, endDate, filters = {}) {
    const pipeline = [
      {
        $match: {
          'costTracking.actualCost': { $exists: true },
          completedAt: { $gte: startDate, $lte: endDate },
          ...this.buildFilters(filters)
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$costTracking.actualCost' },
          laborCost: { $sum: '$costTracking.costBreakdown.labor.subtotal' },
          materialCost: { $sum: '$costTracking.costBreakdown.materials.subtotal' },
          serviceCost: { $sum: '$costTracking.costBreakdown.services' },
          workOrderCount: { $sum: 1 }
        }
      }
    ];

    const result = await db.workOrders.aggregate(pipeline);

    return result[0] || {
      totalCost: 0,
      laborCost: 0,
      materialCost: 0,
      serviceCost: 0,
      workOrderCount: 0
    };
  }

  /**
   * Calculate cost per MWh
   */
  async getCostPerMWh(startDate, endDate, siteId) {
    // Get total costs
    const costs = await this.getTotalOPEX(startDate, endDate, { siteId });

    // Get total generation
    const generation = await db.generationDaily.aggregate([
      {
        $match: {
          siteId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGenerationMWh: { $sum: '$generationMWh' }
        }
      }
    ]);

    const totalGeneration = generation[0]?.totalGenerationMWh || 0;

    return {
      totalCost: costs.totalCost,
      totalGenerationMWh: totalGeneration,
      costPerMWh: totalGeneration > 0 ? costs.totalCost / totalGeneration : 0
    };
  }

  /**
   * Cost breakdown by work order type
   */
  async getCostByWorkOrderType(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate },
          'costTracking.actualCost': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$type',
          totalCost: { $sum: '$costTracking.actualCost' },
          workOrderCount: { $sum: 1 },
          avgCost: { $avg: '$costTracking.actualCost' }
        }
      },
      {
        $sort: { totalCost: -1 }
      }
    ];

    return await db.workOrders.aggregate(pipeline);
  }

  /**
   * Top cost drivers
   */
  async getTopCostDrivers(startDate, endDate, limit = 10) {
    const pipeline = [
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $sort: { 'costTracking.actualCost': -1 }
      },
      {
        $limit: limit
      },
      {
        $project: {
          workOrderId: 1,
          title: 1,
          type: 1,
          assetId: 1,
          actualCost: '$costTracking.actualCost',
          budgetedCost: '$costTracking.budgetedCost',
          variance: '$costTracking.variance'
        }
      }
    ];

    return await db.workOrders.aggregate(pipeline);
  }

  /**
   * Preventive vs Corrective cost ratio
   */
  async getPreventiveCorrective Ratio(startDate, endDate) {
    const pipeline = [
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate },
          type: { $in: ['preventive_maintenance', 'corrective_maintenance'] }
        }
      },
      {
        $group: {
          _id: '$type',
          totalCost: { $sum: '$costTracking.actualCost' },
          workOrderCount: { $sum: 1 }
        }
      }
    ];

    const results = await db.workOrders.aggregate(pipeline);

    const preventive = results.find(r => r._id === 'preventive_maintenance') || { totalCost: 0 };
    const corrective = results.find(r => r._id === 'corrective_maintenance') || { totalCost: 0 };

    const totalCost = preventive.totalCost + corrective.totalCost;

    return {
      preventive: {
        cost: preventive.totalCost,
        percent: totalCost > 0 ? (preventive.totalCost / totalCost) * 100 : 0
      },
      corrective: {
        cost: corrective.totalCost,
        percent: totalCost > 0 ? (corrective.totalCost / totalCost) * 100 : 0
      },
      ratio: corrective.totalCost > 0 ? preventive.totalCost / corrective.totalCost : 0
    };
  }
}
```

---

## 7. Billing Integration

### 7.1 Invoice Generation

```javascript
class InvoiceGenerator {
  /**
   * Generate invoice for completed work orders
   */
  async generateInvoice(workOrders, customer, billingPeriod) {
    const invoiceLineItems = [];

    for (const wo of workOrders) {
      // Get billable costs
      const laborEntries = await db.laborEntries.find({
        workOrderId: wo.workOrderId,
        billable: true
      });

      const materialEntries = await db.materialEntries.find({
        workOrderId: wo.workOrderId,
        billable: true
      });

      // Create line items
      if (laborEntries.length > 0) {
        const totalLaborCost = laborEntries.reduce((sum, entry) => sum + entry.cost, 0);
        const totalLaborHours = laborEntries.reduce((sum, entry) => sum + entry.hours, 0);

        invoiceLineItems.push({
          description: `Labor - ${wo.title}`,
          workOrderId: wo.workOrderId,
          quantity: totalLaborHours,
          unit: 'hours',
          unitPrice: totalLaborCost / totalLaborHours,
          amount: totalLaborCost,
          markup: this.calculateMarkup(totalLaborCost, customer.markupPercent),
          total: totalLaborCost * (1 + customer.markupPercent / 100)
        });
      }

      if (materialEntries.length > 0) {
        for (const material of materialEntries) {
          invoiceLineItems.push({
            description: `${material.description} - ${wo.title}`,
            workOrderId: wo.workOrderId,
            quantity: material.quantity,
            unit: material.unit || 'each',
            unitPrice: material.unitCost,
            amount: material.totalCost,
            markup: this.calculateMarkup(material.totalCost, customer.markupPercent),
            total: material.totalCost * (1 + customer.markupPercent / 100)
          });
        }
      }
    }

    const subtotal = invoiceLineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * (customer.taxRate || 0);
    const total = subtotal + tax;

    const invoice = {
      invoiceId: `INV-${Date.now()}`,
      invoiceNumber: this.generateInvoiceNumber(),
      customerId: customer.customerId,
      customerName: customer.name,
      billingPeriod: {
        startDate: billingPeriod.startDate,
        endDate: billingPeriod.endDate
      },
      lineItems: invoiceLineItems,
      subtotal,
      tax,
      total,
      currency: 'USD',
      dueDate: this.calculateDueDate(customer.paymentTerms),
      status: 'draft',
      createdAt: new Date()
    };

    await db.invoices.insert(invoice);

    return invoice;
  }
}
```

---

## 8. Cost Optimization

### 8.1 Cost Optimization Recommendations

```javascript
class CostOptimizer {
  /**
   * Analyze costs and provide optimization recommendations
   */
  async analyzeAndRecommend(siteId, period) {
    const recommendations = [];

    // Analyze preventive vs corrective ratio
    const pmCmRatio = await costAnalytics.getPreventiveCorrectiveRatio(
      period.startDate,
      period.endDate
    );

    if (pmCmRatio.preventive.percent < 60) {
      recommendations.push({
        category: 'preventive_maintenance',
        priority: 'high',
        title: 'Increase preventive maintenance frequency',
        description: `Preventive maintenance is only ${pmCmRatio.preventive.percent.toFixed(1)}% of total maintenance spend. Increasing PM frequency can reduce expensive corrective maintenance.`,
        potentialSavings: pmCmRatio.corrective.cost * 0.3,
        actionItems: [
          'Review PM schedules for critical assets',
          'Increase PM frequency for high-failure-rate equipment',
          'Implement condition-based maintenance'
        ]
      });
    }

    // Analyze material consumption
    const topMaterials = await this.getTopMaterialCosts(siteId, period);
    const frequentItems = topMaterials.filter(m => m.frequency > 10);

    if (frequentItems.length > 0) {
      recommendations.push({
        category: 'inventory_optimization',
        priority: 'medium',
        title: 'Optimize inventory for frequently used parts',
        description: `${frequentItems.length} items are purchased frequently. Bulk purchasing could reduce costs.`,
        potentialSavings: frequentItems.reduce((sum, item) => sum + item.totalCost * 0.15, 0),
        actionItems: [
          `Establish min/max levels for high-frequency items`,
          `Negotiate volume discounts with suppliers`,
          `Consider vendor-managed inventory (VMI)`
        ]
      });
    }

    // Analyze downtime costs
    const downtimeCosts = await this.getTotalDowntimeCost(siteId, period);

    if (downtimeCosts.total > 50000) {
      recommendations.push({
        category: 'downtime_reduction',
        priority: 'critical',
        title: 'Focus on reducing equipment downtime',
        description: `Downtime cost is $${downtimeCosts.total.toLocaleString()} for the period. Reducing MTTR can significantly improve profitability.`,
        potentialSavings: downtimeCosts.total * 0.4,
        actionItems: [
          'Stock critical spares on-site',
          'Implement predictive maintenance',
          'Train technicians on common failure modes',
          'Establish OEM support contracts'
        ]
      });
    }

    return {
      siteId,
      period,
      recommendations,
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.potentialSavings, 0)
    };
  }
}
```

---

## Summary

This specification provides comprehensive cost management for dCMMS:

1. **Cost Categories** with rate cards, labor rates (standard/overtime/weekend), markup rules
2. **Work Order Costing** with labor tracking, material consumption, downtime impact calculation
3. **Budget Management** with allocations, commitment tracking, variance analysis
4. **Cost Tracking** at enterprise/site/cost center/work order levels
5. **Cost Analytics** with OPEX dashboards, cost per MWh, preventive vs corrective ratios
6. **Billing Integration** with invoice generation, billable cost tracking, markup application
7. **Cost Optimization** with AI-driven recommendations, potential savings identification

**Lines:** ~900
**Status:** Complete
**Next:** Internationalization (Spec 24)
