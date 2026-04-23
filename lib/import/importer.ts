import axios from "axios";
import { parseChapter, parseNovel } from "./parsers/novelfull-parser";
import { upsertNovel, upsertChapter } from "@/lib/db";
import type { Novel, Chapter } from "@/types";

const CHAPTER_BATCH_SIZE = 5;
const CHAPTER_RETRY_LIMIT = 2;
const RETRY_DELAY_MS = 500;

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

export type ImportProgressCallback = (progress: { current: number; total: number }) => void;

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

  // Construct a partial Novel object for initial upsert
  const novelToUpsert: Novel = {
    id: parsedNovel.id,
    title: parsedNovel.title,
    author: parsedNovel.author,
    chapters: [], // Will be populated after chapters are processed
  };

  // Save the novel metadata first. upsertNovel will create the novel directory and meta.json
  const savedNovel = await upsertNovel(novelToUpsert);

  const chaptersToProcess = parsedNovel.chapters;
  const totalChapters = chaptersToProcess.length;
  const importedChapters: Chapter[] = [];
  let processedCount = 0;

  for (let index = 0; index < chaptersToProcess.length; index += CHAPTER_BATCH_SIZE) {
    const batch = chaptersToProcess.slice(index, index + CHAPTER_BATCH_SIZE);

    console.log(`Processing chapter batch ${index / CHAPTER_BATCH_SIZE + 1}/${Math.ceil(chaptersToProcess.length / CHAPTER_BATCH_SIZE)}`);

    const results = await Promise.all(
      batch.map(async (chapterUrl, batchIndex) => {
        const chapterOrder = index + batchIndex + 1; // Chapter numbers are 1-based
        const html = await fetchChapterWithRetry(chapterUrl);
        const parsedChapterContent = html ? parseChapter(html) : null;

        processedCount += 1;
        if (onProgress) {
          onProgress({ current: processedCount, total: totalChapters });
        }

        if (parsedChapterContent) {
          const chapterData = {
            title: parsedChapterContent.title,
            content: parsedChapterContent.content,
          };
          await upsertChapter(savedNovel.id, chapterOrder, chapterData);
          return {
            id: `${savedNovel.id}-chapter-${chapterOrder}`,
            order: chapterOrder,
            title: parsedChapterContent.title,
            content: parsedChapterContent.content,
          };
        }
        return null;
      }),
    );
    importedChapters.push(...results.filter(Boolean));
  }

  // Update the novel with the full list of chapters after all are processed
  // This might not be strictly necessary if upsertNovel handles chapter updates implicitly,
  // but it ensures the novel object returned is complete.
  const finalNovel: Novel = {
    ...savedNovel,
    chapters: importedChapters.sort((a, b) => a.order - b.order),
  };
  await upsertNovel(finalNovel); // Re-upsert to ensure chapter list is updated in meta if needed

  console.log(`Import completed for ${finalNovel.title}. Total chapters: ${importedChapters.length}`);

  return finalNovel;
}
