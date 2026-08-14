"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  listenNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteNotification,
} from "@/services/notifications.service";
import {
  listenEcommerceNotifications,
  markEcommerceNotificationRead,
  markAllEcommerceNotificationsRead,
} from "@/services/ecommerce.service";
import type { Notification } from "@/types/domain";
import type { EcommerceNotification } from "@/types/ecommerce";

export type BellNotification = {
  id: string;
  source: "app" | "ecommerce";
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

function toBell(n: Notification): BellNotification {
  return {
    id: n.id,
    source: "app",
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link || undefined,
    read: n.read,
    createdAt: n.createdAt,
  };
}

function ecommerceToBell(n: EcommerceNotification): BellNotification {
  return {
    id: n.id,
    source: "ecommerce",
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.orderId ? `/sell/orders/${n.orderId}` : "/sell/orders",
    read: n.read,
    createdAt: n.createdAt,
  };
}

/**
 * Single source of truth for the notification bell. Merges in-app
 * notifications (business/team) with Global Sell / marketplace notifications
 * so one bell covers the whole product. Only unread items are surfaced — as
 * soon as one is opened it drops out of the list and the badge.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [appItems, setAppItems] = useState<Notification[]>([]);
  const [ecomItems, setEcomItems] = useState<EcommerceNotification[]>([]);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsubApp = listenNotifications(user.businessId, user.uid, setAppItems);
    const unsubEcom = listenEcommerceNotifications(user.businessId, setEcomItems);
    return () => {
      unsubApp();
      unsubEcom();
    };
  }, [user?.businessId, user?.uid]);

  const all = useMemo<BellNotification[]>(() => {
    return [...appItems.map(toBell), ...ecomItems.map(ecommerceToBell)].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  }, [appItems, ecomItems]);

  const unread = useMemo(() => all.filter((n) => !n.read), [all]);
  const unreadCount = unread.length;

  const markRead = async (n: BellNotification) => {
    if (!user?.businessId) return;
    if (n.source === "ecommerce") {
      await markEcommerceNotificationRead(n.id).catch(() => {});
      setEcomItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
    } else {
      await markNotificationRead(user.businessId, n.id).catch(() => {});
      setAppItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
    }
  };

  const markAllRead = async () => {
    if (!user?.businessId || !user?.uid) return;
    await markAllNotificationsRead(user.businessId, user.uid).catch(() => {});
    await markAllEcommerceNotificationsRead(user.businessId).catch(() => {});
    setAppItems((prev) => prev.map((p) => ({ ...p, read: true })));
    setEcomItems((prev) => prev.map((p) => ({ ...p, read: true })));
  };

  const archive = async (id: string) => {
    if (!user?.businessId) return;
    await archiveNotification(user.businessId, id).catch(() => {});
    setAppItems((prev) => prev.filter((p) => p.id !== id));
  };

  const remove = async (n: BellNotification) => {
    if (!user?.businessId) return;
    if (n.source === "ecommerce") {
      await markEcommerceNotificationRead(n.id).catch(() => {});
      setEcomItems((prev) => prev.filter((p) => p.id !== n.id));
    } else {
      await deleteNotification(user.businessId, n.id).catch(() => {});
      setAppItems((prev) => prev.filter((p) => p.id !== n.id));
    }
  };

  return { items: unread, unreadCount, markRead, markAllRead, archive, remove };
}
