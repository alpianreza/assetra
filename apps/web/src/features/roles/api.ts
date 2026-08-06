import { apiRequest } from '../../lib/api-helper';

export interface Role {
  id: number;
  name: string;
  system: boolean;
  permissions: string[];
  userCount: number;
}

export interface PermissionEntry {
  id: number;
  name: string;
}

export interface PermissionGroup {
  key: string;
  permissions: PermissionEntry[];
}

export interface PermissionCatalog {
  grouped: PermissionGroup[];
  all: PermissionEntry[];
}

export async function fetchRoles(): Promise<{ data: Role[] }> {
  return apiRequest<{ data: Role[] }>('/roles');
}

export async function createRole(data: { name: string; permissionIds: number[] }): Promise<any> {
  return apiRequest<any>('/roles', { method: 'POST', body: data });
}

export async function updateRole(id: number, data: { name: string; permissionIds: number[] }): Promise<any> {
  return apiRequest<any>(`/roles/${id}`, { method: 'PATCH', body: data });
}

export async function deleteRole(id: number): Promise<any> {
  return apiRequest<any>(`/roles/${id}`, { method: 'DELETE' });
}

export async function fetchPermissions(): Promise<{ data: PermissionCatalog }> {
  return apiRequest<{ data: PermissionCatalog }>('/permissions');
}
