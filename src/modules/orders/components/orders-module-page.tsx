"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import type { Order } from "@/types/domain";
import { listenOrders, dueTodayOrders } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { DataTable } from "@/modules/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes } from "@/lib/utils";
import { usePermissions } from "@/modules/shared/use-permissions";

type DateFilter = "today" | "week" | "month" | "year" | "all";

const parseIsoDate = (dateString?: string | null) => {
  if (!dateString) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + "T00:00:00");
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const isToday = (date: Date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const isThisWeek = (date: Date) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return date >= monday && date <= sunday;
};

const isThisMonth = (date: Date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const isThisYear = (date: Date) => date.getFullYear() === new Date().getFullYear();

const isSameDate = (date: Date, dateStr: string) => {
  const target = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(target.getTime())) return false;
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
};

// Filter orders based on selected date range or custom date
function filterByDate(orders: Order[], filter: DateFilter, custom?: string) {
  if (custom) {
    return orders.filter((order) => {
      const orderDate = parseIsoDate(order.dueDate);
      return orderDate ? isSameDate(orderDate, custom) : false;
    });
  }
  if (filter === "all") return orders;

  return orders.filter((order) => {
    const orderDate = parseIsoDate(order.dueDate);
    if (!orderDate) return false;
    switch (filter) {
      case "today":
        return isToday(orderDate);
      case "week":
        return isThisWeek(orderDate);
      case "month":
        return isThisMonth(orderDate);
      case "year":
        return isThisYear(orderDate);
      default:
        return true;
    }
  });
}

export function OrdersModulePage() {
  const { businessId, ready, user } = useBusinessContext();
  const permissions = usePermissions();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customDate, setCustomDate] = useState<string>("");
  const [completedTab, setCompletedTab] = useState<"delivered" | "cancelled">("delivered");

  useEffect(() => {
    if (!ready) {
      return;
    }
    return listenOrders(businessId, setOrders);
  }, [businessId, ready]);

  // Deep links: /orders?filter=today|week|month|year|all and /orders?tab=delivered|cancelled
  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "today" || f === "week" || f === "month" || f === "year" || f === "all") {
      setDateFilter(f);
      setCustomDate("");
    }
    const t = searchParams.get("tab");
    if (t === "delivered" || t === "cancelled") {
      setCompletedTab(t);
    }
  }, [searchParams]);

  const visibleOrders = useMemo(
    () =>
      permissions.assignedOnlyOrders && user
        ? orders.filter((order) => order.assignedTailorId === user.uid)
        : orders,
    [orders, permissions.assignedOnlyOrders, user]
  );

  // Separate active orders from delivered
  const activeOrders = useMemo(
    () => visibleOrders.filter((order) => order.stage !== "delivered" && !order.isCancelled),
    [visibleOrders]
  );

  const deliveredOrders = useMemo(
    () => visibleOrders.filter((order) => order.stage === "delivered" && !order.isCancelled),
    [visibleOrders]
  );

  const cancelledOrders = useMemo(
    () => visibleOrders.filter((order) => order.isCancelled),
    [visibleOrders]
  );

  const urgent = useMemo(() => dueTodayOrders(visibleOrders), [visibleOrders]);

  // Filtered orders for summary
  const filteredSummaryOrders = useMemo(
    () => filterByDate(visibleOrders, dateFilter, customDate || undefined),
    [visibleOrders, dateFilter, customDate]
  );

  const summaryData = useMemo(() => {
    const active = filteredSummaryOrders.filter((order) => order.stage !== "delivered" && !order.isCancelled);
    const delivered = filteredSummaryOrders.filter((order) => order.stage === "delivered" && !order.isCancelled);
    const totalValue = filteredSummaryOrders.reduce((sum, order) => sum + order.subtotalAmount, 0);
    const paidValue = filteredSummaryOrders.reduce((sum, order) => sum + (order.subtotalAmount - order.balanceAmount), 0);
    
    return {
      total: filteredSummaryOrders.length,
      active: active.length,
      delivered: delivered.length,
      totalValue,
      paidValue,
    };
  }, [filteredSummaryOrders]);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order",
        cell: ({ row }) => (
          <Link className="font-medium text-emerald-700" href={`/orders/${row.original.id}`}>
            {row.original.orderNumber}
          </Link>
        ),
      },
      { header: "Customer", cell: ({ row }) => row.original.customerName },
      { 
        header: "Stage", 
        cell: ({ row }) => (
          <Badge variant={row.original.stage === "delivered" ? "success" : "default"}>
            {row.original.stage.replaceAll("_", " ")}
          </Badge>
        ) 
      },
      { header: "Due", cell: ({ row }) => row.original.dueDate },
      { header: "Balance", cell: ({ row }) => formatKes(row.original.balanceAmount) },
    ],
    []
  );

  const summaryTitle = customDate
    ? `Summary for ${new Date(customDate + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}`
    : dateFilter === "today"
      ? "Today's Summary"
      : dateFilter === "week"
        ? "This Week's Summary"
        : dateFilter === "month"
          ? "This Month's Summary"
          : dateFilter === "year"
            ? "This Year's Summary"
            : "All Time Summary";

  const cancelledColumns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        header: "Order",
        cell: ({ row }) => (
          <Link className="font-medium text-emerald-700" href={`/orders/${row.original.id}`}>
            {row.original.orderNumber}
          </Link>
        ),
      },
      { header: "Customer", cell: ({ row }) => row.original.customerName },
      {
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600 capitalize">{row.original.cancellationReason || row.original.cancellationBy || "—"}</span>
        ),
      },
      {
        header: "Refund",
        cell: ({ row }) => (
          <Badge variant={row.original.refundStatus === "refunded" ? "success" : "default"}>
            {(row.original.refundStatus ?? "none").replaceAll("_", " ")}
          </Badge>
        ),
      },
      { header: "Cancelled", cell: ({ row }) => row.original.cancelledAt?.slice(0, 10) ?? "—" },
    ],
    []
  );

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "year", label: "This Year" },
    { value: "all", label: "All Time" },
  ];

  return (
    <div className="space-y-6">
      {/* Date Filter & Production Board Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 flex-wrap items-center">
          {dateFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={!customDate && dateFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setDateFilter(filter.value); setCustomDate(""); }}
              className="text-xs sm:text-sm"
            >
              {filter.label}
            </Button>
          ))}
          <div className="h-5 w-px bg-slate-300 mx-1" />
          <input
            type="date"
            value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); }}
            className="text-xs sm:text-sm border border-slate-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {customDate && (
            <button
              type="button"
              onClick={() => setCustomDate("")}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/orders/new">
            <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
              + New Order
            </Button>
          </Link>
          <Link href="/production/kanban">
            <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Production Board
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{summaryTitle}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard
            label="Total Orders"
            value={summaryData.total.toString()}
            href="/orders?filter=all"
          />
          <SummaryCard
            label="Active Orders"
            value={summaryData.active.toString()}
            tone="blue"
            href="/production/kanban"
          />
          <SummaryCard
            label="Delivered"
            value={summaryData.delivered.toString()}
            tone="green"
            href="/orders?tab=delivered"
          />
          <SummaryCard
            label="Total Value"
            value={formatKes(summaryData.totalValue)}
            href="/finance"
          />
          <SummaryCard
            label="Paid Amount"
            value={formatKes(summaryData.paidValue)}
            tone="emerald"
            href="/payments"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Active Orders"
          value={activeOrders.length.toString()}
          href="/production/kanban"
        />
        <SummaryCard
          label="Urgent Deliveries"
          value={urgent.length.toString()}
          tone="amber"
          href="/orders?filter=today"
        />
        <Card>
          <CardContent className="pt-4 pb-4">
            {permissions.canWriteOrders ? (
              <Link href="/orders/new" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                + New Order
              </Link>
            ) : (
              <p className="text-sm text-slate-500">Read only</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Active Orders ({activeOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pb-4 md:pb-6">
            <DataTable 
              columns={columns} 
              data={filterByDate(activeOrders, dateFilter, customDate || undefined)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completed Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>
              {completedTab === "delivered" ? `Delivered Orders (${deliveredOrders.length})` : `Cancelled Orders (${cancelledOrders.length})`}
            </CardTitle>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setCompletedTab("delivered")}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  completedTab === "delivered" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Delivered
              </button>
              <button
                onClick={() => setCompletedTab("cancelled")}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  completedTab === "cancelled" ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Cancelled
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="pb-4 md:pb-6">
            {completedTab === "delivered" ? (
              <DataTable
                columns={columns}
                data={filterByDate(deliveredOrders, dateFilter, customDate || undefined)}
              />
            ) : (
              <DataTable
                columns={cancelledColumns}
                data={filterByDate(cancelledOrders, dateFilter, customDate || undefined)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "blue" | "green" | "emerald" | "amber";
}) {
  const valueClass = {
    default: "text-slate-900",
    blue: "text-blue-600",
    green: "text-green-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  }[tone];

  const inner = (
    <Card className="group h-full transition hover:shadow-md">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className={`text-xl sm:text-2xl font-semibold mt-1 ${valueClass}`}>{value}</p>
        {href && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
            View
            <ArrowRight className="h-3 w-3" />
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}