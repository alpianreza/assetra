import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import {
  fetchTemplates, fetchGroupedTemplates, fetchTemplate, provisionTemplates,
  createTemplate, updateTemplate,
  updateTemplateQuestions, reorderTemplateQuestions, updateTemplateSessions,
  assignInventoriesToTemplate, unassignInventoriesFromTemplate, deleteTemplate,
} from '../api';

export const TEMPLATES_QUERY_KEY = ['checklist-templates'] as const;
export const TEMPLATES_GROUPED_QUERY_KEY = ['checklist-templates', 'grouped'] as const;

function invalidateTemplates() {
  queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
}

export function useTemplates() {
  return useQuery({ queryKey: TEMPLATES_QUERY_KEY, queryFn: fetchTemplates });
}

export function useGroupedTemplates() {
  return useQuery({ queryKey: TEMPLATES_GROUPED_QUERY_KEY, queryFn: fetchGroupedTemplates });
}

export function useTemplate(id?: number) {
  return useQuery({
    queryKey: ['checklist-template', id],
    queryFn: () => fetchTemplate(id!),
    enabled: !!id,
  });
}

export function useProvisionTemplates() {
  return useMutation({
    mutationFn: () => provisionTemplates(),
    onSuccess: invalidateTemplates,
  });
}

export function useCreateTemplate() {
  return useMutation({
    mutationFn: (data: any) => createTemplate(data),
    onSuccess: invalidateTemplates,
  });
}

export function useUpdateTemplate() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateTemplate(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
    },
  });
}

export function useUpdateTemplateQuestions() {
  return useMutation({
    mutationFn: ({ id, questions }: { id: number; questions: any[] }) => updateTemplateQuestions(id, questions),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
    },
  });
}

export function useReorderTemplateQuestions() {
  return useMutation({
    mutationFn: ({ id, questionIds }: { id: number; questionIds: number[] }) => reorderTemplateQuestions(id, questionIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
    },
  });
}

export function useUpdateTemplateSessions() {
  return useMutation({
    mutationFn: ({ id, sessionIds }: { id: number; sessionIds: number[] }) => updateTemplateSessions(id, sessionIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
    },
  });
}

export function useAssignInventoriesToTemplate() {
  return useMutation({
    mutationFn: ({ id, inventoryIds }: { id: number; inventoryIds: number[] }) => assignInventoriesToTemplate(id, inventoryIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useUnassignInventoriesFromTemplate() {
  return useMutation({
    mutationFn: ({ id, inventoryIds }: { id: number; inventoryIds: number[] }) => unassignInventoriesFromTemplate(id, inventoryIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-template', id] });
      invalidateTemplates();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useDeleteTemplate() {
  return useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: invalidateTemplates,
  });
}
