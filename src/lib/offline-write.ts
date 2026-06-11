// Offline-first write helpers.
//
// Every mutation in the service layer follows the same pattern: when the
// device is offline (or the network drops mid-request), the change is applied
// optimistically to the Dexie cache and enqueued in the sync queue. The
// SyncEngine replays queued operations against Supabase once connectivity
// returns, in causal (priority, then FIFO) order.

import {
  cacheLocalRecord,
  patchCachedRecord,
  markRecordDeleted,
  enqueueSyncOperation,
  generateId,
  getCachedCollection,
} from "@/lib/local-db";

export type WritePriority = "high" | "normal" | "low";

const LOCAL_WRITE_EVENT = "fundiflow:local-write";

// Realtime channels are silent while offline, so optimistic local writes
// announce themselves and listeners re-serve the Dexie cache.
export function notifyLocalWrite(collection: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOCAL_WRITE_EVENT, { detail: { collection } })
  );
}

export function onLocalWrite(
  collections: string[],
  callback: () => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ collection: string }>).detail;
    if (detail && collections.includes(detail.collection)) callback();
  };
  window.addEventListener(LOCAL_WRITE_EVENT, handler);
  return () => window.removeEventListener(LOCAL_WRITE_EVENT, handler);
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

// supabase-js surfaces fetch failures either as thrown TypeErrors or as
// PostgREST error objects whose message embeds the fetch failure.
export function isNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  return /failed to fetch|fetch failed|network ?error|load failed|networkrequestfailed|err_internet_disconnected|timeout/i.test(
    message
  );
}

// Run the online path; if the device is offline or the request dies on the
// network, transparently fall back to the queued offline path.
export async function withOfflineFallback<T>(
  online: () => Promise<T>,
  offline: () => Promise<T>
): Promise<T> {
  if (isOffline()) return offline();
  try {
    return await online();
  } catch (error) {
    if (isOffline() || isNetworkError(error)) return offline();
    throw error;
  }
}

// Optimistically create a record locally and queue it for sync.
// Returns the client-generated UUID, which is preserved on the server.
export async function offlineCreate(
  businessId: string,
  collection: string,
  record: Record<string, unknown>,
  priority: WritePriority = "normal"
): Promise<string> {
  const id = (record.id as string | undefined) ?? generateId();
  const now = new Date().toISOString();
  const data = {
    createdAt: now,
    updatedAt: now,
    ...record,
    id,
    _localOnly: true,
  };
  await cacheLocalRecord(collection, id, businessId, data).catch(() => {});
  await enqueueSyncOperation(businessId, collection, "create", data, id, priority);
  notifyLocalWrite(collection);
  return id;
}

// Optimistically patch a cached record and queue the update for sync.
export async function offlineUpdate(
  businessId: string,
  collection: string,
  docId: string,
  patch: Record<string, unknown>,
  priority: WritePriority = "normal"
): Promise<void> {
  const data = { ...patch, updatedAt: new Date().toISOString() };
  await patchCachedRecord(collection, docId, data).catch(() => {});
  await enqueueSyncOperation(businessId, collection, "update", data, docId, priority);
  notifyLocalWrite(collection);
}

// Tombstone a cached record and queue the delete for sync.
export async function offlineDelete(
  businessId: string,
  collection: string,
  docId: string,
  priority: WritePriority = "normal"
): Promise<void> {
  await markRecordDeleted(collection, docId).catch(() => {});
  await enqueueSyncOperation(businessId, collection, "delete", undefined, docId, priority);
  notifyLocalWrite(collection);
}

// Read a single record from the offline cache by id.
export async function getCachedById<T extends { id?: string }>(
  collection: string,
  businessId: string,
  docId: string
): Promise<T | null> {
  const rows = await getCachedCollection<T>(collection, businessId).catch(
    () => [] as T[]
  );
  return rows.find((r) => (r as { id?: string }).id === docId) ?? null;
}
