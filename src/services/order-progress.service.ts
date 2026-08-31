import {
  getProductionStages,
  buildOrderProgress,
  setOrderStageProgress,
  logSmsEntry,
  updateOrderSmsFields,
  setOrderDeliveryStage,
  getDeliveryConfig,
} from "@/lib/supabase.service";
import type { Order, StageMilestone } from "@/types/domain";
import { notifyOrderCompleted, notifyOrderStageChanged } from "@/services/notification-catalog";
import { sendSms } from "@/lib/sms/sendSms";
import { appendPortalOnboarding } from "@/lib/customer-portal";
import { getCustomerMessagingInfo, markPortalOnboardingSent } from "@/services/customer-portal.service";

export interface PrepareMessageResult {
  message: string;
  onboardingIncluded: boolean;
  customerId: string;
}

// Appends the Customer Portal onboarding block when this is the FIRST
// notification ever sent to the customer (login id + default password).
export async function prepareMessageWithOnboarding(
  businessId: string,
  order: Order,
  baseMessage: string
): Promise<PrepareMessageResult> {
  const messagingInfo = await getCustomerMessagingInfo(businessId, order.customerId).catch(() => null);
  if (messagingInfo && !messagingInfo.portalOnboardingSent) {
    return {
      message: appendPortalOnboarding(baseMessage, {
        email: messagingInfo.email ?? undefined,
        phone: messagingInfo.phone,
      }),
      onboardingIncluded: true,
      customerId: messagingInfo.id,
    };
  }
  return { message: baseMessage, onboardingIncluded: false, customerId: order.customerId };
}

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

export interface StageSmsOptions {
  businessId: string;
  order: Order;
  stageName: string;
  milestone: StageMilestone;
  businessName?: string;
}

/**
 * Send the customer-facing SMS for a stage change: the standard ready-for-pickup
 * message for the ready_for_pickup milestone, a generic "now at X stage" message
 * for other stages flagged notify_customer. Logs the entry and marks onboarding
 * as sent when the portal credentials were included.
 */
export async function sendStageSms(options: StageSmsOptions): Promise<boolean> {
  const { businessId, order, stageName, milestone, businessName } = options;
  const name = order.customerName || "Customer";
  const greeting = timeGreeting();
  const label = orderLabel(order);

  const baseMessage =
    milestone === "ready_for_pickup"
      ? `${greeting} ${name},\n\nYour order "${label}" is complete and ready for pickup within our working hours.\n\nThank you for choosing ${businessName ?? "us"}.`
      : `${greeting} ${name},\n\nGood news! Your order "${label}" is now at the "${stageName}" stage.\n\nThank you for choosing ${businessName ?? "us"}.`;

  const type: "ready_for_pickup" | "stage_notification" =
    milestone === "ready_for_pickup" ? "ready_for_pickup" : "stage_notification";

  try {
    const { message, onboardingIncluded, customerId } = await prepareMessageWithOnboarding(businessId, order, baseMessage);
    const result = await sendSms(order.customerPhone ?? "", message, undefined, businessId);
    if (result.success) {
      if (milestone === "ready_for_pickup") {
        await updateOrderSmsFields(businessId, order.id, {
          readyPickupSmsSent: true,
          readyPickupSmsSentAt: new Date().toISOString(),
        });
      }
      await logSmsEntry(businessId, {
        orderId: order.id,
        recipient: order.customerPhone ?? "",
        message,
        type,
        status: "success",
        response: result.response,
      });
      if (onboardingIncluded) {
        await markPortalOnboardingSent(businessId, customerId).catch(() => {});
      }
      return true;
    }
    await logSmsEntry(businessId, {
      orderId: order.id,
      recipient: order.customerPhone ?? "",
      message,
      type,
      status: "failed",
      response: result.error,
    });
    return false;
  } catch {
    return false;
  }
}

export interface AdvanceStageOptions {
  actorUid?: string;
  businessName?: string;
  /** Fire in-app notifications to the team (default true). */
  sendNotifications?: boolean;
  /** Send the customer SMS when the stage calls for it (default true). */
  sendCustomerSms?: boolean;
  /** Skip the ready-for-pickup SMS even if it hasn't been sent yet. */
  suppressPickupSms?: boolean;
}

export interface AdvanceStageResult {
  ok: boolean;
  movedTo?: string;
  stageName?: string;
  smsSent?: boolean;
  message?: string;
}

/**
 * Move an order onto a custom pipeline stage. Persists the custom progress
 * (current_stage_id / completed_stage_ids + maintained legacy stage) and then,
 * depending on the target stage's configuration:
 *   - milestone delivered  → team completion notification
 *   - milestone ready_for_pickup → team notification + the ready-for-pickup SMS
 *     (once per order, guarded by readyPickupSmsSent)
 *   - notify_customer stage → team notification + generic stage-change SMS
 */
export async function advanceOrderStage(
  businessId: string,
  order: Order,
  stageId: string,
  options: AdvanceStageOptions = {}
): Promise<AdvanceStageResult> {
  const stages = await getProductionStages(businessId);
  const built = buildOrderProgress(stages, stageId);
  if (!built) return { ok: false, message: "Stage not found in the business pipeline" };
  const { progress, target } = built;

  await setOrderStageProgress(businessId, order.id, progress);

  // ── Delivery workflow hand-off ───────────────────────────────────────────
  // Production completing hands the order into the delivery workflow. The
  // ready_for_pickup milestone opens the dispatch / pickup branch, and the
  // delivered milestone terminates it. Only when delivery hasn't started yet
  // (or was never auto-completed at creation).
  try {
    const currentDelivery = order.deliveryStage ?? "pending";
    if (target.milestone === "ready_for_pickup" && currentDelivery === "pending") {
      const config = await getDeliveryConfig(businessId);
      const method = order.deliveryMethod ?? config?.defaultMethod ?? "delivery";
      await setOrderDeliveryStage(businessId, order.id, {
        stage: method === "pickup" ? "pickup_ready" : "ready_for_dispatch",
        byUid: options.actorUid,
      });
    } else if (
      target.milestone === "delivered" &&
      currentDelivery !== "delivered" &&
      currentDelivery !== "picked_by_customer"
    ) {
      const config = await getDeliveryConfig(businessId);
      const method = order.deliveryMethod ?? config?.defaultMethod ?? "delivery";
      await setOrderDeliveryStage(businessId, order.id, {
        stage: method === "pickup" ? "picked_by_customer" : "delivered",
        byUid: options.actorUid,
      });
    }
  } catch {
    // Delivery hand-off is best-effort — production progress is already saved.
  }

  if (options.sendNotifications !== false) {
    if (target.milestone === "delivered") {
      await notifyOrderCompleted(businessId, order.orderNumber, order.customerName, order.id, options.actorUid);
    } else {
      await notifyOrderStageChanged(businessId, order.orderNumber, target.name, order.id, options.actorUid);
    }
  }

  let smsSent = false;
  const wantsPickupSms =
    target.milestone === "ready_for_pickup" && !order.readyPickupSmsSent && !options.suppressPickupSms;
  const wantsStageSms =
    target.notifyCustomer && target.milestone !== "ready_for_pickup" && target.milestone !== "delivered";

  if (options.sendCustomerSms !== false && order.customerPhone && (wantsPickupSms || wantsStageSms)) {
    smsSent = await sendStageSms({
      businessId,
      order,
      stageName: target.name,
      milestone: target.milestone,
      businessName: options.businessName,
    });
  }

  return { ok: true, movedTo: target.id, stageName: target.name, smsSent };
}
