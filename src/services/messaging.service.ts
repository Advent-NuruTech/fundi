// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// import {
//   addDoc,
//   deleteDoc,
//   doc,
//   getDoc,
//   getDocs,
//   limit,
//   onSnapshot,
//   orderBy,
//   query,
//   serverTimestamp,
//   updateDoc,
//   where,
//   writeBatch,
// } from "firebase/firestore";

// import { db } from "@/lib/firebase";
// import {
//   conversationsCollection,
//   messagesCollection,
// } from "@/services/collections";

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

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// function clean<T>(obj: T): T {
//   return Object.fromEntries(
//     Object.entries(obj as any).filter(
//       ([, v]) => v !== undefined
//     )
//   ) as T;
// }

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function createConversation(input: {
//   businessId: string;
//   participants: string[];
//   participantProfiles: Array<{
//     uid: string;
//     displayName: string;
//     photoURL?: string;
//   }>;
//   type: ConversationType;
//   title?: string;
//   priority?: AnnouncementPriority;
// }) {
//   const ref = await addDoc(
//     conversationsCollection(input.businessId),
//     clean({
//       businessId: input.businessId,
//       participants: input.participants,
//
//       participantProfiles: input.participantProfiles.map((p) =>
//         clean({
//           uid: p.uid,
//           displayName: p.displayName ?? "User",
//           photoURL: p.photoURL || undefined,
//         })
//       ),
//
//       type: input.type,
//       title: input.title ?? "",
//       priority: input.priority ?? "normal",
//
//       pinned: false,
//       createdAt: serverTimestamp(),
//       updatedAt: serverTimestamp(),
//     })
//   );
//
//   return ref.id;
// }
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

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function sendMessage(input: {
//   businessId: string;
//   conversationId: string;
//   senderUid: string;
//   senderName: string;
//   text: string;
//   attachments?: Array<{
//     type: "image" | "file";
//     url: string;
//     name?: string;
//   }>;
// }) {
//   const messageRef = await addDoc(
//     messagesCollection(input.businessId, input.conversationId),
//     clean({
//       conversationId: input.conversationId,
//       businessId: input.businessId,
//       senderUid: input.senderUid,
//       senderName: input.senderName ?? "User",
//       text: input.text,
//
//       attachments: input.attachments ?? [],
//       readBy: [input.senderUid],
//
//       createdAt: serverTimestamp(),
//     })
//   );
//
//   await updateDoc(
//     doc(
//       conversationsCollection(input.businessId),
//       input.conversationId
//     ),
//     clean({
//       lastMessage: clean({
//         messageId: messageRef.id,
//         text: input.text,
//         senderUid: input.senderUid,
//         senderName: input.senderName ?? "User",
//         createdAt: serverTimestamp(),
//       }),
//       updatedAt: serverTimestamp(),
//     })
//   );
//
//   return messageRef.id;
// }
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

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function updateMessage(input: {
//   businessId: string;
//   conversationId: string;
//   messageId: string;
//   senderUid: string;
//   text: string;
// }) {
//   const text = input.text.trim();
//   if (!text) {
//     throw new Error("Message cannot be empty.");
//   }
//
//   const messageRef = doc(
//     messagesCollection(input.businessId, input.conversationId),
//     input.messageId
//   );
//   const snapshot = await getDoc(messageRef);
//   if (!snapshot.exists()) {
//     throw new Error("Message not found.");
//   }
//
//   const message = snapshot.data();
//   if (message.senderUid !== input.senderUid || message.deletedAt) {
//     throw new Error("You can only edit your own active messages.");
//   }
//
//   await updateDoc(messageRef, {
//     text,
//     editedAt: serverTimestamp(),
//   });
//
//   await syncLastMessageAfterChange(input.businessId, input.conversationId);
// }
export async function updateMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
  text: string;
}) {
  return supabaseUpdateMessage(input);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function deleteMessage(input: {
//   businessId: string;
//   conversationId: string;
//   messageId: string;
//   senderUid: string;
// }) {
//   const messageRef = doc(
//     messagesCollection(input.businessId, input.conversationId),
//     input.messageId
//   );
//   const snapshot = await getDoc(messageRef);
//   if (!snapshot.exists()) {
//     return;
//   }
//
//   const message = snapshot.data();
//   if (message.senderUid !== input.senderUid) {
//     throw new Error("You can only delete your own messages.");
//   }
//
//   await updateDoc(messageRef, {
//     text: "",
//     attachments: [],
//     deletedAt: serverTimestamp(),
//     deletedByUid: input.senderUid,
//   });
//
//   await syncLastMessageAfterChange(input.businessId, input.conversationId);
// }
export async function deleteMessage(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  return supabaseDeleteMessage(input);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function deleteMessagePermanently(input: {
//   businessId: string;
//   conversationId: string;
//   messageId: string;
//   senderUid: string;
// }) {
//   const messageRef = doc(
//     messagesCollection(input.businessId, input.conversationId),
//     input.messageId
//   );
//   const snapshot = await getDoc(messageRef);
//   if (!snapshot.exists()) {
//     return;
//   }
//
//   const message = snapshot.data();
//   if (message.senderUid !== input.senderUid) {
//     throw new Error("You can only delete your own messages.");
//   }
//
//   await deleteDoc(messageRef);
//   await syncLastMessageAfterChange(input.businessId, input.conversationId);
// }
export async function deleteMessagePermanently(input: {
  businessId: string;
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  return supabaseDeleteMessagePermanently(input);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// async function syncLastMessageAfterChange(
//   businessId: string,
//   conversationId: string
// ) {
//   const snapshot = await getDocs(
//     query(
//       messagesCollection(businessId, conversationId),
//       orderBy("createdAt", "desc"),
//       limit(1)
//     )
//   );
//
//   const latest = snapshot.docs[0]?.data();
//   await updateDoc(doc(conversationsCollection(businessId), conversationId), {
//     lastMessage: latest
//       ? clean({
//           text: latest.deletedAt
//             ? "Message deleted"
//             : latest.text || (latest.attachments?.length ? "Image" : ""),
//           senderUid: latest.senderUid,
//           senderName: latest.senderName ?? "User",
//           createdAt: latest.createdAt ?? serverTimestamp(),
//         })
//       : null,
//     updatedAt: serverTimestamp(),
//   });
// }

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
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

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export function listenMessages(
//   businessId: string,
//   conversationId: string,
//   callback: (messages: Message[]) => void
// ) {
//   const q = query(
//     messagesCollection(businessId, conversationId),
//     orderBy("createdAt", "asc"),
//     limit(100)
//   );
//
//   return onSnapshot(q, (snapshot) => {
//     callback(
//       snapshot.docs.map((docItem) =>
//         clean({
//           ...docItem.data(),
//           id: docItem.id,
//         }) as Message
//       )
//     );
//   });
// }
export function listenMessages(
  businessId: string,
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  return supabaseListenMessages(businessId, conversationId, callback);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export function listenUnreadMessageCount(
//   businessId: string,
//   uid: string,
//   callback: (count: number) => void
// ) {
//   const q = query(
//     conversationsCollection(businessId),
//     where("participants", "array-contains", uid),
//     orderBy("updatedAt", "desc")
//   );
//
//   return onSnapshot(q, (snapshot) => {
//     let total = 0;
//
//     snapshot.docs.forEach((docItem) => {
//       const data: any = docItem.data();
//
//       if (
//         data?.lastMessage &&
//         data.lastMessage.senderUid !== uid
//       ) {
//         total += 1;
//       }
//     });
//
//     callback(total);
//   });
// }
export function listenUnreadMessageCount(
  businessId: string,
  uid: string,
  callback: (count: number) => void
) {
  return supabaseListenUnreadMessageCount(businessId, uid, callback);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function markConversationRead(
//   businessId: string,
//   conversationId: string,
//   uid: string
// ) {
//   const q = query(
//     messagesCollection(businessId, conversationId),
//     where("readBy", "not-in", [uid])
//   );
//
//   const snapshot = await getDocs(q);
//   const batch = writeBatch(db);
//
//   snapshot.docs.forEach((docItem) => {
//     const data: any = docItem.data();
//
//     batch.update(docItem.ref, {
//       readBy: Array.from(
//         new Set([...(data.readBy || []), uid])
//       ),
//     });
//   });
//
//   await batch.commit();
// }
export async function markConversationRead(
  businessId: string,
  conversationId: string,
  uid: string
) {
  return supabaseMarkConversationRead(businessId, conversationId, uid);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function getUnreadConversationCount(
//   businessId: string,
//   uid: string
// ): Promise<number> {
//   const snapshot = await getDocs(
//     query(
//       conversationsCollection(businessId),
//       where("participants", "array-contains", uid)
//     )
//   );
//
//   let count = 0;
//
//   snapshot.docs.forEach((docItem) => {
//     const data: any = docItem.data();
//
//     if (
//       data?.lastMessage &&
//       data.lastMessage.senderUid !== uid
//     ) {
//       count += 1;
//     }
//   });
//
//   return count;
// }
export async function getUnreadConversationCount(
  businessId: string,
  uid: string
): Promise<number> {
  return supabaseGetUnreadConversationCount(businessId, uid);
}
