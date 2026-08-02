"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Send, Loader2, MessageCircle, Store, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useCustomerPortal } from "@/features/customer-portal/customer-portal-context";
import {
  getOrCreateSupportConversation,
  listenSupportMessages,
  sendSupportMessage,
  getMySupportConversations,
  listenMySupportConversations,
  type SupportConversationMeta,
} from "@/services/customer-portal.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
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

interface BusinessChat {
  id: string;
  name: string;
  ownerUid: string;
  conversationId: string;
}

// ─── Read-state helpers (localStorage, mirrors business messaging) ────────────

const READ_KEY = "fundiflow_portal_conv_read";

function loadReadMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveRead(convId: string) {
  const map = loadReadMap();
  map[convId] = new Date().toISOString();
  localStorage.setItem(READ_KEY, JSON.stringify(map));
}

function isChatUnread(
  convId: string,
  meta: SupportConversationMeta | undefined,
  uid: string,
  readMap: Record<string, string>
): boolean {
  if (!meta?.lastMessageAt) return false;
  if (meta.lastMessageSenderUid === uid) return false;
  const lastRead = readMap[convId];
  if (!lastRead) return true;
  return new Date(meta.lastMessageAt) > new Date(lastRead);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function PortalSupportPage() {
  const { userId, customers, primaryCustomer, isLoaded } = useCustomerPortal();
  const [chats, setChats] = useState<BusinessChat[]>([]);
  const [convMeta, setConvMeta] = useState<SupportConversationMeta[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readMap, setReadMap] = useState<Record<string, string>>(loadReadMap);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markRead = (convId: string) => {
    saveRead(convId);
    setReadMap(loadReadMap());
    window.dispatchEvent(new Event("fundiflow-portal-conv-read"));
  };

  // Load the businesses this customer is linked to and ensure a support
  // conversation exists for each of them.
  useEffect(() => {
    if (!isLoaded || !userId || !customers.length) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const bizIds = [...new Set(customers.map((c) => c.businessId))];

    supabase
      .from("businesses")
      .select("id, owner_uid, name")
      .in("id", bizIds)
      .then(async ({ data }) => {
        if (cancelled || !data?.length) {
          if (!cancelled) setLoading(false);
          return;
        }

        const loaded: BusinessChat[] = [];
        for (const biz of data as Array<{ id: string; owner_uid: string; name: string }>) {
          const customer = customers.find((c) => c.businessId === biz.id);
          if (!customer) continue;
          const convId = await getOrCreateSupportConversation(
            biz.id,
            customer.id,
            userId,
            customer.fullName,
            biz.owner_uid,
            biz.name
          );
          if (convId) {
            loaded.push({
              id: biz.id,
              name: biz.name,
              ownerUid: biz.owner_uid,
              conversationId: convId,
            });
          }
        }

        if (cancelled) return;
        setChats(loaded);
        const first = loaded[0];
        setActiveChatId((prev) => prev ?? first?.id ?? null);
        if (first) markRead(first.conversationId);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, customers]);

  // Live conversation metadata → drives unread badges exactly like the
  // business messages sidebar.
  useEffect(() => {
    if (!userId) return;
    getMySupportConversations(userId).then(setConvMeta).catch(() => {});
    return listenMySupportConversations(userId, setConvMeta);
  }, [userId]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const conversationId = activeChat?.conversationId ?? null;
  const currentName =
    customers.find((c) => c.businessId === activeChatId)?.fullName ??
    primaryCustomer?.fullName ??
    "Customer";

  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    return listenSupportMessages(conversationId, setMessages);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = (chat: BusinessChat) => {
    setActiveChatId(chat.id);
    markRead(chat.conversationId);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeChat || !userId || sending) return;

    const tempId = `opt-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const optimistic: SupportMessage = {
      id: tempId,
      senderUid: userId,
      senderName: currentName,
      text: trimmed,
      createdAt: now,
      attachments: [],
    };

    setText("");
    setSending(true);
    // Optimistic display: the message appears instantly and the real-time
    // subscription replaces it with the DB-confirmed one in the background.
    setMessages((prev) => [...prev, optimistic]);
    try {
      await sendSupportMessage(activeChat.conversationId, activeChat.id, userId, currentName, trimmed);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      toast.error("Message could not be sent");
    } finally {
      setSending(false);
    }
  };

  const handleImageSend = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !userId || uploadingImage) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }

    const tempId = `opt-${crypto.randomUUID()}`;
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage({
        file,
        businessId: activeChat.id,
        uploadedByUid: userId,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          senderUid: userId,
          senderName: currentName,
          text: "",
          createdAt: new Date().toISOString(),
          attachments: [{ url: uploaded.url, name: file.name }],
        } as SupportMessage,
      ]);
      await sendSupportMessage(
        activeChat.conversationId,
        activeChat.id,
        userId,
        currentName,
        "",
        [{ type: "image", url: uploaded.url, name: file.name }]
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  if (!chats.length) {
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

      {/* Business selector — customer sees each business by name, with an
          unread dot when that workshop has replied */}
      {chats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 -mx-1 px-1">
          {chats.map((chat) => {
            const unread = isChatUnread(
              chat.conversationId,
              convMeta.find((m) => m.id === chat.conversationId),
              userId,
              readMap
            );
            return (
              <button
                key={chat.id}
                onClick={() => openChat(chat)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  activeChatId === chat.id
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                )}
                aria-pressed={activeChatId === chat.id}
              >
                <Store className="h-3.5 w-3.5" />
                {chat.name}
                {unread && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat header with business name */}
      {activeChat && (
        <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5 shrink-0 rounded-t-xl">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Store className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{activeChat.name}</p>
            <p className="text-[10px] text-slate-400">Customer support chat</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Send a message to get help from the team</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderUid === userId;
          const images = (msg.attachments ?? []).filter((a) => a.url);
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
                {images.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {images.map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={a.url}
                          alt={a.name ?? "Sent image"}
                          className="rounded-lg max-w-full max-h-60 object-cover border"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {msg.text ? <p className="whitespace-pre-wrap break-words">{msg.text}</p> : null}
                <p className={cn("text-[10px] mt-1", isMe ? "text-emerald-200" : "text-slate-400")}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-end gap-2 pt-3 border-t border-slate-200 bg-slate-50 pb-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSend}
        />
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || !conversationId}
          className="h-10 w-10 p-0 shrink-0 text-slate-400 hover:text-emerald-700"
          aria-label="Attach image"
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
        <Input
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          className="flex-1 bg-white"
          disabled={sending || !conversationId}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!text.trim() || sending || !conversationId}
          className="h-10 w-10 p-0 bg-emerald-700 hover:bg-emerald-800 shrink-0"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
