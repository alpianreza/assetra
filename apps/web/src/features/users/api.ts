import { apiRequest } from '../../lib/api-helper';

export interface UserListItem {
  id: number;
  name: string;
  username: string;
  email: string;
  status: string;
  roles: { id: number; name: string }[];
  createdAt: string;
}

export interface UserListResult {
  data: {
    items: UserListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
}

export async function fetchUsers(params: Record<string, any> = {}): Promise<UserListResult> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) query.set(k, String(v));
  });
  const qs = query.toString();
  return apiRequest<UserListResult>(`/users${qs ? '?' + qs : ''}`);
}

export async function fetchUser(id: number): Promise<any> {
  return apiRequest<any>(`/users/${id}`);
}

export async function createUser(data: any): Promise<any> {
  return apiRequest<any>('/users', { method: 'POST', body: data });
}

export async function updateUser(id: number, data: any): Promise<any> {
  return apiRequest<any>(`/users/${id}`, { method: 'PATCH', body: data });
}

export async function updateUserStatus(id: number, status: string): Promise<any> {
  return apiRequest<any>(`/users/${id}/status`, { method: 'PATCH', body: { status } });
}

export async function deleteUser(id: number): Promise<any> {
  return apiRequest<any>(`/users/${id}`, { method: 'DELETE' });
}
