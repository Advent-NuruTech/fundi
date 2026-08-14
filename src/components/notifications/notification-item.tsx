"use client";

import { Archive, Store, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BellNotification } from "./use-notifications";

interface Props {
  notification: BellNotification;
  onClick: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const typeLabels: Record<string, { color: string }> = {
  order_assigned: { color: "text-blue-600" },
  order_updated: { color: "text-indigo-600" },
  payment_received: { color: "text-emerald-600" },
  invitation_accepted: { color: "text-violet-600" },
  message_received: { color: "text-sky-600" },
  announcement: { color: "text-amber-600" },
  low_stock: { color: "text-rose-600" },
  member_joined: { color: "text-teal-600" },
  system: { color: "text-slate-600" },
  material_added: { color: "text-emerald-600" },
  stock_received: { color: "text-emerald-600" },
  stock_adjusted: { color: "text-amber-600" },
  purchase_order_created: { color: "text-blue-600" },
  purchase_order_received: { color: "text-emerald-600" },
  new_order_created: { color: "text-indigo-600" },
  order_stage_changed: { color: "text-purple-600" },
  order_completed: { color: "text-emerald-600" },
  materials_consumed: { color: "text-amber-600" },
  new_order: { color: "text-emerald-600" },
  order_status_changed: { color: "text-indigo-600" },
  stock_low: { color: "text-rose-600" },
};

export function NotificationItem({ notification, onClick, onArchive, onDelete }: Props) {
  const meta = typeLabels[notification.type] || typeLabels.system;

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.color)} />
            <p className={cn("text-sm font-medium truncate", meta.color)}>
              {notification.title}
            </p>
            {notification.source === "ecommerce" && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Store className="h-2.5 w-2.5" />
                Store
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
            {notification.message}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {notification.source === "app" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </button>
  );
}
