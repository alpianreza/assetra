import { apiRequest } from '../../../lib/api-helper';

export async function fetchQrDetail(inventoryId: number): Promise<any> {
  return apiRequest<any>(`/qr/inventory/${inventoryId}`);
}

export async function fetchBatchQr(inventoryIds: number[]): Promise<any> {
  return apiRequest<any>('/qr/batch', { method: 'POST', body: { inventoryIds } });
}
