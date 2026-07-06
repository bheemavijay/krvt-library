// TODO: [KRVT-ARCH-V2] This file manages the IndexedDB connection and schema.

const DB_NAME = "krvt-library";
const DB_VERSION = 3;

export const NOVELS_STORE = "novels";
export const CHAPTERS_STORE = "chapters";
export const BOOKMARKS_STORE = "bookmarks";

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(NOVELS_STORE)) {
        db.createObjectStore(NOVELS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        const chapterStore = db.createObjectStore(CHAPTERS_STORE, {
          keyPath: ["novelId", "chapterIndex"],
        });
        chapterStore.createIndex("novelId", "novelId", { unique: false });
      }

      if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        const store = db.createObjectStore(BOOKMARKS_STORE, {
          keyPath: ["novelId", "chapterIndex"],
        });
        store.createIndex("novelId", "novelId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
