import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompliancePeriodEngine, ComplianceFrequency } from '../compliance/period-engine.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly periodEngine: CompliancePeriodEngine) {}

  private normalizeMonth(requestedMonth?: string) {
    const now = new Date();
    const monthKey = requestedMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new BadRequestException('Format bulan harus YYYY-MM');
    return { monthKey, year: Number(monthKey.slice(0, 4)), month: Number(monthKey.slice(5, 7)) };
  }

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
    return { completed: logs.filter(log => log.status === 'ok').length, pending: logs.filter(log => log.status === 'na').length, late: logs.filter(log => log.status === 'not_ok').length };
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
    const { monthKey, year, month } = this.normalizeMonth(requestedMonth);
    const inventories = await this.prisma.complianceInventory.findMany({
      where: { picAssignments: { some: { userId } }, status: { not: 'disposed' } },
      include: { itemType: true, area: true, category: true, checklistTemplateAssignments: { include: { template: true } } },
      orderBy: { assetCode: 'asc' },
    });
    const inventoryIds = inventories.map(inventory => inventory.id);
    const logs = inventoryIds.length === 0 ? [] : await this.prisma.checklistLog.findMany({ where: { inventoryId: { in: inventoryIds }, periodKey: { startsWith: monthKey }, questionId: { not: null } }, select: { inventoryId: true, periodKey: true, status: true } });
    const doneKeys = new Set(logs.map(log => `${log.inventoryId}:${log.periodKey}`));
    const notOkKeys = new Set(logs.filter(log => log.status === 'not_ok').map(log => `${log.inventoryId}:${log.periodKey}`));
    let totalRequired = 0; let totalDone = 0; const allNotOkKeys = new Set<string>(); const pendingItems: Array<Record<string, unknown>> = [];
    const monthStart = new Date(year, month - 1, 1); const monthEnd = new Date(year, month, 0);
    const offdays = await this.periodEngine.offdayDatesBetween(monthStart, monthEnd);
    for (const inventory of inventories) {
      const rawFrequency = inventory.itemType?.checklistFrequency;
      if (!this.periodEngine.isFrequency(rawFrequency)) continue;
      const frequency = rawFrequency as ComplianceFrequency;
      const periods = this.periodEngine.generateCalendarPeriods(frequency, year, month);
      const available = periods.filter(period => !this.periodEngine.isPeriodFuture(frequency, period.periodKey) && !this.periodEngine.isOffdayPeriod(frequency, period.periodKey, offdays));
      const missing = available.filter(period => !doneKeys.has(`${inventory.id}:${period.periodKey}`));
      totalRequired += available.length; totalDone += available.length - missing.length;
      available.forEach(period => { const key = `${inventory.id}:${period.periodKey}`; if (notOkKeys.has(key)) allNotOkKeys.add(key); });
      if (missing.length > 0) pendingItems.push({ id: inventory.id, assetCode: inventory.assetCode, itemType: inventory.itemType?.name ?? '-', category: inventory.category.name, area: inventory.area?.name ?? '-', specificArea: inventory.specificArea, frequency, remaining: missing.length, firstPeriodKey: missing[0].periodKey, firstPeriodLabel: missing[0].label, templateId: inventory.checklistTemplateAssignments[0]?.templateId ?? null });
    }
    return { month: monthKey, totalInventories: inventories.length, totalRequired, completed: totalDone, pending: Math.max(0, totalRequired - totalDone), findings: allNotOkKeys.size, progress: totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0, pendingItems: pendingItems.slice(0, 12) };
  }

  async getPicProgress(requestedMonth?: string) {
    const { monthKey, year, month } = this.normalizeMonth(requestedMonth);
    const users = await this.prisma.user.findMany({
      where: { status: 'active', inventoryPicAssignments: { some: { inventory: { status: { not: 'disposed' } } } } },
      select: {
        id: true, name: true, username: true, email: true,
        inventoryPicAssignments: {
          where: { inventory: { status: { not: 'disposed' } } },
          select: { inventory: { select: { id: true, assetCode: true, specificArea: true, status: true, itemType: { select: { name: true, checklistFrequency: true } }, area: { select: { name: true } }, category: { select: { name: true } } } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    const inventoryIds = [...new Set(users.flatMap(user => user.inventoryPicAssignments.map(assignment => assignment.inventory.id)))];
    const logs = inventoryIds.length ? await this.prisma.checklistLog.findMany({
      where: { inventoryId: { in: inventoryIds }, periodKey: { startsWith: monthKey }, questionId: { not: null } },
      select: { inventoryId: true, periodKey: true, status: true },
    }) : [];
    const doneKeys = new Set(logs.map(log => `${log.inventoryId}:${log.periodKey}`));
    const findingKeys = new Set(logs.filter(log => log.status === 'not_ok').map(log => `${log.inventoryId}:${log.periodKey}`));
    const monthStart = new Date(year, month - 1, 1); const monthEnd = new Date(year, month, 0);
    const offdays = await this.periodEngine.offdayDatesBetween(monthStart, monthEnd);
    const periodCache = new Map<ComplianceFrequency, ReturnType<CompliancePeriodEngine['generateCalendarPeriods']>>();
    for (const frequency of ['daily', 'weekly', 'monthly'] as ComplianceFrequency[]) {
      periodCache.set(frequency, this.periodEngine.generateCalendarPeriods(frequency, year, month).filter(period => !this.periodEngine.isPeriodFuture(frequency, period.periodKey) && !this.periodEngine.isOffdayPeriod(frequency, period.periodKey, offdays)));
    }

    const rows = users.map(user => {
      let required = 0; let completed = 0; let late = 0; const userFindingKeys = new Set<string>();
      const missingInventories: Array<Record<string, unknown>> = [];
      for (const assignment of user.inventoryPicAssignments) {
        const inventory = assignment.inventory; const rawFrequency = inventory.itemType?.checklistFrequency;
        if (!this.periodEngine.isFrequency(rawFrequency)) continue;
        const frequency = rawFrequency as ComplianceFrequency; const periods = periodCache.get(frequency) ?? [];
        const missing = periods.filter(period => !doneKeys.has(`${inventory.id}:${period.periodKey}`));
        const latePeriods = missing.filter(period => this.periodEngine.isPeriodLate(frequency, period.periodKey));
        required += periods.length; completed += periods.length - missing.length; late += latePeriods.length;
        periods.forEach(period => { const key = `${inventory.id}:${period.periodKey}`; if (findingKeys.has(key)) userFindingKeys.add(key); });
        if (missing.length) missingInventories.push({
          inventoryId: inventory.id, assetCode: inventory.assetCode, itemType: inventory.itemType?.name ?? '-', category: inventory.category.name,
          area: inventory.area?.name ?? '-', specificArea: inventory.specificArea, frequency,
          missing: missing.map(period => ({ periodKey: period.periodKey, label: period.label, status: this.periodEngine.isPeriodLate(frequency, period.periodKey) ? 'late' : 'pending' })),
        });
      }
      return {
        userId: user.id, name: user.name, username: user.username, email: user.email,
        totalInventories: user.inventoryPicAssignments.length, required, completed, pending: Math.max(0, required - completed), late,
        findings: userFindingKeys.size, progress: required > 0 ? Math.round((completed / required) * 100) : 0, missingInventories,
      };
    }).sort((a, b) => a.progress - b.progress || b.late - a.late || a.name.localeCompare(b.name));

    const totalRequired = rows.reduce((sum, row) => sum + row.required, 0);
    const completed = rows.reduce((sum, row) => sum + row.completed, 0);
    return {
      month: monthKey,
      summary: {
        totalPics: rows.length, totalInventories: rows.reduce((sum, row) => sum + row.totalInventories, 0), totalRequired, completed,
        pending: rows.reduce((sum, row) => sum + row.pending, 0), late: rows.reduce((sum, row) => sum + row.late, 0), findings: rows.reduce((sum, row) => sum + row.findings, 0),
        averageProgress: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0,
      },
      rows,
    };
  }
}
