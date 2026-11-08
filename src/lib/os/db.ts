/**
 * Small IndexedDB key/value store used by WindOS for the persistent virtual
 * filesystem, restore points and backups. Falls back to memory when the
 * browser blocks IndexedDB (private mode with strict settings, etc.).
 */

const DB_NAME = "windos-store";
const STORE = "kv";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, unknown>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return (memory.get(key) as T) ?? null;
  try {
    return await new Promise<T | null>((resolve) => {
      const req = tx(db, "readonly").get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve((memory.get(key) as T) ?? null);
    });
  } catch {
    return (memory.get(key) as T) ?? null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  memory.set(key, value);
  const db = await openDb();
  if (!db) return false;
  try {
    return await new Promise<boolean>((resolve) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).put(value, key);
      t.oncomplete = () => resolve(true);
      t.onerror = () => resolve(false);
      t.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function kvDel(key: string): Promise<void> {
  memory.delete(key);
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).delete(key);
      t.oncomplete = () => resolve();
      t.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export async function kvKeys(): Promise<string[]> {
  const db = await openDb();
  if (!db) return [...memory.keys()];
  try {
    return await new Promise<string[]>((resolve) => {
      const req = tx(db, "readonly").getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) ?? []);
      req.onerror = () => resolve([...memory.keys()]);
    });
  } catch {
    return [...memory.keys()];
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number }> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    }
  } catch {
    /* ignore */
  }
  return { usage: 0, quota: 0 };
}

/** Lightweight integrity checksum (FNV-1a, 32-bit) for backup verification. */
export function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
