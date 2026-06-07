"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { listenConversations } from "@/services/messaging.service";
import { useRouter } from "next/navigation";
import type { Conversation } from "@/types/domain";

const READ_KEY = "fundiflow_conv_read";

function loadReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function isConvUnread(conv: Conversation, uid: string, readMap: Record<string, string>): boolean {
  if (!conv.lastMessage) return false;
  if (conv.lastMessage.senderUid === uid) return false;
  const lastRead = readMap[conv.id];
  if (!lastRead) return true;
  return new Date(conv.updatedAt) > new Date(lastRead);
}

export function MessageBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [readMap, setReadMap] = useState<Record<string, string>>(loadReadMap);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    return listenConversations(user.businessId, user.uid, setConversations);
  }, [user?.businessId, user?.uid]);

  // Sync readMap when the messages page marks a conversation read
  useEffect(() => {
    const sync = () => setReadMap(loadReadMap());
    window.addEventListener("fundiflow-conv-read", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("fundiflow-conv-read", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const count = conversations.filter((c) => isConvUnread(c, user?.uid ?? "", readMap)).length;

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
