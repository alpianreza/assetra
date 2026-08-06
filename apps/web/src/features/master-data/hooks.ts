import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchAreas, createArea, updateArea, deleteArea,
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchItemTypes, createItemType, updateItemType, deleteItemType,
} from './api';
import { queryClient } from '@/app/queryClient';

export const AREAS_QUERY_KEY = ['areas'] as const;
export const CATEGORIES_QUERY_KEY = ['categories'] as const;
export const ITEM_TYPES_QUERY_KEY = ['item-types'] as const;

export function useAreas(enabled = true) { return useQuery({ queryKey: AREAS_QUERY_KEY, queryFn: fetchAreas, enabled }); }
export function useCreateArea() { return useMutation({ mutationFn: (data: { name: string; locationDetail?: string }) => createArea(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY }) }); }
export function useUpdateArea() { return useMutation({ mutationFn: ({ id, data }: { id: number; data: { name: string; locationDetail?: string } }) => updateArea(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY }) }); }
export function useDeleteArea() { return useMutation({ mutationFn: (id: number) => deleteArea(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: AREAS_QUERY_KEY }) }); }

export function useCategories(enabled = true) { return useQuery({ queryKey: CATEGORIES_QUERY_KEY, queryFn: fetchCategories, enabled }); }
export function useCreateCategory() { return useMutation({ mutationFn: (data: { name: string; code: string }) => createCategory(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }) }); }
export function useUpdateCategory() { return useMutation({ mutationFn: ({ id, data }: { id: number; data: { name: string; code: string } }) => updateCategory(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }) }); }
export function useDeleteCategory() { return useMutation({ mutationFn: (id: number) => deleteCategory(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }) }); }

export function useItemTypes(enabled = true) { return useQuery({ queryKey: ITEM_TYPES_QUERY_KEY, queryFn: fetchItemTypes, enabled }); }
export function useCreateItemType() { return useMutation({ mutationFn: (data: { categoryId: number; name: string; code: string; checklistFrequency: string }) => createItemType(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEM_TYPES_QUERY_KEY }) }); }
export function useUpdateItemType() { return useMutation({ mutationFn: ({ id, data }: { id: number; data: any }) => updateItemType(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEM_TYPES_QUERY_KEY }) }); }
export function useDeleteItemType() { return useMutation({ mutationFn: (id: number) => deleteItemType(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ITEM_TYPES_QUERY_KEY }) }); }
