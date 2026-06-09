"use client";

import { useState, useEffect } from "react";
import { cn, formatDateLabel } from "@/lib/utils";
import { Shield, UserCheck, UserX, Users } from "lucide-react";
import type { PlatformAdmin, PlatformRole } from "@/types/admin";

const ROLE_CONFIG: Record<PlatformRole, { label: string; cls: string }> = {
  owner: {
    label: "Owner",
    cls: "bg-amber-900/40 text-amber-300 border border-amber-700/30",
  },
  super_admin: {
    label: "Super Admin",
    cls: "bg-violet-900/40 text-violet-300 border border-violet-700/30",
  },
  support_admin: {
    label: "Support Admin",
    cls: "bg-sky-900/40 text-sky-300 border border-sky-700/30",
  },
  billing_admin: {
    label: "Billing Admin",
    cls: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/30",
  },
  operations_admin: {
    label: "Ops Admin",
    cls: "bg-slate-800 text-slate-300 border border-slate-700",
  },
};

export function PlatformTeamTable() {
  const [team, setTeam] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerInTeam, setOwnerInTeam] = useState(true);

  useEffect(() => {
    fetch("/api/ffmanage/team")
      .then((r) => r.json())
      .then((d) => {
        setTeam(d.team ?? []);
        setOwnerInTeam(d.ownerInTeam ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCount = team.filter((m) => m.isActive).length;

  return (
    <div className="space-y-4">
      {/* Warning: system owner not enrolled as a platform admin */}
      {!loading && !ownerInTeam && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-700/40 bg-amber-900/20 p-4 text-sm text-amber-300">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium">System owner is not enrolled as a platform admin</p>
            <p className="mt-0.5 text-xs text-amber-400/80">
              The <code className="rounded bg-amber-900/40 px-1">system_owner_uid</code> in{" "}
              <code className="rounded bg-amber-900/40 px-1">system_config</code> has no matching{" "}
              <code className="rounded bg-amber-900/40 px-1">platform_admins</code> record. Run the
              migration backfill or re-register the owner to fix this.
            </p>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Users className="h-4 w-4 text-slate-500" />
        <span>
          {loading
            ? "Loading…"
            : `${activeCount} active operator${activeCount !== 1 ? "s" : ""} · ${team.length} total`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Operator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 sm:table-cell">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 lg:table-cell">
                  Last Login
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 xl:table-cell">
                  Enrolled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="bg-slate-900">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-800" />
                      </td>
                    </tr>
                  ))
                : team.length === 0
                ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Users className="mx-auto h-8 w-8 text-slate-700" />
                        <p className="mt-2 text-sm text-slate-500">No platform operators enrolled</p>
                      </td>
                    </tr>
                  )
                : team.map((member) => {
                    const roleStyle =
                      ROLE_CONFIG[member.role] ?? {
                        label: member.role,
                        cls: "bg-slate-800 text-slate-300 border border-slate-700",
                      };
                    return (
                      <tr key={member.id} className="bg-slate-900 hover:bg-slate-800/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-200">
                            {member.fullName ?? <span className="text-slate-500 italic">No name</span>}
                          </p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-medium",
                              roleStyle.cls
                            )}
                          >
                            {roleStyle.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {member.isActive ? (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <UserCheck className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <UserX className="h-3.5 w-3.5" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
                          {member.lastLoginAt ? formatDateLabel(member.lastLoginAt) : "Never"}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 xl:table-cell">
                          {formatDateLabel(member.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
