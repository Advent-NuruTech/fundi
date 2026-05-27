"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import { listenConversations, sendMessage, listenMessages, createConversation } from "@/services/messaging.service";
import { listenMembers } from "@/services/firestore.service";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, ArrowLeft, Loader2 } from "lucide-react";
import type { Conversation, Message, UserProfile } from "@/types/domain";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    const unsub = listenConversations(user.businessId, user.uid, setConversations);
    return unsub;
  }, [user?.businessId, user?.uid]);

  useEffect(() => {
    if (!user?.businessId) return;
    const unsub = listenMembers(user.businessId, setMembers);
    return unsub;
  }, [user?.businessId]);

  useEffect(() => {
    if (!selectedConv || !user?.businessId) return;
    const unsub = listenMessages(user.businessId, selectedConv, setMessages);
    return unsub;
  }, [selectedConv, user?.businessId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user?.businessId || !selectedConv || sending) return;
    setSending(true);
    try {
      await sendMessage({
        businessId: user.businessId,
        conversationId: selectedConv,
        senderUid: user.uid,
        senderName: user.displayName,
        text: text.trim(),
      });
      setText("");
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }, [text, user, selectedConv, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConv);
  const otherParticipants = selectedConversation?.participantProfiles.filter((p) => p.uid !== user?.uid) || [];

  const ConversationList = (
    <div className="divide-y divide-slate-100">
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="No conversations yet"
          description="Messages from your team will appear here"
        />
      ) : (
        conversations.map((conv) => {
          const other = conv.participantProfiles.filter((p) => p.uid !== user?.uid);
          const title =
            conv.title ||
            other
              .map((p) => p.displayName)
              .filter(Boolean)
              .join(", ") ||
            "Conversation";
          return (
            <button
              key={conv.id}
              onClick={() => {
                setSelectedConv(conv.id);
                setShowMobileList(false);
              }}
              className={cn(
                "w-full px-4 py-3 text-left transition hover:bg-slate-50",
                selectedConv === conv.id && "bg-emerald-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {other.slice(0, 2).map((p) => (
                    <UserAvatar key={p.uid} profile={p} size="sm" className="ring-2 ring-white" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{title}</p>
                  {conv.lastMessage && (
                    <p className="truncate text-xs text-slate-500">
                      {conv.lastMessage.senderName}: {conv.lastMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const MessageView = selectedConversation ? (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <button
          className="lg:hidden"
          onClick={() => setShowMobileList(true)}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex -space-x-2">
          {otherParticipants.slice(0, 2).map((p) => (
            <UserAvatar key={p.uid} profile={p} size="sm" className="ring-2 ring-white" />
          ))}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            {selectedConversation.title ||
              otherParticipants.map((p) => p.displayName).filter(Boolean).join(", ") ||
              "Conversation"}
          </p>
          {selectedConversation.type === "announcement" && (
            <p className="text-xs text-amber-600 font-medium">Announcement</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderUid === user?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  isMine
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-900"
                )}
              >
                {!isMine && (
                  <p className="mb-0.5 text-xs font-medium text-emerald-600">{msg.senderName}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <p
                  className={cn(
                    "mt-0.5 text-right text-[10px]",
                    isMine ? "text-emerald-200" : "text-slate-400"
                  )}
                >
                  {msg.createdAt
                    ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString("en-KE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="hidden h-full items-center justify-center lg:flex">
      <EmptyState
        icon={<MessageSquare className="h-12 w-12" />}
        title="Select a conversation"
        description="Choose a conversation from the left or start a new one"
      />
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full border-r border-slate-200 lg:w-72",
          showMobileList ? "block" : "hidden lg:block"
        )}
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100%-53px)]">
          {ConversationList}
        </div>
      </div>

      {/* Message view */}
      <div
        className={cn(
          "flex-1",
          showMobileList ? "hidden lg:flex" : "flex"
        )}
      >
        {MessageView}
      </div>
    </div>
  );
}
