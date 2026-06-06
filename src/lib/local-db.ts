import Dexie, { type Table } from "dexie";

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncQueueItem {
  id?: number;
  operationId: string;
  businessId: string;
  collection: string;
  operation: "create" | "update" | "delete";
  docId?: string;
  data?: unknown;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: "high" | "normal" | "low";
}

export interface Draft {
  id?: number;
  key: string;
  businessId: string;
  type: string;
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface CachedRecord {
  id?: number;
  collection: string;
  docId: string;
  businessId: string;
  data: unknown;
  synced: boolean;
  version: number;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface PendingOperation {
  id?: number;
  operationId: string;
  businessId: string;
  collection: string;
  docId: string;
  operation: "create" | "update" | "delete";
  data: unknown;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  syncStatus: SyncStatus;
}

class FundiFlowDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  drafts!: Table<Draft, number>;
  appState!: Table<AppState, string>;
  records!: Table<CachedRecord, number>;
  pendingOps!: Table<PendingOperation, number>;

  constructor() {
    super("FundiFlowDB");

    this.version(1).stores({
      syncQueue: "++id, operationId, businessId, collection, priority, createdAt",
      drafts: "++id, key, businessId, type, updatedAt",
      appState: "key, updatedAt",
      records: "++id, [collection+docId], [collection+businessId], docId, businessId, synced",
      pendingOps: "++id, operationId, businessId, collection, syncStatus, createdAt",
    });
  }
}

let dbInstance: FundiFlowDB | null = null;

export function getLocalDB(): FundiFlowDB {
  if (typeof window === "undefined") {
    throw new Error("local-db cannot be used on the server");
  }
  if (!dbInstance) {
    dbInstance = new FundiFlowDB();
  }
  return dbInstance;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let deviceId = localStorage.getItem("fundiflow_device_id");
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem("fundiflow_device_id", deviceId);
  }
  return deviceId;
}

export async function enqueueSyncOperation(
  businessId: string,
  collection: string,
  operation: "create" | "update" | "delete",
  data?: unknown,
  docId?: string,
  priority: "high" | "normal" | "low" = "normal"
): Promise<string> {
  const db = getLocalDB();
  const operationId = generateId();
  await db.syncQueue.add({
    operationId,
    businessId,
    collection,
    operation,
    docId,
    data,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 5,
    priority,
  });
  return operationId;
}

export async function saveDraft(
  key: string,
  businessId: string,
  type: string,
  data: unknown
): Promise<void> {
  const db = getLocalDB();
  const now = new Date().toISOString();
  await db.drafts.put({
    key,
    businessId,
    type,
    data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getDraft<T>(key: string): Promise<T | null> {
  const db = getLocalDB();
  const draft = await db.drafts.where("key").equals(key).first();
  return draft ? (draft.data as T) : null;
}

export async function deleteDraft(key: string): Promise<void> {
  const db = getLocalDB();
  await db.drafts.where("key").equals(key).delete();
}

export async function setAppState(key: string, value: unknown): Promise<void> {
  const db = getLocalDB();
  await db.appState.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function getAppState<T>(key: string): Promise<T | null> {
  const db = getLocalDB();
  const entry = await db.appState.get(key);
  return entry ? (entry.value as T) : null;
}

export async function cacheRecord(
  collection: string,
  docId: string,
  businessId: string,
  data: unknown
): Promise<void> {
  const db = getLocalDB();
  const deviceId = getDeviceId();
  const existing = await db.records
    .where("[collection+docId]")
    .equals([collection, docId])
    .first();
  const now = new Date().toISOString();
  if (existing) {
    await db.records.update(existing.id!, {
      data,
      synced: true,
      version: (existing.version || 0) + 1,
      updatedAt: now,
      deleted: false,
    });
  } else {
    await db.records.add({
      collection,
      docId,
      businessId,
      data,
      synced: true,
      version: 1,
      deviceId,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    });
  }
}

export async function getCachedRecord<T>(
  collection: string,
  docId: string
): Promise<T | null> {
  const db = getLocalDB();
  const entry = await db.records
    .where("[collection+docId]")
    .equals([collection, docId])
    .first();
  if (!entry || entry.deleted) return null;
  return entry.data as T;
}

export async function getCachedCollection<T>(
  collection: string,
  businessId: string
): Promise<T[]> {
  const db = getLocalDB();
  const entries = await db.records
    .where("[collection+businessId]")
    .equals([collection, businessId])
    .filter((r) => !r.deleted)
    .toArray();
  return entries.map((e) => e.data as T);
}

export async function markRecordDeleted(
  collection: string,
  docId: string
): Promise<void> {
  const db = getLocalDB();
  const entry = await db.records
    .where("[collection+docId]")
    .equals([collection, docId])
    .first();
  if (entry) {
    await db.records.update(entry.id!, { deleted: true, synced: false });
  }
}

export async function getPendingOperations(
  businessId: string,
  collection?: string
): Promise<PendingOperation[]> {
  const db = getLocalDB();
  let query = db.pendingOps
    .where("businessId")
    .equals(businessId)
    .and((op) => op.syncStatus === "pending" || op.syncStatus === "failed");
  if (collection) {
    query = query.and((op) => op.collection === collection);
  }
  return query.toArray();
}

export async function getSyncQueueSize(): Promise<number> {
  const db = getLocalDB();
  return db.syncQueue.count();
}

// Bulk-upsert a whole collection snapshot into the cache.
// items should already be in camelCase with an `id` field.
export async function cacheCollection(
  collection: string,
  businessId: string,
  items: Array<Record<string, unknown>>
): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getLocalDB();
  const deviceId = getDeviceId();
  const now = new Date().toISOString();
  await db.transaction("rw", db.records, async () => {
    for (const item of items) {
      const docId = (item.id ?? item.uid) as string | undefined;
      if (!docId) continue;
      const existing = await db.records
        .where("[collection+docId]")
        .equals([collection, docId])
        .first();
      if (existing) {
        // Never overwrite a local-only (unsynced) record with stale server data
        if (!existing.synced && existing.data && (existing.data as Record<string, unknown>)._localOnly) continue;
        await db.records.update(existing.id!, {
          data: item,
          synced: true,
          version: (existing.version || 0) + 1,
          updatedAt: now,
          deleted: false,
        });
      } else {
        await db.records.add({
          collection,
          docId,
          businessId,
          data: item,
          synced: true,
          version: 1,
          deviceId,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        });
      }
    }
  });
}

// Save a single locally-created record that hasn't synced yet.
export async function cacheLocalRecord(
  collection: string,
  docId: string,
  businessId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getLocalDB();
  const deviceId = getDeviceId();
  const now = new Date().toISOString();
  const existing = await db.records
    .where("[collection+docId]")
    .equals([collection, docId])
    .first();
  if (existing) {
    await db.records.update(existing.id!, { data, synced: false, updatedAt: now, deleted: false });
  } else {
    await db.records.add({
      collection, docId, businessId, data,
      synced: false, version: 1, deviceId,
      createdAt: now, updatedAt: now, deleted: false,
    });
  }
}

export { getDeviceId, generateId };
export default FundiFlowDB;
