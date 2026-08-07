import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/app/queryClient';
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead } from './api';
export const NOTIFICATIONS_KEY = ['app-notifications'] as const;
export function useNotifications(limit=30,unreadOnly=false){return useQuery({queryKey:[...NOTIFICATIONS_KEY,limit,unreadOnly],queryFn:()=>fetchNotifications(limit,unreadOnly),staleTime:30000,refetchInterval:60000,retry:false})}
const refresh=()=>queryClient.invalidateQueries({queryKey:NOTIFICATIONS_KEY});
export function useMarkNotificationRead(){return useMutation({mutationFn:markNotificationRead,onSuccess:refresh})}
export function useMarkAllNotificationsRead(){return useMutation({mutationFn:markAllNotificationsRead,onSuccess:refresh})}
export function useDeleteNotification(){return useMutation({mutationFn:deleteNotification,onSuccess:refresh})}
