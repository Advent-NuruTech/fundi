"use client";

import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Order, ProductionStage } from "@/types/domain";
import { listenOrders, updateOrderStage } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, RefreshCw, GripVertical } from "lucide-react";

const columns: { key: ProductionStage; label: string }[] = [
  { key: "cutting", label: "Cutting" },
  { key: "stitching", label: "Stitching" },
  { key: "fitting", label: "Fitting" },
  { key: "finishing", label: "Finishing" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
];

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
  const [isLoading, setIsLoading] = useState(true);
  const [dragOrderId, setDragOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggingOverColumn, setDraggingOverColumn] = useState<ProductionStage | null>(null);
  const containerRefs = useRef<Record<ProductionStage, HTMLDivElement | null>>({} as Record<ProductionStage, HTMLDivElement | null>);
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

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [businessId, ready]);

  const { grouped, orderCounts } = useMemo(() => {
    const groupMap = new Map<ProductionStage, Order[]>();
    const countMap = new Map<ProductionStage, number>();
    
    columns.forEach(({ key }) => {
      groupMap.set(key, []);
      countMap.set(key, 0);
    });

    orders.forEach((order) => {
      const stageOrders = groupMap.get(order.stage);
      if (stageOrders) {
        stageOrders.push(order);
        countMap.set(order.stage, (countMap.get(order.stage) || 0) + 1);
      }
    });

    return {
      grouped: groupMap,
      orderCounts: countMap,
    };
  }, [orders]);

  const handleDragStart = useCallback((orderId: string) => {
    setDragOrderId(orderId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: ProductionStage) => {
    e.preventDefault();
    setDraggingOverColumn(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDraggingOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (stage: ProductionStage) => {
    if (!dragOrderId || isUpdating) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    setIsUpdating(true);
    setDraggingOverColumn(null);
    
    const orderToMove = orders.find(o => o.id === dragOrderId);
    if (orderToMove) {
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === dragOrderId ? { ...o, stage } : o
        )
      );
    }

    try {
      await updateOrderStage(businessId, dragOrderId, stage);
      toast.success(`Order moved to ${columns.find(c => c.key === stage)?.label}`, {
        duration: 2000,
      });
    } catch (error) {
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === dragOrderId ? { ...o, stage: orderToMove?.stage || o.stage } : o
        )
      );
      toast.error("Failed to update stage. Please try again.");
      console.error("Drop error:", error);
    } finally {
      setIsUpdating(false);
      setDragOrderId(null);
    }
  }, [dragOrderId, businessId, isUpdating, orders]);

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

  const renderColumn = useCallback((column: { key: ProductionStage; label: string }) => {
    const columnOrders = grouped.get(column.key) || [];
    const count = orderCounts.get(column.key) || 0;
    const isDragOver = draggingOverColumn === column.key;

    const columnRef = (el: HTMLDivElement | null) => {
      containerRefs.current[column.key] = el;
    };

    return (
      <Card 
        key={column.key}
        className={`
          flex flex-col min-w-[280px] w-full transition-all duration-200
          ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          ${isDragOver ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
        `}
        style={{ height: columnHeight }}
        onDragOver={(event) => handleDragOver(event, column.key)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(column.key)}
      >
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="text-sm font-medium">{column.label}</span>
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
          {columns.map(renderColumn)}
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