import { apiRequest } from '../../lib/api-helper';
import { QueryInventoryDto } from './types';

export async function fetchInventory(params: QueryInventoryDto): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
  });
  const qs = query.toString();
  return apiRequest<any>(`/inventory${qs ? '?' + qs : ''}`);
}

export async function fetchInventoryById(id: number): Promise<any> {
  return apiRequest<any>(`/inventory/${id}`);
}

export async function createInventory(data: any): Promise<any> {
  return apiRequest<any>('/inventory', { method: 'POST', body: data });
}

export async function updateInventory(id: number, data: any): Promise<any> {
  return apiRequest<any>(`/inventory/${id}`, { method: 'PATCH', body: data });
}

export async function updateInventoryStatus(id: number, status: string): Promise<any> {
  return apiRequest<any>(`/inventory/${id}/status`, { method: 'PATCH', body: { status } });
}

export async function deleteInventory(id: number): Promise<any> {
  return apiRequest<any>(`/inventory/${id}`, { method: 'DELETE' });
}
