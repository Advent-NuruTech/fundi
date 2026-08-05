"use client";

import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Order, ProductionStageConfig } from "@/types/domain";
import { listenOrders, listenProductionStages } from "@/services/firestore.service";
import { advanceOrderStage } from "@/services/order-progress.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, RefreshCw, GripVertical } from "lucide-react";

// Memoized order card component
const OrderCard = memo(function OrderCard({ 
  order, 
  onDragStart,
  onDragEnd
}: { 
  order: Order; 
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const isOverdue = order.dueDate < new Date().toISOString().slice(0, 10);
  
  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onDragEnd={onDragEnd}
      className={`
        block rounded-xl border bg-white p-3 transition-all hover:shadow-md cursor-grab active:cursor-grabbing
        ${isOverdue ? "border-rose-300 bg-rose-50" : "border-slate-200"}
      `}
    >
      <Link href={`/orders/${order.id}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-900">{order.orderNumber}</p>
          </div>
          {isOverdue && <Clock className="h-4 w-4 text-rose-600" />}
        </div>
        <p className="text-xs text-slate-500 mt-1">{order.customerName}</p>
        <p className="text-xs text-slate-500">Tailor: {order.assignedTailorName || "Unassigned"}</p>
        <p className="text-xs text-slate-500">Due {order.dueDate}</p>
        <p className="mt-2 text-xs font-medium text-rose-600">Balance {formatKes(order.balanceAmount)}</p>
        {isOverdue && (
          <p className="mt-1 text-xs font-medium text-rose-700 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Overdue
          </p>
        )}
      </Link>
    </div>
  );
});

export function ProductionKanbanModulePage() {
  const { businessId, ready } = useBusinessContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stages, setStages] = useState<ProductionStageConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dragOrderId, setDragOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !businessId) return;

    setIsLoading(true);
    let isSubscribed = true;

    const unsubscribe = listenOrders(businessId, (updatedOrders) => {
      if (!isSubscribed) return;
      
      const filteredOrders = updatedOrders.filter(order => order.stage !== "delivered");
      
      requestAnimationFrame(() => {
        setOrders(filteredOrders);
        setIsLoading(false);
      });
    });

    const unsubscribeStages = listenProductionStages(businessId, setStages);

    return () => {
      isSubscribed = false;
      unsubscribe();
      unsubscribeStages();
    };
  }, [businessId, ready]);

  // Active pipeline columns (the delivered milestone is intentionally left off
  // the board — completed orders are filtered out before rendering).
  const boardColumns = stages.filter((s) => s.isActive && s.milestone !== "delivered");

  const resolveOrderStageId = useCallback((order: Order): string | null => {
    if (order.currentStageId) return order.currentStageId;
    const byName = stages.find((s) => s.name.trim().toLowerCase() === order.stage.replaceAll("_", " "));
    if (byName) return byName.id;
    if (order.stage === "delivered") return stages.find((s) => s.milestone === "delivered")?.id ?? null;
    if (order.stage === "ready_for_pickup") return stages.find((s) => s.milestone === "ready_for_pickup")?.id ?? null;
    return null;
  }, [stages]);

  const { grouped, orderCounts } = useMemo(() => {
    const groupMap = new Map<string, Order[]>();
    const countMap = new Map<string, number>();
    
    boardColumns.forEach((c) => {
      groupMap.set(c.id, []);
      countMap.set(c.id, 0);
    });

    orders.forEach((order) => {
      const stageId = resolveOrderStageId(order);
      if (!stageId) return;
      const stageOrders = groupMap.get(stageId);
      if (stageOrders) {
        stageOrders.push(order);
        countMap.set(stageId, (countMap.get(stageId) || 0) + 1);
      }
    });

    return {
      grouped: groupMap,
      orderCounts: countMap,
    };
  }, [orders, boardColumns, resolveOrderStageId]);

  const handleDragStart = useCallback((orderId: string) => {
    setDragOrderId(orderId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDraggingOverColumn(stageId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDraggingOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (stageId: string) => {
    if (!dragOrderId || isUpdating) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    setIsUpdating(true);
    setDraggingOverColumn(null);
    
    const orderToMove = orders.find(o => o.id === dragOrderId);
    const targetStage = stages.find(s => s.id === stageId);
    if (orderToMove) {
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === dragOrderId ? { ...o, currentStageId: stageId } : o
        )
      );
    }

    try {
      const result = await advanceOrderStage(businessId, orderToMove as Order, stageId, {});
      if (!result.ok) throw new Error(result.message ?? "Stage not found");
      toast.success(`Order moved to ${targetStage?.name ?? "stage"}`, {
        duration: 2000,
      });
    } catch (error) {
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === dragOrderId ? { ...o, currentStageId: orderToMove?.currentStageId || undefined } : o
        )
      );
      toast.error("Failed to update stage. Please try again.");
      console.error("Drop error:", error);
    } finally {
      setIsUpdating(false);
      setDragOrderId(null);
    }
  }, [dragOrderId, businessId, isUpdating, orders, stages]);

  // Calculate dynamic height based on viewport
  const getColumnHeight = useCallback(() => {
    if (typeof window === 'undefined') return '600px';
    // Subtract header, padding, and other elements
    const viewportHeight = window.innerHeight;
    const headerHeight = 150; // Approximate header height
    const padding = 40;
    return `${Math.max(400, viewportHeight - headerHeight - padding)}px`;
  }, []);

  const [columnHeight, setColumnHeight] = useState('600px');

  useEffect(() => {
    const updateHeight = () => {
      setColumnHeight(getColumnHeight());
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [getColumnHeight]);

  const renderColumn = useCallback((column: ProductionStageConfig) => {
    const columnOrders = grouped.get(column.id) || [];
    const count = orderCounts.get(column.id) || 0;
    const isDragOver = draggingOverColumn === column.id;

    const columnRef = (el: HTMLDivElement | null) => {
      containerRefs.current[column.id] = el;
    };

    return (
      <Card 
        key={column.id}
        className={`
          flex flex-col min-w-[280px] w-full transition-all duration-200
          ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${isDragOver ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
        `}
        style={{ height: columnHeight }}
        onDragOver={(event) => handleDragOver(event, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(column.id)}
      >
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${column.color ?? "bg-slate-400"}`} />
              {column.name}
            </span>
            <Badge variant="default">{count}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-3 pt-0">
          <div 
            ref={columnRef} 
            className="h-full overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
          >
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            ) : columnOrders.length > 0 ? (
              columnOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200">
                <p className="text-sm text-slate-400">No orders</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [grouped, orderCounts, isLoading, draggingOverColumn, handleDragOver, handleDragLeave, handleDrop, handleDragStart, handleDragEnd, columnHeight]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Production Board</h1>
          <p className="text-sm text-slate-500">
            Drag orders between stages in realtime
            {orders.length > 0 && (
              <span className="ml-2 text-xs text-slate-400">
                ({orders.length} active orders)
              </span>
            )}
          </p>
        </div>
        {isUpdating && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Updating...
          </div>
        )}
      </div>

      {/* Scrollable container for horizontal scrolling on all devices */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-4"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent'
        }}
      >
        <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
          {boardColumns.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
              No active production stages. Configure your workflow in Settings → Production Workflow.
            </div>
          ) : (
            boardColumns.map(renderColumn)
          )}
        </div>
      </div>

      {/* Status indicator for real-time updates */}
      {isUpdating && dragOrderId && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-4 z-50">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Moving order...</span>
        </div>
      )}
    </div>
  );
}