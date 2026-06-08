"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteBusinessDialog } from "@/components/admin/delete-business-dialog";
import { BusinessActionDialog } from "@/components/admin/business-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKes, formatDateLabel, cn } from "@/lib/utils";
import {
  ArrowLeft, Building2, Users, CreditCard, MessageSquare,
  AlertTriangle, CheckCircle2, Settings2, Trash2, RefreshCw,
  ChevronDown,
} from "lucide-react";
import type { AdminBusinessDetail } from "@/types/admin";

type ActionType = "suspend" | "reactivate" | "change_plan" | "extend_subscription" | "cancel_subscription" | "add_manual_subscription";

export default function AdminBusinessDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "sms" | "members" | "audit">("overview");

  const fetchBusiness = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ffmanage/businesses/${id}`);
    const data = await res.json();
    setBusiness(data.business ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  if (loading) {
    return (
      <AdminShell>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-slate-800" />
          <div className="h-32 rounded-xl bg-slate-800" />
          <div className="h-64 rounded-xl bg-slate-800" />
        </div>
      </AdminShell>
    );
  }

  if (!business) {
    return (
      <AdminShell>
        <div className="text-center py-20">
          <Building2 className="mx-auto h-12 w-12 text-slate-700" />
          <p className="mt-3 text-slate-500">Business not found</p>
          <Button variant="ghost" onClick={() => router.back()} className="mt-4 text-slate-400">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {showDelete && (
        <DeleteBusinessDialog
          businessId={business.id}
          businessName={business.name}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.replace("/ffmanage/businesses")}
        />
      )}

      {activeAction && (
        <BusinessActionDialog
          business={business}
          action={activeAction}
          onClose={() => setActiveAction(null)}
          onSuccess={() => { setActiveAction(null); fetchBusiness(); }}
        />
      )}

      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push("/ffmanage/businesses")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Businesses
        </button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{business.name}</h1>
              <Badge variant={business.isActive ? "success" : "danger"}>
                {business.isActive ? "Active" : "Suspended"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {business.ownerEmail} • Created {formatDateLabel(business.createdAt)}
            </p>
          </div>

          {/* Actions dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionsOpen((o) => !o)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Actions
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </Button>
            {actionsOpen && (
              <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl py-1">
                {[
                  { action: "change_plan" as ActionType, label: "Change Plan" },
                  { action: "extend_subscription" as ActionType, label: "Extend Subscription" },
                  { action: "add_manual_subscription" as ActionType, label: "Add Manual Sub" },
                  { action: business.isActive ? "suspend" as ActionType : "reactivate" as ActionType,
                    label: business.isActive ? "Suspend Business" : "Reactivate Business",
                    danger: business.isActive },
                  { action: "cancel_subscription" as ActionType, label: "Cancel Subscription", danger: true },
                ].map(({ action, label, danger }) => (
                  <button
                    key={action}
                    onClick={() => { setActiveAction(action); setActionsOpen(false); }}
                    className={cn(
                      "flex w-full items-center px-4 py-2.5 text-sm transition-colors",
                      danger ? "text-rose-400 hover:bg-rose-900/20" : "text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => { setShowDelete(true); setActionsOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Employees", value: business.employeeCount, icon: Users },
            { label: "Customers", value: business.customerCount, icon: Users },
            { label: "Plan", value: business.plan?.toUpperCase() ?? "—", icon: CreditCard },
            { label: "Subscription", value: business.subscriptionStatus ?? "None", icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <Icon className="h-4 w-4 text-slate-600" />
              </div>
              <p className="mt-1.5 text-lg font-bold text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto">
          {(["overview", "payments", "sms", "members", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                activeTab === tab
                  ? "border-violet-500 text-violet-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Subscription details */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-slate-200 mb-4">Subscription</h3>
              {business.subscription ? (
                <dl className="space-y-2.5">
                  {[
                    ["Plan", business.subscription.planSlug?.toUpperCase()],
                    ["Status", business.subscription.status],
                    ["Installation fee", business.subscription.installationFeePaid ? "Paid" : "Pending"],
                    ["Period start", business.subscription.currentPeriodStart ? formatDateLabel(business.subscription.currentPeriodStart) : "—"],
                    ["Period end", business.subscription.currentPeriodEnd ? formatDateLabel(business.subscription.currentPeriodEnd) : "—"],
                    ["Next billing", business.subscription.nextBillingDate ? formatDateLabel(business.subscription.nextBillingDate) : "—"],
                    ["Cancel at period end", business.subscription.cancelAtPeriodEnd ? "Yes" : "No"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className="text-xs text-slate-300 font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">No subscription</p>
              )}
            </div>

            {/* Business info */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-slate-200 mb-4">Business Info</h3>
              <dl className="space-y-2.5">
                {[
                  ["ID", business.id.slice(0, 8) + "…"],
                  ["Owner", business.ownerName ?? "—"],
                  ["Email", business.email ?? "—"],
                  ["Phone", business.phone],
                  ["Location", business.location ?? "—"],
                  ["Country", business.country],
                  ["Currency", business.currency],
                  ["SMS Sender ID", business.smsSettings.senderId ?? "FundiFlow"],
                  ["SMS Enabled", business.smsSettings.senderIdEnabled ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="text-xs text-slate-300 font-medium truncate max-w-[180px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {business.recentPayments.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">No payments</td></tr>
                ) : business.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.type}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-300">{formatKes(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "success" ? "success" : p.status === "pending" ? "warning" : "danger"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.paidAt ? formatDateLabel(p.paidAt) : formatDateLabel(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "sms" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Phone</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {business.recentSmsLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No SMS logs</td></tr>
                ) : business.recentSmsLogs.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.recipientPhone}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.messageType}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "delivered" || s.status === "success" ? "success" : s.status === "failed" ? "danger" : "default"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateLabel(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "members" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Member</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {business.members.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-500">No members</td></tr>
                ) : business.members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-200">{m.displayName}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{m.role}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.active ? "success" : "danger"}>
                        {m.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateLabel(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {business.auditLogs.length === 0 ? (
                  <tr><td colSpan={3} className="py-10 text-center text-sm text-slate-500">No audit logs</td></tr>
                ) : business.auditLogs.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-sm text-slate-300">{a.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.performedByRole ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateLabel(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
