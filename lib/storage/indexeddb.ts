import type { Novel } from "@/types";
import { normalizeNovelRecord } from "@/lib/novels";

const DB_NAME = "krvt-library";
const STORE = "novels";
const BOOKMARKS_STORE = "bookmarks";
const LIBRARY_UPDATED_EVENT = "library:updated";

type StoredNovelRecord = Partial<Novel> & {
  genre?: string | string[];
  rating?: number | string;
  categories?: string[] | string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // Increased version for new store

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        // Use a composite key path for uniqueness per novel chapter
        const store = db.createObjectStore(BOOKMARKS_STORE, { keyPath: ["novelId", "chapterIndex"] });
        // Add index to easily get all bookmarks for a specific novel
        store.createIndex("novelId", "novelId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addNovel(novel: StoredNovelRecord) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  return new Promise<void>((resolve, reject) => {
    const req = store.put(normalizeNovelRecord(novel));
    req.onsuccess = () => {
      notifyLibraryUpdated();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export const saveNovel = addNovel;

export async function getAllNovels() {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);

  return new Promise<Novel[]>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const result = req.result as StoredNovelRecord[];
      const normalized = result.map((novel) => {
        try {
          return normalizeNovelRecord(novel);
        } catch (e) {
          console.error("Error normalizing novel", novel, e);
          return null;
        }
      }).filter((novel): novel is Novel => novel !== null);
      resolve(normalized);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getNovel(id: string) {
  if (!id) {
    console.error("❌ getNovel called with invalid id:", id);
    return null;
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);

      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as StoredNovelRecord | null;
        resolve(result ? normalizeNovelRecord(result) : null);
      };
      request.onerror = () => reject(request.error);
    } catch (err) {
      console.error("DB error:", err);
      resolve(null);
    }
  });
}

export async function deleteNovel(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  return new Promise<void>((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => {
      notifyLibraryUpdated();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllNovels() {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  return new Promise<void>((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => {
      notifyLibraryUpdated();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function notifyLibraryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIBRARY_UPDATED_EVENT));
  }
}

// --- BOOKMARKS API ---

export type Bookmark = {
  novelId: string;
  chapterIndex: number;
  createdAt: number;
};

export async function addBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
      const store = tx.objectStore(BOOKMARKS_STORE);

      const bookmark: Bookmark = {
        novelId,
        chapterIndex,
        createdAt: Date.now(),
      };

      const request = store.put(bookmark);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (err) {
      console.error("DB error adding bookmark:", err);
      reject(err);
    }
  });
}

export async function removeBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    try {
      const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
      const store = tx.objectStore(BOOKMARKS_STORE);

      const request = store.delete([novelId, chapterIndex]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (err) {
      console.error("DB error removing bookmark:", err);
      reject(err);
    }
  });
}

export async function getBookmarks(novelId: string): Promise<Bookmark[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(BOOKMARKS_STORE, "readonly");
      const store = tx.objectStore(BOOKMARKS_STORE);
      const index = store.index("novelId");

      const request = index.getAll(novelId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (err) {
      console.error("DB error getting bookmarks:", err);
      resolve([]);
    }
  });
}
