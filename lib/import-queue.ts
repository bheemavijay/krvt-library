"use client";

export type QueueItem = {
  id: string;
  provider: "mvlempyr";
  novelId: string;
  status: "pending" | "running" | "completed" | "failed";
  retryCount: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
};

const DB_NAME = "krvt-import-queue";
const QUEUE_STORE = "queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueue(): Promise<QueueItem[]> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readonly");
  const store = tx.objectStore(QUEUE_STORE);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.sort((a: QueueItem, b: QueueItem) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function replaceQueue(queue: QueueItem[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(QUEUE_STORE, "readwrite");
  const store = tx.objectStore(QUEUE_STORE);
  
  await new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  if (queue.length === 0) {
    return;
  }

  await Promise.all(queue.map(item => new Promise<void>((resolve, reject) => {
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  })));
}