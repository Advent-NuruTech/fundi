// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// import {
//   addDoc,
//   collectionGroup,
//   deleteDoc,
//   doc,
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
// import { notificationsCollection } from "@/services/collections";

import {
  createNotification as supabaseCreateNotification,
  createNotificationForAllMembers as supabaseCreateNotificationForAllMembers,
  listenNotifications as supabaseListenNotifications,
  listenUnreadCount as supabaseListenUnreadCount,
  markNotificationRead as supabaseMarkNotificationRead,
  markAllNotificationsRead as supabaseMarkAllNotificationsRead,
  archiveNotification as supabaseArchiveNotification,
  deleteNotification as supabaseDeleteNotification,
  bulkArchiveNotifications as supabaseBulkArchiveNotifications,
  cleanupOldNotifications as supabaseCleanupOldNotifications,
} from "@/lib/supabase.service";

import type { Notification, NotificationType } from "@/types/domain";

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function createNotification(input: {
//   businessId: string;
//   recipientUid: string;
//   type: NotificationType;
//   title: string;
//   message: string;
//   link?: string;
//   metadata?: Record<string, string>;
// }) {
//   const ref = await addDoc(notificationsCollection(input.businessId), {
//     businessId: input.businessId,
//     recipientUid: input.recipientUid,
//     type: input.type,
//     title: input.title,
//     message: input.message,
//     link: input.link ?? "",
//     read: false,
//     archived: false,
//     metadata: input.metadata ?? {},
//     createdAt: serverTimestamp(),
//   });
//   return ref.id;
// }
export async function createNotification(input: {
  businessId: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, string>;
}) {
  return supabaseCreateNotification(input);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function createNotificationForAllMembers(
//   businessId: string,
//   type: NotificationType,
//   title: string,
//   message: string,
//   link?: string,
//   excludeUid?: string
// ) {
//   const { fetchMembers } = await import("@/services/firestore.service");
//   const members = await fetchMembers(businessId);
//
//   const batch = writeBatch(db);
//   const ref = notificationsCollection(businessId);
//
//   for (const member of members) {
//     if (member.uid === excludeUid) continue;
//     if (!member.active) continue;
//     const docRef = doc(ref);
//     batch.set(docRef, {
//       businessId,
//       recipientUid: member.uid,
//       type,
//       title,
//       message,
//       link: link ?? "",
//       read: false,
//       archived: false,
//       metadata: {},
//       createdAt: serverTimestamp(),
//     });
//   }
//
//   await batch.commit();
// }
export async function createNotificationForAllMembers(
  businessId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUid?: string
) {
  return supabaseCreateNotificationForAllMembers(businessId, type, title, message, link, excludeUid);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export function listenNotifications(
//   businessId: string,
//   recipientUid: string,
//   callback: (notifications: Notification[]) => void
// ) {
//   const q = query(
//     notificationsCollection(businessId),
//     where("recipientUid", "==", recipientUid),
//     where("archived", "==", false),
//     orderBy("createdAt", "desc"),
//     limit(50)
//   );
//   return onSnapshot(q, (snapshot) => {
//     const cutoff = Date.now() - 48 * 60 * 60 * 1000;
//     const expired = snapshot.docs.filter((docItem) => {
//       const createdAt = docItem.data().createdAt?.toDate?.();
//       return createdAt && createdAt.getTime() < cutoff;
//     });
//     void Promise.all(expired.map((docItem) => deleteDoc(docItem.ref)));
//     callback(
//       snapshot.docs
//         .filter((docItem) => !expired.includes(docItem))
//         .map((docItem) => ({ ...docItem.data(), id: docItem.id } as unknown as Notification))
//     );
//   });
// }
export function listenNotifications(
  businessId: string,
  recipientUid: string,
  callback: (notifications: Notification[]) => void
) {
  return supabaseListenNotifications(businessId, recipientUid, callback);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export function listenUnreadCount(
//   businessId: string,
//   recipientUid: string,
//   callback: (count: number) => void
// ) {
//   const q = query(
//     notificationsCollection(businessId),
//     where("recipientUid", "==", recipientUid),
//     where("read", "==", false),
//     where("archived", "==", false)
//   );
//   return onSnapshot(q, (snapshot) => {
//     callback(snapshot.size);
//   });
// }
export function listenUnreadCount(
  businessId: string,
  recipientUid: string,
  callback: (count: number) => void
) {
  return supabaseListenUnreadCount(businessId, recipientUid, callback);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function markNotificationRead(businessId: string, notificationId: string) {
//   await updateDoc(doc(notificationsCollection(businessId), notificationId), {
//     read: true,
//   });
// }
export async function markNotificationRead(businessId: string, notificationId: string) {
  return supabaseMarkNotificationRead(businessId, notificationId);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
//   const q = query(
//     notificationsCollection(businessId),
//     where("recipientUid", "==", recipientUid),
//     where("read", "==", false),
//     where("archived", "==", false)
//   );
//   const snapshot = await getDocs(q);
//   const batch = writeBatch(db);
//   snapshot.docs.forEach((docItem) => {
//     batch.update(docItem.ref, { read: true });
//   });
//   await batch.commit();
// }
export async function markAllNotificationsRead(businessId: string, recipientUid: string) {
  return supabaseMarkAllNotificationsRead(businessId, recipientUid);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function archiveNotification(businessId: string, notificationId: string) {
//   await updateDoc(doc(notificationsCollection(businessId), notificationId), {
//     archived: true,
//   });
// }
export async function archiveNotification(businessId: string, notificationId: string) {
  return supabaseArchiveNotification(businessId, notificationId);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function deleteNotification(businessId: string, notificationId: string) {
//   await deleteDoc(doc(notificationsCollection(businessId), notificationId));
// }
export async function deleteNotification(businessId: string, notificationId: string) {
  return supabaseDeleteNotification(businessId, notificationId);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
//   const q = query(
//     notificationsCollection(businessId),
//     where("recipientUid", "==", recipientUid),
//     where("archived", "==", false)
//   );
//   const snapshot = await getDocs(q);
//   const batch = writeBatch(db);
//   snapshot.docs.forEach((docItem) => {
//     batch.update(docItem.ref, { archived: true });
//   });
//   await batch.commit();
// }
export async function bulkArchiveNotifications(businessId: string, recipientUid: string) {
  return supabaseBulkArchiveNotifications(businessId, recipientUid);
}

// 🔴 FIREBASE DISABLED - MIGRATED TO SUPABASE
// export async function cleanupOldNotifications() {
//   const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
//   const q = query(
//     collectionGroup(db, "notifications"),
//     where("createdAt", "<", fortyEightHoursAgo)
//   );
//   const snapshot = await getDocs(q);
//   const batch = writeBatch(db);
//   snapshot.docs.forEach((docItem) => {
//     batch.delete(docItem.ref);
//   });
//   await batch.commit();
// }
export async function cleanupOldNotifications() {
  return supabaseCleanupOldNotifications();
}
