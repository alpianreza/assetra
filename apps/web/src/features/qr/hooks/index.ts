import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchQrDetail, fetchBatchQr } from '../api';

export function useQrDetail(inventoryId: number) {
  return useQuery({
    queryKey: ['qr-detail', inventoryId],
    queryFn: () => fetchQrDetail(inventoryId),
  });
}

export function useBatchQr() {
  return useMutation({
    mutationFn: (inventoryIds: number[]) => fetchBatchQr(inventoryIds),
  });
}
