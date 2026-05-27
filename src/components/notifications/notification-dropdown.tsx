"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/types/domain";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  listenNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteNotification,
} from "@/services/notifications.service";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./notification-item";

interface Props {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsub = listenNotifications(user.businessId, user.uid, setNotifications);
    return unsub;
  }, [user?.businessId, user?.uid]);

  const handleClick = useCallback(
    async (notification: Notification) => {
      if (user?.businessId) {
        await markNotificationRead(user.businessId, notification.id);
      }
      if (notification.link) {
        router.push(notification.link);
      }
      onClose();
    },
    [user?.businessId, router, onClose]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (user?.businessId && user?.uid) {
      await markAllNotificationsRead(user.businessId, user.uid);
    }
  }, [user?.businessId, user?.uid]);

  const handleArchive = useCallback(
    async (id: string) => {
      if (user?.businessId) {
        await archiveNotification(user.businessId, id);
      }
    },
    [user?.businessId]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (user?.businessId) {
        await deleteNotification(user.businessId, id);
      }
    },
    [user?.businessId]
  );

  return (
    <div className="w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">Notifications</span>
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
          <CheckCheck className="mr-1 h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>
      <Separator />
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Bell className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleClick(notification)}
              onArchive={() => handleArchive(notification.id)}
              onDelete={() => handleDelete(notification.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
