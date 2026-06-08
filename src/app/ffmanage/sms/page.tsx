"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { SmsChart } from "@/components/admin/sms-chart";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel } from "@/lib/utils";
import { MessageSquare, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import type { SmsBusinessStat, SmsDataPoint } from "@/types/admin";

interface SmsLog {
  id: string;
  business_id: string;
  recipient_phone: string;
  message_type: string;
  status: string;
  created_at: string;
  businessName: string | null;
}

export default function AdminSmsPage() {
  const [total, setTotal] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [topBusinesses, setTopBusinesses] = useState<SmsBusinessStat[]>([]);
  const [trend, setTrend] = useState<SmsDataPoint[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ffmanage/sms")
      .then((r) => r.json())
      .then((d) => {
        setTotal(d.total ?? 0);
        setThisMonth(d.thisMonth ?? 0);
        setTopBusinesses(d.topBusinesses ?? []);
        setTrend(d.trend ?? []);
        setLogs(d.logs ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const delivered = topBusinesses.reduce((s, b) => s + b.delivered, 0);
  const failed = topBusinesses.reduce((s, b) => s + b.failed, 0);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">SMS Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">Platform-wide SMS usage and delivery tracking</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total SMS Sent" value={total.toLocaleString()} icon={MessageSquare} variant="purple" loading={loading} />
          <StatCard title="This Month" value={thisMonth.toLocaleString()} icon={TrendingUp} loading={loading} />
          <StatCard title="Delivered" value={delivered.toLocaleString()} icon={CheckCircle2} variant="success" loading={loading} />
          <StatCard title="Failed" value={failed.toLocaleString()} icon={AlertCircle} variant="danger" loading={loading} />
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Daily SMS Volume (last 30 days)</h3>
          <SmsChart data={trend} loading={loading} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top businesses */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Top Businesses by SMS</h3>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800" />)}
              </div>
            ) : topBusinesses.length === 0 ? (
              <p className="text-sm text-slate-500">No SMS data</p>
            ) : (
              <div className="space-y-2">
                {topBusinesses.map((biz, i) => (
                  <div key={biz.businessId} className="flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2">
                    <span className="text-xs font-bold text-slate-600 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{biz.businessName}</p>
                      <p className="text-xs text-slate-500">{biz.delivered} delivered • {biz.failed} failed</p>
                    </div>
                    <span className="text-sm font-bold text-violet-300">{biz.sent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent logs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="font-semibold text-slate-200">Recent SMS Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Business</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? Array.from({length: 6}).map((_,i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-2"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                  )) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-500">No logs</td></tr>
                  ) : logs.slice(0, 15).map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-2.5 text-xs text-slate-300 truncate max-w-[100px]">{log.businessName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{log.message_type}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={
                          log.status === "delivered" || log.status === "success" ? "success" :
                          log.status === "failed" ? "danger" : "default"
                        }>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{formatDateLabel(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
