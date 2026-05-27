"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { listenUnreadMessageCount } from "@/services/messaging.service";
import { useRouter } from "next/navigation";

export function MessageBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsub = listenUnreadMessageCount(user.businessId, user.uid, setCount);
    return unsub;
  }, [user?.businessId, user?.uid]);

  return (
    <button
      onClick={() => router.push("/messages")}
      className="relative rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:bg-slate-50"
    >
      <MessageSquare className="h-5 w-5 text-slate-600" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
