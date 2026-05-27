import {
  addDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { conversationsCollection, messagesCollection } from "@/services/collections";
import type { Conversation, ConversationType, Message, AnnouncementPriority } from "@/types/domain";

export async function createConversation(input: {
  businessId: string;
  participants: string[];
  participantProfiles: Array<{ uid: string; displayName: string; photoURL?: string }>;
  type: ConversationType;
  title?: string;
  priority?: AnnouncementPriority;
}) {
  const ref = await addDoc(conversationsCollection(input.businessId), {
    businessId: input.businessId,
    participants: input.participants,
    participantProfiles: input.participantProfiles,
    type: input.type,
    title: input.title ?? "",
    priority: input.priority ?? "normal",
    pinned: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(input: {
  businessId: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  text: string;
  attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>;
}) {
  const messageRef = await addDoc(messagesCollection(input.businessId, input.conversationId), {
    conversationId: input.conversationId,
    businessId: input.businessId,
    senderUid: input.senderUid,
    senderName: input.senderName,
    text: input.text,
    attachments: input.attachments ?? [],
    readBy: [input.senderUid],
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(conversationsCollection(input.businessId), input.conversationId), {
    lastMessage: {
      text: input.text,
      senderUid: input.senderUid,
      senderName: input.senderName,
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  return messageRef.id;
}

export function listenConversations(
  businessId: string,
  uid: string,
  callback: (conversations: Conversation[]) => void
) {
  const q = query(
    conversationsCollection(businessId),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id } as unknown as Conversation))
    );
  });
}

export function listenMessages(
  businessId: string,
  conversationId: string,
  callback: (messages: Message[]) => void
) {
  const q = query(
    messagesCollection(businessId, conversationId),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id } as unknown as Message))
    );
  });
}

export function listenUnreadMessageCount(
  businessId: string,
  uid: string,
  callback: (count: number) => void
) {
  const q = query(
    conversationsCollection(businessId),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    let total = 0;
    snapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      const lastMsg = data.lastMessage;
      if (lastMsg && lastMsg.senderUid !== uid) {
        total += 1;
      }
    });
    callback(total);
  });
}

export async function markConversationRead(
  businessId: string,
  conversationId: string,
  uid: string
) {
  const q = query(
    messagesCollection(businessId, conversationId),
    where("readBy", "not-in", [uid])
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docItem) => {
    batch.update(docItem.ref, {
      readBy: [...(docItem.data().readBy || []), uid],
    });
  });
  await batch.commit();
}

export async function getUnreadConversationCount(
  businessId: string,
  uid: string
): Promise<number> {
  const snapshot = await getDocs(
    query(
      conversationsCollection(businessId),
      where("participants", "array-contains", uid)
    )
  );
  let count = 0;
  snapshot.docs.forEach((docItem) => {
    const data = docItem.data();
    if (data.lastMessage && data.lastMessage.senderUid !== uid) {
      count += 1;
    }
  });
  return count;
}
