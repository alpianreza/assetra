import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompliancePeriodEngine } from '../compliance/period-engine.service';
import { ComplianceFrequency } from '../compliance/period-engine.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodEngine: CompliancePeriodEngine,
  ) {}

  async getSummary(filters: { areaId?: number; categoryId?: number }) {
    const where: any = {};
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const [total, active, inactive, maintenance, disposed] = await Promise.all([
      this.prisma.complianceInventory.count({ where }),
      this.prisma.complianceInventory.count({ where: { ...where, status: 'active' } }),
      this.prisma.complianceInventory.count({ where: { ...where, status: 'inactive' } }),
      this.prisma.complianceInventory.count({ where: { ...where, status: 'maintenance' } }),
      this.prisma.complianceInventory.count({ where: { ...where, status: 'disposed' } }),
    ]);

    return { total, active, inactive, maintenance, disposed };
  }

  async getComplianceStatus(filters: { areaId?: number; categoryId?: number }) {
    // Basic compliance status based on ChecklistLog status.
    const where: any = {};
    if (filters.areaId) where.inventory = { areaId: filters.areaId };
    if (filters.categoryId) where.inventory = { ...where.inventory, categoryId: filters.categoryId };

    const logs = await this.prisma.checklistLog.findMany({
      where: { ...where, questionId: null },
      select: { status: true },
    });

    return {
      completed: logs.filter(l => l.status === 'ok').length,
      pending: logs.filter(l => l.status === 'na').length, // simplified
      late: logs.filter(l => l.status === 'not_ok').length, // simplified
    };
  }

  async getBreakdowns(filters: { areaId?: number; categoryId?: number }) {
    const where: any = {};
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const inventories = await this.prisma.complianceInventory.findMany({
      where,
      include: { category: true, area: true },
    });

    const byArea = inventories.reduce((acc, inv) => {
      const area = inv.area?.name ?? 'Unknown';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = inventories.reduce((acc, inv) => {
      const category = inv.category?.name ?? 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byArea, byCategory };
  }
}
