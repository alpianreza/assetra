import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchHomeSummary } from './api';

export const DASHBOARD_QUERY_KEY = ['dashboard-summary'] as const;
export const HOME_QUERY_KEY = ['home-summary'] as const;

export function useHomeSummary(month?: string) {
  return useQuery({ queryKey: [...HOME_QUERY_KEY, month], queryFn: () => fetchHomeSummary(month), retry: false });
}

export function useDashboardSummary(params: { areaId?: string; categoryId?: string; month?: string }) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, params],
    queryFn: () => fetchDashboardSummary(params),
    retry: false,
  });
}
