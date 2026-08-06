import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import {
  fetchComplianceOverview,
  fetchCompliancePeriods,
  fetchComplianceChecklist,
  submitComplianceChecklist,
  fetchComplianceHistory,
  fetchComplianceResult,
} from '../api';

export const COMPLIANCE_QUERY_KEY = ['compliance'] as const;

export function useComplianceOverview() {
  return useQuery({ queryKey: COMPLIANCE_QUERY_KEY, queryFn: fetchComplianceOverview });
}

export function useCompliancePeriods(inventoryId?: number, ym?: string) {
  return useQuery({
    queryKey: ['compliance', 'periods', inventoryId, ym],
    queryFn: () => fetchCompliancePeriods(inventoryId!, ym),
    enabled: !!inventoryId,
  });
}

export function useComplianceChecklist(inventoryId?: number, templateId?: number, periodKey?: string, sessionId?: number | null) {
  return useQuery({
    queryKey: ['compliance', 'checklist', inventoryId, templateId, periodKey, sessionId],
    queryFn: () => fetchComplianceChecklist(inventoryId!, templateId!, periodKey!, sessionId),
    enabled: !!inventoryId && !!templateId && !!periodKey,
  });
}

export function useSubmitComplianceChecklist(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null) {
  return useMutation({
    mutationFn: (answers: { questionId: number; status: string }[]) =>
      submitComplianceChecklist(inventoryId, templateId, periodKey, sessionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'periods', inventoryId] });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'history', inventoryId] });
    },
  });
}

export function useComplianceHistory(inventoryId?: number) {
  return useQuery({
    queryKey: ['compliance', 'history', inventoryId],
    queryFn: () => fetchComplianceHistory(inventoryId!),
    enabled: !!inventoryId,
  });
}

export function useComplianceResult(inventoryId?: number, occurrenceId?: number) {
  return useQuery({
    queryKey: ['compliance', 'result', inventoryId, occurrenceId],
    queryFn: () => fetchComplianceResult(inventoryId!, occurrenceId!),
    enabled: !!inventoryId && !!occurrenceId,
  });
}
