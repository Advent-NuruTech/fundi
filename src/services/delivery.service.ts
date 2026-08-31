// Delivery workflow orchestration — the UI-facing layer that sits on top of
// the delivery primitives in @/lib/supabase.service. Moves an order between
// delivery stages, appends its timeline, notifies the team, and (when the
// business config toggles it on) sends the customer an SMS per milestone.

import {
  setOrderDeliveryStage,
  logSmsEntry,
  nextDeliveryStages,
  getDeliveryConfig,
} from "@/lib/supabase.service";
import { sendSms } from "@/lib/sms/sendSms";
import { prepareMessageWithOnboarding } from "@/services/order-progress.service";
import { notifyDeliveryStageChanged } from "@/services/notification-catalog";
import type { BusinessDeliveryConfig, DeliveryStage, DeliveryTimelineEntry, Order } from "@/types/domain";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function orderLabel(order: Order): string {
  const first = order.items?.[0]?.inventoryItemName || order.garments?.[0]?.name;
  return first ? `${first} - ${order.orderNumber}` : order.orderNumber;
}

type DeliverySmsLogType =
  | "delivery_notification"
  | "delivery_dispatch"
  | "delivery_courier_assigned"
  | "delivery_picked_up"
  | "delivery_in_transit"
  | "delivery_attempted"
  | "delivery_delivered"
  | "ready_for_pickup";

const DELIVERY_SMS_TYPE: Record<DeliveryStage, DeliverySmsLogType> = {
  pending: "delivery_notification",
  ready_for_dispatch: "delivery_dispatch",
  courier_assigned: "delivery_courier_assigned",
  picked_up: "delivery_picked_up",
  in_transit: "delivery_in_transit",
  delivery_attempted: "delivery_attempted",
  delivered: "delivery_delivered",
  pickup_ready: "ready_for_pickup",
  picked_by_customer: "delivery_picked_up",
};

function buildDeliverySms(stage: DeliveryStage, order: Order, businessName?: string, partnerName?: string): string {
  const greeting = timeGreeting();
  const name = order.customerName || "Customer";
  const label = orderLabel(order);
  const business = businessName ?? "us";
  switch (stage) {
    case "ready_for_dispatch":
      return `${greeting} ${name},\n\nGreat news! Your order "${label}" is complete and packed for delivery. A courier will be assigned shortly.\n\nThank you for choosing ${business}.`;
    case "courier_assigned":
      return `${greeting} ${name},\n\nYour order "${label}" has been handed to our courier${partnerName ? ` (${partnerName})` : ""} for delivery. You will receive an update once it is on the move.\n\nThank you for choosing ${business}.`;
    case "picked_up":
      return `${greeting} ${name},\n\nYour order "${label}" has been picked up by the courier and is on its way to you.\n\nThank you for choosing ${business}.`;
    case "in_transit":
      return `${greeting} ${name},\n\nYour order "${label}" is now in transit and will reach you soon.\n\nThank you for choosing ${business}.`;
    case "delivery_attempted":
      return `${greeting} ${name},\n\nWe tried to deliver your order "${label}" but could not reach you. We will retry shortly — please ensure you are available.\n\nThank you for choosing ${business}.`;
    case "delivered":
      return `${greeting} ${name},\n\nYour order "${label}" has been delivered. Thank you for choosing ${business} — we hope to serve you again!`;
    case "pickup_ready":
      return `${greeting} ${name},\n\nYour order "${label}" is complete and ready for pickup within our working hours.\n\nThank you for choosing ${business}.`;
    case "picked_by_customer":
      return `${greeting} ${name},\n\nThank you for collecting your order "${label}". We hope you enjoy it!\n\nThank you for choosing ${business}.`;
    default:
      return `${greeting} ${name},\n\nUpdate on your order "${label}".\n\nThank you for choosing ${business}.`;
  }
}

export interface AdvanceDeliveryOptions {
  stage: DeliveryStage;
  note?: string;
  byUid?: string;
  byName?: string;
  businessName?: string;
  partnerName?: string;
  /** Override the per-stage SMS toggle (default: honor business config). */
  sendCustomerSms?: boolean;
}

export interface AdvanceDeliveryResult {
  ok: boolean;
  smsSent?: boolean;
  message?: string;
  timeline?: DeliveryTimelineEntry[];
}

/**
 * Advance an order to the next delivery stage, fire the team notification and
 * send the milestone SMS when the business config enables it.
 */
export async function advanceOrderDelivery(
  businessId: string,
  order: Order,
  options: AdvanceDeliveryOptions
): Promise<AdvanceDeliveryResult> {
  const { stage } = options;
  try {
    const allowed = nextDeliveryStages(order.deliveryStage ?? "pending", order.deliveryMethod ?? "delivery");
    if ((order.deliveryStage ?? "pending") !== stage && !allowed.includes(stage)) {
      return { ok: false, message: "This order cannot move to that delivery stage yet." };
    }

    await setOrderDeliveryStage(businessId, order.id, {
      stage,
      note: options.note,
      byUid: options.byUid,
      byName: options.byName,
    });

    await notifyDeliveryStageChanged(
      businessId,
      order.orderNumber,
      order.customerName,
      order.id,
      stage,
      options.byUid
    );

    let smsSent = false;
    if (order.customerPhone) {
      let sendSmsToCustomer = options.sendCustomerSms;
      if (sendSmsToCustomer == null) {
        const config: BusinessDeliveryConfig | null = await getDeliveryConfig(businessId);
        const key = smsToggleKey(stage);
        sendSmsToCustomer = key ? (config?.sms?.[key] ?? false) : false;
      }
      if (sendSmsToCustomer) {
        const baseMessage = buildDeliverySms(stage, order, options.businessName, options.partnerName);
        try {
          const { message, onboardingIncluded, customerId } = await prepareMessageWithOnboarding(
            businessId,
            order,
            baseMessage
          );
            const result = await sendSms(order.customerPhone, message, undefined, businessId);
            if (result.success) {
              await logSmsEntry(businessId, {
                orderId: order.id,
                recipient: order.customerPhone,
                message,
                type: DELIVERY_SMS_TYPE[stage],
                status: "success",
                response: result.response,
              });
              if (onboardingIncluded) {
                const { markPortalOnboardingSent } = await import("@/services/customer-portal.service");
                await markPortalOnboardingSent(businessId, customerId).catch(() => {});
              }
              smsSent = true;
            } else {
              await logSmsEntry(businessId, {
                orderId: order.id,
                recipient: order.customerPhone,
                message,
                type: DELIVERY_SMS_TYPE[stage],
                status: "failed",
                response: result.error,
              });
            }
        } catch {
          // SMS failure never blocks the stage transition
        }
      }
    }

    return { ok: true, smsSent };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not update delivery stage" };
  }
}

function smsToggleKey(stage: DeliveryStage): keyof BusinessDeliveryConfig["sms"] | null {
  switch (stage) {
    case "ready_for_dispatch":
      return "dispatch";
    case "courier_assigned":
      return "assign";
    case "picked_up":
      return "pickup";
    case "in_transit":
      return "transit";
    case "delivery_attempted":
      return "attempt";
    case "delivered":
    case "picked_by_customer":
      return "delivered";
    default:
      return null;
  }
}
