import {
  createConversation as supabaseCreateConversation,
  sendMessage as supabaseSendMessage,
  updateMessage as supabaseUpdateMessage,
  deleteMessage as supabaseDeleteMessage,
  deleteMessagePermanently as supabaseDeleteMessagePermanently,
  listenConversations as supabaseListenConversations,
  listenMessages as supabaseListenMessages,
  listenUnreadMessageCount as supabaseListenUnreadMessageCount,
  markConversationRead as supabaseMarkConversationRead,
  getUnreadConversationCount as supabaseGetUnreadConversationCount,
} from "@/lib/supabase.service";

import type {
  Conversation,
  ConversationType,
  Message,
  AnnouncementPriority,
} from "@/types/domain";

export async function createConversation(input: {
  businessId: string;
  participants: string[];
  participantProfiles: Array<{
    uid: string;
    displayName: string;
    photoURL?: string;
  }>;
  type: ConversationType;
  title?: string;
  priority?: AnnouncementPriority;
}) {
  return supabaseCreateConversation(input);
}

export async function sendMessage(input: {
  businessId: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  text: string;
  attachments?: Array<{
    type: "image" | "file";
    url: string;
    name?: string;
  }>;
}) {
  return supabaseSendMessage(input);
}

export async function updateMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
  text: string;
}) {
  return supabaseUpdateMessage(input);
}

export async function deleteMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  return supabaseDeleteMessage(input);
}

export async function deleteMessagePermanently(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  return supabaseDeleteMessagePermanently(input);
}

// export function listenConversations(
//   businessId: string,
//   uid: string,
//   callback: (conversations: Conversation[]) => void
// ) {
//   const q = query(
//     conversationsCollection(businessId),
//     where("participants", "array-contains", uid),
//     orderBy("updatedAt", "desc"),
//     limit(30)
//   );
//
//   return onSnapshot(q, (snapshot) => {
//     callback(
//       snapshot.docs.map((docItem) =>
//         clean({
//           ...docItem.data(),
//           id: docItem.id,
//         }) as Conversation
//       )
//     );
//   });
// }
export function listenConversations(
  businessId: string,
  uid: string,
  callback: (conversations: Conversation[]) => void
) {
  return supabaseListenConversations(businessId, uid, callback);
}

export function listenMessages(
  businessId: string,
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  return supabaseListenMessages(businessId, conversationId, callback);
}

export function listenUnreadMessageCount(
  businessId: string,
  uid: string,
  callback: (count: number) => void
) {
  return supabaseListenUnreadMessageCount(businessId, uid, callback);
}

export async function markConversationRead(
  businessId: string,
  conversationId: string,
  uid: string
) {
  return supabaseMarkConversationRead(businessId, conversationId, uid);
}

export async function getUnreadConversationCount(
  businessId: string,
  uid: string
): Promise<number> {
  return supabaseGetUnreadConversationCount(businessId, uid);
}
