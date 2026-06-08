"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { formatKes } from "@/lib/utils";
import {
  Building2, Users, CreditCard, MessageSquare,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  DollarSign, BarChart3, Ticket,
} from "lucide-react";
import type { PlatformStats, RevenueDataPoint } from "@/types/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ffmanage/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setRevenueTrend(d.revenueTrend ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-slate-100">Platform Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">Real-time metrics across all FundiFlow tenants</p>
        </div>

        {/* Primary stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Businesses"
            value={loading ? "—" : stats?.totalBusinesses ?? 0}
            icon={Building2}
            variant="purple"
            loading={loading}
          />
          <StatCard
            title="Active Subscriptions"
            value={loading ? "—" : stats?.activeSubscriptions ?? 0}
            icon={CheckCircle2}
            variant="success"
            loading={loading}
          />
          <StatCard
            title="Total Customers"
            value={loading ? "—" : (stats?.totalCustomers ?? 0).toLocaleString()}
            icon={Users}
            loading={loading}
          />
          <StatCard
            title="SMS Sent"
            value={loading ? "—" : (stats?.totalSmsSent ?? 0).toLocaleString()}
            icon={MessageSquare}
            loading={loading}
          />
        </div>

        {/* Revenue stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={loading ? "—" : formatKes(stats?.dailyRevenue ?? 0)}
            icon={DollarSign}
            variant="success"
            loading={loading}
          />
          <StatCard
            title="This Week"
            value={loading ? "—" : formatKes(stats?.weeklyRevenue ?? 0)}
            icon={BarChart3}
            variant="success"
            loading={loading}
          />
          <StatCard
            title="This Month"
            value={loading ? "—" : formatKes(stats?.monthlyRevenue ?? 0)}
            icon={TrendingUp}
            variant="success"
            loading={loading}
          />
          <StatCard
            title="Annual Revenue"
            value={loading ? "—" : formatKes(stats?.annualRevenue ?? 0)}
            icon={CreditCard}
            variant="purple"
            loading={loading}
          />
        </div>

        {/* Alerts row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Pending Payments"
            value={loading ? "—" : stats?.pendingPayments ?? 0}
            icon={Clock}
            variant="warning"
            loading={loading}
          />
          <StatCard
            title="Failed Payments"
            value={loading ? "—" : stats?.failedPayments ?? 0}
            icon={AlertCircle}
            variant="danger"
            loading={loading}
          />
          <StatCard
            title="Open Support Tickets"
            value={loading ? "—" : stats?.openSupportTickets ?? 0}
            icon={Ticket}
            variant={stats && stats.openSupportTickets > 0 ? "warning" : "default"}
            loading={loading}
          />
        </div>

        {/* Revenue chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-100">Revenue Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daily revenue for the current month</p>
            </div>
            {!loading && revenueTrend.length > 0 && (
              <span className="rounded-lg bg-violet-900/30 px-2.5 py-1 text-xs font-medium text-violet-300">
                {revenueTrend.length} days
              </span>
            )}
          </div>
          <RevenueChart data={revenueTrend} loading={loading} />
        </div>
      </div>
    </AdminShell>
  );
}
