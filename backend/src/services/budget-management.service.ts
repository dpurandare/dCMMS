import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Budget,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  BudgetPeriod,
  BudgetStatus,
  Currency,
  CostCategory,
  BudgetSpending,
  BudgetAlert,
  BudgetForecast,
} from '../models/cost.models';
import { CostCalculationService } from './cost-calculation.service';

@Injectable()
export class BudgetManagementService {
  private readonly logger = new Logger(BudgetManagementService.name);

  // In-memory storage (in production, use database)
  private budgets: Map<string, Budget> = new Map();
  private budgetAlerts: Map<string, BudgetAlert> = new Map();

  constructor(private readonly costService: CostCalculationService) {}

  // ===== Budget CRUD =====

  /**
   * Create a budget
   */
  async createBudget(request: CreateBudgetRequest): Promise<Budget> {
    this.logger.log(
      `Creating budget: Site ${request.siteId}, ` +
        `Period ${request.budgetPeriod} (${request.periodStart.toISOString().split('T')[0]} to ${request.periodEnd.toISOString().split('T')[0]}), ` +
        `Category ${request.category}, ` +
        `Amount $${request.allocatedAmount}`
    );

    // Validate date range
    if (request.periodStart >= request.periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    // Validate amount
    if (request.allocatedAmount <= 0) {
      throw new BadRequestException('allocatedAmount must be positive');
    }

    const budgetId = `budget_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const budget: Budget = {
      id: budgetId,
      siteId: request.siteId,
      budgetPeriod: request.budgetPeriod,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      category: request.category,
      allocatedAmount: request.allocatedAmount,
      spentAmount: 0,
      currency: request.currency || Currency.USD,
      status: BudgetStatus.ON_TRACK,

      // Calculated fields (initial)
      remainingAmount: request.allocatedAmount,
      spentPercentage: 0,
      variance: -100, // -100% = 0% spent

      createdAt: new Date(),
      createdBy: request.createdBy,
    };

    this.budgets.set(budgetId, budget);

    this.logger.log(`Budget ${budgetId} created`);

    return budget;
  }

  /**
   * Get budgets with filters
   */
  async getBudgets(filters?: {
    siteId?: string;
    budgetPeriod?: BudgetPeriod;
    category?: CostCategory | 'all';
    status?: BudgetStatus;
  }): Promise<Budget[]> {
    let budgets = Array.from(this.budgets.values());

    if (filters?.siteId) {
      budgets = budgets.filter((b) => b.siteId === filters.siteId);
    }

    if (filters?.budgetPeriod) {
      budgets = budgets.filter((b) => b.budgetPeriod === filters.budgetPeriod);
    }

    if (filters?.category) {
      budgets = budgets.filter((b) => b.category === filters.category);
    }

    if (filters?.status) {
      budgets = budgets.filter((b) => b.status === filters.status);
    }

    return budgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a single budget
   */
  async getBudget(budgetId: string): Promise<Budget> {
    const budget = this.budgets.get(budgetId);

    if (!budget) {
      throw new NotFoundException(`Budget ${budgetId} not found`);
    }

    // Refresh calculated fields
    await this.updateBudgetCalculatedFields(budget);

    return budget;
  }

  /**
   * Update budget allocated amount
   */
  async updateBudget(
    budgetId: string,
    request: UpdateBudgetRequest
  ): Promise<Budget> {
    this.logger.log(`Updating budget: ${budgetId}`);

    const budget = await this.getBudget(budgetId);

    if (request.allocatedAmount !== undefined) {
      if (request.allocatedAmount <= 0) {
        throw new BadRequestException('allocatedAmount must be positive');
      }

      const oldAmount = budget.allocatedAmount;
      budget.allocatedAmount = request.allocatedAmount;

      this.logger.log(
        `Budget ${budgetId} allocated amount updated: $${oldAmount} → $${request.allocatedAmount}`
      );
    }

    budget.updatedAt = new Date();
    budget.updatedBy = request.updatedBy;

    // Recalculate fields
    await this.updateBudgetCalculatedFields(budget);

    this.budgets.set(budgetId, budget);

    // Check for alerts
    await this.checkBudgetAlerts(budget);

    return budget;
  }

  /**
   * Delete a budget
   */
  async deleteBudget(budgetId: string, deletedBy: string): Promise<void> {
    const budget = await this.getBudget(budgetId);

    this.budgets.delete(budgetId);

    this.logger.log(`Budget ${budgetId} deleted by ${deletedBy}`);
  }

  // ===== Budget Spending =====

  /**
   * Get budget spending details
   */
  async getBudgetSpending(budgetId: string): Promise<BudgetSpending> {
    const budget = await this.getBudget(budgetId);

    // Calculate current spending
    const currentSpending = budget.spentAmount;

    // Calculate days remaining
    const now = new Date();
    const totalDays = this.getDaysDifference(budget.periodStart, budget.periodEnd);
    const daysElapsed = this.getDaysDifference(budget.periodStart, now);
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Calculate daily burn rate
    const dailyBurnRate = daysElapsed > 0 ? currentSpending / daysElapsed : 0;

    // Project spending to end of period
    const projectedSpending = currentSpending + dailyBurnRate * daysRemaining;

    // Check if on track
    const expectedSpendingRate = budget.allocatedAmount / totalDays;
    const expectedSpending = expectedSpendingRate * daysElapsed;
    const isOnTrack = currentSpending <= expectedSpending * 1.1; // 10% buffer

    // Generate alerts
    const alerts: string[] = [];

    if (budget.spentPercentage >= 100) {
      alerts.push('Budget exhausted: Spending has exceeded allocated amount');
    } else if (budget.spentPercentage >= 90) {
      alerts.push('Critical: 90% of budget spent');
    } else if (budget.spentPercentage >= 80) {
      alerts.push('Warning: 80% of budget spent');
    }

    if (projectedSpending > budget.allocatedAmount) {
      const overspend = projectedSpending - budget.allocatedAmount;
      alerts.push(
        `Projected overspend: $${overspend.toFixed(2)} by end of period`
      );
    }

    if (!isOnTrack && budget.spentPercentage < 80) {
      alerts.push('Spending ahead of schedule');
    }

    return {
      budgetId: budget.id,
      budget,
      currentSpending,
      projectedSpending,
      daysRemaining,
      dailyBurnRate,
      isOnTrack,
      alerts,
    };
  }

  /**
   * Update budget spent amount (called when costs are added to work orders)
   */
  async updateBudgetSpending(
    siteId: string,
    category: CostCategory,
    amount: number
  ): Promise<void> {
    this.logger.log(
      `Updating budget spending: Site ${siteId}, Category ${category}, Amount $${amount}`
    );

    // Find matching budgets (category-specific and 'all')
    const budgets = await this.getBudgets({
      siteId,
    });

    const now = new Date();

    for (const budget of budgets) {
      // Check if budget is active for this period
      if (now < budget.periodStart || now > budget.periodEnd) {
        continue;
      }

      // Check if category matches
      if (budget.category !== 'all' && budget.category !== category) {
        continue;
      }

      // Update spent amount
      budget.spentAmount += amount;

      // Recalculate fields
      await this.updateBudgetCalculatedFields(budget);

      this.budgets.set(budget.id, budget);

      this.logger.log(
        `Budget ${budget.id} updated: Spent $${budget.spentAmount} / $${budget.allocatedAmount} (${budget.spentPercentage.toFixed(1)}%)`
      );

      // Check for alerts
      await this.checkBudgetAlerts(budget);
    }
  }

  // ===== Budget Forecast =====

  /**
   * Forecast end-of-period spending using linear extrapolation
   */
  async forecastBudgetSpending(budgetId: string): Promise<BudgetForecast> {
    const budget = await this.getBudget(budgetId);

    const now = new Date();
    const totalDays = this.getDaysDifference(budget.periodStart, budget.periodEnd);
    const daysElapsed = this.getDaysDifference(budget.periodStart, now);
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Linear extrapolation
    const dailyBurnRate = daysElapsed > 0 ? budget.spentAmount / daysElapsed : 0;
    const forecastedSpending = budget.spentAmount + dailyBurnRate * daysRemaining;

    // Calculate confidence (higher if more days have elapsed)
    const confidence = Math.min(daysElapsed / totalDays, 0.95); // Max 95% confidence

    // Assumptions and warnings
    const assumptions = [
      'Assumes linear spending pattern',
      `Based on ${daysElapsed} days of data`,
      'Does not account for scheduled large expenses',
    ];

    const warnings: string[] = [];

    if (daysElapsed < totalDays * 0.2) {
      warnings.push('Low confidence: Less than 20% of period elapsed');
    }

    if (forecastedSpending > budget.allocatedAmount) {
      const overspend = forecastedSpending - budget.allocatedAmount;
      const overspendPercentage = (overspend / budget.allocatedAmount) * 100;
      warnings.push(
        `Projected to exceed budget by $${overspend.toFixed(2)} (${overspendPercentage.toFixed(1)}%)`
      );
    }

    return {
      budgetId: budget.id,
      currentSpending: budget.spentAmount,
      forecastedEndOfPeriodSpending: forecastedSpending,
      confidence,
      method: 'linear',
      assumptions,
      warnings,
    };
  }

  // ===== Budget Alerts =====

  /**
   * Check and create budget alerts
   */
  private async checkBudgetAlerts(budget: Budget): Promise<void> {
    // Check if alert already exists for this budget
    const existingAlerts = Array.from(this.budgetAlerts.values()).filter(
      (alert) => alert.budgetId === budget.id && !alert.acknowledged
    );

    // Determine alert type
    let alertType: BudgetAlert['alertType'] | null = null;
    let message = '';

    if (budget.spentPercentage >= 100) {
      alertType = 'over_budget';
      message = `Budget exhausted: $${budget.spentAmount.toFixed(2)} spent of $${budget.allocatedAmount.toFixed(2)} allocated`;
    } else if (budget.spentPercentage >= 90) {
      alertType = 'critical';
      message = `Critical: ${budget.spentPercentage.toFixed(1)}% of budget spent`;
    } else if (budget.spentPercentage >= 80) {
      alertType = 'warning';
      message = `Warning: ${budget.spentPercentage.toFixed(1)}% of budget spent`;
    }

    if (!alertType) {
      return; // No alert needed
    }

    // Check if alert of this type already exists
    const sameTypeAlert = existingAlerts.find((a) => a.alertType === alertType);

    if (sameTypeAlert) {
      return; // Alert already exists
    }

    // Create new alert
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const alert: BudgetAlert = {
      id: alertId,
      budgetId: budget.id,
      budget,
      alertType,
      message,
      spentPercentage: budget.spentPercentage,
      createdAt: new Date(),
      acknowledged: false,
    };

    this.budgetAlerts.set(alertId, alert);

    this.logger.warn(
      `[BUDGET ALERT] ${alertType.toUpperCase()}: ${message} (Budget ${budget.id})`
    );

    // Send email notification
    await this.sendBudgetAlertEmail(alert);
  }

  /**
   * Get active budget alerts
   */
  async getBudgetAlerts(budgetId?: string): Promise<BudgetAlert[]> {
    let alerts = Array.from(this.budgetAlerts.values()).filter(
      (alert) => !alert.acknowledged
    );

    if (budgetId) {
      alerts = alerts.filter((alert) => alert.budgetId === budgetId);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Acknowledge a budget alert
   */
  async acknowledgeBudgetAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<BudgetAlert> {
    const alert = this.budgetAlerts.get(alertId);

    if (!alert) {
      throw new NotFoundException(`Budget alert ${alertId} not found`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.budgetAlerts.set(alertId, alert);

    this.logger.log(`Budget alert ${alertId} acknowledged by ${acknowledgedBy}`);

    return alert;
  }

  // ===== Private Methods =====

  /**
   * Update budget calculated fields
   */
  private async updateBudgetCalculatedFields(budget: Budget): Promise<void> {
    // Remaining amount
    budget.remainingAmount = budget.allocatedAmount - budget.spentAmount;

    // Spent percentage
    budget.spentPercentage =
      budget.allocatedAmount > 0
        ? (budget.spentAmount / budget.allocatedAmount) * 100
        : 0;

    // Variance
    budget.variance =
      budget.allocatedAmount > 0
        ? ((budget.spentAmount - budget.allocatedAmount) / budget.allocatedAmount) * 100
        : 0;

    // Status
    if (budget.spentPercentage >= 100) {
      budget.status = BudgetStatus.OVER_BUDGET;
    } else if (budget.spentPercentage >= 80) {
      budget.status = BudgetStatus.AT_RISK;
    } else {
      budget.status = BudgetStatus.ON_TRACK;
    }

    // Forecasted spending
    const forecast = await this.forecastBudgetSpending(budget.id);
    budget.forecastedSpending = forecast.forecastedEndOfPeriodSpending;
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }

  /**
   * Send budget alert email
   */
  private async sendBudgetAlertEmail(alert: BudgetAlert): Promise<void> {
    // TODO: Integrate with email service
    this.logger.log(
      `[EMAIL] Budget alert: ${alert.alertType.toUpperCase()} - ${alert.message}`
    );

    // In production:
    // - Send email to budget owner
    // - Send email to finance team
    // - Post to Slack channel
  }

  /**
   * Calculate budget variance percentage
   */
  calculateVariance(allocated: number, spent: number): number {
    if (allocated === 0) {
      return 0;
    }

    return ((spent - allocated) / allocated) * 100;
  }
}
