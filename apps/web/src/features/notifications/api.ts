import { apiRequest } from '@/lib/api-helper';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  type: 'late' | 'reminder';
  inventoryId?: number | null;
  href: string;
  createdAt: string;
  updatedAt: string;
}
export interface NotificationData { unreadCount: number; total: number; items: AppNotification[] }

export function fetchNotifications(limit = 30, unreadOnly = false) {
  return apiRequest<{ success: boolean; data: NotificationData }>(`/notifications?limit=${limit}&unreadOnly=${unreadOnly}`);
}
export function markNotificationRead(id: number) { return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }); }
export function markAllNotificationsRead() { return apiRequest('/notifications/read-all', { method: 'PATCH' }); }
export function deleteNotification(id: number) { return apiRequest(`/notifications/${id}`, { method: 'DELETE' }); }
