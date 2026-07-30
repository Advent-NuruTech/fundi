"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const parseIsoDate = (dateString: string) => {
  const date = new Date(dateString);
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

export function OrdersModulePage() {
  const { businessId, ready, user } = useBusinessContext();
  const permissions = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customDate, setCustomDate] = useState<string>("");

  useEffect(() => {
    if (!ready) {
      return;
    }
    return listenOrders(businessId, setOrders);
  }, [businessId, ready]);

  const visibleOrders = useMemo(
    () =>
      permissions.assignedOnlyOrders && user
        ? orders.filter((order) => order.assignedTailorId === user.uid)
        : orders,
    [orders, permissions.assignedOnlyOrders, user]
  );

  // Separate active orders from delivered
  const activeOrders = useMemo(
    () => visibleOrders.filter((order) => order.stage !== "delivered"),
    [visibleOrders]
  );

  const deliveredOrders = useMemo(
    () => visibleOrders.filter((order) => order.stage === "delivered"),
    [visibleOrders]
  );

  const urgent = useMemo(() => dueTodayOrders(visibleOrders), [visibleOrders]);

  const isSameDate = (date: Date, dateStr: string) => {
    const target = new Date(dateStr + "T00:00:00");
    target.setHours(0, 0, 0, 0);
    return (
      date.getFullYear() === target.getFullYear() &&
      date.getMonth() === target.getMonth() &&
      date.getDate() === target.getDate()
    );
  };

  // Filter orders based on selected date range or custom date
  const filterByDate = (orders: Order[], filter: DateFilter, custom?: string) => {
    if (custom) {
      return orders.filter((order) => {
        const orderDate = parseIsoDate(order.dueDate);
        return isSameDate(orderDate, custom);
      });
    }
    if (filter === "all") return orders;
    
    return orders.filter((order) => {
      const orderDate = parseIsoDate(order.dueDate);
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
  };

  // Filtered orders for summary
  const filteredSummaryOrders = useMemo(
    () => filterByDate(visibleOrders, dateFilter, customDate || undefined),
    [visibleOrders, dateFilter, customDate]
  );

  const summaryData = useMemo(() => {
    const active = filteredSummaryOrders.filter((order) => order.stage !== "delivered");
    const delivered = filteredSummaryOrders.filter((order) => order.stage === "delivered");
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
          <Link href="http://localhost:3000/production/kanban">
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
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">Total Orders</p>
              <p className="text-xl sm:text-2xl font-semibold">{summaryData.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">Active Orders</p>
              <p className="text-xl sm:text-2xl font-semibold text-blue-600">{summaryData.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">Delivered</p>
              <p className="text-xl sm:text-2xl font-semibold text-green-600">{summaryData.delivered}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">Total Value</p>
              <p className="text-xl sm:text-2xl font-semibold">{formatKes(summaryData.totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">Paid Amount</p>
              <p className="text-xl sm:text-2xl font-semibold text-emerald-600">{formatKes(summaryData.paidValue)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Total Active Orders</p>
            <p className="text-xl sm:text-2xl font-semibold">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-slate-500">Urgent Deliveries</p>
            <p className="text-xl sm:text-2xl font-semibold text-amber-600">{urgent.length}</p>
          </CardContent>
        </Card>
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

      {/* Delivered Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Delivered Orders ({deliveredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pb-4 md:pb-6">
            <DataTable 
              columns={columns} 
              data={filterByDate(deliveredOrders, dateFilter, customDate || undefined)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}