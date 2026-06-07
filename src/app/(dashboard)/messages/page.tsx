"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useAuth } from "@/features/auth/components/auth-context";
import {
  listenConversations,
  sendMessage,
  listenMessages,
  createConversation,
  updateMessage,
  deleteMessage,
  markConversationRead,
} from "@/services/messaging.service";
import { listenMembers } from "@/services/firestore.service";
import { uploadImage } from "@/services/cloudinary/upload.service";
import { toast } from "sonner";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Send,
  Loader2,
  Search,
  ImageIcon,
  Pencil,
  Trash2,
  Megaphone,
  X,
  Check,
  Plus,
  ChevronLeft,
} from "lucide-react";
import type { Conversation, Message, UserProfile } from "@/types/domain";

// ─── Image lightbox ──────────────────────────────────────────────────────────

function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, images.length, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 rounded-full bg-white/10 p-1.5 text-white hover:bg-white/25 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
        />
        {images.length > 1 && (
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => onNavigate((index - 1 + images.length) % images.length)}
              className="rounded-xl bg-white/15 px-5 py-2 text-white hover:bg-white/25 transition-colors text-sm"
            >
              ←
            </button>
            <span className="text-white/70 text-sm tabular-nums">
              {index + 1} / {images.length}
            </span>
            <button
              onClick={() => onNavigate((index + 1) % images.length)}
              className="rounded-xl bg-white/15 px-5 py-2 text-white hover:bg-white/25 transition-colors text-sm"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shouldShowDivider(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].createdAt);
  const curr = new Date(messages[index].createdAt);
  return prev.toDateString() !== curr.toDateString();
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Read-state helpers (localStorage) ───────────────────────────────────────

const READ_KEY = "fundiflow_conv_read";

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

function isConvUnread(conv: Conversation, uid: string, readMap: Record<string, string>): boolean {
  if (!conv.lastMessage) return false;
  if (conv.lastMessage.senderUid === uid) return false;
  const lastRead = readMap[conv.id];
  if (!lastRead) return true;
  return new Date(conv.updatedAt) > new Date(lastRead);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [readMap, setReadMap] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReadMap(loadReadMap());
  }, []);

  useEffect(() => {
    if (!user?.businessId || !user?.uid) return;
    return listenConversations(user.businessId, user.uid, setConversations);
  }, [user?.businessId, user?.uid]);

  useEffect(() => {
    if (!user?.businessId) return;
    return listenMembers(user.businessId, setMembers);
  }, [user?.businessId]);

  useEffect(() => {
    if (!selectedConvId || !user?.businessId) return;
    return listenMessages(user.businessId, selectedConvId, setMessages);
  }, [selectedConvId, user?.businessId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = useCallback(
    async (convId: string) => {
      setSelectedConvId(convId);
      setShowMobileList(false);
      setShowNewChat(false);
      setEditingId(null);
      saveRead(convId);
      setReadMap(loadReadMap());
      if (user?.businessId && user?.uid) {
        markConversationRead(user.businessId, convId, user.uid).catch(() => {});
      }
    },
    [user?.businessId, user?.uid]
  );

  const handleSend = useCallback(async () => {
    if (!text.trim() || !user?.businessId || !selectedConvId || sending) return;
    setSending(true);
    try {
      await sendMessage({
        businessId: user.businessId,
        conversationId: selectedConvId,
        senderUid: user.uid,
        senderName: user.displayName,
        text: text.trim(),
      });
      setText("");
    } catch {
      toast.error("Message could not be sent");
    } finally {
      setSending(false);
    }
  }, [text, user, selectedConvId, sending]);

  const startDirectConversation = async (member: UserProfile) => {
    if (!user?.businessId || !user?.uid || creating) return;
    const existing = conversations.find(
      (c) =>
        c.type === "direct" &&
        c.participants.includes(member.uid) &&
        c.participants.includes(user.uid)
    );
    if (existing) {
      openConversation(existing.id);
      return;
    }
    setCreating(true);
    try {
      const convId = await createConversation({
        businessId: user.businessId,
        participants: [user.uid, member.uid],
        participantProfiles: [
          { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
          { uid: member.uid, displayName: member.displayName, photoURL: member.photoURL },
        ],
        type: "direct",
      });
      openConversation(convId);
    } catch {
      toast.error("Could not start conversation");
    } finally {
      setCreating(false);
    }
  };

  const openAnnouncementChannel = async () => {
    if (!user?.businessId || !user?.uid) return;
    const existing = conversations.find((c) => c.type === "announcement");
    if (existing) {
      openConversation(existing.id);
      return;
    }
    const activeMembers = members.filter((m) => m.active !== false);
    if (activeMembers.length === 0) {
      toast.error("No active employees found");
      return;
    }
    setCreating(true);
    try {
      const convId = await createConversation({
        businessId: user.businessId,
        participants: Array.from(new Set([user.uid, ...activeMembers.map((m) => m.uid)])),
        participantProfiles: [
          { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL },
          ...activeMembers.map((m) => ({
            uid: m.uid,
            displayName: m.displayName,
            photoURL: m.photoURL,
          })),
        ],
        type: "announcement",
        title: "Team Announcements",
        priority: "normal",
      });
      openConversation(convId);
    } catch {
      toast.error("Could not create announcement channel");
    } finally {
      setCreating(false);
    }
  };

  const handleImageSend = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.businessId || !selectedConvId || uploadingImage) return;
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
      const uploaded = await uploadImage({
        file,
        businessId: user.businessId,
        uploadedByUid: user.uid,
      });
      await sendMessage({
        businessId: user.businessId,
        conversationId: selectedConvId,
        senderUid: user.uid,
        senderName: user.displayName,
        text: "",
        attachments: [{ type: "image", url: uploaded.url, name: file.name }],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveEdit = async () => {
    if (!user?.businessId || !selectedConvId || !editingId || !editingText.trim()) return;
    try {
      await updateMessage({
        businessId: user.businessId,
        conversationId: selectedConvId,
        messageId: editingId,
        senderUid: user.uid,
        text: editingText.trim(),
      });
      setEditingId(null);
      setEditingText("");
    } catch {
      toast.error("Could not edit message");
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!user?.businessId || !selectedConvId) return;
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteMessage({
        businessId: user.businessId,
        conversationId: selectedConvId,
        messageId,
        senderUid: user.uid,
      });
    } catch {
      toast.error("Could not delete message");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOwner = user?.role === "owner" || user?.roles?.includes("owner");
  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const isAnnouncement = selectedConv?.type === "announcement";
  const otherParticipants =
    selectedConv?.participantProfiles.filter((p) => p.uid !== user?.uid) ?? [];

  const totalUnread = conversations.filter((c) =>
    isConvUnread(c, user?.uid ?? "", readMap)
  ).length;

  const filteredMembers = members
    .filter((m) => m.uid !== user?.uid && m.active !== false)
    .filter((m) =>
      memberSearch
        ? m.displayName?.toLowerCase().includes(memberSearch.toLowerCase())
        : true
    );

  // Collect all images across conversation for lightbox navigation
  const openLightbox = useCallback(
    (clickedUrl: string) => {
      const allUrls = messages.flatMap((m) =>
        (m.attachments ?? [])
          .filter((a) => a.type === "image")
          .map((a) => a.url)
      );
      const idx = allUrls.indexOf(clickedUrl);
      setLightboxImages(allUrls);
      setLightboxIndex(idx >= 0 ? idx : 0);
    },
    [messages]
  );

  // ─── Sidebar ─────────────────────────────────────────────────────────────

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-900 text-base">Messages</h2>
          {totalUnread > 0 && (
            <span className="h-5 min-w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1.5 flex items-center justify-center">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isOwner && (
            <button
              onClick={openAnnouncementChannel}
              disabled={creating}
              title="Team Announcements"
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-amber-50 transition-colors text-amber-500"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={() => {
              setShowNewChat((v) => !v);
              setMemberSearch("");
            }}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <Plus className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={showNewChat ? "Search members..." : "Search conversations..."}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-slate-50 border-0 rounded-full focus:bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {showNewChat ? (
          <div>
            <p className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              New conversation
            </p>
            {filteredMembers.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-slate-400">No members found</p>
            )}
            {filteredMembers.map((member) => (
              <button
                key={member.uid}
                onClick={() => startDirectConversation(member)}
                disabled={creating}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
              >
                <UserAvatar profile={member} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {member.displayName}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {member.role?.replace(/_/g, " ")}
                  </p>
                </div>
                {creating && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div>
            {conversations.length === 0 && (
              <div className="p-8">
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="No conversations"
                  description="Tap + to start a chat"
                />
              </div>
            )}
            {conversations
              .filter((c) =>
                memberSearch
                  ? (c.title ?? "")
                      .toLowerCase()
                      .includes(memberSearch.toLowerCase()) ||
                    c.participantProfiles.some((p) =>
                      p.displayName?.toLowerCase().includes(memberSearch.toLowerCase())
                    )
                  : true
              )
              .map((conv) => {
                const other = conv.participantProfiles.filter(
                  (p) => p.uid !== user?.uid
                );
                const title =
                  conv.title ||
                  other
                    .map((p) => p.displayName)
                    .filter(Boolean)
                    .join(", ") ||
                  "Conversation";
                const unread = isConvUnread(conv, user?.uid ?? "", readMap);
                const isSelected = selectedConvId === conv.id;
                const isAnnouncementConv = conv.type === "announcement";

                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={cn(
                      "w-full px-3 py-3 text-left transition-colors hover:bg-slate-50 border-b border-slate-50",
                      isSelected && "bg-emerald-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {isAnnouncementConv ? (
                          <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center">
                            <Megaphone className="h-5 w-5 text-amber-500" />
                          </div>
                        ) : other.length === 1 ? (
                          <div className="h-11 w-11">
                            <UserAvatar
                              profile={other[0]}
                              size="md"
                              className="h-11 w-11"
                            />
                          </div>
                        ) : (
                          <div className="flex -space-x-2 h-11">
                            {other.slice(0, 2).map((p) => (
                              <UserAvatar
                                key={p.uid}
                                profile={p}
                                size="sm"
                                className="ring-2 ring-white"
                              />
                            ))}
                          </div>
                        )}
                        {unread && (
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <p
                            className={cn(
                              "truncate text-sm",
                              unread
                                ? "font-bold text-slate-900"
                                : "font-medium text-slate-700"
                            )}
                          >
                            {title}
                          </p>
                          {conv.lastMessage?.createdAt && (
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p
                            className={cn(
                              "truncate text-xs mt-0.5",
                              unread ? "text-slate-600 font-medium" : "text-slate-400"
                            )}
                          >
                            {conv.lastMessage.senderUid === user?.uid ? "You: " : ""}
                            {conv.lastMessage.text || "📷 Image"}
                          </p>
                        )}
                      </div>

                      {unread && (
                        <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Chat view ────────────────────────────────────────────────────────────

  const chatView = selectedConv ? (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0 bg-white shadow-sm">
        <button
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition shrink-0"
          onClick={() => {
            setShowMobileList(true);
            setSelectedConvId(null);
          }}
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>

        <div className="shrink-0">
          {isAnnouncement ? (
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-amber-500" />
            </div>
          ) : otherParticipants.length === 1 ? (
            <UserAvatar profile={otherParticipants[0]} size="md" />
          ) : (
            <div className="flex -space-x-2">
              {otherParticipants.slice(0, 2).map((p) => (
                <UserAvatar key={p.uid} profile={p} size="sm" className="ring-2 ring-white" />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">
            {selectedConv.title ||
              otherParticipants
                .map((p) => p.displayName)
                .filter(Boolean)
                .join(", ") ||
              "Conversation"}
          </p>
          {isAnnouncement ? (
            <p className="text-xs text-amber-500 font-medium">
              Team channel · {selectedConv.participantProfiles.length} members
            </p>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5"
        style={{ background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)" }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No messages yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderUid === user?.uid;
            const showDivider = shouldShowDivider(messages, idx);
            const isEditing = editingId === msg.id;
            const msgImages = (msg.attachments ?? [])
              .filter((a) => a.type === "image")
              .map((a) => a.url);

            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="bg-white text-slate-400 text-[11px] px-3 py-1 rounded-full shadow-sm border border-slate-100 font-medium">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "group flex w-full mb-1",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  {/* Avatar for others in group/announcement */}
                  {!isMine && (isAnnouncement || otherParticipants.length > 1) && (
                    <div className="mr-2 self-end shrink-0 mb-1">
                      <UserAvatar
                        profile={{ displayName: msg.senderName, photoURL: undefined }}
                        size="sm"
                      />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[min(75%,30rem)]",
                      !isMine && !(isAnnouncement || otherParticipants.length > 1) && "ml-1"
                    )}
                  >
                    {!isMine && (isAnnouncement || otherParticipants.length > 1) && (
                      <p className="text-[11px] font-semibold text-emerald-600 ml-1 mb-0.5">
                        {msg.senderName}
                      </p>
                    )}

                    <div
                      className={cn(
                        "relative rounded-2xl px-3.5 py-2.5 shadow-sm text-sm",
                        isMine
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                      )}
                    >
                      {/* Images */}
                      {msgImages.length > 0 && (
                        <div className="space-y-1.5 mb-2">
                          {msgImages.map((url, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              className="block w-full text-left"
                              onClick={() => openLightbox(url)}
                            >
                              <img
                                src={url}
                                alt="Sent image"
                                className="max-w-full rounded-xl max-h-60 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Text or edit input */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                              if (e.key === "Escape") { setEditingId(null); setEditingText(""); }
                            }}
                            className="flex-1 h-7 px-2 rounded-lg bg-white/20 text-white text-sm outline-none border border-white/30 focus:border-white/60 placeholder:text-white/60"
                            autoFocus
                          />
                          <button type="button" onClick={saveEdit} className="hover:opacity-80 shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditingText(""); }}
                            className="hover:opacity-80 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : msg.text ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                      ) : null}

                      {/* Time + actions */}
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1",
                          isMine ? "justify-end text-emerald-200" : "justify-end text-slate-400",
                          "text-[10px]"
                        )}
                      >
                        {isMine && !isEditing && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                            {msg.text && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(msg.id);
                                  setEditingText(msg.text);
                                }}
                                aria-label="Edit message"
                                className="hover:opacity-70"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              aria-label="Delete message"
                              className="hover:opacity-70"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <span>{msg.createdAt ? formatTime(msg.createdAt) : ""}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white px-3 py-3 shrink-0">
        {isAnnouncement && !isOwner && (
          <p className="text-xs text-center text-slate-400 py-2">
            Only the owner can post in the Announcements channel
          </p>
        )}
        {(!isAnnouncement || isOwner) && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSend}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition shrink-0 disabled:opacity-50"
            >
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : (
                <ImageIcon className="h-5 w-5 text-slate-400" />
              )}
            </button>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAnnouncement ? "Write an announcement to your team..." : "Type a message..."
              }
              className="flex-1 h-10 px-4 rounded-full bg-slate-100 border-0 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 transition"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="hidden lg:flex h-full items-center justify-center bg-slate-50">
      <div className="text-center px-6">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-10 w-10 text-emerald-500" />
        </div>
        <h3 className="font-bold text-slate-700 text-lg">Your messages</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
          Select a conversation or tap <span className="font-medium text-slate-500">+</span> to start a new chat
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => {
            setLightboxIndex(null);
            setLightboxImages([]);
          }}
          onNavigate={setLightboxIndex}
        />
      )}

      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border bg-white shadow-sm">
        {/* Sidebar */}
        <div
          className={cn(
            "w-full lg:w-80 border-r flex flex-col shrink-0",
            showMobileList ? "flex" : "hidden lg:flex"
          )}
        >
          {sidebar}
        </div>

        {/* Chat panel */}
        <div
          className={cn(
            "min-w-0 flex-1",
            showMobileList ? "hidden lg:flex" : "flex"
          )}
        >
          {chatView}
        </div>
      </div>
    </>
  );
}
