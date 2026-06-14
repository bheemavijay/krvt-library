# MVLEMPYR Novel Importer Architecture

## Overview

Modular, production-safe novel importer for https://www.mvlempyr.io/

**Current capabilities:**
- ✓ Metadata extraction (title, author, cover, description, genres, status, rating)
- ✓ Sequential chapter discovery
- ✓ Chapter HTML parsing with fallback selectors
- ✓ Content cleaning (remove ads, junk)
- ✓ KRVT JSON export
- ✓ Progress tracking
- ✓ Error recovery

**Future-ready for:**
- Resumable imports
- Parallel chapter downloads (with rate limiting)
- Cached metadata
- Multi-provider support
- Mobile import (optimized memory usage)
- Large novel support (1700+ chapters)

---

## Module Breakdown

### 1. `fetch.ts` - Raw HTML Retrieval

**Responsibility:** Fetch HTML from URLs with proper headers

**Functions:**
- `fetchChapterHtml(url)` - Fetch chapter page HTML
- Uses User-Agent to avoid bot detection
- Validates response status and size
- Throws on HTTP errors

**Why separate:** 
- Encapsulates network logic
- Easy to test in isolation
- Can add caching/rate limiting here later
- Can swap implementation (now: fetch API)

---

### 2. `parser.ts` - HTML to Data Extraction

**Responsibility:** Parse HTML using Cheerio, extract structured data

**Functions:**
- `parseChapter(html)` - Extract chapter content from HTML
- `extractNovelTitle()` - Multiple fallback selectors for robustness
- `extractChapterTitle()` - Handle title variations
- `extractParagraphs()` - Try 7 different paragraph selectors

**Selectors (in priority order):**

```
Novel title:      #novel-name → h1.NovelName → .novel-name → h1
Chapter title:    #chapter-name → h2.ChapterName → .chapter-name → h2
Paragraphs:       #chapter p → .ChapterContentWrapper p → article p → etc
```

**Why fallbacks:**
- Site HTML changes frequently
- Different chapter layouts (old vs new content)
- Ensures resilience without complete rewrite

**Returns:** `ParsedChapter` object:
```typescript
{
  novelTitle: string;
  chapterTitle: string;
  paragraphs: string[];
}
```

---

### 3. `cleaner.ts` - Content Quality Control

**Responsibility:** Remove noise from extracted content

**Functions:**
- `cleanParagraphs(paragraphs)` - Filter and normalize

**Processing:**
1. Collapse multiple spaces to single space
2. Remove paragraphs < 2 characters
3. Filter blocked patterns (ads, navigation, prompts)
4. Return clean array

**Blocked patterns:**
- "advertisement"
- "report this ad"
- "continue reading"
- "bookmark"
- "support us"
- "patreon"

**Why separate:**
- Cleaning is independent of source
- Can add language detection later
- Can add keyword extraction
- Reusable across providers

---

### 4. `discover.ts` - Chapter Enumeration

**Responsibility:** Find all available chapters for a novel

**Functions:**
- `discoverChapters(novelId, options)` - Sequential discovery

**Algorithm:**
```
for chapter 1, 2, 3, ... maxChapters:
  try fetch and parse chapter
  if valid content:
    add to results
    reset failure counter
  else:
    increment failure counter
  
  if failures >= maxFailures:
    stop (reached end of novel)
  
  return discovered chapters
```

**Why sequential:**
- No upfront chapter count needed
- Graceful end-of-novel detection
- Low memory (no buffering)
- Mobile-friendly

**Future optimizations:**
- Parallel discovery in chunks (50/50 concurrent)
- Rate limiting (1-2s between requests)
- Resume from last successful chapter
- Binary search if chapter numbering is known

---

### 5. `metadata.ts` - Novel Metadata Extraction

**NEW - Responsibility:** Extract metadata from novel page

**Functions:**
- `fetchNovelPageHtml(novelId)` - Fetch novel info page
- `extractMetadata(html)` - Parse metadata
- `mergeMetadata(novel, metadata)` - Combine with chapter data

**Extracted fields:**
- Title, Author
- Cover image (with URL normalization)
- Description/Synopsis
- Genres (Smart classification)
- Tags (Separate from genres)
- Status (ongoing/completed/unknown)
- Rating (0-5 or 0-10 scale, normalized)
- Alternative titles (comma-separated handling)

**Extraction strategy:**

```
Title:        h1, [class*='title'], .novel-title (+ fallback to h1)
Author:       span:contains('Author'), [data-label], meta[name="author"]
Cover:        img[alt*='cover'], .novel-cover img (+ URL normalization)
Description:  .description, .synopsis, meta[name="description"]
Genres:       .genre, .genres a, [data-tag] (+ smart classification)
Status:       span:contains('Status') (+ pattern matching)
Rating:       .rating-value, [data-rating] (+ scale normalization)
```

**Why separate metadata module:**
- Novel page != Chapter page (different HTML)
- Metadata fetched once per novel, chapters fetched many times
- Enables caching metadata independently
- Clear separation of concerns
- Reusable for novel discovery/listing

---

### 6. `importer.ts` - Orchestration & Export

**Responsibility:** Coordinate all modules, manage flow, export JSON

**Main function:** `importNovel(novelId, options)`

**Flow:**
```
1. Fetch metadata from novel page
2. Discover all chapters
3. For each chapter:
   - Fetch HTML
   - Parse content
   - Handle errors gracefully
   - Track progress
4. Merge metadata with chapters
5. Build KRVT-compatible JSON
6. Write to file
7. Return novel object
```

**Returns:** `KrvtNovel` object:
```typescript
{
  id: string;
  title: string;
  author: string;
  sourceUrl: string;
  isCompleted: boolean;
  lastUpdated: string;
  image: string;
  alternative: string;
  genres: string[];
  status: string;
  rating: number;
  tags: string[];
  description: string;
  chapters: Chapter[];
}
```

**Progress tracking:** `ImportProgress` object for callbacks:
```typescript
{
  novelId: string;
  totalChapters: number;
  downloadedChapters: number;
  failedChapters: number;
  lastSuccessfulChapter: number;
  lastError: string | null;
  startTime: string;
  updatedTime: string;
}
```

**Options:**
```typescript
{
  maxFailures?: number;        // Stop after N failures (default: 3)
  maxChapters?: number;        // Max chapters to import (default: 999)
  skipMetadata?: boolean;      // Skip metadata fetch (default: false)
  onProgress?: (progress) => {}; // Progress callback
}
```

---

### 7. `types.ts` - Type Definitions

**Central type definitions:**

```typescript
ParsedChapter        // Chapter extracted from HTML
NovelMetadata        // Metadata from novel page
Chapter              // Standardized chapter format
KrvtNovel            // Final export format (KRVT-compatible)
ImportProgress       // Progress tracking
ImporterOptions      // Configuration options
```

---

## Data Flow

### Chapter Import Flow

```
Novel ID
    ↓
fetchNovelPageHtml()
    ↓
extractMetadata()  ← (Cover, Author, Description, Genres, Status, Rating)
    ↓
discoverChapters()
    ├→ Chapter 1
    ├→ Chapter 2
    └→ ... Chapter N
    ↓
For each chapter:
    fetchChapterHtml()
    ↓
    parseChapter()  ← (Extract title, paragraphs)
    ↓
    cleanParagraphs()  ← (Remove ads, noise)
    ↓
    Chapter object
    ↓
mergeMetadata() + Build KrvtNovel
    ↓
Export JSON
```

---

## Memory & Performance Considerations

### Current Status

**Good:**
- ✓ Sequential processing (low peak memory)
- ✓ Streaming-friendly (process chapter by chapter)
- ✓ No buffering of full novel in memory until final step
- ✓ Mobile-safe for novels with 1000+ chapters

**Potential bottlenecks:**

1. **HTML Parsing**
   - Cheerio loads entire HTML in memory
   - Risk: Very large chapter pages (rare)
   - Mitigation: Already validates response size in fetch.ts

2. **Full JSON Serialization**
   - KrvtNovel built in memory before export
   - For 1700+ chapters: ~10-50MB JSON
   - Risk: Mobile devices with limited RAM
   - Mitigation: JSON.stringify is buffered by fs-extra

3. **Parallel Requests** (Future)
   - Current: Sequential (safe, no blocking)
   - Future: 5-10 parallel requests
   - Must add rate limiting to avoid bans

### Recommendations

**Now:**
- Keep sequential processing
- Good baseline for stability

**Later (Phase 2):**
- Add resumable imports (save progress to IndexedDB)
- Implement streaming JSON export
- Cache metadata to avoid re-fetching

**Later (Phase 3):**
- Parallel chapter downloads with rate limiting
- Memory-efficient chapter batching
- Consider Chapter pruning for local storage

---

## Error Handling

### Current Strategy

**Graceful Degradation:**
- Missing metadata → use defaults, continue
- Bad chapter → skip, track, continue
- Network error → retry logic in fetch (add later)
- Invalid HTML → clean returns empty paragraphs

**Validation:**
- Chapter must have 3+ paragraphs
- Chapter title must not be "Unknown"
- Novel title required (defaults to "Unknown Novel")

**Tracking:**
- Progress object logs all errors
- Failed chapters tracked separately
- Last error message stored

---

## Extensibility

### Adding a New Provider (e.g., NovelFull)

**Minimal changes needed:**

1. Create `providers/novelfull/` folder
2. Copy structure from mvlempyr:
   - `fetch.ts` - Update URL patterns
   - `parser.ts` - Update selectors
   - `cleaner.ts` - Reuse (same logic)
   - `discover.ts` - Update URL pattern
   - `metadata.ts` - Update selectors
   - `types.ts` - Reuse
   - `importer.ts` - Reuse with URL changes
3. Create provider router in main importer

**Example:** `providers/index.ts`
```typescript
export async function importNovel(provider: 'mvlempyr' | 'novelfull', novelId: string) {
  if (provider === 'mvlempyr') {
    return import('./mvlempyr/importer').then(m => m.importNovel(novelId));
  } else if (provider === 'novelfull') {
    return import('./novelfull/importer').then(m => m.importNovel(novelId));
  }
}
```

---

## Testing Strategy

**Current:** `test.ts`
- Tests chapter parsing
- Tests metadata extraction
- Validates selectors against live site

**Improvements (Phase 2):**
- Mock HTML fixtures for each selector type
- Unit tests for each function
- Integration tests (end-to-end)
- Regression tests when site HTML changes

---

## Deployment

**Build:**
```bash
npx tsc --target ES2020 --module commonjs
```

**Run:**
```bash
node dist/providers/mvlempyr/importer.js
```

**CLI Usage:**
```bash
npx ts-node providers/mvlempyr/importer.ts --novel-id 5117 --max-chapters 100
```

---

## Future Roadmap

### Phase 1 (Current)
- ✓ Basic chapter scraping
- ✓ Metadata extraction
- ✓ JSON export
- ✓ Progress tracking

### Phase 2
- Resumable imports (save to IndexedDB)
- Retry logic for network failures
- Batch operations (import 10 novels)
- Caching layer for metadata
- CLI with arguments

### Phase 3
- Parallel downloads (with rate limiting)
- WebSocket progress updates (for UI)
- Mobile-optimized storage
- Multi-provider support
- Novel discovery (search, listings)

### Phase 4
- User-facing import UI
- Background import service (service worker)
- Sync across devices
- Library management
- Reading statistics

---

## Support & Troubleshooting

**Novel metadata not extracting:**
1. Check if novel URL is correct
2. Inspect HTML with browser DevTools
3. Update selectors in `metadata.ts`

**Chapters stopping early:**
1. Check `maxFailures` option (default: 3)
2. Verify chapter URLs follow pattern: `chapter/{novelId}-{chapterNumber}`
3. Check if chapters actually exist on site

**Large JSON file:**
- Normal for 1000+ chapters
- Example: 50 chapters ~0.5-2MB, 1000 chapters ~10-40MB

**Memory issues on mobile:**
- Reduce `maxChapters` option
- Use resumable imports (Phase 2)
- Process in smaller batches
