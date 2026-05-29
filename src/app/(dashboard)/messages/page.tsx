"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  listenConversations,
  sendMessage,
  listenMessages,
  createConversation,
} from "@/services/messaging.service";
import { listenMembers } from "@/services/firestore.service";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
  UserPlus,
} from "lucide-react";
import type { Conversation, Message, UserProfile } from "@/types/domain";

export default function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversations
  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    return listenConversations(user.businessId, user.uid, setConversations);
  }, [user?.businessId, user?.uid]);

  // Members
  useEffect(() => {
    if (!user?.businessId) return;
    return listenMembers(user.businessId, setMembers);
  }, [user?.businessId]);

  // Messages
  useEffect(() => {
    if (!selectedConv || !user?.businessId) return;
    return listenMessages(user.businessId, selectedConv, setMessages);
  }, [selectedConv, user?.businessId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
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
    } finally {
      setSending(false);
    }
  }, [text, user, selectedConv, sending]);

  // Create conversation from member
  const startConversation = async (member: UserProfile) => {
    if (!user?.businessId || !user?.uid || creating) return;

    setCreating(true);
    try {
      const convId = await createConversation({
        businessId: user.businessId,
        participants: [user.uid, member.uid],
        participantProfiles: [
          {
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          member,
        ],
      });

      setSelectedConv(convId);
      setShowMobileList(false);
    } catch (err) {
      console.error("Failed to create conversation", err);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConv
  );

  const otherParticipants =
    selectedConversation?.participantProfiles.filter(
      (p) => p.uid !== user?.uid
    ) || [];

  // ---------------- CONVERSATION LIST ----------------
  const ConversationList = (
    <div className="divide-y divide-slate-100">
      {conversations.length > 0 ? (
        conversations.map((conv) => {
          const other = conv.participantProfiles.filter(
            (p) => p.uid !== user?.uid
          );

          const title =
            conv.title ||
            other.map((p) => p.displayName).filter(Boolean).join(", ") ||
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
                    <UserAvatar
                      key={p.uid}
                      profile={p}
                      size="sm"
                      className="ring-2 ring-white"
                    />
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {title}
                  </p>

                  {conv.lastMessage && (
                    <p className="truncate text-xs text-slate-500">
                      {conv.lastMessage.senderName}:{" "}
                      {conv.lastMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })
      ) : (
        <div className="p-3 space-y-3">
          <EmptyState
            icon={<MessageSquare className="h-8 w-8" />}
            title="No conversations yet"
            description="Start a chat with a team member"
          />

          <div className="space-y-2">
            {members
              .filter((m) => m.uid !== user?.uid)
              .map((member) => (
                <button
                  key={member.uid}
                  onClick={() => startConversation(member)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition"
                >
                  <UserAvatar profile={member} size="sm" />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Tap to start chat
                    </p>
                  </div>

                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  // ---------------- MESSAGE VIEW ----------------
  const MessageView = selectedConversation ? (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          className="lg:hidden"
          onClick={() => setShowMobileList(true)}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <p className="text-sm font-medium text-slate-900">
            {selectedConversation.title ||
              otherParticipants
                .map((p) => p.displayName)
                .filter(Boolean)
                .join(", ") ||
              "Conversation"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderUid === user?.uid;

            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    isMine
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  )}
                >
                  {!isMine && (
                    <p className="text-xs font-medium text-emerald-600 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}

                  <p className="whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

                  <p className="text-[10px] text-right opacity-60 mt-1">
                    {msg.createdAt
                      ? new Date(
                          msg.createdAt.seconds * 1000
                        ).toLocaleTimeString("en-KE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  ) : (
    <div className="hidden lg:flex h-full items-center justify-center">
      <EmptyState
        icon={<MessageSquare className="h-10 w-10" />}
        title="Select a conversation"
        description="Choose a chat or start a new one"
      />
    </div>
  );

  // ---------------- ROOT ----------------
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-2xl border bg-white">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full lg:w-72 border-r",
          showMobileList ? "block" : "hidden lg:block"
        )}
      >
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Messages</h2>
        </div>

        <div className="h-[calc(100%-53px)] overflow-y-auto">
          {ConversationList}
        </div>
      </div>

      {/* Chat */}
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