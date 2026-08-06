import { apiRequest } from '../../lib/api-helper';

// --- Areas ---
export async function fetchAreas(): Promise<any> {
  return apiRequest<any>('/master/areas');
}
export async function createArea(data: { name: string; locationDetail?: string }): Promise<any> {
  return apiRequest<any>('/master/areas', { method: 'POST', body: data });
}
export async function updateArea(id: number, data: { name: string; locationDetail?: string }): Promise<any> {
  return apiRequest<any>(`/master/areas/${id}`, { method: 'PATCH', body: data });
}
export async function deleteArea(id: number): Promise<any> {
  return apiRequest<any>(`/master/areas/${id}`, { method: 'DELETE' });
}

// --- Categories ---
export async function fetchCategories(): Promise<any> {
  return apiRequest<any>('/master/categories');
}
export async function createCategory(data: { name: string; code: string }): Promise<any> {
  return apiRequest<any>('/master/categories', { method: 'POST', body: data });
}
export async function updateCategory(id: number, data: { name: string; code: string }): Promise<any> {
  return apiRequest<any>(`/master/categories/${id}`, { method: 'PATCH', body: data });
}
export async function deleteCategory(id: number): Promise<any> {
  return apiRequest<any>(`/master/categories/${id}`, { method: 'DELETE' });
}

// --- Asset Item Types ---
export async function fetchItemTypes(): Promise<any> {
  return apiRequest<any>('/master/asset-item-types');
}
export async function createItemType(data: { categoryId: number; name: string; code: string; checklistFrequency: string }): Promise<any> {
  return apiRequest<any>('/master/asset-item-types', { method: 'POST', body: data });
}
export async function updateItemType(id: number, data: any): Promise<any> {
  return apiRequest<any>(`/master/asset-item-types/${id}`, { method: 'PATCH', body: data });
}
export async function deleteItemType(id: number): Promise<any> {
  return apiRequest<any>(`/master/asset-item-types/${id}`, { method: 'DELETE' });
}
