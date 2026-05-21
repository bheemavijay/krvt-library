import fs from "fs-extra";
import path from "path";

import { discoverChapters } from "./discover";
import { fetchChapterHtml } from "./fetch";
import { parseChapter } from "./parser";
import { fetchNovelPageHtml, extractMetadata, mergeMetadata } from "./metadata";
import type { ImporterOptions, ImportProgress, KrvtNovel, Chapter } from "./types";

/**
 * Main importer function
 * Handles full novel import including metadata, chapters, and JSON export
 * 
 * Flow:
 * 1. Fetch novel metadata from novel page
 * 2. Discover all chapters
 * 3. Download and parse each chapter
 * 4. Merge metadata with chapter data
 * 5. Export to KRVT JSON format
 */
export async function importNovel(
  novelId: string,
  options: ImporterOptions = {}
): Promise<KrvtNovel> {
  const {
    maxFailures = 3,
    maxChapters = 999,
    skipMetadata = false,
    onProgress,
  } = options;

  console.log(`\n═══════════════════════════════════════`);
  console.log(`Starting import for novel: ${novelId}`);
  console.log(`═══════════════════════════════════════\n`);

  const startTime = new Date().toISOString();
  let progress: ImportProgress = {
    novelId,
    totalChapters: 0,
    downloadedChapters: 0,
    failedChapters: 0,
    lastSuccessfulChapter: 0,
    lastError: null,
    startTime,
    updatedTime: startTime,
  };

  // Step 1: Prepare metadata state
  console.log("📖 Fetching novel metadata...");
  let novelTitle = "Unknown Novel";
  let author = "Unknown Author";
  let metadata = null;
  let novelUrl = "";

  if (!skipMetadata && novelUrl) {
    try {
      const html = await fetchNovelPageHtml(novelUrl);
      metadata = extractMetadata(html);
      novelTitle = metadata.title;
      author = metadata.author;
      console.log(`✓ Novel: ${novelTitle}`);
      console.log(`✓ Author: ${author}`);
      console.log(`✓ Cover: ${metadata.coverImage ? "✓" : "✗"}`);
      console.log(`✓ Description: ${metadata.description.length} chars`);
      console.log(`✓ Genres: ${metadata.genres.join(", ") || "—"}`);
    } catch (error) {
      console.warn(
        `⚠ Failed to fetch metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      progress.lastError = `Metadata fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      if (onProgress) onProgress(progress);
    }
  }

  // Step 2: Discover chapters
  console.log("\n🔍 Discovering chapters...");
  const discoveredChapters = await discoverChapters(novelId, {
    maxFailures,
    maxChapters,
  });

  if (discoveredChapters.length === 0) {
    throw new Error(`No chapters discovered for novel ${novelId}`);
  }

  progress.totalChapters = discoveredChapters.length;
  console.log(`✓ Found ${discoveredChapters.length} chapters\n`);

  // Step 3: Download and parse chapters
  console.log("📥 Downloading chapters...\n");
  const chapters: Chapter[] = [];

  for (const discovered of discoveredChapters) {
    try {
      console.log(
        `[${discovered.chapterNumber}/${discoveredChapters.length}] Downloading...`
      );

      const html = await fetchChapterHtml(discovered.url);
      const parsed = parseChapter(html);
      if (!novelUrl && parsed.novelUrl) {
        novelUrl = parsed.novelUrl;
      }

      if (!skipMetadata && !metadata && parsed.novelUrl) {
        console.log("ðŸ“– Fetching novel metadata...");
        try {
          const metadataHtml = await fetchNovelPageHtml(parsed.novelUrl);
          metadata = extractMetadata(metadataHtml);
          novelTitle = metadata.title;
          author = metadata.author;
          console.log(`âœ“ Novel: ${novelTitle}`);
          console.log(`âœ“ Author: ${author}`);
          console.log(`âœ“ Cover: ${metadata.coverImage ? "âœ“" : "âœ—"}`);
          console.log(`âœ“ Description: ${metadata.description.length} chars`);
          console.log(`âœ“ Genres: ${metadata.genres.join(", ") || "â€”"}`);
        } catch (error) {
          console.warn(
            `âš  Failed to fetch metadata: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          progress.lastError = `Metadata fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          if (onProgress) onProgress(progress);
        }
      }

      // Use discovered title as fallback for extracted title
      const chapterTitle =
        parsed.chapterTitle !== "Unknown Chapter"
          ? parsed.chapterTitle
          : discovered.chapterTitle;

      const chapter: Chapter = {
        id: `${novelId}-${discovered.chapterNumber}`,
        order: discovered.chapterNumber,
        title: chapterTitle,
        content: parsed.paragraphs,
      };

      chapters.push(chapter);
      progress.downloadedChapters++;
      progress.lastSuccessfulChapter = discovered.chapterNumber;

      if (onProgress) {
        progress.updatedTime = new Date().toISOString();
        onProgress(progress);
      }
    } catch (error) {
      progress.failedChapters++;
      progress.lastError = error instanceof Error ? error.message : "Unknown error";

      console.error(
        `✗ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      if (onProgress) {
        progress.updatedTime = new Date().toISOString();
        onProgress(progress);
      }
    }
  }

  console.log(`\n✓ Downloaded ${chapters.length} chapters`);
  if (progress.failedChapters > 0) {
    console.log(`⚠ Failed chapters: ${progress.failedChapters}`);
  }

  // Step 4: Build KRVT novel object
  console.log("\n🏗 Building novel data structure...");
  let novel: KrvtNovel = {
    id: `mvlempyr-${novelId}`,
    title: novelTitle,
    author: author,
    sourceUrl: novelUrl || `https://www.mvlempyr.io/chapter/${novelId}-1`,
    isCompleted: metadata?.status === "completed" || false,
    lastUpdated: new Date().toISOString(),
    image: metadata?.coverImage || "",
    alternative: metadata?.alternativeTitles.join("; ") || "",
    genres: metadata?.genres || [],
    status: metadata?.status || "unknown",
    rating: metadata?.rating || 0,
    tags: metadata?.tags || [],
    description: metadata?.description || "",
    chapters,
  };

  console.log(`✓ Title: ${novel.title}`);
  console.log(`✓ Chapters: ${novel.chapters.length}`);
  console.log(`✓ Status: ${novel.status}`);
  if (novel.rating > 0) console.log(`✓ Rating: ${novel.rating}/5`);

  // Step 5: Export to JSON
  console.log("\n💾 Exporting to JSON...");
  const outputDir = path.join(process.cwd(), "output");
  await fs.ensureDir(outputDir);

  const outputPath = path.join(outputDir, `mvlempyr-${novelId}.json`);
  await fs.writeJson(outputPath, novel, { spaces: 2 });

  console.log(`✓ Saved to: ${outputPath}`);

  // Final summary
  console.log(`\n═══════════════════════════════════════`);
  console.log(`IMPORT COMPLETE`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Novel: ${novel.title}`);
  console.log(`Author: ${novel.author}`);
  console.log(`Chapters: ${novel.chapters.length}`);
  console.log(`Size: ${(Buffer.byteLength(JSON.stringify(novel)) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${getDuration(startTime, new Date().toISOString())}`);
  console.log(`Output: ${outputPath}`);
  console.log(`═══════════════════════════════════════\n`);

  return novel;
}

/**
 * Helper: Calculate duration between two ISO timestamps
 */
function getDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * CLI entry point
 */
async function main() {
  // Example: import a novel
  const novelId = "5117";

  try {
    await importNovel(novelId, {
      maxChapters: 50,
      maxFailures: 3,
      onProgress: (progress) => {
        // Log progress every 10 chapters
        if (progress.downloadedChapters % 10 === 0) {
          console.log(
            `Progress: ${progress.downloadedChapters}/${progress.totalChapters}`
          );
        }
      },
    });
  } catch (error) {
    console.error(
      `IMPORTER ERROR: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ImporterOptions, ImportProgress };
