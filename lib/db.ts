import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Chapter, Novel, NovelSummary } from "@/types";

type NovelMetaRecord = {
  id?: string;
  title?: string;
  author?: string;
  cover?: string;
  description?: string;
  genres?: string[];
};

type ChapterFileRecord = {
  title?: string;
  content?: string[];
  status?: string;
};

type ChapterLoadMode = "list" | "full";

type ChapterQuery = {
  chapterNumber?: number;
  mode?: ChapterLoadMode;
};

type IndexedNovelRecord = {
  directoryName: string;
  summary: NovelSummary;
  chapterNumbers: number[];
};

const DATA_ROOT = path.join(process.cwd(), "data", "novels");
let novelsCache: NovelSummary[] | null = null;
let novelIndexCache: Map<string, IndexedNovelRecord> | null = null;
let novelIndexPromise: Promise<Map<string, IndexedNovelRecord>> | null = null;
const chapterListCache = new Map<string, Chapter[]>();
const chapterListPromises = new Map<string, Promise<Chapter[]>>();
const chapterContentCache = new Map<string, Chapter>();
const chapterContentPromises = new Map<string, Promise<Chapter | null>>();

export async function getNovels(): Promise<NovelSummary[]> {
  console.time("getNovels");

  try {
    if (novelsCache) {
      return novelsCache;
    }

    const index = await getNovelIndex();
    const summaries = Array.from(index.values())
      .map((entry) => entry.summary)
      .sort((left, right) => left.title.localeCompare(right.title));

    novelsCache = summaries;

    return summaries;
  } finally {
    console.timeEnd("getNovels");
  }
}

export async function getLibraryNovels(): Promise<Novel[]> {
  const summaries = await getNovels();
  const novels = await Promise.all(
    summaries.map((novel) => getNovelById(novel.id, { mode: "list" })),
  );

  return novels.filter((novel): novel is Novel => novel !== null);
}

export async function getNovelById(
  id: string,
  options: ChapterQuery = {},
): Promise<Novel | null> {
  const summary = await getNovelSummaryById(id);

  // ✅ MUST check FIRST
  if (!summary) {
    return null;
  }

  const chapters = await getChaptersByNovelId(summary.id, options);

  return {
    id: summary.id,
    title: summary.title,
    author: summary.author ?? "Unknown Author",

    sourceUrl: "",
    image: "",
    description: "",
    genres: [],
    tags: [],
    alternative: "",
    status: "unknown",
    rating: 0,
    isCompleted: false,
    lastUpdated: new Date().toISOString(),

    chapters,
  };
}

export async function getChaptersByNovelId(
  novelId: string,
  options: ChapterQuery = {},
): Promise<Chapter[]> {
  console.time("getChapters");

  try {
    const mode = options.mode ?? "full";
    const chapterList = await getChapterList(novelId);

    if (mode === "list") {
      return chapterList;
    }

    if (typeof options.chapterNumber === "number") {
      const targetChapter = await getChapterContent(novelId, options.chapterNumber);

      return chapterList.map((chapter) =>
        chapter.order === options.chapterNumber ? targetChapter ?? chapter : chapter,
      );
    }

    const fullChapters = await Promise.all(
      chapterList.map((chapter) => getChapterContent(novelId, chapter.order)),
    );

    return chapterList.map((chapter, index) => fullChapters[index] ?? chapter);
  } finally {
    console.timeEnd("getChapters");
  }
}

export async function upsertNovel(novel: Novel) {
  const directoryName = sanitizeNovelId(novel.id);
  const novelPaths = getNovelPaths(directoryName);

  await ensureDataRoot();
  await mkdir(novelPaths.chaptersDir, { recursive: true });
  await writeJson(novelPaths.metaPath, {
    id: novel.id,
    title: novel.title,
    author: novel.author,
    cover: "",
    description: "",
    genres: [],
  } satisfies NovelMetaRecord);
  await removeStaleChapterFiles(directoryName, novel.chapters.map((chapter) => chapter.order));

  await Promise.all(
    novel.chapters.map((chapter) =>
      upsertChapter(novel.id, chapter.order, {
        title: chapter.title,
        content: chapter.content,
      }),
    ),
  );

  invalidateNovelCaches(novel.id);

  return getNovelById(novel.id, { mode: "full" });
}

export async function upsertChapter(
  novelId: string,
  chapterNumber: number,
  data: {
    title: string;
    content: string[];
  },
) {
  await ensureDataRoot();
  const directoryName = sanitizeNovelId(novelId);
  const novelPaths = getNovelPaths(directoryName);
  const chapterPath = path.join(novelPaths.chaptersDir, `${chapterNumber}.json`);

  await mkdir(novelPaths.chaptersDir, { recursive: true });
  await writeJson(chapterPath, {
    title: data.title.trim() || `Chapter ${chapterNumber}`,
    content: normalizeChapterContent(data.content),
    status: "SUCCESS",
  } satisfies ChapterFileRecord);

  invalidateNovelCaches(novelId, chapterNumber);
}

export async function getNovelSummaryById(id: string): Promise<NovelSummary | null> {
  const index = await getNovelIndex();
  return index.get(id)?.summary ?? null;
}

async function getNovelIndex() {
  if (novelIndexCache) {
    return novelIndexCache;
  }

  if (!novelIndexPromise) {
    novelIndexPromise = loadNovelIndexFromDisk();
  }

  const index = await novelIndexPromise;
  novelIndexCache = index;

  return index;
}

async function loadNovelIndexFromDisk() {
  await ensureDataRoot();
  const entries = await readdir(DATA_ROOT, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const records = await Promise.all(
    directories.map(async (directoryName) => {
      const meta = await readNovelMeta(directoryName);
      const chapterNumbers = await getChapterNumbers(directoryName);
      const novelId = meta.id ?? directoryName;

      return [
        novelId,
        {
          directoryName,
          summary: {
            id: novelId,
            title: meta.title ?? humanizeNovelId(novelId),
            author: meta.author ?? getFallbackAuthor(novelId),
            chapterCount: chapterNumbers.length,
          } satisfies NovelSummary,
          chapterNumbers,
        } satisfies IndexedNovelRecord,
      ] as const;
    }),
  );

  novelsCache = records
    .map(([, entry]) => entry.summary)
    .sort((left, right) => left.title.localeCompare(right.title));

  return new Map(records);
}

async function getChapterList(novelId: string) {
  if (chapterListCache.has(novelId)) {
    return chapterListCache.get(novelId) ?? [];
  }

  const existingPromise = chapterListPromises.get(novelId);

  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = loadChapterListFromDisk(novelId);
  chapterListPromises.set(novelId, loadPromise);

  const chapterList = await loadPromise;
  chapterListCache.set(novelId, chapterList);
  chapterListPromises.delete(novelId);

  return chapterList;
}

async function loadChapterListFromDisk(novelId: string) {
  const indexedNovel = await getIndexedNovel(novelId);

  if (!indexedNovel) {
    return [];
  }

  const chapterRecords = await Promise.all(
    indexedNovel.chapterNumbers.map((chapterNumber) =>
      readChapterRecord(indexedNovel.directoryName, chapterNumber),
    ),
  );

  return indexedNovel.chapterNumbers.map((chapterNumber, index) => ({
    id: `${novelId}-chapter-${chapterNumber}`,
    order: chapterNumber,
    title: chapterRecords[index]?.title?.trim() || `Chapter ${chapterNumber}`,
    content: [],
  }));
}

async function getChapterContent(novelId: string, chapterNumber: number) {
  const cacheKey = getChapterCacheKey(novelId, chapterNumber);

  if (chapterContentCache.has(cacheKey)) {
    return chapterContentCache.get(cacheKey) ?? null;
  }

  const existingPromise = chapterContentPromises.get(cacheKey);

  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = loadChapterContentFromDisk(novelId, chapterNumber);
  chapterContentPromises.set(cacheKey, loadPromise);

  const chapter = await loadPromise;

  if (chapter) {
    chapterContentCache.set(cacheKey, chapter);
  }

  chapterContentPromises.delete(cacheKey);

  return chapter;
}

async function loadChapterContentFromDisk(novelId: string, chapterNumber: number) {
  const indexedNovel = await getIndexedNovel(novelId);

  if (!indexedNovel) {
    return null;
  }

  const chapterRecord = await readChapterRecord(indexedNovel.directoryName, chapterNumber);

  return {
    id: `${novelId}-chapter-${chapterNumber}`,
    order: chapterNumber,
    title: chapterRecord.title?.trim() || `Chapter ${chapterNumber}`,
    content: normalizeChapterContent(chapterRecord.content),
  } satisfies Chapter;
}

async function getIndexedNovel(novelId: string) {
  const index = await getNovelIndex();
  return index.get(novelId) ?? null;
}

function getNovelPaths(directoryName: string) {
  const rootDir = path.join(DATA_ROOT, directoryName);

  return {
    rootDir,
    metaPath: path.join(rootDir, "meta.json"),
    chaptersDir: path.join(rootDir, "chapters"),
  };
}

async function readNovelMeta(directoryName: string): Promise<NovelMetaRecord> {
  const { metaPath } = getNovelPaths(directoryName);
  return readJsonFile<NovelMetaRecord>(metaPath, {});
}

async function readChapterRecord(
  directoryName: string,
  chapterNumber: number,
): Promise<ChapterFileRecord> {
  const { chaptersDir } = getNovelPaths(directoryName);
  const chapterPath = path.join(chaptersDir, `${chapterNumber}.json`);
  return readJsonFile<ChapterFileRecord>(chapterPath, {});
}

async function getChapterNumbers(directoryName: string) {
  const { chaptersDir } = getNovelPaths(directoryName);

  try {
    const entries = await readdir(chaptersDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => Number.parseInt(entry.name.replace(/\.json$/i, ""), 10))
      .filter((chapterNumber) => Number.isInteger(chapterNumber) && chapterNumber > 0)
      .sort((left, right) => left - right);
  } catch {
    return [];
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureDataRoot() {
  await mkdir(DATA_ROOT, { recursive: true });
}

function invalidateNovelCaches(novelId: string, chapterNumber?: number) {
  novelsCache = null;
  novelIndexCache = null;
  novelIndexPromise = null;
  chapterListCache.delete(novelId);
  chapterListPromises.delete(novelId);

  if (typeof chapterNumber === "number") {
    const cacheKey = getChapterCacheKey(novelId, chapterNumber);
    chapterContentCache.delete(cacheKey);
    chapterContentPromises.delete(cacheKey);
    return;
  }

  for (const cacheKey of chapterContentCache.keys()) {
    if (cacheKey.startsWith(`${novelId}:`)) {
      chapterContentCache.delete(cacheKey);
    }
  }

  for (const cacheKey of chapterContentPromises.keys()) {
    if (cacheKey.startsWith(`${novelId}:`)) {
      chapterContentPromises.delete(cacheKey);
    }
  }
}

async function removeStaleChapterFiles(directoryName: string, keepChapterNumbers: number[]) {
  const keepSet = new Set(keepChapterNumbers);
  const { chaptersDir } = getNovelPaths(directoryName);

  try {
    const entries = await readdir(chaptersDir, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const chapterNumber = Number.parseInt(entry.name.replace(/\.json$/i, ""), 10);

          if (!keepSet.has(chapterNumber)) {
            await rm(path.join(chaptersDir, entry.name), { force: true });
          }
        }),
    );
  } catch {
    // Ignore cleanup failures and continue with the current write.
  }
}

function normalizeChapterContent(content: string[] | undefined) {
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .map((paragraph) => String(paragraph ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getChapterCacheKey(novelId: string, chapterNumber: number) {
  return `${novelId}:${chapterNumber}`;
}

function sanitizeNovelId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "novel";
}

function humanizeNovelId(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getFallbackAuthor(novelId: string) {
  if (novelId.startsWith("uploaded-")) {
    return "Uploaded TXT";
  }

  return "Unknown Author";
}
