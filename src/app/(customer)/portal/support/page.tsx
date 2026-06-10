"use client";

import { useEffect, useRef, useState } from "react";
import { Send, ImageIcon, Loader2, MessageCircle } from "lucide-react";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import {
  getOrCreateSupportConversation,
  listenSupportMessages,
  sendSupportMessage,
} from "@/services/customer-portal.service";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SupportMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: Array<{ url: string; name: string }>;
}

export default function PortalSupportPage() {
  const { userId, primaryCustomer, customerIds, isLoaded } = useCustomerPortal();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !userId || !customerIds.length) {
      setLoading(false);
      return;
    }

    const customer = primaryCustomer;
    if (!customer) {
      setLoading(false);
      return;
    }

    // Get business owner UID to create/find support conversation
    supabase
      .from("businesses")
      .select("id, owner_uid, name")
      .eq("id", customer.businessId)
      .single()
      .then(async ({ data: biz }) => {
        if (!biz) {
          setLoading(false);
          return;
        }

        const convId = await getOrCreateSupportConversation(
          customer.businessId,
          customer.id,
          userId,
          customer.fullName,
          biz.owner_uid as string,
          (biz.name as string) + " Support"
        );

        setConversationId(convId);
        setLoading(false);
      });
  }, [isLoaded, userId, primaryCustomer, customerIds]);

  useEffect(() => {
    if (!conversationId) return;
    return listenSupportMessages(conversationId, setMessages);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || !userId || sending) return;
    setSending(true);
    const name = primaryCustomer?.fullName ?? "Customer";
    await sendSupportMessage(conversationId, userId, name, text.trim());
    setText("");
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!customerIds.length) {
    return (
      <div className="text-center py-16">
        <MessageCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500">Support is available once your account is linked to an order</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <h1 className="text-lg font-bold text-slate-900 mb-3 shrink-0">Support</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Send a message to get help from the team</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderUid === userId;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  isMe
                    ? "bg-emerald-700 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                )}
              >
                {!isMe && (
                  <p className="text-[10px] font-semibold text-emerald-700 mb-1">{msg.senderName}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                {msg.attachments?.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                    <img src={a.url} alt={a.name} className="rounded-lg max-w-full border" />
                  </a>
                ))}
                <p className={cn("text-[10px] mt-1", isMe ? "text-emerald-200" : "text-slate-400")}>
                  {new Date(msg.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-end gap-2 pt-3 border-t border-slate-200 bg-slate-50 pb-1">
        <Input
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 bg-white"
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="h-10 w-10 p-0 bg-emerald-700 hover:bg-emerald-800 shrink-0"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
