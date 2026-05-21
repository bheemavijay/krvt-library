import { fetchChapterHtml } from "./fetch";
import { parseChapter } from "./parser";

export type ChapterDiscoveryResult = {
  chapterNumber: number;
  chapterTitle: string;
  url: string;
};

/**
 * Sequentially discover available chapters for a novel
 * 
 * Algorithm:
 * 1. Try chapters 1, 2, 3... sequentially
 * 2. Parse each chapter to validate content quality
 * 3. Stop after N consecutive failures (indicates end of novel)
 * 4. Return array of discovered chapters
 * 
 * This is stable and doesn't require knowing chapter count upfront.
 * Future optimization: could parallelize with chunk size limiting
 */
export async function discoverChapters(
  novelId: string,
  options?: {
    maxFailures?: number;
    maxChapters?: number;
  }
): Promise<ChapterDiscoveryResult[]> {
  const chapters: ChapterDiscoveryResult[] = [];

  const maxFailures = options?.maxFailures ?? 3;
  const maxChapters = options?.maxChapters ?? 999;

  let chapterNumber = 1;
  let consecutiveFailures = 0;

  while (
    consecutiveFailures < maxFailures &&
    chapterNumber <= maxChapters
  ) {
    const url = `https://www.mvlempyr.io/chapter/${novelId}-${chapterNumber}`;

    try {
      const html = await fetchChapterHtml(url);
      const parsed = parseChapter(html);

      // Validation: chapter must have meaningful content
      const hasValidContent =
        parsed.paragraphs.length >= 3 &&
        parsed.chapterTitle !== "Unknown Chapter";

      if (!hasValidContent) {
        console.log(`Chapter ${chapterNumber}: Invalid content (skipped)`);
        consecutiveFailures++;
        chapterNumber++;
        continue;
      }

      // Valid chapter found
      chapters.push({
        chapterNumber,
        chapterTitle: parsed.chapterTitle,
        url,
      });

      console.log(
        `Chapter ${chapterNumber}: ${parsed.chapterTitle}`
      );

      consecutiveFailures = 0;
    } catch (error) {
      console.log(
        `Chapter ${chapterNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      consecutiveFailures++;
    }

    chapterNumber++;
  }

  console.log(
    `Stopped after ${consecutiveFailures} consecutive failures at chapter ${chapterNumber - 1}`
  );

  return chapters;
}
