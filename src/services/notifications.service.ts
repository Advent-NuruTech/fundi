import {
  createNotification as supabaseCreateNotification,
  createNotificationForAllMembers as supabaseCreateNotificationForAllMembers,
  listenNotifications as supabaseListenNotifications,
  listenUnreadCount as supabaseListenUnreadCount,
  markNotificationRead as supabaseMarkNotificationRead,
  markAllNotificationsRead as supabaseMarkAllNotificationsRead,
  archiveNotification as supabaseArchiveNotification,
  deleteNotification as supabaseDeleteNotification,
  bulkArchiveNotifications as supabaseBulkArchiveNotifications,
  cleanupOldNotifications as supabaseCleanupOldNotifications,
} from "@/lib/supabase.service";

import type { Notification, NotificationType } from "@/types/domain";

export async function createNotification(input: {
  businessId: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, string>;
}) {
  return supabaseCreateNotification(input);
}

export async function createNotificationForAllMembers(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUid?: string
) {
  return supabaseCreateNotificationForAllMembers(businessId, type, title, message, link, excludeUid);
}

export function listenNotifications(
  businessId: string,
  recipientUid: string,
  callback: (notifications: Notification[]) => void
) {
  return supabaseListenNotifications(businessId, recipientUid, callback);
}

export function listenUnreadCount(
  businessId: string,
  recipientUid: string,
  callback: (count: number) => void
) {
  return supabaseListenUnreadCount(businessId, recipientUid, callback);
}

export async function markNotificationRead(businessId: string, notificationId: string) {
  return supabaseMarkNotificationRead(businessId, notificationId);
}

export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
  return supabaseMarkAllNotificationsRead(businessId, recipientUid);
}

export async function archiveNotification(businessId: string, notificationId: string) {
  return supabaseArchiveNotification(businessId, notificationId);
}

export async function deleteNotification(businessId: string, notificationId: string) {
  return supabaseDeleteNotification(businessId, notificationId);
}

export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
  return supabaseBulkArchiveNotifications(businessId, recipientUid);
}

export async function cleanupOldNotifications() {
  return supabaseCleanupOldNotifications();
}
