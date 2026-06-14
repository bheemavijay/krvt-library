# Implementation Guide - MVLEMPYR Importer

## Installation

```bash
npm install cheerio
npm install --save-dev typescript ts-node @types/node
```

## File Structure

Place files in your backend:

```
backend/
  providers/
    mvlempyr/
      fetch.ts          # Raw HTML fetching
      parser.ts         # HTML parsing (chapters)
      cleaner.ts        # Content cleaning
      discover.ts       # Chapter discovery
      metadata.ts       # Metadata extraction (NEW)
      importer.ts       # Orchestration & export
      types.ts          # Type definitions
      test.ts           # Testing
      ARCHITECTURE.md   # Documentation
```

## Basic Usage

### Import a Single Novel

```typescript
import { importNovel } from "./providers/mvlempyr/importer";

async function main() {
  const novel = await importNovel("5117", {
    maxChapters: 100,
    maxFailures: 3,
    onProgress: (progress) => {
      console.log(
        `Imported ${progress.downloadedChapters}/${progress.totalChapters}`
      );
    },
  });

  console.log(`Imported: ${novel.title}`);
  console.log(`Chapters: ${novel.chapters.length}`);
  console.log(`File: ${novel.id}.json`);
}

main().catch(console.error);
```

### Import Without Metadata (faster)

```typescript
await importNovel("5117", {
  skipMetadata: true,  // Skip novel page fetch
  maxChapters: 50,
});
```

### Batch Import (Multiple Novels)

```typescript
const novelIds = ["5117", "5118", "5119"];

for (const id of novelIds) {
  console.log(`Importing ${id}...`);
  try {
    const novel = await importNovel(id);
    console.log(`✓ ${novel.title}`);
  } catch (error) {
    console.error(`✗ Failed: ${error.message}`);
  }
}
```

## Extract Only Metadata (No Chapters)

```typescript
import { fetchNovelPageHtml, extractMetadata } from "./providers/mvlempyr/metadata";

async function getNovelInfo(novelId: string) {
  const html = await fetchNovelPageHtml(novelId);
  const metadata = extractMetadata(html);

  return {
    title: metadata.title,
    author: metadata.author,
    description: metadata.description,
    genres: metadata.genres,
    cover: metadata.coverImage,
    rating: metadata.rating,
  };
}

const info = await getNovelInfo("mythical-era-my-evolution-into-a-celestial-beast");
console.log(info);
```

## Extract Only Chapters (No Metadata)

```typescript
import { discoverChapters } from "./providers/mvlempyr/discover";
import { fetchChapterHtml } from "./providers/mvlempyr/fetch";
import { parseChapter } from "./providers/mvlempyr/parser";

async function getChapters(novelId: string) {
  const chapters = await discoverChapters(novelId, { maxChapters: 50 });

  const contents = [];
  for (const ch of chapters) {
    const html = await fetchChapterHtml(ch.url);
    const parsed = parseChapter(html);
    contents.push({
      number: ch.chapterNumber,
      title: ch.chapterTitle,
      paragraphs: parsed.paragraphs,
    });
  }

  return contents;
}
```

## Custom Chapter Discovery

```typescript
import { discoverChapters } from "./providers/mvlempyr/discover";

// Discover up to 1000 chapters, stop after 5 consecutive failures
const chapters = await discoverChapters("5117", {
  maxChapters: 1000,
  maxFailures: 5,
});

console.log(`Found ${chapters.length} chapters`);
chapters.forEach((ch) => {
  console.log(`${ch.chapterNumber}: ${ch.chapterTitle}`);
});
```

## Export to KRVT Format

The importer already exports to KRVT-compatible JSON:

```typescript
const novel = await importNovel("5117");

// novel.json structure:
{
  "id": "mvlempyr-5117",
  "title": "Mythical Era...",
  "author": "Author Name",
  "sourceUrl": "https://www.mvlempyr.io/novel/5117",
  "isCompleted": false,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "image": "https://..../cover.jpg",
  "alternative": "Alt Title 1; Alt Title 2",
  "genres": ["Fantasy", "Cultivation", "Action"],
  "status": "ongoing",
  "rating": 4.5,
  "tags": ["Popular", "Trending"],
  "description": "Novel description here...",
  "chapters": [
    {
      "id": "5117-1",
      "order": 1,
      "title": "Chapter 1: Beginning",
      "content": ["Paragraph 1", "Paragraph 2", "..."]
    },
    // ... more chapters
  ]
}
```

## Error Handling

### Handle Import Failures

```typescript
import { importNovel, ImportProgress } from "./providers/mvlempyr/importer";

try {
  const novel = await importNovel("5117", {
    onProgress: (progress: ImportProgress) => {
      if (progress.lastError) {
        console.warn(`Error: ${progress.lastError}`);
      }
      if (progress.failedChapters > 0) {
        console.log(`Failed: ${progress.failedChapters} chapters`);
      }
    },
  });
} catch (error) {
  if (error instanceof Error) {
    console.error(`Import failed: ${error.message}`);
  }
}
```

### Retry Failed Chapters

```typescript
async function importWithRetry(
  novelId: string,
  maxAttempts: number = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts}...`);
      return await importNovel(novelId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt} failed: ${lastError.message}`);
      
      // Wait before retrying (exponential backoff)
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError;
}

const novel = await importWithRetry("5117");
```

## Testing Selectors

If extraction isn't working:

```typescript
import { fetchChapterHtml } from "./providers/mvlempyr/fetch";
import { parseChapter } from "./providers/mvlempyr/parser";
import * as cheerio from "cheerio";

async function debugSelectors(chapterUrl: string) {
  const html = await fetchChapterHtml(chapterUrl);
  const $ = cheerio.load(html);

  // Test selectors manually
  console.log("Title selectors:");
  console.log("#novel-name:", $("#novel-name").text());
  console.log("h1.NovelName:", $("h1.NovelName").text());
  console.log(".novel-name:", $(".novel-name").text());

  console.log("\nParagraph counts:");
  console.log("#chapter p:", $("#chapter p").length);
  console.log(".ChapterContentWrapper p:", $(".ChapterContentWrapper p").length);
  console.log("article p:", $("article p").length);
}

await debugSelectors("https://www.mvlempyr.io/chapter/5117-1");
```

## Update Selectors When Site Changes

1. Run `test.ts` to see what's failing
2. Open chapter page in browser
3. Inspect HTML with DevTools
4. Update selectors in `parser.ts` or `metadata.ts`
5. Re-run test

Example update in `parser.ts`:

```typescript
function extractNovelTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    // Add new selector if site changed:
    ".new-novel-title-class",  // ← Add here
    "#novel-name",
    "h1.NovelName",
    // ...
  ];
  // ... rest of function
}
```

## Performance Tips

### For Large Novels (1000+ chapters)

```typescript
// Limit to first 500 chapters
const novel = await importNovel("5117", {
  maxChapters: 500,  // Don't import all at once
  maxFailures: 5,
});

// Later: import more chapters
const moreChapters = await importNovel("5117", {
  maxChapters: 1000,
});
```

### Rate Limiting (Add Later)

```typescript
// Current: no delay between requests
// To add: modify fetch.ts

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchChapterHtml(url: string): Promise<string> {
  await sleep(1000); // Add 1s delay between requests
  // ... rest of function
}
```

### Parallel Downloads (Phase 2)

Currently sequential. For parallel:

```typescript
// Future implementation (not yet stable)
async function downloadChaptersParallel(
  chapters: ChapterDiscoveryResult[],
  concurrency: number = 5
) {
  const queue = [];
  const results = [];

  for (const chapter of chapters) {
    const promise = (async () => {
      const html = await fetchChapterHtml(chapter.url);
      const parsed = parseChapter(html);
      return { ...chapter, parsed };
    })();

    queue.push(promise);

    if (queue.length >= concurrency) {
      const result = await Promise.race(queue);
      results.push(result);
      queue.splice(queue.indexOf(result), 1);
    }
  }

  // Wait for remaining
  results.push(...(await Promise.all(queue)));
  return results;
}
```

## Debugging

### Enable Verbose Logging

Modify `importer.ts` to add more `console.log` calls:

```typescript
console.log(`Fetching chapter ${discovered.chapterNumber}...`);
console.log(`HTML length: ${html.length} bytes`);
console.log(`Extracted ${parsed.paragraphs.length} paragraphs`);
```

### Check JSON Output

```bash
# View first chapter
jq '.chapters[0]' mvlempyr-5117.json

# View metadata
jq '{title, author, rating, genres}' mvlempyr-5117.json

# Check file size
ls -lh mvlempyr-5117.json
```

## Common Issues

### Issue: "No chapters discovered"

**Cause:** Novel ID format is wrong or site doesn't have chapters

**Fix:**
1. Verify URL: `https://www.mvlempyr.io/chapter/{novelId}-1` exists
2. Check browser console for 404 errors
3. Try with shorter `maxChapters` value

### Issue: Missing metadata

**Cause:** Metadata extraction selectors don't match site HTML

**Fix:**
1. Run `test.ts` to debug
2. Use DevTools to find correct selectors
3. Update `metadata.ts` with new selectors
4. Re-run import

### Issue: Paragraphs are empty

**Cause:** Paragraph selectors don't match new HTML layout

**Fix:**
1. Open chapter in browser
2. Inspect element on a paragraph
3. Note the class/id
4. Add selector to `parser.ts` in priority order

### Issue: Large JSON file (>100MB)

**Cause:** Importing very long novel (1000+ chapters)

**Fix:**
- This is normal
- Use `maxChapters` to limit
- Consider splitting into batches
- Compress JSON with gzip

## Next Steps

1. **Test:** Run `test.ts` on a live novel
2. **Verify:** Check JSON output structure
3. **Integrate:** Add to your backend API
4. **Monitor:** Track import success rates
5. **Improve:** Add more error handling based on real usage

## Support

- Check `ARCHITECTURE.md` for detailed design docs
- Read `test.ts` for examples
- Inspect HTML with browser DevTools when selectors fail
- Add logging to debug specific functions
