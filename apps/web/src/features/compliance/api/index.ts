import { apiRequest } from '../../../lib/api-helper';

export async function fetchComplianceOverview(): Promise<any> {
  return apiRequest<any>('/compliance');
}

export async function fetchCompliancePeriods(inventoryId: number): Promise<any> {
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/periods`);
}

export async function fetchComplianceChecklist(inventoryId: number, templateId: number, periodKey: string, sessionId?: number | null): Promise<any> {
  const qs = new URLSearchParams({ templateId: String(templateId), periodKey });
  if (sessionId) qs.set('sessionId', String(sessionId));
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/checklist?${qs.toString()}`);
}

export async function submitComplianceChecklist(
  inventoryId: number,
  templateId: number,
  periodKey: string,
  sessionId: number | null,
  answers: { questionId: number; status: string }[],
): Promise<any> {
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`, {
    method: 'POST',
    body: { periodKey, sessionId, answers },
  });
}

export async function fetchComplianceHistory(inventoryId: number): Promise<any> {
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/history`);
}
