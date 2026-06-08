"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Copy, X, Loader2, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateLabel } from "@/lib/utils";

interface InviteLink {
  id: string;
  token: string;
  label: string | null;
  email: string | null;
  roleToAssign: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
  url: string;
  isExpired: boolean;
  isExhausted: boolean;
}

export function InviteLinksPanel() {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    email: "",
    roleToAssign: "owner",
    maxUses: 1,
    expiresInDays: 7,
  });

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/ffmanage/invites");
    const data = await res.json();
    setLinks((data.links ?? []).map(transformLink));
    setLoading(false);
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  function transformLink(l: Record<string, string | number | boolean | null>) {
    return {
      id: l.id as string,
      token: l.token as string,
      label: l.label as string | null,
      email: l.email as string | null,
      roleToAssign: l.role_to_assign as string,
      maxUses: l.max_uses as number | null,
      useCount: l.use_count as number,
      expiresAt: l.expires_at as string,
      revoked: l.revoked as boolean,
      createdAt: l.created_at as string,
      url: l.url as string,
      isExpired: l.isExpired as boolean,
      isExhausted: l.isExhausted as boolean,
    };
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/ffmanage/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Invite link created");
      setShowCreate(false);
      fetchLinks();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch("/api/ffmanage/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", id }),
    });
    if (res.ok) { toast.success("Link revoked"); fetchLinks(); }
  }

  async function copyLink(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-100">Invite Links</h3>
          <p className="text-xs text-slate-500 mt-0.5">Control who can register on the platform</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Link
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-violet-800/40 bg-violet-900/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-violet-300">New invite link</p>
            <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Label</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Beta signup"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Restrict to email (optional)</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="specific@email.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Max uses</label>
              <input type="number" min={1} max={100} value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: parseInt(e.target.value, 10) }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Expires in (days)</label>
              <input type="number" min={1} max={30} value={form.expiresInDays}
                onChange={e => setForm(f => ({ ...f, expiresInDays: parseInt(e.target.value, 10) }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none" />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Generate Link
          </Button>
        </div>
      )}

      {/* Links list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-slate-800 p-8 text-center">
          <Link2 className="mx-auto h-8 w-8 text-slate-700" />
          <p className="mt-2 text-sm text-slate-500">No invite links yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const invalid = link.revoked || link.isExpired || link.isExhausted;
            return (
              <div key={link.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {link.label ?? link.token.slice(0, 12) + "…"}
                    </p>
                    {link.revoked && <Badge variant="danger">Revoked</Badge>}
                    {link.isExpired && !link.revoked && <Badge variant="warning">Expired</Badge>}
                    {link.isExhausted && !link.revoked && <Badge variant="warning">Exhausted</Badge>}
                    {!invalid && <Badge variant="success">Active</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {link.email ? `→ ${link.email} • ` : ""}
                    {link.useCount}/{link.maxUses ?? "∞"} uses • Expires {formatDateLabel(link.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {!invalid && (
                    <button
                      onClick={() => copyLink(link.url, link.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                      title="Copy link"
                    >
                      {copiedId === link.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                  {!link.revoked && (
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-900/30 hover:text-rose-400 transition-colors"
                      title="Revoke"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
