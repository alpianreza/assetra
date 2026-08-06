import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import { fetchSessions, createSession, updateSession, deleteSession } from '../api';

export const SESSIONS_QUERY_KEY = ['checklist-sessions'] as const;

export function useSessions() {
  return useQuery({ queryKey: SESSIONS_QUERY_KEY, queryFn: fetchSessions });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: (data: any) => createSession(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
}

export function useUpdateSession() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSession(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
}

export function useDeleteSession() {
  return useMutation({
    mutationFn: (id: number) => deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  });
}