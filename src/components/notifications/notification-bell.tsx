"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { listenUnreadCount } from "@/services/notifications.service";
import { NotificationDropdown } from "./notification-dropdown";

export function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsub = listenUnreadCount(user.businessId, user.uid, setCount);
    return unsub;
  }, [user?.businessId, user?.uid]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {count > 99 ? "99+" : count}
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
