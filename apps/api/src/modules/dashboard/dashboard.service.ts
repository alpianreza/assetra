import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompliancePeriodEngine, ComplianceFrequency } from '../compliance/period-engine.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periodEngine: CompliancePeriodEngine,
  ) {}

  async getSummary(filters: { areaId?: number; categoryId?: number }) {
    const where: Record<string, number> = {};
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
    const where: any = {};
    if (filters.areaId) where.inventory = { areaId: filters.areaId };
    if (filters.categoryId) where.inventory = { ...where.inventory, categoryId: filters.categoryId };
    const logs = await this.prisma.checklistLog.findMany({ where: { ...where, questionId: { not: null } }, select: { status: true } });
    return {
      completed: logs.filter(log => log.status === 'ok').length,
      pending: logs.filter(log => log.status === 'na').length,
      late: logs.filter(log => log.status === 'not_ok').length,
    };
  }

  async getBreakdowns(filters: { areaId?: number; categoryId?: number }) {
    const where: Record<string, number> = {};
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    const inventories = await this.prisma.complianceInventory.findMany({ where, include: { category: true, area: true } });
    const byArea = inventories.reduce((acc, inv) => { const key = inv.area?.name ?? 'Tanpa Area'; acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byCategory = inventories.reduce((acc, inv) => { const key = inv.category?.name ?? 'Tanpa Kategori'; acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>);
    return { byArea, byCategory };
  }

  async getMyWork(userId: number, requestedMonth?: string) {
    const now = new Date();
    const monthKey = requestedMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new BadRequestException('Format bulan harus YYYY-MM');
    const [year, month] = monthKey.split('-').map(Number);

    const inventories = await this.prisma.complianceInventory.findMany({
      where: { picAssignments: { some: { userId } }, status: { not: 'disposed' } },
      include: {
        itemType: true,
        area: true,
        category: true,
        checklistTemplateAssignments: { include: { template: true } },
      },
      orderBy: { assetCode: 'asc' },
    });

    const inventoryIds = inventories.map(inventory => inventory.id);
    const logs = inventoryIds.length === 0 ? [] : await this.prisma.checklistLog.findMany({
      where: { inventoryId: { in: inventoryIds }, periodKey: { startsWith: monthKey }, questionId: { not: null } },
      select: { inventoryId: true, periodKey: true, status: true },
    });
    const doneKeys = new Set(logs.map(log => `${log.inventoryId}:${log.periodKey}`));
    const notOkKeys = new Set(logs.filter(log => log.status === 'not_ok').map(log => `${log.inventoryId}:${log.periodKey}`));

    let totalRequired = 0;
    let totalDone = 0;
    const allNotOkKeys = new Set<string>();
    const pendingItems: Array<Record<string, unknown>> = [];

    for (const inventory of inventories) {
      const rawFrequency = inventory.itemType?.checklistFrequency;
      if (!this.periodEngine.isFrequency(rawFrequency)) continue;
      const frequency = rawFrequency as ComplianceFrequency;
      const periods = this.periodEngine.generateCalendarPeriods(frequency, year, month);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const offdays = frequency === 'daily' ? await this.periodEngine.offdayDatesBetween(monthStart, monthEnd) : new Set<string>();
      const available = periods.filter(period => !this.periodEngine.isPeriodFuture(frequency, period.periodKey) && !this.periodEngine.isOffdayPeriod(frequency, period.periodKey, offdays));
      const missing = available.filter(period => !doneKeys.has(`${inventory.id}:${period.periodKey}`));
      totalRequired += available.length;
      totalDone += available.length - missing.length;
      available.forEach(period => { const key = `${inventory.id}:${period.periodKey}`; if (notOkKeys.has(key)) allNotOkKeys.add(key); });

      if (missing.length > 0) {
        pendingItems.push({
          id: inventory.id,
          assetCode: inventory.assetCode,
          itemType: inventory.itemType?.name ?? '-',
          category: inventory.category.name,
          area: inventory.area?.name ?? '-',
          specificArea: inventory.specificArea,
          frequency,
          remaining: missing.length,
          firstPeriodKey: missing[0].periodKey,
          firstPeriodLabel: missing[0].label,
          templateId: inventory.checklistTemplateAssignments[0]?.templateId ?? null,
        });
      }
    }

    return {
      month: monthKey,
      totalInventories: inventories.length,
      totalRequired,
      completed: totalDone,
      pending: Math.max(0, totalRequired - totalDone),
      findings: allNotOkKeys.size,
      progress: totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0,
      pendingItems: pendingItems.slice(0, 12),
    };
  }
}
