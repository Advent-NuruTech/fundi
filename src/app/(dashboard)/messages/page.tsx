"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  listenConversations,
  sendMessage,
  listenMessages,
  createConversation,
  updateMessage,
  deleteMessage,
} from "@/services/messaging.service";
import { listenMembers } from "@/services/firestore.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
import { toast } from "sonner";
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
  Search,
  ImageIcon,
  Pencil,
  Trash2,
  Megaphone,
  X,
  Check,
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
  const [memberSearch, setMemberSearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      console.error("Failed to send message", err);
      toast.error("Message could not be sent");
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
        type: "direct",
      });

      setSelectedConv(convId);
      setShowMobileList(false);
      toast.success("Conversation ready");
    } catch (err) {
      console.error("Failed to create conversation", err);
      toast.error("Could not start conversation");
    } finally {
      setCreating(false);
    }
  };

  const handleImageSend = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.businessId || !selectedConv || uploadingImage) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await uploadImage({ file, businessId: user.businessId, uploadedByUid: user.uid });
      await sendMessage({
        businessId: user.businessId,
        conversationId: selectedConv,
        senderUid: user.uid,
        senderName: user.displayName,
        text: "",
        attachments: [{ type: "image", url: uploaded.url, name: file.name }],
      });
      toast.success("Image sent");
    } catch (err) {
      console.error("Failed to upload image", err);
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isOwner = user?.role === "owner" || user?.roles?.includes("owner");

  const handleAnnouncementSend = async () => {
    if (!announcementText.trim() || !user?.businessId || !user?.uid || sendingAnnouncement || !isOwner) return;

    const activeMembers = members.filter((member) => member.active !== false);
    if (activeMembers.length === 0) {
      toast.error("No employees found for the announcement");
      return;
    }

    setSendingAnnouncement(true);
    try {
      const convId = await createConversation({
        businessId: user.businessId,
        participants: Array.from(new Set(activeMembers.map((member) => member.uid))),
        participantProfiles: activeMembers.map((member) => ({
          uid: member.uid,
          displayName: member.displayName,
          photoURL: member.photoURL,
        })),
        type: "announcement",
        title: "Team announcement",
        priority: "normal",
      });

      await sendMessage({
        businessId: user.businessId,
        conversationId: convId,
        senderUid: user.uid,
        senderName: user.displayName,
        text: announcementText.trim(),
      });

      setSelectedConv(convId);
      setShowMobileList(false);
      setAnnouncementText("");
      setShowAnnouncementForm(false);
      toast.success("Announcement sent to all employees");
    } catch (err) {
      console.error("Failed to send announcement", err);
      toast.error("Could not send announcement");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEditMessage = async () => {
    if (!user?.businessId || !selectedConv || !editingMessageId || !editingText.trim()) return;

    try {
      await updateMessage({
        businessId: user.businessId,
        conversationId: selectedConv,
        messageId: editingMessageId,
        senderUid: user.uid,
        text: editingText.trim(),
      });
      cancelEditMessage();
      toast.success("Message updated");
    } catch (err) {
      console.error("Failed to edit message", err);
      toast.error("Could not edit message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.businessId || !selectedConv) return;
    if (!window.confirm("Delete this message?")) return;

    try {
      await deleteMessage({
        businessId: user.businessId,
        conversationId: selectedConv,
        messageId,
        senderUid: user.uid,
      });
      toast.success("Message deleted");
    } catch (err) {
      console.error("Failed to delete message", err);
      toast.error("Could not delete message");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMembers = members
    .filter((m) => m.uid !== user?.uid)
    .filter((m) =>
      memberSearch
        ? m.displayName?.toLowerCase().includes(memberSearch.toLowerCase())
        : true
    );

  const otherMembersForNew = filteredMembers.filter(
    (m) => !conversations.some((c) => c.participants.includes(m.uid))
  );

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConv
  );

  const otherParticipants =
    selectedConversation?.participantProfiles.filter(
      (p) => p.uid !== user?.uid
    ) || [];

  // ---------------- CONVERSATION LIST ----------------
  const ConversationList = (
    <div className="flex flex-col">
      {/* Search members */}
      <div className="px-3 py-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search members..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {isOwner && (
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
              onClick={() => setShowAnnouncementForm((value) => !value)}
            >
              <Megaphone className="h-4 w-4" />
              Announcement
            </Button>
          </div>
        )}
        {showAnnouncementForm && isOwner && (
          <div className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
            <Input
              value={announcementText}
              onChange={(event) => setAnnouncementText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAnnouncementSend();
                }
              }}
              placeholder="Message all employees..."
              className="bg-white"
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={handleAnnouncementSend}
              disabled={!announcementText.trim() || sendingAnnouncement}
            >
              {sendingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send to all"}
            </Button>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {conversations.length > 0 && conversations.map((conv) => {
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
        })}

        {/* New conversation starters */}
        {otherMembersForNew.length > 0 && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Start a conversation
            </p>
            <div className="space-y-1">
              {otherMembersForNew.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => startConversation(member)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition text-left"
                >
                  <UserAvatar profile={member} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-slate-500">Start chat</p>
                  </div>
                  {creating && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && otherMembersForNew.length === 0 && filteredMembers.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No conversations yet"
              description="No other members found to start a chat with"
            />
          </div>
        )}

        {conversations.length === 0 && otherMembersForNew.length === 0 && filteredMembers.length > 0 && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              Start a conversation
            </p>
            <div className="space-y-1">
              {filteredMembers.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => startConversation(member)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition text-left"
                >
                  <UserAvatar profile={member} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-slate-500">Start chat</p>
                  </div>
                  {creating && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ---------------- MESSAGE VIEW ----------------
  const MessageView = selectedConversation ? (
    <div className="flex h-full w-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                className={cn("group flex w-full", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[min(82%,40rem)] rounded-2xl px-4 py-2 text-sm",
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

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1 mb-1">
                      {msg.attachments.map((att, i) =>
                        att.type === "image" ? (
                          <img
                            key={i}
                            src={att.url}
                            alt={att.name || "Image"}
                            className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                            onClick={() => window.open(att.url, "_blank")}
                          />
                        ) : null
                      )}
                    </div>
                  )}

                  {editingMessageId === msg.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveEditMessage();
                          }
                          if (event.key === "Escape") {
                            cancelEditMessage();
                          }
                        }}
                        className="h-8 bg-white text-slate-900"
                      />
                      <button type="button" onClick={saveEditMessage} className="opacity-80 hover:opacity-100">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={cancelEditMessage} className="opacity-80 hover:opacity-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : msg.text && (
                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60">
                    {isMine && editingMessageId !== msg.id && (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {msg.text && (
                          <button type="button" onClick={() => startEditMessage(msg)} aria-label="Edit message">
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" onClick={() => handleDeleteMessage(msg.id)} aria-label="Delete message">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <span>
                      {msg.createdAt
                        ? new Date(
                            msg.createdAt.seconds * 1000
                          ).toLocaleTimeString("en-KE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 flex gap-2 shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSend}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || !selectedConv}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="shrink-0"
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
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border bg-white">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full lg:w-72 border-r flex flex-col",
          showMobileList ? "block" : "hidden lg:block"
        )}
      >
        <div className="px-4 py-3 border-b shrink-0">
          <h2 className="text-sm font-semibold">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ConversationList}
        </div>
      </div>

      {/* Chat */}
      <div
        className={cn(
          "min-w-0 flex-1",
          showMobileList ? "hidden lg:flex" : "flex"
        )}
      >
        {MessageView}
      </div>
    </div>
  );
}
