const API_BASE = '/api/v1'

export interface PendingWorkItem {
  id: number
  assetCode: string
  itemType: string
  category: string
  area: string
  specificArea?: string | null
  frequency: 'daily' | 'weekly' | 'monthly'
  remaining: number
  firstPeriodKey: string
  firstPeriodLabel: string
  templateId?: number | null
}

export interface DashboardResponse {
  success: boolean
  data: {
    summary: { total: number; active: number; inactive: number; maintenance: number; disposed: number }
    compliance: { completed: number; pending: number; late: number }
    breakdowns: { byArea: Record<string, number>; byCategory: Record<string, number> }
    myWork: {
      month: string
      totalInventories: number
      totalRequired: number
      completed: number
      pending: number
      findings: number
      progress: number
      pendingItems: PendingWorkItem[]
    }
  }
}

export async function fetchDashboardSummary(params: { areaId?: string; categoryId?: string; month?: string }): Promise<DashboardResponse> {
  const qs = new URLSearchParams();
  if (params.areaId) qs.set('areaId', params.areaId);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.month) qs.set('month', params.month);
  const res = await fetch(`${API_BASE}/dashboard/summary?${qs.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Dashboard summary failed: ${res.status}`)
  return res.json()
}

export interface ExportPayload { inventoryIds: number[]; templateId: number; periodKey: string; sessionId?: number }

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export async function exportComplianceXlsx(payload: ExportPayload): Promise<Blob> {
  let csrf = readCookie('assetra_csrf');
  if (!csrf) {
    const csrfRes = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
    if (csrfRes.ok) csrf = (await csrfRes.json()).data.csrfToken;
  }
  const res = await fetch(`${API_BASE}/reports/compliance/export.xlsx`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    credentials: 'include', body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Compliance export failed: ${res.status}`)
  return res.blob()
}

export async function exportInventoryXlsx(): Promise<Blob> {
  const res = await fetch(`${API_BASE}/inventory/export.xlsx`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Inventory export failed: ${res.status}`)
  return res.blob()
}
