import { writeFileSync } from "node:fs";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
import {
  createNovelStoragePaths,
  saveLocalChapter,
  saveNovelMetadata,
} from "./local-import-storage";
import { parseChapter, parseNovel } from "./parsers/novelfull-parser";

const DEFAULT_NOVEL_URL = "https://novelfull.net/library-of-heavens-path.html";

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
    } catch {
      if (attempt === CHAPTER_RETRY_LIMIT) {
        console.error(`Skipped: ${url}`);
        return null;
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

async function run() {
  const novelUrl = process.argv[2] ?? DEFAULT_NOVEL_URL;

  console.log(`Fetching novel page: ${novelUrl}`);

  const novelHtml = await fetchHtml(novelUrl);
  writeFileSync("debug.html", novelHtml);

  const novel = await parseNovel(novelHtml, {
    novelUrl,
    fetchHtml,
  });
  const storagePaths = createNovelStoragePaths(novel.title);
  let localFilesSaved = 0;

  saveNovelMetadata(storagePaths.metaPath, novel);
  localFilesSaved += 1;

  console.log(`Novel: ${novel.title}`);
  console.log(`Chapters: ${novel.chapters.length}`);
  console.log(`Genres: ${novel.genres.join(", ")}`);

  const chapters = [];

  for (let index = 0; index < novel.chapters.length; index += CHAPTER_BATCH_SIZE) {
    const batch = novel.chapters.slice(index, index + CHAPTER_BATCH_SIZE);

    console.log(`Batch ${index / CHAPTER_BATCH_SIZE + 1}`);

    const results = await Promise.all(
      batch.map(async (chapterUrl, batchIndex) => {
        const chapterIndex = index + batchIndex;
        const html = await fetchChapterWithRetry(chapterUrl);
        const parsedChapter = html ? parseChapter(html) : null;
        const status = parsedChapter ? "SUCCESS" : "FAILED";

        saveLocalChapter(storagePaths.chaptersDir, chapterIndex, parsedChapter, status);
        localFilesSaved += 1;

        return parsedChapter;
      }),
    );

    chapters.push(...results.filter(Boolean));
  }

  console.log("Done:");
  console.log(`Total: ${novel.chapters.length}`);
  console.log(`Success: ${chapters.length}`);
  console.log(`Local files saved: ${localFilesSaved}`);
}

run().catch(console.error);
