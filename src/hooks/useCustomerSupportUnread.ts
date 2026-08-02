"use client";

import { useEffect, useState } from "react";
import {
  getMySupportConversations,
  listenMySupportConversations,
  type SupportConversationMeta,
} from "@/services/customer-portal.service";

const READ_KEY = "fundiflow_portal_conv_read";

function loadReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function isConversationUnread(
  conv: SupportConversationMeta,
  userId: string,
  readMap: Record<string, string>
): boolean {
  if (!conv.lastMessageAt) return false;
  if (conv.lastMessageSenderUid === userId) return false;
  const lastRead = readMap[conv.id];
  if (!lastRead) return true;
  return new Date(conv.lastMessageAt) > new Date(lastRead);
}

/**
 * Live unread conversation count for the customer portal. Mirrors the business
 * messaging read-state model (lastMessage + localStorage read map) so the
 * Support nav item badge behaves exactly like the workshop's Messages bell.
 */
export function useCustomerSupportUnread(userId: string): number {
  const [conversations, setConversations] = useState<SupportConversationMeta[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) {
      setConversations([]);
      return;
    }
    // Recompute immediately on mount in case read state changed on another tab.
    getMySupportConversations(userId).then((rows) => {
      const readMap = loadReadMap();
      setConversations(rows);
      setUnread(rows.filter((c) => isConversationUnread(c, userId, readMap)).length);
    });
    return listenMySupportConversations(userId, setConversations);
  }, [userId]);

  useEffect(() => {
    const compute = () => {
      const readMap = loadReadMap();
      setUnread(conversations.filter((c) => isConversationUnread(c, userId, readMap)).length);
    };
    compute();
    window.addEventListener("fundiflow-portal-conv-read", compute);
    return () => window.removeEventListener("fundiflow-portal-conv-read", compute);
  }, [conversations, userId]);

  return unread;
}
