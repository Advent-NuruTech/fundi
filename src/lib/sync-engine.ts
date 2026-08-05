import { supabase } from "@/lib/supabase";
import { transformKeysToSnake } from "@/lib/case-utils";
import {
  getLocalDB,
  getSyncQueueSize,
  setAppState,
  markCachedRecordSynced,
  removeCachedRecord,
  patchCachedRecord,
} from "@/lib/local-db";

const COLLECTION_TABLE_MAP: Record<string, string> = {
  orders: "orders",
  order_items: "order_items",
  order_item_material_usage: "order_item_material_usage",
  customers: "customers",
  inventory_materials: "inventory_materials",
  stock_movements: "stock_movements",
  suppliers: "suppliers",
  purchase_orders: "purchase_orders",
  payments: "payments",
  notifications: "notifications",
  conversations: "conversations",
  units: "inventory_units",
  categories: "inventory_categories",
  consumption_reports: "consumption_reports",
  sms_logs: "sms_logs",
  expenses: "expenses",
  withdrawals: "withdrawals",
  transactions: "transactions",
  employees: "employees",
  members: "business_members",
  messages: "messages",
  invitations: "employee_invitations",
  images: "images",
  users: "profiles",
  order_members: "order_members",
  order_member_garments: "order_member_garments",
  production_stages: "production_stages",
  delivery_partners: "delivery_partners",
  order_returns: "order_returns",
  order_cancellations: "order_cancellations",
};

// Child tables keyed by a parent row rather than a business — the sync engine
// must not inject business_id into their payloads.
const TABLES_WITHOUT_BUSINESS_ID = new Set([
  "order_garments",
  "order_images",
  "order_fitting_records",
  "order_material_usage",
  "customer_measurements",
  "inventory_material_images",
  "order_members",
  "order_member_garments",
  "order_items",
  "order_item_material_usage",
]);

// Conflict targets for idempotent replays (default is the primary key `id`).
const ON_CONFLICT_TARGET: Record<string, string> = {
  order_images: "order_id,image_id",
};

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

type SyncOperation = "create" | "update" | "delete";
type SyncPriority = "high" | "normal" | "low";

interface SyncEntry {
  id?: number;
  operationId: string;
  businessId: string;
  collection: string;
  operation: SyncOperation;
  docId?: string;
  data?: unknown;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  priority: SyncPriority;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 60000;
const BACKOFF_FACTOR = 2;

function getBackoffDelay(retryCount: number): number {
  const delay = BASE_DELAY * Math.pow(BACKOFF_FACTOR, retryCount);
  return Math.min(delay, MAX_DELAY);
}

function resolveTable(collectionName: string): string {
  return COLLECTION_TABLE_MAP[collectionName] ?? collectionName;
}

async function executeOperation(entry: SyncEntry): Promise<boolean> {
  const { businessId, collection: collectionName, operation, docId, data } = entry;
  const table = resolveTable(collectionName);

  try {
    switch (operation) {
      case "create": {
        const payload = transformKeysToSnake(data as Record<string, unknown>);
        if (!TABLES_WITHOUT_BUSINESS_ID.has(table)) {
          payload.business_id = businessId;
        }
        // Preserve client-generated UUID so the local cache ID matches the server ID
        if (docId) payload.id = docId;
        // Strip local-only markers before sending to Supabase
        delete payload._local_only;

        // Orders created offline carry a placeholder order number — claim a
        // real one from the per-business counter now that we're online.
        if (payload._needs_order_number) {
          delete payload._needs_order_number;
          const { data: orderNumber, error: rpcError } = await supabase.rpc(
            "get_next_order_number",
            { biz_id: businessId }
          );
          if (rpcError) throw rpcError;
          payload.order_number = orderNumber;
          if (docId) {
            await patchCachedRecord(collectionName, docId, {
              orderNumber: orderNumber as string,
            }).catch(() => {});
          }
        }

        // Upsert so replaying an already-applied create is a no-op instead of
        // a permanent unique-violation failure.
        const { error } = await supabase
          .from(table)
          .upsert([payload], {
            onConflict: ON_CONFLICT_TARGET[table] ?? "id",
            ignoreDuplicates: ON_CONFLICT_TARGET[table] !== undefined,
          });
        if (error && !isDuplicateKeyError(error)) throw error;
        break;
      }
      case "update": {
        if (!docId) throw new Error("docId required for update");
        const payload = transformKeysToSnake(data as Record<string, unknown>, false);
        delete payload._local_only;
        const { error } = await supabase.from(table).update(payload).eq("id", docId);
        if (error) throw error;
        break;
      }
      case "delete": {
        if (!docId) throw new Error("docId required for delete");
        const { error } = await supabase.from(table).delete().eq("id", docId);
        if (error) throw error;
        break;
      }
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    throw new Error(message);
  }
}

// Once an operation has been pushed (or permanently abandoned), reconcile the
// Dexie cache: deletes are removed outright; creates/updates are marked synced
// so future server snapshots may overwrite them — unless another queued
// operation still targets the same document.
async function reconcileCacheAfterSync(entry: SyncEntry): Promise<void> {
  if (!entry.docId) return;
  try {
    if (entry.operation === "delete") {
      await removeCachedRecord(entry.collection, entry.docId);
      return;
    }
    const localDb = getLocalDB();
    const stillPending = await localDb.syncQueue
      .where("collection")
      .equals(entry.collection)
      .and((e) => e.docId === entry.docId && e.id !== entry.id)
      .count();
    if (stillPending === 0) {
      await markCachedRecordSynced(entry.collection, entry.docId);
    }
  } catch {
    // cache reconciliation is best-effort
  }
}

export type SyncEventCallback = (event: {
  type: "sync_start" | "sync_complete" | "sync_error" | "item_synced" | "item_failed";
  operationId?: string;
  collection?: string;
  error?: string;
  remaining?: number;
}) => void;

export interface SyncEngineConfig {
  maxConcurrent?: number;
  onEvent?: SyncEventCallback;
}

export class SyncEngine {
  private syncing = false;
  private destroyed = false;
  private maxConcurrent: number;
  private onEvent?: SyncEventCallback;
  private listeners: Array<() => void> = [];

  constructor(config: SyncEngineConfig = {}) {
    this.maxConcurrent = config.maxConcurrent || 5;
    this.onEvent = config.onEvent;
  }

  private emit(event: Parameters<SyncEventCallback>[0]): void {
    this.onEvent?.(event);
  }

  async startSync(): Promise<{ synced: number; failed: number }> {
    if (this.syncing || this.destroyed) return { synced: 0, failed: 0 };
    this.syncing = true;

    try {
      const localDb = getLocalDB();
      const pending = await localDb.syncQueue.toArray();

      if (pending.length === 0) {
        this.syncing = false;
        return { synced: 0, failed: 0 };
      }

      this.emit({ type: "sync_start", remaining: pending.length });

      let synced = 0;
      let failed = 0;

      // High priority first; within a priority replay in insertion (causal)
      // order so creates land before updates that reference them.
      const priorityRank: Record<SyncPriority, number> = { high: 0, normal: 1, low: 2 };
      const ordered = [...pending].sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          (a.id ?? 0) - (b.id ?? 0)
      );

      for (const entry of ordered) {
        if (this.destroyed) break;

        try {
          await executeOperation(entry);
          await localDb.syncQueue.delete(entry.id!);
          await reconcileCacheAfterSync(entry);
          synced++;
          this.emit({
            type: "item_synced",
            operationId: entry.operationId,
            collection: entry.collection,
            remaining: ordered.length - synced - failed,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sync failed";
          entry.retryCount++;
          entry.lastError = message;
          if (entry.retryCount >= entry.maxRetries) {
            // Abandon the change: drop the queue entry and let server data
            // overwrite the optimistic cache copy on the next snapshot.
            await localDb.syncQueue.delete(entry.id!);
            await reconcileCacheAfterSync(entry);
          } else {
            await localDb.syncQueue.update(entry.id!, {
              retryCount: entry.retryCount,
              lastError: message,
            });
          }
          failed++;
          this.emit({
            type: "item_failed",
            operationId: entry.operationId,
            collection: entry.collection,
            error: message,
            remaining: ordered.length - synced - failed,
          });
        }

        await delay(100);
      }

      await setAppState("last_sync_at", new Date().toISOString());
      this.emit({ type: "sync_complete", remaining: 0 });
      return { synced, failed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync engine error";
      this.emit({ type: "sync_error", error: message });
      return { synced: 0, failed: 0 };
    } finally {
      this.syncing = false;
    }
  }

  async processRetryQueue(): Promise<void> {
    if (this.syncing || this.destroyed) return;
    const localDb = getLocalDB();
    const failed = await localDb.syncQueue
      .where("retryCount")
      .above(0)
      .and((e) => e.retryCount < e.maxRetries)
      .toArray();

    if (failed.length === 0) return;

    for (const entry of failed) {
      if (this.destroyed) break;
      const delayMs = getBackoffDelay(entry.retryCount);
      await delay(delayMs);

      try {
        await executeOperation(entry);
        await localDb.syncQueue.delete(entry.id!);
        await reconcileCacheAfterSync(entry);
      } catch {
        entry.retryCount++;
        await localDb.syncQueue.update(entry.id!, {
          retryCount: entry.retryCount,
          lastError: entry.lastError,
        });
      }
    }
  }

  async getPendingCount(): Promise<number> {
    return getSyncQueueSize();
  }

  addListener(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners = [];
    this.syncing = false;
  }
}

let engineInstance: SyncEngine | null = null;

export function getSyncEngine(config?: SyncEngineConfig): SyncEngine {
  if (!engineInstance) {
    engineInstance = new SyncEngine(config);
  }
  return engineInstance;
}

export function resetSyncEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

const ONLINE_CHECK_INTERVAL = 30000;

export function startBackgroundSync(config?: {
  onEvent?: SyncEventCallback;
}): { engine: SyncEngine; stop: () => void } {
  const engine = getSyncEngine({ onEvent: config?.onEvent });
  let running = true;

  async function tick() {
    if (!running) return;
    try {
      if (typeof navigator === "undefined" || !navigator.onLine) {
        return;
      }
      await engine.startSync();
      await engine.processRetryQueue();
    } catch {
    } finally {
      if (running) {
        setTimeout(tick, ONLINE_CHECK_INTERVAL);
      }
    }
  }

  const handleOnline = () => {
    setTimeout(tick, 500);
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      setTimeout(tick, 1000);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility, { passive: true });
  }

  setTimeout(tick, 2000);

  const stop = () => {
    running = false;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };

  return { engine, stop };
}

export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ("sync" in registration) {
      const syncRegistration = registration as unknown as {
        sync: { register: (tag: string) => Promise<void> };
      };
      await syncRegistration.sync.register("fundiflow-sync");
      return true;
    }
  } catch {
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type { SyncEntry };
