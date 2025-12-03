/**
 * Cost Management Data Models
 *
 * Provides types and interfaces for work order costing, budgets, and cost analytics.
 */

// ===== Cost Categories =====

export enum CostCategory {
  LABOR = "labor",
  PARTS = "parts",
  EQUIPMENT = "equipment",
  OTHER = "other",
}

export enum Currency {
  USD = "USD",
  EUR = "EUR",
  INR = "INR",
  GBP = "GBP",
}

export enum BudgetPeriod {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export enum BudgetStatus {
  ON_TRACK = "on_track",
  AT_RISK = "at_risk",
  OVER_BUDGET = "over_budget",
}

// ===== Cost Record =====

export interface CostRecord {
  id: string;
  workOrderId: string;
  category: CostCategory;
  description: string;
  amount: number;
  currency: Currency;
  isAutoCalculated: boolean; // True for labor/parts, false for manual entries

  // For labor costs
  laborHours?: number;
  laborRate?: number;
  technicianId?: string;

  // For parts costs
  partId?: string;
  partQuantity?: number;
  partUnitPrice?: number;

  // For equipment costs
  equipmentType?: string;
  equipmentHours?: number;
  equipmentRate?: number;

  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface CreateCostRecordRequest {
  workOrderId: string;
  category: CostCategory;
  description: string;
  amount: number;
  currency?: Currency;

  // Optional category-specific fields
  laborHours?: number;
  technicianId?: string;
  partId?: string;
  partQuantity?: number;
  equipmentType?: string;
  equipmentHours?: number;

  createdBy: string;
}

export interface UpdateCostRecordRequest {
  description?: string;
  amount?: number;
  updatedBy: string;
}

// ===== Labor Rates =====

export interface LaborRate {
  id: string;
  role: string; // e.g., 'Electrician', 'Mechanical Technician', 'Engineer'
  hourlyRate: number;
  overtimeMultiplier: number; // e.g., 1.5 for time-and-a-half
  currency: Currency;
  effectiveDate: Date; // Rate effective from this date
  expiryDate?: Date; // Rate expires on this date (null = active)
  createdAt: Date;
  createdBy: string;
}

export interface CreateLaborRateRequest {
  role: string;
  hourlyRate: number;
  overtimeMultiplier?: number;
  currency?: Currency;
  effectiveDate?: Date;
  createdBy: string;
}

// ===== Equipment Rates =====

export interface EquipmentRate {
  id: string;
  equipmentType: string; // e.g., 'Crane', 'Forklift', 'Welding Machine'
  hourlyRate: number;
  currency: Currency;
  effectiveDate: Date;
  expiryDate?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface CreateEquipmentRateRequest {
  equipmentType: string;
  hourlyRate: number;
  currency?: Currency;
  effectiveDate?: Date;
  createdBy: string;
}

// ===== Budget =====

export interface Budget {
  id: string;
  siteId: string;
  siteName?: string; // Populated from join
  budgetPeriod: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  category: CostCategory | "all"; // 'all' for total budget
  allocatedAmount: number;
  spentAmount: number;
  currency: Currency;
  status: BudgetStatus;

  // Calculated fields
  remainingAmount: number;
  spentPercentage: number;
  variance: number; // (actual - allocated) / allocated * 100
  forecastedSpending?: number; // Predicted end-of-period spending

  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface CreateBudgetRequest {
  siteId: string;
  budgetPeriod: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;
  category: CostCategory | "all";
  allocatedAmount: number;
  currency?: Currency;
  createdBy: string;
}

export interface UpdateBudgetRequest {
  allocatedAmount?: number;
  updatedBy: string;
}

export interface BudgetSpending {
  budgetId: string;
  budget: Budget;
  currentSpending: number;
  projectedSpending: number;
  daysRemaining: number;
  dailyBurnRate: number; // Average spending per day
  isOnTrack: boolean;
  alerts: string[];
}

// ===== Cost Summary =====

export interface CostSummary {
  workOrderId: string;
  totalCost: number;
  currency: Currency;
  breakdown: {
    labor: {
      total: number;
      hours: number;
      averageRate: number;
      records: number;
    };
    parts: {
      total: number;
      quantity: number;
      records: number;
    };
    equipment: {
      total: number;
      hours: number;
      averageRate: number;
      records: number;
    };
    other: {
      total: number;
      records: number;
    };
  };
  autoCalculatedCost: number;
  manualCost: number;
  createdAt: Date;
  lastUpdated: Date;
}

// ===== Cost Analytics =====

export interface CostAnalyticsQuery {
  siteId?: string;
  startDate: Date;
  endDate: Date;
  groupBy: "site" | "asset" | "wo_type" | "category" | "month";
  categories?: CostCategory[];
  woTypes?: string[];
  assetIds?: string[];
}

export interface CostAnalyticsResult {
  totalCost: number;
  averageCostPerWO: number;
  costPerAsset: number;
  costVariance: number; // vs previous period
  currency: Currency;

  // Breakdown by category
  categoryBreakdown: {
    labor: { amount: number; percentage: number };
    parts: { amount: number; percentage: number };
    equipment: { amount: number; percentage: number };
    other: { amount: number; percentage: number };
  };

  // Time series data
  trends: Array<{
    date: Date;
    totalCost: number;
    woCount: number;
    avgCostPerWO: number;
  }>;

  // Grouped data
  groups: Array<{
    groupKey: string;
    groupName: string;
    totalCost: number;
    woCount: number;
    avgCostPerWO: number;
  }>;

  // Comparison with previous period
  comparison?: {
    previousPeriodCost: number;
    change: number;
    changePercentage: number;
  };
}

export interface CostTrend {
  month: string; // YYYY-MM
  totalCost: number;
  laborCost: number;
  partsCost: number;
  equipmentCost: number;
  otherCost: number;
  woCount: number;
  avgCostPerWO: number;
}

export interface CostBySite {
  siteId: string;
  siteName: string;
  totalCost: number;
  woCount: number;
  avgCostPerWO: number;
}

export interface CostByWOType {
  woType: string; // 'preventive', 'corrective', 'predictive'
  totalCost: number;
  woCount: number;
  avgCostPerWO: number;
  percentage: number;
}

export interface CostExportOptions {
  format: "csv" | "pdf" | "excel";
  includeBreakdown: boolean;
  includeTrends: boolean;
  includeComparison: boolean;
}

// ===== Budget Alert =====

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budget: Budget;
  alertType: "warning" | "critical" | "over_budget";
  message: string;
  spentPercentage: number;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// ===== Cost Allocation =====

export interface CostAllocation {
  siteId: string;
  siteName: string;
  assetId?: string;
  assetName?: string;
  woType: string;
  totalCost: number;
  woCount: number;
  period: {
    start: Date;
    end: Date;
  };
}

// ===== Database Prisma Schema Suggestion =====

export const CostManagementSchema = `
// Add to schema.prisma:

model CostRecord {
  id                String       @id @default(cuid())
  workOrderId       String
  workOrder         WorkOrder    @relation(fields: [workOrderId], references: [id])
  category          String       // 'labor', 'parts', 'equipment', 'other'
  description       String
  amount            Float
  currency          String       @default("USD")
  isAutoCalculated  Boolean      @default(false)

  // Labor fields
  laborHours        Float?
  laborRate         Float?
  technicianId      String?

  // Parts fields
  partId            String?
  partQuantity      Int?
  partUnitPrice     Float?

  // Equipment fields
  equipmentType     String?
  equipmentHours    Float?
  equipmentRate     Float?

  createdAt         DateTime     @default(now())
  createdBy         String
  updatedAt         DateTime?    @updatedAt
  updatedBy         String?

  @@index([workOrderId])
  @@index([category])
  @@index([createdAt])
}

model LaborRate {
  id                  String    @id @default(cuid())
  role                String
  hourlyRate          Float
  overtimeMultiplier  Float     @default(1.5)
  currency            String    @default("USD")
  effectiveDate       DateTime  @default(now())
  expiryDate          DateTime?
  createdAt           DateTime  @default(now())
  createdBy           String

  @@index([role, effectiveDate])
}

model EquipmentRate {
  id              String    @id @default(cuid())
  equipmentType   String
  hourlyRate      Float
  currency        String    @default("USD")
  effectiveDate   DateTime  @default(now())
  expiryDate      DateTime?
  createdAt       DateTime  @default(now())
  createdBy       String

  @@index([equipmentType, effectiveDate])
}

model Budget {
  id              String    @id @default(cuid())
  siteId          String
  site            Site      @relation(fields: [siteId], references: [id])
  budgetPeriod    String    // 'monthly', 'quarterly', 'yearly'
  periodStart     DateTime
  periodEnd       DateTime
  category        String    // 'labor', 'parts', 'equipment', 'other', 'all'
  allocatedAmount Float
  spentAmount     Float     @default(0)
  currency        String    @default("USD")
  status          String    @default("on_track")

  createdAt       DateTime  @default(now())
  createdBy       String
  updatedAt       DateTime? @updatedAt
  updatedBy       String?

  @@index([siteId, budgetPeriod, periodStart])
  @@index([status])
}

model BudgetAlert {
  id              String    @id @default(cuid())
  budgetId        String
  budget          Budget    @relation(fields: [budgetId], references: [id])
  alertType       String    // 'warning', 'critical', 'over_budget'
  message         String
  spentPercentage Float
  createdAt       DateTime  @default(now())
  acknowledged    Boolean   @default(false)
  acknowledgedBy  String?
  acknowledgedAt  DateTime?

  @@index([budgetId, acknowledged])
  @@index([createdAt])
}
`;

// ===== Utility Types =====

export interface CostCalculationInput {
  // Labor
  laborRecords?: Array<{
    hours: number;
    technicianRole: string;
    isOvertime?: boolean;
  }>;

  // Parts
  partsConsumed?: Array<{
    partId: string;
    quantity: number;
    unitPrice: number;
  }>;

  // Equipment
  equipmentUsage?: Array<{
    equipmentType: string;
    hours: number;
  }>;

  // Manual costs
  otherCosts?: Array<{
    description: string;
    amount: number;
  }>;
}

export interface CostCalculationResult {
  laborCost: number;
  partsCost: number;
  equipmentCost: number;
  otherCost: number;
  totalCost: number;
  breakdown: Array<{
    category: CostCategory;
    description: string;
    amount: number;
    isAutoCalculated: boolean;
  }>;
}

// ===== Budget Forecast =====

export interface BudgetForecast {
  budgetId: string;
  currentSpending: number;
  forecastedEndOfPeriodSpending: number;
  confidence: number; // 0-1
  method: "linear" | "moving_average" | "exponential_smoothing";
  assumptions: string[];
  warnings: string[];
}
