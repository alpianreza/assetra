import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchRoles, createRole, updateRole, deleteRole, fetchPermissions } from './api';
import { queryClient } from '@/app/queryClient';

export const ROLES_QUERY_KEY = ['roles'] as const;
export const PERMISSIONS_QUERY_KEY = ['permissions'] as const;

export function useRoles() {
  return useQuery({ queryKey: ROLES_QUERY_KEY, queryFn: fetchRoles });
}

export function usePermissions() {
  return useQuery({ queryKey: PERMISSIONS_QUERY_KEY, queryFn: fetchPermissions });
}

export function useCreateRole() {
  return useMutation({
    mutationFn: (data: { name: string; permissionIds: number[] }) => createRole(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY }),
  });
}

export function useUpdateRole() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; permissionIds: number[] } }) => updateRole(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY }),
  });
}

export function useDeleteRole() {
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY }),
  });
}
