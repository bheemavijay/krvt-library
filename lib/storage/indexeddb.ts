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
  lastChapterIndex?: number;
  chapters?: Array<
    Partial<Novel["chapters"][number]> & {
      url?: string;
      content?: string[] | string;
    }
  >;
};

type StoredChapterRecord = NonNullable<StoredNovelRecord["chapters"]>[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const req = indexedDB.open(DB_NAME, 2);

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
  return saveOrUpdateNovel(novel);
}

export async function saveNovelsBatch(novels: StoredNovelRecord[]) {
  if (!Array.isArray(novels) || novels.length === 0) {
    return 0;
  }

  const existingNovels = await getAllNovels();
  const mergedById = new Map(existingNovels.map((novel) => [novel.id, novel] as const));

  for (const novel of novels) {
    const normalizedIncoming = normalizeNovelRecord(novel);
    const existingNovel = mergedById.get(normalizedIncoming.id) ?? null;
    const mergedNovel = existingNovel
      ? buildMergedNovelRecord(existingNovel, novel)
      : normalizeNovelRecord({
          ...novel,
          ...normalizedIncoming,
          sourceUrl: normalizedIncoming.sourceUrl,
        });
    const mergedNovelId = String(mergedNovel.id ?? normalizedIncoming.id);
    const mergedNovelRecord = normalizeNovelRecord({
      ...mergedNovel,
      id: mergedNovelId,
    });

    mergedById.set(mergedNovelId, mergedNovelRecord);
  }

  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  return new Promise<number>((resolve, reject) => {
    const values = Array.from(mergedById.values());
    let index = 0;

    const writeNext = () => {
      if (index >= values.length) {
        notifyLibraryUpdated();
        resolve(novels.length);
        return;
      }

      const record = values[index] as StoredNovelRecord;
      const normalizedNovel = normalizeNovelRecord(record) as Novel & {
        lastChapterIndex?: number;
      };
      normalizedNovel.lastChapterIndex = Math.max(0, normalizedNovel.chapters.length - 1);

      const req = store.put(normalizedNovel);
      req.onsuccess = () => {
        index += 1;
        writeNext();
      };
      req.onerror = () => reject(req.error);
    };

    writeNext();
  });
}

async function putNovelRecord(novel: StoredNovelRecord) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  return new Promise<void>((resolve, reject) => {
    const normalizedNovel = normalizeNovelRecord(novel) as Novel & {
      lastChapterIndex?: number;
    };
    normalizedNovel.lastChapterIndex = Math.max(0, normalizedNovel.chapters.length - 1);

    const req = store.put(normalizedNovel);
    req.onsuccess = () => {
      notifyLibraryUpdated();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function getChapterUrl(chapter: StoredChapterRecord | undefined) {
  const url = chapter && "url" in chapter ? chapter.url : undefined;
  return typeof url === "string" ? url.trim() : "";
}

function getChapterKey(
  chapter: StoredChapterRecord | undefined,
  fallbackOrder: number
) {
  const chapterUrl = getChapterUrl(chapter);

  // BEST: URL
  if (chapterUrl) {
    return `url:${chapterUrl.toLowerCase()}`;
  }

  // SECOND: explicit order if present
  const order = Number(chapter?.order);
  if (order > 0) {
    return `order:${order}`;
  }

  // LAST fallback: title + index (force uniqueness)
  const title = String(chapter?.title ?? "").trim().toLowerCase();

  return `fallback:${title}:${fallbackOrder}`;
}

function pickPreferredValue<T>(
  incoming: T | undefined | null,
  existing: T | undefined | null
): T | undefined {
  if (typeof incoming === "string") {
    return incoming.trim() ? incoming : existing ?? undefined;
  }

  if (Array.isArray(incoming)) {
    return incoming.length ? incoming : existing ?? undefined;
  }

  return incoming ?? existing ?? undefined;
}

function mergeChapters(
  existingChapters: StoredNovelRecord["chapters"],
  incomingChapters: StoredNovelRecord["chapters"],
) {
  const mergedByKey = new Map<string, StoredChapterRecord>();
  const ordered = [
    ...(Array.isArray(existingChapters) ? existingChapters : []),
    ...(Array.isArray(incomingChapters) ? incomingChapters : []),
  ];

  ordered.forEach((chapter, index) => {
    const key = getChapterKey(chapter, index + 1);
    const current = mergedByKey.get(key);

    if (!current) {
      mergedByKey.set(key, chapter);
      return;
    }

const currentContent = current?.content as unknown;
let currentLength = 0;

if (Array.isArray(currentContent)) {
  currentLength = currentContent.length;
} else if (typeof currentContent === "string") {
  currentLength = currentContent.length;
}

const nextContent = chapter?.content as unknown;
let nextLength = 0;

if (Array.isArray(nextContent)) {
  nextLength = nextContent.length;
} else if (typeof nextContent === "string") {
  nextLength = nextContent.length;
}
    if (nextLength >= currentLength) {
      mergedByKey.set(key, {
        ...current,
        ...chapter,
        url: getChapterUrl(chapter) || getChapterUrl(current) || undefined,
      });
    }
  });

  return Array.from(mergedByKey.values())
    .sort((left, right) => {
      const leftOrder = Number(left.order) || 0;
      const rightOrder = Number(right.order) || 0;
      return leftOrder - rightOrder;
    })
    .map((chapter, index) => ({
      ...chapter,
      id: chapter.id ?? String(index + 1),
      order: index + 1,
      url: getChapterUrl(chapter) || undefined,
    }));
}

export async function saveOrUpdateNovel(newNovel: StoredNovelRecord) {
  const normalizedIncoming = normalizeNovelRecord(newNovel);
  const existingNovel = await getNovel(normalizedIncoming.id);

  if (!existingNovel) {
    await putNovelRecord({
      ...newNovel,
      ...normalizedIncoming,
      sourceUrl: normalizedIncoming.sourceUrl,
      lastChapterIndex: Math.max(0, normalizedIncoming.chapters.length - 1),
    });
    return normalizedIncoming;
  }

  const mergedNovel = buildMergedNovelRecord(existingNovel, newNovel);

  await putNovelRecord(mergedNovel);
  return normalizeNovelRecord(mergedNovel);
}

export const saveNovel = saveOrUpdateNovel;

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

export async function getNovel(id: string): Promise<Novel | null> {
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

function buildMergedNovelRecord(existingNovel: Novel, newNovel: StoredNovelRecord): StoredNovelRecord {
  const mergedChapters = mergeChapters(
    existingNovel.chapters as StoredNovelRecord["chapters"],
    newNovel.chapters as StoredNovelRecord["chapters"],
  );

  return {
    ...existingNovel,
    ...newNovel,
    id: existingNovel.id,
    title: pickPreferredValue(newNovel.title, existingNovel.title),
    author: pickPreferredValue(newNovel.author, existingNovel.author),
    sourceUrl: pickPreferredValue(newNovel.sourceUrl, existingNovel.sourceUrl),
    image: pickPreferredValue(newNovel.image, existingNovel.image),
    alternative: pickPreferredValue(newNovel.alternative, existingNovel.alternative),
    description: pickPreferredValue(newNovel.description, existingNovel.description),
    status: pickPreferredValue(newNovel.status, existingNovel.status),
    genres: pickPreferredValue(newNovel.genres, existingNovel.genres),
    tags: pickPreferredValue(newNovel.tags, existingNovel.tags),
    rating:
      typeof newNovel.rating === "number"
        ? newNovel.rating
        : typeof existingNovel.rating === "number"
          ? existingNovel.rating
          : undefined,
    isCompleted: Boolean(newNovel.isCompleted ?? existingNovel.isCompleted),
    lastUpdated: new Date().toISOString(),
    chapters: mergedChapters,
    lastChapterIndex: Math.max(0, mergedChapters.length - 1),
  };
}
