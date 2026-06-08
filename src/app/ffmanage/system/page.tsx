"use client";

import { useState, useEffect } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatCard } from "@/components/admin/stat-card";
import { InviteLinksPanel } from "@/components/admin/invite-links-panel";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel, cn } from "@/lib/utils";
import { Server, Database, Activity, Shield, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { SystemHealth, AdminAuditLog } from "@/types/admin";

interface AdminSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"health" | "audit" | "sessions" | "invites">("health");

  useEffect(() => {
    fetch("/api/ffmanage/system")
      .then((r) => r.json())
      .then((d) => {
        setHealth(d.health ?? null);
        setAuditLogs((d.auditLogs ?? []) as AdminAuditLog[]);
        setActiveSessions(d.activeSessions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const SEVERITY_VARIANTS: Record<string, "default" | "success" | "warning" | "danger"> = {
    info: "default", warning: "warning", critical: "danger"
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">System</h1>
          <p className="mt-0.5 text-sm text-slate-500">Health monitoring, audit logs, sessions, and invite management</p>
        </div>

        {/* System health summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="System Status"
            value={loading ? "—" : health?.status === "healthy" ? "Healthy" : health?.status === "degraded" ? "Degraded" : "Down"}
            icon={health?.status === "healthy" ? CheckCircle2 : AlertTriangle}
            variant={health?.status === "healthy" ? "success" : "danger"}
            loading={loading}
          />
          <StatCard
            title="DB Latency"
            value={loading ? "—" : `${health?.database.latencyMs ?? 0}ms`}
            icon={Database}
            variant={health?.database.latencyMs && health.database.latencyMs > 200 ? "warning" : "success"}
            loading={loading}
          />
          <StatCard
            title="Active Sessions"
            value={loading ? "—" : activeSessions.length}
            icon={Shield}
            variant="purple"
            loading={loading}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
          {(["health", "audit", "sessions", "invites"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "health" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                Database
              </h3>
              {loading ? <div className="h-20 animate-pulse rounded-lg bg-slate-800" /> : (
                <dl className="space-y-2.5">
                  <div className="flex justify-between">
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="text-xs font-medium">
                      <span className={health?.database.status === "ok" ? "text-emerald-400" : "text-rose-400"}>
                        {health?.database.status ?? "unknown"}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs text-slate-500">Latency</dt>
                    <dd className="text-xs text-slate-300">{health?.database.latencyMs}ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-xs text-slate-500">Last checked</dt>
                    <dd className="text-xs text-slate-300">{health ? formatDateLabel(health.checkedAt) : "—"}</dd>
                  </div>
                </dl>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-500" />
                Storage
              </h3>
              {loading ? <div className="h-20 animate-pulse rounded-lg bg-slate-800" /> : (
                <dl className="space-y-2.5">
                  <div className="flex justify-between">
                    <dt className="text-xs text-slate-500">Status</dt>
                    <dd className="text-xs font-medium">
                      <span className="text-emerald-400">{health?.storage.status ?? "ok"}</span>
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Admin</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Resource</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Severity</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">IP</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {loading ? Array.from({length: 8}).map((_,i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                  )) : auditLogs.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">No audit logs</td></tr>
                  ) : auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/60">
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-300">{log.action}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 truncate max-w-[120px]">{log.adminEmail ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 truncate max-w-[120px]">
                        {log.resourceName ?? log.resourceType ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={SEVERITY_VARIANTS[log.severity] ?? "default"}>{log.severity}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.ipAddress ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{formatDateLabel(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Session ID</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Last Active</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {loading ? Array.from({length: 3}).map((_,i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-800" /></td></tr>
                )) : activeSessions.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No active sessions</td></tr>
                ) : activeSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.id.slice(0, 12)}…</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{s.ip_address ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateLabel(s.last_active_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateLabel(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "invites" && (
          <InviteLinksPanel />
        )}
      </div>
    </AdminShell>
  );
}
