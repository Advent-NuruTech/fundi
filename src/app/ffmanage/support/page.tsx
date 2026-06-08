"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateLabel, cn } from "@/lib/utils";
import { FileText, ChevronLeft, ChevronRight, Plus, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { SupportTicket, SupportTicketMessage } from "@/types/admin";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const LIMIT = 25;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), status: statusFilter });
    const res = await fetch(`/api/ffmanage/support?${params}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  async function openTicket(ticket: SupportTicket) {
    setSelectedTicket(ticket);
    const res = await fetch(`/api/ffmanage/support/${ticket.id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function sendReply() {
    if (!selectedTicket || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/ffmanage/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reply", content: reply }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setReply("");
      openTicket(selectedTicket);
      toast.success("Reply sent");
    } catch { toast.error("Failed to send reply"); }
    finally { setSending(false); }
  }

  async function updateStatus(ticketId: string, status: string) {
    await fetch(`/api/ffmanage/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(t => t ? { ...t, status: status as SupportTicket["status"] } : t);
    }
    toast.success("Status updated");
  }

  const PRIORITY_COLORS: Record<string, string> = {
    low: "text-slate-400", medium: "text-blue-400", high: "text-amber-400", urgent: "text-rose-400"
  };
  const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger"> = {
    open: "warning", in_progress: "default", resolved: "success", closed: "default"
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Support Tickets</h1>
            <p className="mt-0.5 text-sm text-slate-500">Manage customer support requests</p>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Ticket list */}
          <div className="flex-1 min-w-0">
            <div className="space-y-2">
              {loading ? Array.from({length: 6}).map((_,i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800" />
              )) : tickets.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-700" />
                  <p className="mt-2 text-sm text-slate-500">No tickets</p>
                </div>
              ) : tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-colors",
                    selectedTicket?.id === ticket.id
                      ? "border-violet-700 bg-violet-900/20"
                      : "border-slate-800 bg-slate-900 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-slate-500">{ticket.ticketNumber}</p>
                        <Badge variant={STATUS_VARIANTS[ticket.status] ?? "default"}>{ticket.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-200 truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ticket.userEmail ?? "—"} • {formatDateLabel(ticket.createdAt)}</p>
                    </div>
                    <span className={cn("text-xs font-medium uppercase", PRIORITY_COLORS[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">{page}/{totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ticket detail */}
          {selectedTicket && (
            <div className="w-full lg:w-96 rounded-xl border border-slate-800 bg-slate-900 flex flex-col max-h-[600px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div>
                  <p className="font-mono text-xs text-slate-500">{selectedTicket.ticketNumber}</p>
                  <p className="text-sm font-medium text-slate-200 truncate">{selectedTicket.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={() => setSelectedTicket(null)} className="text-slate-500 hover:text-slate-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "rounded-xl px-3 py-2.5 text-sm",
                    msg.senderRole === "admin"
                      ? "ml-6 bg-violet-900/30 border border-violet-800/30 text-violet-100"
                      : "mr-6 bg-slate-800 text-slate-200"
                  )}>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">{msg.senderName}</p>
                    <p>{msg.content}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{formatDateLabel(msg.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                    placeholder="Write a reply…"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="self-end rounded-lg bg-violet-600 p-2.5 text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
