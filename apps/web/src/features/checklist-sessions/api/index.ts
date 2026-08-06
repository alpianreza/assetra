import { apiRequest } from '../../../lib/api-helper';

export async function fetchSessions(): Promise<any> {
  return apiRequest<any>('/checklist-sessions');
}

export async function fetchSession(id: number): Promise<any> {
  return apiRequest<any>(`/checklist-sessions/${id}`);
}

export async function createSession(data: any): Promise<any> {
  return apiRequest<any>('/checklist-sessions', { method: 'POST', body: data });
}

export async function updateSession(id: number, data: any): Promise<any> {
  return apiRequest<any>(`/checklist-sessions/${id}`, { method: 'PATCH', body: data });
}

export async function deleteSession(id: number): Promise<any> {
  return apiRequest<any>(`/checklist-sessions/${id}`, { method: 'DELETE' });
}