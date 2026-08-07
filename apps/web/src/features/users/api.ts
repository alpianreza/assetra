import { apiRequest } from '../../lib/api-helper';
export interface UserListItem { id: number; name: string; username: string; email: string; status: string; roles: { id: number; name: string }[]; createdAt: string }
export interface UserListResult { data: { items: UserListItem[]; meta: { page: number; limit: number; total: number; totalPages: number } } }
export async function fetchUsers(params: Record<string, any> = {}): Promise<UserListResult> { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '' && value !== null && value !== 'all') query.set(key, String(value)); }); const qs = query.toString(); return apiRequest<UserListResult>(`/users${qs ? `?${qs}` : ''}`); }
export async function fetchUser(id: number) { return apiRequest<any>(`/users/${id}`); }
export async function createUser(data: any) { return apiRequest<any>('/users', { method: 'POST', body: data }); }
export async function updateUser(id: number, data: any) { return apiRequest<any>(`/users/${id}`, { method: 'PATCH', body: data }); }
export async function updateUserStatus(id: number, status: string) { return apiRequest<any>(`/users/${id}/status`, { method: 'PATCH', body: { status } }); }
export async function deleteUser(id: number) { return apiRequest<any>(`/users/${id}`, { method: 'DELETE' }); }
export async function uploadUserPhoto(id: number, file: File) { const form = new FormData(); form.append('file', file); return apiRequest<any>(`/users/${id}/photo`, { method: 'POST', body: form }); }
export function userPhotoUrl(id: number, version?: string | number) { return `/api/v1/users/${id}/photo${version ? `?v=${version}` : ''}`; }
