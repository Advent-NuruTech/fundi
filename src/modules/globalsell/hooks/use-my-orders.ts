"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listenSellerOrders,
  fetchBuyerOrders,
  updateOrderStatus,
  listenEcommerceNotifications,
} from "@/services/ecommerce.service";
import type { EcommerceNotification, EcommerceOrder } from "@/types/ecommerce";

export function useSellerOrders(businessId: string) {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [notifications, setNotifications] = useState<EcommerceNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);

    const unsubOrders = listenSellerOrders(businessId, (data) => {
      setOrders(data);
      setLoading(false);
    });

    const unsubNotifs = listenEcommerceNotifications(businessId, (data) => {
      setNotifications(data);
    });

    return () => {
      unsubOrders();
      unsubNotifs();
    };
  }, [businessId]);

  const changeStatus = useCallback(
    async (
      orderId: string,
      status: EcommerceOrder["status"],
      reason?: string
    ) => {
      await updateOrderStatus(orderId, businessId, status, reason);
    },
    [businessId]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { orders, notifications, loading, changeStatus, unreadCount };
}

export function useBuyerOrders(buyerBusinessId: string) {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!buyerBusinessId) return;
    setLoading(true);
    try {
      const data = await fetchBuyerOrders(buyerBusinessId);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [buyerBusinessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orders, loading, refresh };
}
