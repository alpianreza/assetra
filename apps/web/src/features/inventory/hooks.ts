import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchInventory,
  fetchInventoryById,
  fetchNextAssetCode,
  createInventory,
  updateInventory,
  uploadInventoryPhoto,
  updateInventoryStatus,
  deleteInventory,
} from './api';
import { queryClient } from '@/app/queryClient';
import { QueryInventoryDto } from './types';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;

export function useInventoryList(params: QueryInventoryDto) {
  return useQuery({ queryKey: [...INVENTORY_QUERY_KEY, params], queryFn: () => fetchInventory(params) });
}

export function useInventoryDetail(id?: number) {
  return useQuery({ queryKey: ['inventory', id], queryFn: () => fetchInventoryById(id!), enabled: !!id });
}

export function useNextAssetCode(itemTypeId?: number) {
  return useQuery({
    queryKey: ['inventory', 'preview-asset-code', itemTypeId],
    queryFn: () => fetchNextAssetCode(itemTypeId!),
    enabled: !!itemTypeId && itemTypeId > 0,
    staleTime: 0,
  });
}

export function useCreateInventory() {
  return useMutation({ mutationFn: (data: any) => createInventory(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }) });
}

export function useUpdateInventory() {
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => updateInventory(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }) });
}

export function useUploadInventoryPhoto() {
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadInventoryPhoto(id, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.id] });
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
}

export function useUpdateInventoryStatus() {
  return useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => updateInventoryStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }) });
}

export function useDeleteInventory() {
  return useMutation({ mutationFn: (id: number) => deleteInventory(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }) });
}
