/**
 * Test script for metadata extraction
 * Run: npx ts-node test.ts
 */

import { fetchChapterHtml } from "./fetch";
import { fetchNovelPageHtml, extractMetadata } from "./metadata";
import { parseChapter } from "./parser";

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("MVLEMPYR SCRAPER TEST");
  console.log("═══════════════════════════════════════\n");

  // Test 1: Chapter parsing
  console.log("TEST 1: Chapter Parsing");
  console.log("─────────────────────────────────────");
  try {
    const chapterUrl = "https://www.mvlempyr.io/chapter/5117-1";
    console.log(`Fetching: ${chapterUrl}`);

    const html = await fetchChapterHtml(chapterUrl);
    const chapter = parseChapter(html);

    console.log(`✓ Novel Title: ${chapter.novelTitle}`);
    console.log(`✓ Chapter Title: ${chapter.chapterTitle}`);
    console.log(`✓ Paragraphs: ${chapter.paragraphs.length}`);
    console.log(`\nFirst 3 paragraphs:`);
    chapter.paragraphs.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.substring(0, 80)}...`);
    });
  } catch (error) {
    console.error(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  // Test 2: Metadata extraction
  console.log("\n\nTEST 2: Metadata Extraction");
  console.log("─────────────────────────────────────");
  try {
    const novelId = "mythical-era-my-evolution-into-a-celestial-beast";
    console.log(`Fetching metadata for: ${novelId}`);

    const html = await fetchNovelPageHtml(novelId);
    const metadata = extractMetadata(html);

    console.log(`✓ Title: ${metadata.title}`);
    console.log(`✓ Author: ${metadata.author}`);
    console.log(`✓ Status: ${metadata.status}`);
    console.log(`✓ Rating: ${metadata.rating}/5`);
    console.log(`✓ Genres: ${metadata.genres.join(", ") || "—"}`);
    console.log(`✓ Tags: ${metadata.tags.join(", ") || "—"}`);
    console.log(`✓ Cover: ${metadata.coverImage ? "✓" : "✗"}`);
    console.log(`✓ Description: ${metadata.description.substring(0, 100)}...`);
    console.log(`✓ Alternative titles: ${metadata.alternativeTitles.length}`);
  } catch (error) {
    console.error(`✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("TESTS COMPLETE");
  console.log("═══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("TEST ERROR:");
  console.error(err);
  process.exit(1);
});
