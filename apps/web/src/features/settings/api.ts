import { apiRequest } from '../../lib/api-helper';

export interface WorkingDay {
  id: number;
  dayOfWeek: number;
  status: 'WORKING' | 'OFF';
}

export interface HolidayOverride {
  id: number;
  date: string;
  name: string;
  status: 'WORKING' | 'OFF';
}

export async function fetchWorkingDays(): Promise<{ data: WorkingDay[] }> {
  return apiRequest<{ data: WorkingDay[] }>('/settings/working-days');
}

export async function updateWorkingDay(day: number, status: 'WORKING' | 'OFF'): Promise<any> {
  return apiRequest<any>(`/settings/working-days/${day}`, { method: 'PATCH', body: { status } });
}

export async function fetchHolidays(): Promise<{ data: HolidayOverride[] }> {
  return apiRequest<{ data: HolidayOverride[] }>('/settings/holidays');
}

export async function createHoliday(data: { date: string; name: string; status: 'WORKING' | 'OFF' }): Promise<any> {
  return apiRequest<any>('/settings/holidays', { method: 'POST', body: data });
}

export async function deleteHoliday(id: number): Promise<any> {
  return apiRequest<any>(`/settings/holidays/${id}`, { method: 'DELETE' });
}
