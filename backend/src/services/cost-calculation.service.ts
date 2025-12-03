import { CostRecord, CreateCostRecordRequest, UpdateCostRecordRequest, CostSummary, CostCategory, Currency, LaborRate, CreateLaborRateRequest, EquipmentRate, CreateEquipmentRateRequest, CostCalculationInput, CostCalculationResult } from '../models/cost.models';

export class CostCalculationService {
  // In-memory storage (in production, use database)
  private costRecords: Map<string, CostRecord> = new Map();
  private laborRates: Map<string, LaborRate> = new Map();
  private equipmentRates: Map<string, EquipmentRate> = new Map();

  constructor() {
    // Seed with default rates
    this.seedDefaultRates();
  }

  // ===== Cost Record CRUD =====

  /**
   * Add a cost record to a work order
   */
  async addCostRecord(request: CreateCostRecordRequest): Promise<CostRecord> {
    console.log(`Adding cost record for WO: ${request.workOrderId}`);

    // Validate amount
    if (request.amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const costId = `cost_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const costRecord: CostRecord = {
      id: costId,
      workOrderId: request.workOrderId,
      category: request.category,
      description: request.description,
      amount: request.amount,
      currency: request.currency || Currency.USD,
      isAutoCalculated: false, // Manual entry by default

      // Category-specific fields
      laborHours: request.laborHours,
      technicianId: request.technicianId,
      partId: request.partId,
      partQuantity: request.partQuantity,
      equipmentType: request.equipmentType,
      equipmentHours: request.equipmentHours,

      // Audit
      createdAt: new Date(),
      createdBy: request.createdBy,
    };

    this.costRecords.set(costId, costRecord);

    console.log(`Cost record ${costId} added: ${request.category} - $${request.amount}`);

    // Update work order total cost
    await this.updateWorkOrderTotalCost(request.workOrderId);

    return costRecord;
  }

  /**
   * Get all cost records for a work order
   */
  async getCostRecords(workOrderId: string): Promise<CostRecord[]> {
    const records = Array.from(this.costRecords.values()).filter(
      (record) => record.workOrderId === workOrderId
    );

    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get a single cost record
   */
  async getCostRecord(costId: string): Promise<CostRecord> {
    const record = this.costRecords.get(costId);

    if (!record) {
      throw new Error(`Cost record ${costId} not found`);
    }

    return record;
  }

  async updateCostRecord(
    costId: string,
    request: UpdateCostRecordRequest
  ): Promise<CostRecord> {
    const record = await this.getCostRecord(costId);

    if (record.isAutoCalculated) {
      throw new Error('Cannot update auto-calculated cost records');
    }

    if (request.description) {
      record.description = request.description;
    }

    if (request.amount !== undefined) {
      if (request.amount < 0) {
        throw new Error('Amount cannot be negative');
      }
      record.amount = request.amount;
    }

    record.updatedAt = new Date();
    record.updatedBy = request.updatedBy;

    this.costRecords.set(costId, record);

    console.log(`Cost record ${costId} updated`);

    // Update work order total cost
    await this.updateWorkOrderTotalCost(record.workOrderId);

    return record;
  }

  async deleteCostRecord(costId: string, deletedBy: string): Promise<void> {
    const record = await this.getCostRecord(costId);

    if (record.isAutoCalculated) {
      throw new Error('Cannot delete auto-calculated cost records');
    }

    this.costRecords.delete(costId);

    console.log(`Cost record ${costId} deleted by ${deletedBy}`);

    // Update work order total cost
    await this.updateWorkOrderTotalCost(record.workOrderId);
  }

  async autoCalculateCosts(
    workOrderId: string,
    input: CostCalculationInput,
    calculatedBy: string
  ): Promise<CostCalculationResult> {
    console.log(`Auto-calculating costs for WO: ${workOrderId}`);

    const breakdown: CostCalculationResult['breakdown'] = [];
    let laborCost = 0;
    let partsCost = 0;
    let equipmentCost = 0;
    let otherCost = 0;

    // Calculate labor costs
    if (input.laborRecords && input.laborRecords.length > 0) {
      for (const labor of input.laborRecords) {
        const rate = await this.getActiveLaborRate(labor.technicianRole);

        if (!rate) {
          console.warn(`No labor rate found for role: ${labor.technicianRole}`);
          continue;
        }

        const hourlyRate = labor.isOvertime
          ? rate.hourlyRate * rate.overtimeMultiplier
          : rate.hourlyRate;

        const cost = labor.hours * hourlyRate;
        laborCost += cost;

        // Create cost record
        const costRecord: CostRecord = {
          id: `cost_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          workOrderId,
          category: CostCategory.LABOR,
          description: `Labor: ${labor.technicianRole} (${labor.hours} hrs${labor.isOvertime ? ' OT' : ''})`,
          amount: cost,
          currency: rate.currency,
          isAutoCalculated: true,
          laborHours: labor.hours,
          laborRate: hourlyRate,
          createdAt: new Date(),
          createdBy: calculatedBy,
        };

        this.costRecords.set(costRecord.id, costRecord);

        breakdown.push({
          category: CostCategory.LABOR,
          description: costRecord.description,
          amount: cost,
          isAutoCalculated: true,
        });
      }
    }

    // Calculate parts costs
    if (input.partsConsumed && input.partsConsumed.length > 0) {
      for (const part of input.partsConsumed) {
        const cost = part.quantity * part.unitPrice;
        partsCost += cost;

        // Create cost record
        const costRecord: CostRecord = {
          id: `cost_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          workOrderId,
          category: CostCategory.PARTS,
          description: `Parts: ${part.partId} (${part.quantity} units @ $${part.unitPrice})`,
          amount: cost,
          currency: Currency.USD,
          isAutoCalculated: true,
          partId: part.partId,
          partQuantity: part.quantity,
          partUnitPrice: part.unitPrice,
          createdAt: new Date(),
          createdBy: calculatedBy,
        };

        this.costRecords.set(costRecord.id, costRecord);

        breakdown.push({
          category: CostCategory.PARTS,
          description: costRecord.description,
          amount: cost,
          isAutoCalculated: true,
        });
      }
    }

    // Calculate equipment costs
    if (input.equipmentUsage && input.equipmentUsage.length > 0) {
      for (const equipment of input.equipmentUsage) {
        const rate = await this.getActiveEquipmentRate(equipment.equipmentType);

        if (!rate) {
          console.warn(`No equipment rate found for type: ${equipment.equipmentType}`);
          continue;
        }

        const cost = equipment.hours * rate.hourlyRate;
        equipmentCost += cost;

        // Create cost record
        const costRecord: CostRecord = {
          id: `cost_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          workOrderId,
          category: CostCategory.EQUIPMENT,
          description: `Equipment: ${equipment.equipmentType} (${equipment.hours} hrs @ $${rate.hourlyRate}/hr)`,
          amount: cost,
          currency: rate.currency,
          isAutoCalculated: true,
          equipmentType: equipment.equipmentType,
          equipmentHours: equipment.hours,
          equipmentRate: rate.hourlyRate,
          createdAt: new Date(),
          createdBy: calculatedBy,
        };

        this.costRecords.set(costRecord.id, costRecord);

        breakdown.push({
          category: CostCategory.EQUIPMENT,
          description: costRecord.description,
          amount: cost,
          isAutoCalculated: true,
        });
      }
    }

    // Add other costs (manual entries)
    if (input.otherCosts && input.otherCosts.length > 0) {
      for (const other of input.otherCosts) {
        otherCost += other.amount;

        breakdown.push({
          category: CostCategory.OTHER,
          description: other.description,
          amount: other.amount,
          isAutoCalculated: false,
        });
      }
    }

    const totalCost = laborCost + partsCost + equipmentCost + otherCost;

    console.log(
      `Auto-calculation complete for WO ${workOrderId}: ` +
      `Labor=$${laborCost}, Parts=$${partsCost}, Equipment=$${equipmentCost}, ` +
      `Other=$${otherCost}, Total=$${totalCost}`
    );

    // Update work order total cost
    await this.updateWorkOrderTotalCost(workOrderId);

    return {
      laborCost,
      partsCost,
      equipmentCost,
      otherCost,
      totalCost,
      breakdown,
    };
  }

  async getCostSummary(workOrderId: string): Promise<CostSummary> {
    const records = await this.getCostRecords(workOrderId);

    if (records.length === 0) {
      throw new Error(`No cost records found for work order ${workOrderId}`);
    }

    // Initialize breakdown
    const breakdown = {
      labor: {
        total: 0,
        hours: 0,
        averageRate: 0,
        records: 0,
      },
      parts: {
        total: 0,
        quantity: 0,
        records: 0,
      },
      equipment: {
        total: 0,
        hours: 0,
        averageRate: 0,
        records: 0,
      },
      other: {
        total: 0,
        records: 0,
      },
    };

    let totalCost = 0;
    let autoCalculatedCost = 0;
    let manualCost = 0;
    const currency = records[0].currency;
    const createdAt = records[records.length - 1].createdAt;
    const lastUpdated = records[0].createdAt;

    // Aggregate by category
    for (const record of records) {
      totalCost += record.amount;

      if (record.isAutoCalculated) {
        autoCalculatedCost += record.amount;
      } else {
        manualCost += record.amount;
      }

      switch (record.category) {
        case CostCategory.LABOR:
          breakdown.labor.total += record.amount;
          breakdown.labor.hours += record.laborHours || 0;
          breakdown.labor.records++;
          break;

        case CostCategory.PARTS:
          breakdown.parts.total += record.amount;
          breakdown.parts.quantity += record.partQuantity || 0;
          breakdown.parts.records++;
          break;

        case CostCategory.EQUIPMENT:
          breakdown.equipment.total += record.amount;
          breakdown.equipment.hours += record.equipmentHours || 0;
          breakdown.equipment.records++;
          break;

        case CostCategory.OTHER:
          breakdown.other.total += record.amount;
          breakdown.other.records++;
          break;
      }
    }

    // Calculate averages
    if (breakdown.labor.hours > 0) {
      breakdown.labor.averageRate = breakdown.labor.total / breakdown.labor.hours;
    }

    if (breakdown.equipment.hours > 0) {
      breakdown.equipment.averageRate = breakdown.equipment.total / breakdown.equipment.hours;
    }

    return {
      workOrderId,
      totalCost,
      currency,
      breakdown,
      autoCalculatedCost,
      manualCost,
      createdAt,
      lastUpdated,
    };
  }

  async createLaborRate(request: CreateLaborRateRequest): Promise<LaborRate> {
    console.log(`Creating labor rate for role: ${request.role}`);

    const rateId = `labor_rate_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const laborRate: LaborRate = {
      id: rateId,
      role: request.role,
      hourlyRate: request.hourlyRate,
      overtimeMultiplier: request.overtimeMultiplier || 1.5,
      currency: request.currency || Currency.USD,
      effectiveDate: request.effectiveDate || new Date(),
      createdAt: new Date(),
      createdBy: request.createdBy,
    };

    this.laborRates.set(rateId, laborRate);

    console.log(
      `Labor rate created: ${request.role} @ $${request.hourlyRate}/hr`
    );

    return laborRate;
  }

  /**
   * Get all labor rates
   */
  async getLaborRates(includeExpired: boolean = false): Promise<LaborRate[]> {
    let rates = Array.from(this.laborRates.values());

    if (!includeExpired) {
      const now = new Date();
      rates = rates.filter((rate) => !rate.expiryDate || rate.expiryDate > now);
    }

    return rates.sort((a, b) => a.role.localeCompare(b.role));
  }

  /**
   * Get active labor rate for a role
   */
  async getActiveLaborRate(role: string): Promise<LaborRate | null> {
    const now = new Date();

    const rates = Array.from(this.laborRates.values()).filter(
      (rate) =>
        rate.role === role &&
        rate.effectiveDate <= now &&
        (!rate.expiryDate || rate.expiryDate > now)
    );

    if (rates.length === 0) {
      return null;
    }

    // Return most recent effective rate
    return rates.sort(
      (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
    )[0];
  }

  async updateLaborRate(
    role: string,
    newHourlyRate: number,
    updatedBy: string
  ): Promise<LaborRate> {
    console.log(`Updating labor rate for role: ${role}`);

    // Expire old rate
    const currentRate = await this.getActiveLaborRate(role);

    if (currentRate) {
      currentRate.expiryDate = new Date();
      this.laborRates.set(currentRate.id, currentRate);
    }

    // Create new rate
    const newRate = await this.createLaborRate({
      role,
      hourlyRate: newHourlyRate,
      overtimeMultiplier: currentRate?.overtimeMultiplier,
      currency: currentRate?.currency,
      createdBy: updatedBy,
    });

    console.log(`Labor rate updated: ${role} @ $${newHourlyRate}/hr (was $${currentRate?.hourlyRate || 'N/A'}/hr)`);

    return newRate;
  }

  async createEquipmentRate(request: CreateEquipmentRateRequest): Promise<EquipmentRate> {
    console.log(`Creating equipment rate for type: ${request.equipmentType}`);

    const rateId = `equipment_rate_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const equipmentRate: EquipmentRate = {
      id: rateId,
      equipmentType: request.equipmentType,
      hourlyRate: request.hourlyRate,
      currency: request.currency || Currency.USD,
      effectiveDate: request.effectiveDate || new Date(),
      createdAt: new Date(),
      createdBy: request.createdBy,
    };

    this.equipmentRates.set(rateId, equipmentRate);

    console.log(
      `Equipment rate created: ${request.equipmentType} @ $${request.hourlyRate}/hr`
    );

    return equipmentRate;
  }

  /**
   * Get all equipment rates
   */
  async getEquipmentRates(includeExpired: boolean = false): Promise<EquipmentRate[]> {
    let rates = Array.from(this.equipmentRates.values());

    if (!includeExpired) {
      const now = new Date();
      rates = rates.filter((rate) => !rate.expiryDate || rate.expiryDate > now);
    }

    return rates.sort((a, b) => a.equipmentType.localeCompare(b.equipmentType));
  }

  /**
   * Get active equipment rate
   */
  async getActiveEquipmentRate(equipmentType: string): Promise<EquipmentRate | null> {
    const now = new Date();

    const rates = Array.from(this.equipmentRates.values()).filter(
      (rate) =>
        rate.equipmentType === equipmentType &&
        rate.effectiveDate <= now &&
        (!rate.expiryDate || rate.expiryDate > now)
    );

    if (rates.length === 0) {
      return null;
    }

    // Return most recent effective rate
    return rates.sort(
      (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime()
    )[0];
  }

  async updateEquipmentRate(
    equipmentType: string,
    newHourlyRate: number,
    updatedBy: string
  ): Promise<EquipmentRate> {
    console.log(`Updating equipment rate for type: ${equipmentType}`);

    // Expire old rate
    const currentRate = await this.getActiveEquipmentRate(equipmentType);

    if (currentRate) {
      currentRate.expiryDate = new Date();
      this.equipmentRates.set(currentRate.id, currentRate);
    }

    // Create new rate
    const newRate = await this.createEquipmentRate({
      equipmentType,
      hourlyRate: newHourlyRate,
      currency: currentRate?.currency,
      createdBy: updatedBy,
    });

    console.log(
      `Equipment rate updated: ${equipmentType} @ $${newHourlyRate}/hr (was $${currentRate?.hourlyRate || 'N/A'}/hr)`
    );

    return newRate;
  }

  private async updateWorkOrderTotalCost(workOrderId: string): Promise<void> {
    try {
      const summary = await this.getCostSummary(workOrderId);

      // TODO: Update work order entity with total cost
      // await this.workOrderService.updateTotalCost(workOrderId, summary.totalCost);

      console.log(`Work order ${workOrderId} total cost updated: $${summary.totalCost}`);
    } catch (error) {
      if ((error as any).message.includes('No cost records found')) {
        // No costs yet, that's ok
        console.log(`No costs to update for work order ${workOrderId}`);
      } else {
        console.error(`Failed to update work order total cost: ${(error as any).message}`);
      }
    }
  }

  private seedDefaultRates(): void {
    // Labor rates
    const laborRoles = [
      { role: 'Electrician', rate: 45 },
      { role: 'Mechanical Technician', rate: 42 },
      { role: 'HVAC Technician', rate: 48 },
      { role: 'Plumber', rate: 40 },
      { role: 'Engineer', rate: 75 },
      { role: 'Technician', rate: 35 },
    ];

    for (const { role, rate } of laborRoles) {
      this.createLaborRate({
        role,
        hourlyRate: rate,
        overtimeMultiplier: 1.5,
        createdBy: 'system',
      });
    }

    // Equipment rates
    const equipmentTypes = [
      { type: 'Crane', rate: 150 },
      { type: 'Forklift', rate: 75 },
      { type: 'Welding Machine', rate: 25 },
      { type: 'Generator', rate: 50 },
      { type: 'Scaffolding', rate: 30 },
      { type: 'Aerial Lift', rate: 100 },
    ];

    for (const { type, rate } of equipmentTypes) {
      this.createEquipmentRate({
        equipmentType: type,
        hourlyRate: rate,
        createdBy: 'system',
      });
    }

    console.log('Default rates seeded');
  }
}
