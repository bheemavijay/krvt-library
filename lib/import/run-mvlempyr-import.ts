import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
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

// =======================
// 🔴 PROGRESS MANAGEMENT
// =======================

function getProgressPath(chaptersDir: string) {
  return path.join(chaptersDir, "../progress.json");
}

function loadProgress(chaptersDir: string) {
  const progressPath = getProgressPath(chaptersDir);

  console.log("Loading progress from:", progressPath);

  if (!existsSync(progressPath)) {
    console.log("No progress file found. Starting fresh.");
    return { lastChapter: -1 };
  }

  const data = JSON.parse(readFileSync(progressPath, "utf-8"));
  console.log("Loaded progress:", data);

  return data;
}

function saveProgress(chaptersDir: string, chapterIndex: number) {
  const progressPath = getProgressPath(chaptersDir);

  console.log("Saving progress:", chapterIndex);

  writeFileSync(
    progressPath,
    JSON.stringify({ lastChapter: chapterIndex }, null, 2)
  );
}

// =======================
// 🔴 FILE CHECK
// =======================

function chapterExists(chaptersDir: string, chapterIndex: number) {
  const filePath = path.join(chaptersDir, `${chapterIndex}.json`);
  return existsSync(filePath);
}

// =======================
// 🔴 NETWORK
// =======================

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
      console.error(`Attempt ${attempt + 1} failed for ${url}`);

      if (attempt === CHAPTER_RETRY_LIMIT) {
        console.error(`Skipped: ${url}`);
        return null;
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

// =======================
// 🔴 MAIN SCRAPER
// =======================

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
  console.log(`Total Chapters: ${novel.chapters.length}`);
  console.log(`Genres: ${novel.genres.join(", ")}`);

  const chapters = [];

  // =======================
  // 🔴 RESUME LOGIC
  // =======================

  const progress = loadProgress(storagePaths.chaptersDir);
  let startIndex = progress.lastChapter + 1;

  console.log(`Resuming from chapter index: ${startIndex}`);

  // =======================
  // 🔴 MAIN LOOP
  // =======================

  for (let index = startIndex; index < novel.chapters.length; index += CHAPTER_BATCH_SIZE) {
    const batch = novel.chapters.slice(index, index + CHAPTER_BATCH_SIZE);

    console.log(
      `Downloading chapters ${index + 1} to ${Math.min(
        index + CHAPTER_BATCH_SIZE,
        novel.chapters.length
      )}...`
    );

    // ❗ SEQUENTIAL PROCESSING (IMPORTANT)
    for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
      const chapterUrl = batch[batchIndex];
      const chapterIndex = index + batchIndex;

      // ✅ SKIP IF EXISTS
      if (chapterExists(storagePaths.chaptersDir, chapterIndex)) {
        console.log(`Skipping chapter ${chapterIndex}`);
        continue;
      }

      const html = await fetchChapterWithRetry(chapterUrl);
      const parsedChapter = html ? parseChapter(html) : null;
      const status = parsedChapter ? "SUCCESS" : "FAILED";

      saveLocalChapter(
        storagePaths.chaptersDir,
        chapterIndex,
        parsedChapter,
        status
      );

      // ✅ SAVE PROGRESS IMMEDIATELY
      saveProgress(storagePaths.chaptersDir, chapterIndex);

      localFilesSaved += 1;

      if (parsedChapter) {
        chapters.push(parsedChapter);
      }

      // ✅ SMALL DELAY BETWEEN CHAPTERS
      await sleep(800);
    }

    // ✅ DELAY BETWEEN BATCHES
    await sleep(1500);
  }

  console.log("Done:");
  console.log(`Total: ${novel.chapters.length}`);
  console.log(`Success: ${chapters.length}`);
  console.log(`Local files saved: ${localFilesSaved}`);
}

run().catch(console.error);