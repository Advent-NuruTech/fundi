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
import {
  conversationsCollection,
  messagesCollection,
} from "@/services/collections";

import type {
  Conversation,
  ConversationType,
  Message,
  AnnouncementPriority,
} from "@/types/domain";

/* =========================================================
   🔥 SAFE FIRESTORE SANITIZER (CRITICAL FIX)
========================================================= */
function clean<T>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as any).filter(
      ([, v]) => v !== undefined
    )
  ) as T;
}

/* =========================================================
   CREATE CONVERSATION (FIXED)
========================================================= */
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
  const ref = await addDoc(
    conversationsCollection(input.businessId),
    clean({
      businessId: input.businessId,
      participants: input.participants,

      participantProfiles: input.participantProfiles.map((p) =>
        clean({
          uid: p.uid,
          displayName: p.displayName ?? "User",
          photoURL: p.photoURL ?? null,
        })
      ),

      type: input.type,
      title: input.title ?? "",
      priority: input.priority ?? "normal",

      pinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  return ref.id;
}

/* =========================================================
   SEND MESSAGE (FIXED)
========================================================= */
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
  const messageRef = await addDoc(
    messagesCollection(input.businessId, input.conversationId),
    clean({
      conversationId: input.conversationId,
      businessId: input.businessId,
      senderUid: input.senderUid,
      senderName: input.senderName ?? "User",
      text: input.text,

      attachments: input.attachments ?? [],
      readBy: [input.senderUid],

      createdAt: serverTimestamp(),
    })
  );

  await updateDoc(
    doc(
      conversationsCollection(input.businessId),
      input.conversationId
    ),
    clean({
      lastMessage: clean({
        text: input.text,
        senderUid: input.senderUid,
        senderName: input.senderName ?? "User",
        createdAt: serverTimestamp(),
      }),
      updatedAt: serverTimestamp(),
    })
  );

  return messageRef.id;
}

/* =========================================================
   LISTEN CONVERSATIONS (SAFE)
========================================================= */
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
      snapshot.docs.map((docItem) =>
        clean({
          ...docItem.data(),
          id: docItem.id,
        }) as Conversation
      )
    );
  });
}

/* =========================================================
   LISTEN MESSAGES (SAFE)
========================================================= */
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
      snapshot.docs.map((docItem) =>
        clean({
          ...docItem.data(),
          id: docItem.id,
        }) as Message
      )
    );
  });
}

/* =========================================================
   UNREAD COUNT (SAFE)
========================================================= */
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
      const data: any = docItem.data();

      if (
        data?.lastMessage &&
        data.lastMessage.senderUid !== uid
      ) {
        total += 1;
      }
    });

    callback(total);
  });
}

/* =========================================================
   MARK READ (SAFE)
========================================================= */
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
    const data: any = docItem.data();

    batch.update(docItem.ref, {
      readBy: Array.from(
        new Set([...(data.readBy || []), uid])
      ),
    });
  });

  await batch.commit();
}

/* =========================================================
   UNREAD CONVERSATION COUNT (SAFE)
========================================================= */
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
    const data: any = docItem.data();

    if (
      data?.lastMessage &&
      data.lastMessage.senderUid !== uid
    ) {
      count += 1;
    }
  });

  return count;
}