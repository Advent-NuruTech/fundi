import { createNotification, createNotificationForAllMembers } from "@/services/notifications.service";
import type { NotificationType } from "@/types/domain";

export async function notifyMaterialAdded(businessId: string, materialName: string, materialId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "material_added",
    "New Material Added",
    `${materialName} has been added to inventory.`,
    `/inventory/materials/${materialId}`,
    excludeUid
  );
}

export async function notifyPurchaseOrderCreated(businessId: string, supplierName: string, materialName: string, poId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "purchase_order_created",
    "Purchase Order Created",
    `Order for ${materialName} from ${supplierName} has been created.`,
    `/inventory?section=purchase-orders`,
    excludeUid
  );
}

export async function notifyStockReceived(businessId: string, materialName: string, quantity: number, unit: string, materialId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "stock_received",
    "Stock Received",
    `${quantity} ${unit} of ${materialName} has been added to inventory.`,
    `/inventory/materials/${materialId}`,
    excludeUid
  );
}

export async function notifyStockAdjusted(businessId: string, materialName: string, adjustment: number, unit: string, materialId: string, excludeUid?: string) {
  const label = adjustment > 0 ? "added to" : "removed from";
  await createNotificationForAllMembers(
    businessId,
    "stock_adjusted",
    "Stock Adjusted",
    `${Math.abs(adjustment)} ${unit} ${label} ${materialName} inventory.`,
    `/inventory/materials/${materialId}`,
    excludeUid
  );
}

export async function notifyLowStock(businessId: string, materialName: string, quantity: number, unit: string, materialId: string) {
  await createNotificationForAllMembers(
    businessId,
    "low_stock",
    "Low Stock Alert",
    `${materialName} is running low (${quantity} ${unit} remaining).`,
    `/inventory/materials/${materialId}`
  );
}

export async function notifyNewOrder(businessId: string, orderNumber: string, customerName: string, orderId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "new_order_created",
    "New Order Created",
    `Order ${orderNumber} for ${customerName} has been created.`,
    `/orders/${orderId}`,
    excludeUid
  );
}

export async function notifyOrderStageChanged(businessId: string, orderNumber: string, stage: string, orderId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "order_stage_changed",
    "Order Stage Updated",
    `Order ${orderNumber} is now at ${stage.replace(/_/g, " ")}.`,
    `/orders/${orderId}`,
    excludeUid
  );
}

export async function notifyOrderCompleted(businessId: string, orderNumber: string, customerName: string, orderId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "order_completed",
    "Order Completed",
    `Order ${orderNumber} for ${customerName} has been completed.`,
    `/orders/${orderId}`,
    excludeUid
  );
}

export async function notifyMaterialsConsumed(businessId: string, orderNumber: string, orderId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "materials_consumed",
    "Materials Used",
    `Materials have been recorded for order ${orderNumber}.`,
    `/orders/${orderId}`,
    excludeUid
  );
}

export async function notifyPaymentReceived(businessId: string, orderNumber: string, amount: number, orderId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "payment_received",
    "Payment Received",
    `KES ${amount.toLocaleString()} payment received for order ${orderNumber}.`,
    `/orders/${orderId}`,
    excludeUid
  );
}

export async function notifyPurchaseOrderReceived(businessId: string, materialName: string, poId: string, excludeUid?: string) {
  await createNotificationForAllMembers(
    businessId,
    "purchase_order_received",
    "Purchase Order Received",
    `Purchase order for ${materialName} has been marked as fully received.`,
    `/inventory?section=purchase-orders`,
    excludeUid
  );
}
