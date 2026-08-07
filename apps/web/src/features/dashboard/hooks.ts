import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSummary, fetchHomeSummary, fetchPicProgress } from './api';
export const DASHBOARD_QUERY_KEY = ['dashboard-summary'] as const;
export const HOME_QUERY_KEY = ['home-summary'] as const;
export const PIC_PROGRESS_QUERY_KEY = ['pic-progress'] as const;
export function useHomeSummary(month?: string) { return useQuery({ queryKey: [...HOME_QUERY_KEY, month], queryFn: () => fetchHomeSummary(month), retry: false }); }
export function useDashboardSummary(params: { areaId?: string; categoryId?: string; month?: string }) { return useQuery({ queryKey: [...DASHBOARD_QUERY_KEY, params], queryFn: () => fetchDashboardSummary(params), retry: false }); }
export function usePicProgress(month?: string) { return useQuery({ queryKey: [...PIC_PROGRESS_QUERY_KEY, month], queryFn: () => fetchPicProgress(month), retry: false }); }
