import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import {
  fetchTemplates, fetchTemplate, createTemplate, updateTemplate,
  updateTemplateQuestions, reorderTemplateQuestions, updateTemplateSessions,
  assignInventoriesToTemplate, unassignInventoriesFromTemplate, deleteTemplate,
} from '../api';

export const TEMPLATES_QUERY_KEY = ['checklist-templates'] as const;

export function useTemplates() {
  return useQuery({ queryKey: TEMPLATES_QUERY_KEY, queryFn: fetchTemplates });
}

export function useTemplate(id?: number) {
  return useQuery({
    queryKey: ['checklist-template', id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  return useMutation({
    mutationFn: (data: any) => createTemplate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY }),
  });
}

export function useUpdateTemplate() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateTemplateQuestions() {
  return useMutation({
    mutationFn: ({ id, questions }: { id: number; questions: any[] }) => updateTemplateQuestions(id, questions),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
}

export function useReorderTemplateQuestions() {
  return useMutation({
    mutationFn: ({ id, questionIds }: { id: number; questionIds: number[] }) => reorderTemplateQuestions(id, questionIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
}

export function useUpdateTemplateSessions() {
  return useMutation({
    mutationFn: ({ id, sessionIds }: { id: number; sessionIds: number[] }) => updateTemplateSessions(id, sessionIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
    },
  });
}

export function useAssignInventoriesToTemplate() {
  return useMutation({
    mutationFn: ({ id, inventoryIds }: { id: number; inventoryIds: number[] }) => assignInventoriesToTemplate(id, inventoryIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUnassignInventoriesFromTemplate() {
  return useMutation({
    mutationFn: ({ id, inventoryIds }: { id: number; inventoryIds: number[] }) => unassignInventoriesFromTemplate(id, inventoryIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteTemplate() {
  return useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY }),
  });
}
