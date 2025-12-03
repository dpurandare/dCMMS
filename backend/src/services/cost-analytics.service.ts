import {
  CostAnalyticsQuery,
  CostAnalyticsResult,
  CostTrend,
  CostBySite,
  CostByWOType,
  CostExportOptions,
  Currency,
} from '../models/cost.models';
import { CostCalculationService } from './cost-calculation.service';

export class CostAnalyticsService {
  constructor(private readonly costService: CostCalculationService) { }

  /**
   * Get aggregate cost analytics
   */
  async getCostAnalytics(query: CostAnalyticsQuery): Promise<CostAnalyticsResult> {
    console.log(
      `Generating cost analytics: ${query.startDate.toISOString().split('T')[0]} to ${query.endDate.toISOString().split('T')[0]}, ` +
      `GroupBy: ${query.groupBy}`
    );

    // Get all cost records in the date range
    // In production, this would query the database
    // For now, we'll use mock data

    const mockData = this.generateMockAnalyticsData(query);

    return mockData;
  }

  /**
   * Get cost trends over time (monthly aggregates)
   */
  async getCostTrends(
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostTrend[]> {
    console.log('Generating cost trends');

    // Mock data for demonstration
    const trends: CostTrend[] = [];
    const start = startDate || new Date(new Date().getFullYear(), 0, 1); // Jan 1 of current year
    const end = endDate || new Date();

    const months = this.getMonthsBetween(start, end);

    for (const month of months) {
      trends.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM
        totalCost: Math.random() * 50000 + 20000, // $20K-$70K
        laborCost: Math.random() * 25000 + 10000,
        partsCost: Math.random() * 15000 + 5000,
        equipmentCost: Math.random() * 8000 + 3000,
        otherCost: Math.random() * 2000 + 500,
        woCount: Math.floor(Math.random() * 50 + 20),
        avgCostPerWO: 0, // Will be calculated
      });

      // Calculate avg cost per WO
      const lastTrend = trends[trends.length - 1];
      lastTrend.avgCostPerWO = lastTrend.totalCost / lastTrend.woCount;
    }

    return trends;
  }

  /**
   * Get cost breakdown by site
   */
  async getCostBySite(startDate: Date, endDate: Date): Promise<CostBySite[]> {
    console.log('Generating cost by site');

    // Mock data
    const sites = ['Site A', 'Site B', 'Site C', 'Site D'];
    const costBySite: CostBySite[] = [];

    for (const siteName of sites) {
      const woCount = Math.floor(Math.random() * 30 + 10);
      const totalCost = Math.random() * 40000 + 15000;

      costBySite.push({
        siteId: `site_${siteName.toLowerCase().replace(' ', '_')}`,
        siteName,
        totalCost,
        woCount,
        avgCostPerWO: totalCost / woCount,
      });
    }

    return costBySite.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get cost breakdown by work order type
   */
  async getCostByWOType(
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostByWOType[]> {
    console.log('Generating cost by WO type');

    // Mock data
    const woTypes = [
      { type: 'preventive', cost: 25000, count: 45 },
      { type: 'corrective', cost: 35000, count: 30 },
      { type: 'predictive', cost: 15000, count: 20 },
    ];

    const totalCost = woTypes.reduce((sum, wt) => sum + wt.cost, 0);

    return woTypes.map((wt) => ({
      woType: wt.type,
      totalCost: wt.cost,
      woCount: wt.count,
      avgCostPerWO: wt.cost / wt.count,
      percentage: (wt.cost / totalCost) * 100,
    }));
  }

  /**
   * Export cost data
   */
  async exportCostData(
    query: CostAnalyticsQuery,
    options: CostExportOptions
  ): Promise<{ data: string; mimeType: string; filename: string }> {
    console.log(`Exporting cost data as ${options.format}`);

    const analytics = await this.getCostAnalytics(query);

    switch (options.format) {
      case 'csv':
        return this.exportAsCSV(analytics, query, options);

      case 'pdf':
        return this.exportAsPDF(analytics, query, options);

      case 'excel':
        return this.exportAsExcel(analytics, query, options);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get cost variance analysis (current vs previous period)
   */
  async getCostVariance(
    siteId?: string,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date
  ): Promise<{
    currentPeriod: { cost: number; woCount: number };
    previousPeriod: { cost: number; woCount: number };
    variance: {
      costChange: number;
      costChangePercentage: number;
      woCountChange: number;
      woCountChangePercentage: number;
    };
  }> {
    console.log('Calculating cost variance');

    // Mock data
    const currentPeriod = {
      cost: Math.random() * 50000 + 30000,
      woCount: Math.floor(Math.random() * 50 + 30),
    };

    const previousPeriod = {
      cost: Math.random() * 50000 + 25000,
      woCount: Math.floor(Math.random() * 50 + 25),
    };

    const costChange = currentPeriod.cost - previousPeriod.cost;
    const costChangePercentage = (costChange / previousPeriod.cost) * 100;

    const woCountChange = currentPeriod.woCount - previousPeriod.woCount;
    const woCountChangePercentage = (woCountChange / previousPeriod.woCount) * 100;

    return {
      currentPeriod,
      previousPeriod,
      variance: {
        costChange,
        costChangePercentage,
        woCountChange,
        woCountChangePercentage,
      },
    };
  }

  /**
   * Get cost per asset analysis
   */
  async getCostPerAsset(
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    assetId: string;
    assetName: string;
    totalCost: number;
    woCount: number;
    avgCostPerWO: number;
    lastMaintenanceDate: Date;
  }>> {
    console.log('Generating cost per asset');

    // Mock data
    const assets = [];

    for (let i = 1; i <= 10; i++) {
      const woCount = Math.floor(Math.random() * 10 + 2);
      const totalCost = Math.random() * 15000 + 3000;

      assets.push({
        assetId: `asset_${i.toString().padStart(3, '0')}`,
        assetName: `Asset ${String.fromCharCode(64 + i)} - Equipment`,
        totalCost,
        woCount,
        avgCostPerWO: totalCost / woCount,
        lastMaintenanceDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      });
    }

    return assets.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get category-wise cost breakdown
   */
  async getCostBreakdown(
    siteId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    labor: { amount: number; percentage: number };
    parts: { amount: number; percentage: number };
    equipment: { amount: number; percentage: number };
    other: { amount: number; percentage: number };
    total: number;
  }> {
    console.log('Generating cost breakdown');

    // Mock data
    const labor = Math.random() * 30000 + 15000;
    const parts = Math.random() * 20000 + 10000;
    const equipment = Math.random() * 10000 + 5000;
    const other = Math.random() * 5000 + 2000;
    const total = labor + parts + equipment + other;

    return {
      labor: {
        amount: labor,
        percentage: (labor / total) * 100,
      },
      parts: {
        amount: parts,
        percentage: (parts / total) * 100,
      },
      equipment: {
        amount: equipment,
        percentage: (equipment / total) * 100,
      },
      other: {
        amount: other,
        percentage: (other / total) * 100,
      },
      total,
    };
  }

  // ===== Private Methods =====

  /**
   * Generate mock analytics data
   */
  private generateMockAnalyticsData(query: CostAnalyticsQuery): CostAnalyticsResult {
    const totalCost = Math.random() * 100000 + 50000;
    const woCount = Math.floor(Math.random() * 100 + 50);

    return {
      totalCost,
      averageCostPerWO: totalCost / woCount,
      costPerAsset: totalCost / 50, // Assume 50 assets
      costVariance: (Math.random() - 0.5) * 20, // -10% to +10%
      currency: Currency.USD,

      categoryBreakdown: {
        labor: {
          amount: totalCost * 0.45,
          percentage: 45,
        },
        parts: {
          amount: totalCost * 0.30,
          percentage: 30,
        },
        equipment: {
          amount: totalCost * 0.18,
          percentage: 18,
        },
        other: {
          amount: totalCost * 0.07,
          percentage: 7,
        },
      },

      trends: this.generateMockTrends(query.startDate, query.endDate),

      groups: this.generateMockGroups(query.groupBy),

      comparison: {
        previousPeriodCost: totalCost * (0.9 + Math.random() * 0.2), // 90-110% of current
        change: 0, // Will be calculated
        changePercentage: 0, // Will be calculated
      },
    };
  }

  /**
   * Generate mock trends
   */
  private generateMockTrends(startDate: Date, endDate: Date): CostAnalyticsResult['trends'] {
    const trends: CostAnalyticsResult['trends'] = [];
    const months = this.getMonthsBetween(startDate, endDate);

    for (const month of months) {
      const totalCost = Math.random() * 30000 + 15000;
      const woCount = Math.floor(Math.random() * 30 + 10);

      trends.push({
        date: month,
        totalCost,
        woCount,
        avgCostPerWO: totalCost / woCount,
      });
    }

    return trends;
  }

  /**
   * Generate mock groups
   */
  private generateMockGroups(groupBy: string): CostAnalyticsResult['groups'] {
    const groups: CostAnalyticsResult['groups'] = [];

    const groupNames =
      groupBy === 'site'
        ? ['Site A', 'Site B', 'Site C', 'Site D']
        : groupBy === 'wo_type'
          ? ['Preventive', 'Corrective', 'Predictive']
          : groupBy === 'category'
            ? ['Labor', 'Parts', 'Equipment', 'Other']
            : ['Group 1', 'Group 2', 'Group 3'];

    for (const name of groupNames) {
      const totalCost = Math.random() * 40000 + 10000;
      const woCount = Math.floor(Math.random() * 40 + 10);

      groups.push({
        groupKey: name.toLowerCase().replace(' ', '_'),
        groupName: name,
        totalCost,
        woCount,
        avgCostPerWO: totalCost / woCount,
      });
    }

    return groups.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get months between two dates
   */
  private getMonthsBetween(startDate: Date, endDate: Date): Date[] {
    const months: Date[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(
    analytics: CostAnalyticsResult,
    query: CostAnalyticsQuery,
    options: CostExportOptions
  ): { data: string; mimeType: string; filename: string } {
    let csv = 'Cost Analytics Report\n\n';

    csv += `Period: ${query.startDate.toISOString().split('T')[0]} to ${query.endDate.toISOString().split('T')[0]}\n`;
    csv += `Total Cost: $${analytics.totalCost.toFixed(2)}\n`;
    csv += `Average Cost per WO: $${analytics.averageCostPerWO.toFixed(2)}\n\n`;

    if (options.includeBreakdown) {
      csv += 'Category Breakdown\n';
      csv += 'Category,Amount,Percentage\n';
      csv += `Labor,$${analytics.categoryBreakdown.labor.amount.toFixed(2)},${analytics.categoryBreakdown.labor.percentage.toFixed(1)}%\n`;
      csv += `Parts,$${analytics.categoryBreakdown.parts.amount.toFixed(2)},${analytics.categoryBreakdown.parts.percentage.toFixed(1)}%\n`;
      csv += `Equipment,$${analytics.categoryBreakdown.equipment.amount.toFixed(2)},${analytics.categoryBreakdown.equipment.percentage.toFixed(1)}%\n`;
      csv += `Other,$${analytics.categoryBreakdown.other.amount.toFixed(2)},${analytics.categoryBreakdown.other.percentage.toFixed(1)}%\n\n`;
    }

    if (options.includeTrends) {
      csv += 'Cost Trends\n';
      csv += 'Date,Total Cost,WO Count,Avg Cost per WO\n';
      for (const trend of analytics.trends) {
        csv += `${trend.date.toISOString().split('T')[0]},$${trend.totalCost.toFixed(2)},${trend.woCount},$${trend.avgCostPerWO.toFixed(2)}\n`;
      }
      csv += '\n';
    }

    if (options.includeComparison && analytics.comparison) {
      csv += 'Period Comparison\n';
      csv += `Previous Period: $${analytics.comparison.previousPeriodCost.toFixed(2)}\n`;
      csv += `Current Period: $${analytics.totalCost.toFixed(2)}\n`;
      csv += `Change: $${analytics.comparison.change.toFixed(2)} (${analytics.comparison.changePercentage.toFixed(1)}%)\n`;
    }

    return {
      data: csv,
      mimeType: 'text/csv',
      filename: `cost_analytics_${query.startDate.toISOString().split('T')[0]}_to_${query.endDate.toISOString().split('T')[0]}.csv`,
    };
  }

  /**
   * Export as PDF (mock)
   */
  private exportAsPDF(
    analytics: CostAnalyticsResult,
    query: CostAnalyticsQuery,
    options: CostExportOptions
  ): { data: string; mimeType: string; filename: string } {
    // In production, use a PDF library like pdfkit or puppeteer
    console.warn('PDF export not fully implemented - returning placeholder');

    return {
      data: 'PDF export would generate a formatted PDF report here',
      mimeType: 'application/pdf',
      filename: `cost_analytics_${query.startDate.toISOString().split('T')[0]}_to_${query.endDate.toISOString().split('T')[0]}.pdf`,
    };
  }

  /**
   * Export as Excel (mock)
   */
  private exportAsExcel(
    analytics: CostAnalyticsResult,
    query: CostAnalyticsQuery,
    options: CostExportOptions
  ): { data: string; mimeType: string; filename: string } {
    // In production, use a library like exceljs
    console.warn('Excel export not fully implemented - returning placeholder');

    return {
      data: 'Excel export would generate an XLSX file here',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `cost_analytics_${query.startDate.toISOString().split('T')[0]}_to_${query.endDate.toISOString().split('T')[0]}.xlsx`,
    };
  }
}
