"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, type BellNotification } from "./use-notifications";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./notification-item";

interface Props {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: Props) {
  const router = useRouter();
  const { items, markRead, markAllRead, archive, remove } = useNotifications();

  const handleClick = useCallback(
    async (notification: BellNotification) => {
      await markRead(notification);
      if (notification.link) {
        router.push(notification.link);
      }
      onClose();
    },
    [markRead, router, onClose]
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  const handleArchive = useCallback(
    async (id: string) => {
      await archive(id);
    },
    [archive]
  );

  const handleRemove = useCallback(
    async (notification: BellNotification) => {
      await remove(notification);
    },
    [remove]
  );

  return (
    <div className="w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-slate-900">Notifications</span>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>
      <Separator />
      <div className="max-h-[60vh] overflow-y-auto sm:max-h-[400px]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Bell className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">You&apos;re all caught up</p>
          </div>
        ) : (
          items.map((notification) => (
            <NotificationItem
              key={`${notification.source}-${notification.id}`}
              notification={notification}
              onClick={() => handleClick(notification)}
              onArchive={() => handleArchive(notification.id)}
              onDelete={() => handleRemove(notification)}
            />
          ))
        )}
      </div>
    </div>
  );
}
