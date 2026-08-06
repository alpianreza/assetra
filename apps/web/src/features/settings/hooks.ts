import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchWorkingDays, updateWorkingDay, fetchHolidays, createHoliday, deleteHoliday } from './api';
import { queryClient } from '@/app/queryClient';

export const WORKING_DAYS_QUERY_KEY = ['working-days'] as const;
export const HOLIDAYS_QUERY_KEY = ['holidays'] as const;

export function useWorkingDays() {
  return useQuery({ queryKey: WORKING_DAYS_QUERY_KEY, queryFn: fetchWorkingDays });
}

export function useUpdateWorkingDay() {
  return useMutation({
    mutationFn: ({ day, status }: { day: number; status: 'WORKING' | 'OFF' }) => updateWorkingDay(day, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKING_DAYS_QUERY_KEY }),
  });
}

export function useHolidays() {
  return useQuery({ queryKey: HOLIDAYS_QUERY_KEY, queryFn: fetchHolidays });
}

export function useCreateHoliday() {
  return useMutation({
    mutationFn: (data: { date: string; name: string; status: 'WORKING' | 'OFF' }) => createHoliday(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY }),
  });
}

export function useDeleteHoliday() {
  return useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY }),
  });
}
