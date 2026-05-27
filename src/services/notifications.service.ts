import {
  addDoc,
  collectionGroup,
  deleteDoc,
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
import { notificationsCollection } from "@/services/collections";
import type { Notification, NotificationType } from "@/types/domain";

export async function createNotification(input: {
  businessId: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, string>;
}) {
  const ref = await addDoc(notificationsCollection(input.businessId), {
    businessId: input.businessId,
    recipientUid: input.recipientUid,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? "",
    read: false,
    archived: false,
    metadata: input.metadata ?? {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createNotificationForAllMembers(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUid?: string
) {
  const { fetchMembers } = await import("@/services/firestore.service");
  const members = await fetchMembers(businessId);

  const batch = writeBatch(db);
  const ref = notificationsCollection(businessId);

  for (const member of members) {
    if (member.uid === excludeUid) continue;
    if (!member.active) continue;
    const docRef = doc(ref);
    batch.set(docRef, {
      businessId,
      recipientUid: member.uid,
      type,
      title,
      message,
      link: link ?? "",
      read: false,
      archived: false,
      metadata: {},
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export function listenNotifications(
  businessId: string,
  recipientUid: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    notificationsCollection(businessId),
    where("recipientUid", "==", recipientUid),
    where("archived", "==", false),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((docItem) => ({ ...docItem.data(), id: docItem.id } as unknown as Notification))
    );
  });
}

export function listenUnreadCount(
  businessId: string,
  recipientUid: string,
  callback: (count: number) => void
) {
  const q = query(
    notificationsCollection(businessId),
    where("recipientUid", "==", recipientUid),
    where("read", "==", false),
    where("archived", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

export async function markNotificationRead(businessId: string, notificationId: string) {
  await updateDoc(doc(notificationsCollection(businessId), notificationId), {
    read: true,
  });
}

export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
  const q = query(
    notificationsCollection(businessId),
    where("recipientUid", "==", recipientUid),
    where("read", "==", false),
    where("archived", "==", false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docItem) => {
    batch.update(docItem.ref, { read: true });
  });
  await batch.commit();
}

export async function archiveNotification(businessId: string, notificationId: string) {
  await updateDoc(doc(notificationsCollection(businessId), notificationId), {
    archived: true,
  });
}

export async function deleteNotification(businessId: string, notificationId: string) {
  await deleteDoc(doc(notificationsCollection(businessId), notificationId));
}

export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
  const q = query(
    notificationsCollection(businessId),
    where("recipientUid", "==", recipientUid),
    where("archived", "==", false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docItem) => {
    batch.update(docItem.ref, { archived: true });
  });
  await batch.commit();
}

export async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const q = query(
    collectionGroup(db, "notifications"),
    where("createdAt", "<", thirtyDaysAgo)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((docItem) => {
    batch.delete(docItem.ref);
  });
  await batch.commit();
}
