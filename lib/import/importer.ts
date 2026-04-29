import axios from "axios";

import { upsertChapter, upsertNovel } from "@/lib/db";
import { mergeNovelChapters, normalizeNovelRecord } from "@/lib/novels";
import { getNovel } from "@/lib/storage/indexeddb";
import type { Chapter, Novel } from "@/types";

import { parseChapter, parseNovel } from "./parsers/novelfull-parser";

const CHAPTER_RETRY_LIMIT = 2;
const RETRY_DELAY_MS = 500;

export type ImportProgressCallback = (progress: { current: number; total: number }) => void;

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://novelfull.net/",
    },
  });

  return response.data;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChapterWithRetry(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= CHAPTER_RETRY_LIMIT; attempt += 1) {
    try {
      return await fetchHtml(url);
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${url}:`, error);

      if (attempt === CHAPTER_RETRY_LIMIT) {
        console.error(`Skipped: ${url} after ${CHAPTER_RETRY_LIMIT + 1} attempts.`);
        return null;
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

export async function importNovelFromUrl(
  novelUrl: string,
  onProgress?: ImportProgressCallback,
): Promise<Novel> {
  console.log(`Starting import for: ${novelUrl}`);

  const novelHtml = await fetchHtml(novelUrl);
  const parsedNovel = await parseNovel(novelHtml, {
    novelUrl,
    fetchHtml,
  });

  const seedNovel = normalizeNovelRecord({
    title: parsedNovel.title,
    author: "Unknown Author", // ✅ FIX
    sourceUrl: novelUrl,
    chapters: [],
  });

  const savedNovel = await upsertNovel(seedNovel);
  if (!savedNovel) {
    throw new Error("Unable to initialize novel import");
  }

  const chaptersToProcess = parsedNovel.chapters;
  const totalChapters = chaptersToProcess.length;
  const importedChapters: Chapter[] = [];
  let processedCount = 0;

  const existingNovel = await getNovel(savedNovel.id);
  const existingChapters = new Set((existingNovel?.chapters || []).map((chapter) => chapter.order));

  let startIndex = 0;
  if (existingChapters.size > 0) {
    const maxChapter = Math.max(...existingChapters);
    startIndex = Math.max(0, maxChapter - 1);
  }

  for (let index = startIndex; index < chaptersToProcess.length; index += 1) {
    const chapterUrl = chaptersToProcess[index];
    const chapterOrder = index + 1;

    if (existingChapters.has(chapterOrder)) {
      continue;
    }

    const html = await fetchChapterWithRetry(chapterUrl);
    const parsedChapterContent = html ? parseChapter(html) : null;

    processedCount += 1;
    onProgress?.({ current: processedCount, total: totalChapters });

    if (!parsedChapterContent) {
      break;
    }

    await upsertChapter(savedNovel.id, chapterOrder, {
      title: parsedChapterContent.title,
      content: parsedChapterContent.content,
    });

    existingChapters.add(chapterOrder);
    importedChapters.push({
      id: `${savedNovel.id}-chapter-${chapterOrder}`,
      order: chapterOrder,
      title: parsedChapterContent.title,
      content: parsedChapterContent.content,
    });

    await sleep(1000);
  }

  const finalNovel = normalizeNovelRecord({
    ...savedNovel,
    sourceUrl: novelUrl,
    chapters: mergeNovelChapters(savedNovel.id, existingNovel?.chapters || [], importedChapters),
  });

  await upsertNovel(finalNovel);

  console.log(
    `Import completed for ${finalNovel.title}. Total chapters: ${finalNovel.chapters.length}`,
  );

  return finalNovel;
}
