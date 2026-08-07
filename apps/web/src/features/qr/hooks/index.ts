import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import { fetchQrDetail, fetchQrGallery, fetchBatchQr, regenerateQr } from '../api';

export const QR_GALLERY_QUERY_KEY = ['qr-gallery'] as const;

export function useQrDetail(inventoryId: number) {
  return useQuery({
    queryKey: ['qr-detail', inventoryId],
    queryFn: () => fetchQrDetail(inventoryId),
  });
}

export function useQrGallery() {
  return useQuery({ queryKey: QR_GALLERY_QUERY_KEY, queryFn: fetchQrGallery });
}

export function useBatchQr() {
  return useMutation({ mutationFn: (inventoryIds: number[]) => fetchBatchQr(inventoryIds) });
}

export function useRegenerateQr() {
  return useMutation({
    mutationFn: (inventoryIds?: number[]) => regenerateQr(inventoryIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QR_GALLERY_QUERY_KEY }),
  });
}
