"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "./use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2">
            <NotificationDropdown onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
