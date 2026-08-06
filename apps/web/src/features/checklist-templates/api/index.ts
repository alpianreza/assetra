import { apiRequest } from '../../../lib/api-helper';

export async function fetchTemplates(): Promise<any> {
  return apiRequest<any>('/checklist-templates');
}

/** Checklist Master view: templates grouped by Jenis Item. */
export async function fetchGroupedTemplates(): Promise<any> {
  return apiRequest<any>('/checklist-templates/grouped');
}

export async function fetchTemplate(id: number): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}`);
}

export async function provisionTemplates(): Promise<any> {
  return apiRequest<any>('/checklist-templates/provision', { method: 'POST', body: {} });
}

export async function createTemplate(data: any): Promise<any> {
  return apiRequest<any>('/checklist-templates', { method: 'POST', body: data });
}

export async function updateTemplate(id: number, data: any): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}`, { method: 'PATCH', body: data });
}

export async function updateTemplateQuestions(id: number, questions: any[]): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}/questions`, { method: 'PATCH', body: { questions } });
}

export async function reorderTemplateQuestions(id: number, questionIds: number[]): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}/questions/reorder`, { method: 'PATCH', body: { questionIds } });
}

export async function updateTemplateSessions(id: number, sessionIds: number[]): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}/sessions`, { method: 'PATCH', body: { sessionIds } });
}

export async function assignInventoriesToTemplate(id: number, inventoryIds: number[]): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}/inventories`, { method: 'POST', body: { templateId: id, inventoryIds } });
}

export async function unassignInventoriesFromTemplate(id: number, inventoryIds: number[]): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}/inventories`, { method: 'DELETE', body: { inventoryIds } });
}

export async function deleteTemplate(id: number): Promise<any> {
  return apiRequest<any>(`/checklist-templates/${id}`, { method: 'DELETE' });
}
