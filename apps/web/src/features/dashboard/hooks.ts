import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary } from './api';

export const DASHBOARD_QUERY_KEY = ['dashboard-summary'] as const;

export function useDashboardSummary(params: { areaId?: string; categoryId?: string }) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, params],
    queryFn: () => fetchDashboardSummary(params),
    retry: false,
  });
}
