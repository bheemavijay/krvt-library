/**
 * Test script for MVLEMPYR scraper
 * Run:
 *   npx tsx test.ts
 */
import fs from "fs";
import { fetchChapterHtml } from "./fetch";
import { fetchNovelPageHtml, extractMetadata } from "./metadata";
import { parseChapter } from "./parser";

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("MVLEMPYR SCRAPER TEST");
  console.log("═══════════════════════════════════════\n");

  // ============================================================
  // TEST 1: Chapter Parsing
  // ============================================================
  console.log("TEST 1: Chapter Parsing");
  console.log("─────────────────────────────────────");

  try {
    const chapterUrl = "https://www.mvlempyr.io/chapter/5117-1";
    console.log(`Fetching: ${chapterUrl}`);

    const html = await fetchChapterHtml(chapterUrl);

    fs.writeFileSync("chapter1.html", html, "utf8");
    console.log("Saved raw HTML to chapter1.html");
    const chapter = parseChapter(html);

    console.log(`✓ Novel Title: ${chapter.novelTitle}`);
    console.log(`✓ Novel URL: ${chapter.novelUrl}`);
    console.log(`✓ Chapter Title: ${chapter.chapterTitle}`);
    console.log(`✓ Paragraphs: ${chapter.paragraphs.length}`);

    console.log("\nFirst 3 paragraphs:");
    chapter.paragraphs.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.substring(0, 80)}...`);
    });
  } catch (error) {
    console.error(
        `✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // ============================================================
  // TEST 2: Metadata Extraction
  // ============================================================
  console.log("\n\nTEST 2: Metadata Extraction");
  console.log("─────────────────────────────────────");

  try {
    const novelUrl =
        "https://www.mvlempyr.io/novel/the-first-legendary-beast-master";

    console.log(`Fetching metadata for: ${novelUrl}`);

    const html = await fetchNovelPageHtml(novelUrl);
    const metadata = extractMetadata(html);

    console.log(`✓ Title: ${metadata.title}`);
    console.log(`✓ Author: ${metadata.author}`);
    console.log(`✓ Status: ${metadata.status}`);
    console.log(`✓ Rating: ${metadata.rating}/5`);
    console.log(`✓ Genres: ${metadata.genres.join(", ") || "—"}`);
    console.log(`✓ Tags: ${metadata.tags.join(", ") || "—"}`);
    console.log(`✓ Cover: ${metadata.coverImage ? "✓" : "✗"}`);

    if (metadata.description) {
      console.log(
          `✓ Description: ${metadata.description.substring(0, 100)}...`
      );
    } else {
      console.log("✓ Description: (empty)");
    }

    console.log(
        `✓ Alternative titles: ${metadata.alternativeTitles.length}`
    );
  } catch (error) {
    console.error(
        `✗ Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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