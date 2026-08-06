import { apiRequest } from '../../../lib/api-helper';

export type ChecklistAnswerInput = {
  questionId: number;
  status: string;
  remark?: string;
  photo?: File;
};

export async function fetchComplianceOverview(): Promise<any> {
  return apiRequest<any>('/compliance');
}

export async function fetchCompliancePeriods(inventoryId: number, ym?: string): Promise<any> {
  const query = ym ? `?ym=${encodeURIComponent(ym)}` : '';
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/periods${query}`);
}

export async function fetchComplianceChecklist(
  inventoryId: number,
  templateId: number,
  periodKey: string,
  sessionId?: number | null,
): Promise<any> {
  const query = new URLSearchParams({ templateId: String(templateId), periodKey });
  if (sessionId != null) query.set('sessionId', String(sessionId));
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/checklist?${query.toString()}`);
}

export async function submitComplianceChecklist(
  inventoryId: number,
  templateId: number,
  periodKey: string,
  sessionId: number | null,
  answers: ChecklistAnswerInput[],
): Promise<any> {
  const form = new FormData();
  form.append('periodKey', periodKey);
  if (sessionId != null) form.append('sessionId', String(sessionId));
  form.append('answers', JSON.stringify(answers.map(answer => ({
    questionId: answer.questionId,
    status: answer.status,
    remark: answer.remark?.trim() || undefined,
  }))));
  for (const answer of answers) {
    if (answer.photo) form.append(`photo_${answer.questionId}`, answer.photo);
  }

  return apiRequest<any>(`/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`, {
    method: 'POST',
    body: form,
  });
}

export async function fetchComplianceHistory(inventoryId: number): Promise<any> {
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/history`);
}

export async function fetchComplianceResult(inventoryId: number, occurrenceId: number): Promise<any> {
  return apiRequest<any>(`/compliance/inventory/${inventoryId}/history/${occurrenceId}`);
}
