// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// import { query, where, getDocs, orderBy, limit } from "firebase/firestore";
// import {
//   materialsCollection,
//   ordersCollection,
// } from "@/services/collections";

import { supabase } from "@/lib/supabase";
import { createNotification } from "@/services/notifications.service";
import { fetchMembers } from "@/services/firestore.service";
import type { InventoryMaterial, Order } from "@/types/domain";

export async function checkAndNotifyLowStock(businessId: string) {
  // 🔴 FIREBASE DISABLED
  // const allMaterials = await getDocs(
  //   query(materialsCollection(businessId), orderBy("quantity", "asc"))
  // );
  const { data: allMaterials } = await supabase
    .from("inventory_materials")
    .select("*")
    .eq("business_id", businessId)
    .order("quantity", { ascending: true });

  if (!allMaterials || allMaterials.length === 0) return;

  const lowStockItems = allMaterials
    .filter((m: any) => (m.quantity ?? 0) <= (m.reorder_level ?? 0))
    .slice(0, 10);

  if (lowStockItems.length === 0) return;

  const members = await fetchMembers(businessId);

  for (const item of lowStockItems) {
    for (const member of members) {
      if (!member.active) continue;
      await createNotification({
        businessId,
        recipientUid: member.uid,
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${item.name} is running low (${item.quantity} ${item.unit_name} remaining). Reorder at ${item.reorder_level}.`,
        link: `/inventory/materials/${item.id}`,
        metadata: { materialId: item.id, materialName: item.name },
      });
    }
  }
}

export async function checkAndNotifyOverdueOrders(businessId: string) {
  const today = new Date().toISOString().slice(0, 10);

  // 🔴 FIREBASE DISABLED
  // const q = query(
  //   ordersCollection(businessId),
  //   where("stage", "!=", "delivered"),
  //   orderBy("stage"),
  //   limit(50)
  // );
  // const snapshot = await getDocs(q);
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .neq("stage", "delivered")
    .order("stage", { ascending: true })
    .limit(50);

  const overdue: Order[] = [];
  (orders ?? []).forEach((order: any) => {
    if (order.due_date && order.due_date < today) {
      overdue.push({ ...order, id: order.id } as unknown as Order);
    }
  });

  if (overdue.length === 0) return;

  const members = await fetchMembers(businessId);

  for (const order of overdue.slice(0, 10)) {
    const dueDate = new Date(order.dueDate);
    const now = new Date();
    const diffMs = now.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    const timeStr = diffDays > 0
      ? `${diffDays} day${diffDays > 1 ? "s" : ""} overdue`
      : `${diffHours} hour${diffHours > 1 ? "s" : ""} overdue`;

    for (const member of members) {
      if (!member.active) continue;
      await createNotification({
        businessId,
        recipientUid: member.uid,
        type: "order_updated",
        title: `Order ${order.orderNumber} ${timeStr}`,
        message: `${order.customerName} — Due: ${order.dueDate}. Currently at ${order.stage.replace(/_/g, " ")}.`,
        link: `/orders/${order.id}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          overdueBy: timeStr,
        },
      });
    }
  }
}
