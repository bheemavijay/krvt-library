import type { Chapter, Novel, NovelSummary } from "@/types";
import { normalizeChapter, normalizeNovelRecord } from "@/lib/novels";
import { CANONICAL_GENRES } from "@/lib/constants/genres";

const DB_NAME = "krvt-library";
const NOVELS_STORE = "novels";
const CHAPTERS_STORE = "chapters";
const BOOKMARKS_STORE = "bookmarks";
const LIBRARY_UPDATED_EVENT = "library:updated";
const DB_VERSION = 3;
const SUMMARY_PAGE_SIZE = 60;

type StoredNovelRecord = Partial<Novel> & {
  genre?: string | string[];
  rating?: number | string;
  categories?: string[] | string;
  chapterCount?: number;
  chapterTitles?: string[];
  updatedAt?: string;
  lastChapterIndex?: number;
  chapters?: Array<Partial<Chapter> & { url?: string; content?: string[] | string }>;
};

type StoredChapterRecord = {
  novelId: string;
  chapterIndex: number;
  id: string;
  order: number;
  title: string;
  content: string[];
  url?: string;
};

type StoredNovelMeta = Omit<Novel, "chapters"> & {
  chapterCount: number;
  chapterTitles: string[];
  updatedAt: string;
  categories?: string[];
  chapters?: never;
};

type Bookmark = {
  novelId: string;
  chapterIndex: number;
  createdAt: number;
};

function openDB(): Promise<IDBDatabase> {
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

export async function addNovel(novel: StoredNovelRecord) {
  return saveOrUpdateNovel(novel);
}

export async function saveNovelsBatch(novels: StoredNovelRecord[]) {
  if (!Array.isArray(novels) || novels.length === 0) {
    return 0;
  }

  let saved = 0;
  for (const novel of novels) {
    try {
      await saveOrUpdateNovel(novel);
      saved += 1;
      await yieldToUi();
    } catch (error) {
      console.error("Skipping invalid novel during batch save", getNovelLabel(novel), error);
    }
  }

  return saved;
}

export async function saveOrUpdateNovel(newNovel: StoredNovelRecord) {
  const normalizedIncoming = normalizeNovelRecord(newNovel);
  const existingNovel = await getNovel(normalizedIncoming.id);
  const mergedNovel = existingNovel
    ? buildMergedNovelRecord(existingNovel, newNovel)
    : normalizedIncoming;

  await putNovelRecord(mergedNovel);
  return normalizeNovelRecord(mergedNovel);
}

export const saveNovel = saveOrUpdateNovel;

export async function getAllNovels() {
  const summaries = await getNovelSummaries();
  return summaries.map(summaryToNovelShell);
}

export async function getNovelSummaries(options: { offset?: number; limit?: number } = {}) {
  const db = await openDB();
  const tx = db.transaction(NOVELS_STORE, "readonly");
  const store = tx.objectStore(NOVELS_STORE);
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? Number.MAX_SAFE_INTEGER);

  return new Promise<NovelSummary[]>((resolve) => {
    const summaries: NovelSummary[] = [];
    const migrations: StoredNovelRecord[] = [];
    let skipped = 0;
    let seen = 0;
    let advanced = offset === 0;
    const req = store.openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || summaries.length >= limit) {
        if (migrations.length > 0) {
          void migrateLegacyRecords(migrations);
        }
        resolve(summaries);
        return;
      }

      if (!advanced) {
        advanced = true;
        cursor.advance(offset);
        return;
      }

      try {
        const record = cursor.value as StoredNovelRecord;
        if (Array.isArray(record.chapters)) {
          migrations.push(record);
        }

        const summary = normalizeNovelSummary(record);
        summaries.push(summary);
        seen += 1;
      } catch (error) {
        skipped += 1;
        console.warn("Skipping corrupted novel metadata", cursor.key, error);
      }

      cursor.continue();
    };

    req.onerror = () => {
      console.error("Failed to read novel summaries", req.error);
      resolve(summaries);
    };
  });
}

export async function getNovel(id: string): Promise<Novel | null> {
  console.info("krvt.debug.storage.getNovel", { id });
  
  if (!id?.trim()) {
    console.error("getNovel called with invalid id:", id);
    return null;
  }

  const meta = await getNovelMeta(id);
  if (!meta) {
    return null;
  }

  const chapters = await getNovelChapters(id, meta.chapterCount);
  return normalizeNovelRecord({
    ...meta,
    chapters,
  });
}

export async function getNovelSummary(id: string): Promise<NovelSummary | null> {
  const meta = await getNovelMeta(id);
  return meta ? metaToSummary(meta) : null;
}

export async function getNovelChapterList(id: string) {
  const meta = await getNovelMeta(id);
  if (!meta) {
    return [];
  }

  return meta.chapterTitles.map((title, index) => ({
    id: `${id}-chapter-${index + 1}`,
    order: index + 1,
    title: title || `Chapter ${index + 1}`,
    content: [],
  })) satisfies Chapter[];
}

export async function getChapter(novelId: string, chapterIndex: number): Promise<Chapter | null> {
  const db = await openDB();
  const tx = db.transaction(CHAPTERS_STORE, "readonly");
  const store = tx.objectStore(CHAPTERS_STORE);

  return new Promise((resolve) => {
    const request = store.get([novelId, chapterIndex]);
    request.onsuccess = () => {
      try {
        const record = request.result as StoredChapterRecord | undefined;
        resolve(record ? storedChapterToChapter(record) : null);
      } catch (error) {
        console.warn("Skipping corrupted chapter", { novelId, chapterIndex, error });
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

export async function deleteNovel(id: string) {
  const db = await openDB();
  const deleteNovelTx = db.transaction(NOVELS_STORE, "readwrite");
  await requestToPromise(deleteNovelTx.objectStore(NOVELS_STORE).delete(id));

  const deleteChaptersTx = db.transaction(CHAPTERS_STORE, "readwrite");
  const chapterIndex = deleteChaptersTx.objectStore(CHAPTERS_STORE).index("novelId");
  await new Promise<void>((resolve) => {
    const cursorRequest = chapterIndex.openCursor(IDBKeyRange.only(id));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
    cursorRequest.onerror = () => resolve();
  });

  notifyLibraryUpdated();
}

export async function clearAllNovels() {
  const db = await openDB();
  const tx = db.transaction([NOVELS_STORE, CHAPTERS_STORE], "readwrite");
  await Promise.all([
    requestToPromise(tx.objectStore(NOVELS_STORE).clear()),
    requestToPromise(tx.objectStore(CHAPTERS_STORE).clear()),
  ]);
  notifyLibraryUpdated();
}

export async function addBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
  const store = tx.objectStore(BOOKMARKS_STORE);

  await requestToPromise(
    store.put({
      novelId,
      chapterIndex,
      createdAt: Date.now(),
    } satisfies Bookmark),
  );
}

export async function removeBookmark(novelId: string, chapterIndex: number) {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readwrite");
  await requestToPromise(tx.objectStore(BOOKMARKS_STORE).delete([novelId, chapterIndex]));
}

export async function getBookmarks(novelId: string): Promise<Bookmark[]> {
  const db = await openDB();
  const tx = db.transaction(BOOKMARKS_STORE, "readonly");
  const store = tx.objectStore(BOOKMARKS_STORE);
  const index = store.index("novelId");

  try {
    return await requestToPromise<Bookmark[]>(index.getAll(novelId));
  } catch {
    return [];
  }
}

async function putNovelRecord(novel: StoredNovelRecord) {
  const normalized = normalizeNovelRecord(novel);
  const chapters = normalized.chapters;
  const meta = createNovelMeta(normalized);
  const db = await openDB();
  const tx = db.transaction([NOVELS_STORE, CHAPTERS_STORE], "readwrite");
  const novelsStore = tx.objectStore(NOVELS_STORE);
  const chaptersStore = tx.objectStore(CHAPTERS_STORE);

  console.info("krvt.debug.storage.addNovel", {
    id: normalized.id,
    title: normalized.title,
    chapters: chapters.length,
  });

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      notifyLibraryUpdated();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    novelsStore.put(meta);

    for (let index = 0; index < chapters.length; index += 1) {
      const chapter = chapters[index];
      chaptersStore.put({
        novelId: normalized.id,
        chapterIndex: index,
        id: chapter.id,
        order: chapter.order,
        title: chapter.title,
        content: chapter.content,
      } satisfies StoredChapterRecord);
    }
  });
}

async function getNovelMeta(id: string): Promise<StoredNovelMeta | null> {
  const db = await openDB();
  const tx = db.transaction(NOVELS_STORE, "readonly");
  const store = tx.objectStore(NOVELS_STORE);

  try {
    const record = await requestToPromise<StoredNovelRecord | undefined>(store.get(id));
    if (!record) {
      return null;
    }

    if (Array.isArray(record.chapters)) {
      await migrateLegacyRecords([record]);
    }

    return normalizeNovelMeta(record);
  } catch (error) {
    console.warn("Skipping corrupted novel metadata", id, error);
    return null;
  }
}

async function getNovelChapters(novelId: string, chapterCount: number) {
  const chapters: Chapter[] = [];
  for (let index = 0; index < chapterCount; index += 1) {
    const chapter = await getChapter(novelId, index);
    if (chapter) {
      chapters.push(chapter);
    }
    if (index % 25 === 0) {
      await yieldToUi();
    }
  }
  return chapters;
}

async function migrateLegacyRecords(records: StoredNovelRecord[]) {
  for (const record of records) {
    try {
      if (!Array.isArray(record.chapters)) {
        continue;
      }
      await putNovelRecord(record);
    } catch (error) {
      console.warn("Legacy novel migration skipped", getNovelLabel(record), error);
    }
  }
}

function createNovelMeta(novel: Novel): StoredNovelMeta {
  return {
    id: novel.id,
    title: novel.title,
    author: novel.author,
    sourceUrl: novel.sourceUrl,
    isCompleted: novel.isCompleted,
    lastUpdated: novel.lastUpdated,
    updatedAt: novel.lastUpdated || new Date().toISOString(),
    image: novel.image,
    alternative: novel.alternative,
    genres: novel.genres,
    categories: novel.genres,
    status: novel.status,
    rating: novel.rating,
    tags: novel.tags,
    description: novel.description,
    chapterCount: novel.chapters.length,
    chapterTitles: novel.chapters.map((chapter, index) => chapter.title || `Chapter ${index + 1}`),
  };
}

function normalizeNovelMeta(record: StoredNovelRecord): StoredNovelMeta {
  const normalized = normalizeNovelRecord({
    ...record,
    chapters: [],
  });
  const { chapters: _chapters, ...normalizedMeta } = normalized;
  const legacyChapters = Array.isArray(record.chapters) ? record.chapters : [];
  const chapterTitles = Array.isArray(record.chapterTitles)
    ? record.chapterTitles.map((title, index) => String(title || `Chapter ${index + 1}`))
    : legacyChapters.map((chapter, index) => String(chapter?.title || `Chapter ${index + 1}`));
  const chapterCount =
    typeof record.chapterCount === "number" && record.chapterCount >= 0
      ? record.chapterCount
      : chapterTitles.length;
  const lastUpdated =
    typeof record.lastUpdated === "string" && record.lastUpdated
      ? record.lastUpdated
      : typeof record.updatedAt === "string" && record.updatedAt
        ? record.updatedAt
        : new Date().toISOString();

  return {
    ...normalizedMeta,
    lastUpdated,
    updatedAt: lastUpdated,
    chapterCount,
    chapterTitles:
      chapterTitles.length > 0
        ? chapterTitles
        : Array.from({ length: chapterCount }, (_, index) => `Chapter ${index + 1}`),
  };
}

function normalizeNovelSummary(record: StoredNovelRecord): NovelSummary {
  const meta = normalizeNovelMeta(record);

  const sameArrays =
      Array.isArray(meta.genres) &&
      Array.isArray(meta.tags) &&
      meta.genres.length === meta.tags.length &&
      meta.genres.every((value, index) => value === meta.tags[index]);

  if (sameArrays) {
    const allLabels = meta.genres;
    meta.genres = allLabels.filter(label => CANONICAL_GENRES.has(label));
    meta.tags = allLabels.filter(label => !CANONICAL_GENRES.has(label));
  }
  
  return metaToSummary(meta);
}

function metaToSummary(meta: StoredNovelMeta): NovelSummary {
  return {
    id: meta.id,
    title: meta.title,
    author: meta.author,
    sourceUrl: meta.sourceUrl,
    chapterCount: meta.chapterCount,
    image: meta.image,
    isCompleted: meta.isCompleted,
    status: meta.status,
    description: meta.description,
    genres: meta.genres,
    tags: meta.tags,
    lastUpdated: meta.lastUpdated,
  };
}

function summaryToNovelShell(summary: NovelSummary): Novel {
  return normalizeNovelRecord({
    ...summary,
    chapters: (summary.chapterTitles ?? []).map((title, index) => ({
      id: `${summary.id}-chapter-${index + 1}`,
      order: index + 1,
      title,
      content: [],
    })),
  });
}

function storedChapterToChapter(record: StoredChapterRecord): Chapter {
  return normalizeChapter(
    record.novelId,
    {
      id: record.id,
      order: record.order || record.chapterIndex + 1,
      title: record.title,
      content: record.content,
    },
    record.chapterIndex + 1,
  );
}

function buildMergedNovelRecord(existingNovel: Novel, newNovel: StoredNovelRecord): StoredNovelRecord {
  const incoming = normalizeNovelRecord(newNovel);
  const chaptersByOrder = new Map<number, Chapter>();

  for (const chapter of existingNovel.chapters) {
    chaptersByOrder.set(chapter.order, chapter);
  }

  for (const chapter of incoming.chapters) {
    const current = chaptersByOrder.get(chapter.order);
    if (!current || chapter.content.length >= current.content.length) {
      chaptersByOrder.set(chapter.order, chapter);
    }
  }

  const chapters = Array.from(chaptersByOrder.values())
    .sort((left, right) => left.order - right.order)
    .map((chapter, index) => ({
      ...chapter,
      id: `${existingNovel.id}-chapter-${index + 1}`,
      order: index + 1,
    }));

  return {
    ...existingNovel,
    ...newNovel,
    id: existingNovel.id,
    title: pickPreferredValue(newNovel.title, existingNovel.title) ?? existingNovel.title,
    author: pickPreferredValue(newNovel.author, existingNovel.author) ?? existingNovel.author,
    sourceUrl: pickPreferredValue(newNovel.sourceUrl, existingNovel.sourceUrl) ?? existingNovel.sourceUrl,
    image: pickPreferredValue(newNovel.image, existingNovel.image) ?? existingNovel.image,
    alternative: pickPreferredValue(newNovel.alternative, existingNovel.alternative) ?? existingNovel.alternative,
    description: pickPreferredValue(newNovel.description, existingNovel.description) ?? existingNovel.description,
    status: pickPreferredValue(newNovel.status, existingNovel.status) ?? existingNovel.status,
    genres: pickPreferredValue(newNovel.genres, existingNovel.genres) ?? existingNovel.genres,
    tags: pickPreferredValue(newNovel.tags, existingNovel.tags) ?? existingNovel.tags,
    rating:
      typeof newNovel.rating === "number"
        ? newNovel.rating
        : typeof existingNovel.rating === "number"
          ? existingNovel.rating
          : undefined,
    isCompleted: Boolean(newNovel.isCompleted ?? existingNovel.isCompleted),
    lastUpdated: new Date().toISOString(),
    chapters,
  };
}

function pickPreferredValue<T>(
  incoming: T | undefined | null,
  existing: T | undefined | null,
): T | undefined {
  if (typeof incoming === "string") {
    return incoming.trim() ? incoming : existing ?? undefined;
  }

  if (Array.isArray(incoming)) {
    return incoming.length ? incoming : existing ?? undefined;
  }

  return incoming ?? existing ?? undefined;
}

function requestToPromise<T = unknown>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function notifyLibraryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LIBRARY_UPDATED_EVENT));
  }
}

function getNovelLabel(novel: Partial<Novel> | undefined) {
  const title = typeof novel?.title === "string" ? novel.title.trim() : "";
  return title || "Unknown novel";
}

async function yieldToUi() {
  if (typeof window === "undefined") {
    return;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

export { SUMMARY_PAGE_SIZE };