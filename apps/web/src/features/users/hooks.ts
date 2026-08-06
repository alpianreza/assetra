import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchUsers, fetchUser, createUser, updateUser, updateUserStatus, deleteUser } from './api';
import { queryClient } from '@/app/queryClient';

export const USERS_QUERY_KEY = ['users'] as const;

export function useUsers(params?: Record<string, any>) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => fetchUsers(params ?? {}),
  });
}

export function useUser(id?: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: (data: any) => createUser(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useUpdateUserStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
}
