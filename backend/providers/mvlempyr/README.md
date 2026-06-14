# MVLEMPYR Novel Importer

Production-safe, modular novel scraper for [mvlempyr.io](https://www.mvlempyr.io/)

## Features

✅ **Metadata Extraction**
- Title, author, cover image
- Description, genres, tags
- Status (ongoing/completed), rating
- Alternative titles

✅ **Chapter Scraping**
- Sequential discovery
- Robust HTML parsing (fallback selectors)
- Content cleaning (remove ads/junk)
- Error recovery

✅ **Export**
- KRVT-compatible JSON format
- Progress tracking
- Large novel support (1000+ chapters)
- Mobile-friendly (low memory)

✅ **Production Ready**
- Error handling
- Graceful degradation
- Type-safe TypeScript
- Modular architecture

## Quick Start

### Installation

```bash
npm install cheerio
npm install --save-dev typescript ts-node @types/node
```

### Basic Usage

```typescript
import { importNovel } from "./providers/mvlempyr/importer";

const novel = await importNovel("5117", {
  maxChapters: 100,
  onProgress: (p) => console.log(`${p.downloadedChapters}/${p.totalChapters}`),
});

console.log(`✓ ${novel.title}`);
console.log(`✓ ${novel.chapters.length} chapters`);
```

### Just Metadata

```typescript
import { fetchNovelPageHtml, extractMetadata } from "./providers/mvlempyr/metadata";

const html = await fetchNovelPageHtml("mythical-era-my-evolution-into-a-celestial-beast");
const metadata = extractMetadata(html);
console.log(metadata); // { title, author, genres, rating, ... }
```

### Just Chapters

```typescript
import { discoverChapters } from "./providers/mvlempyr/discover";

const chapters = await discoverChapters("5117", { maxChapters: 50 });
chapters.forEach(ch => console.log(`${ch.chapterNumber}: ${ch.chapterTitle}`));
```

## Architecture

```
fetch.ts        → Raw HTML from URLs
      ↓
parser.ts       → Extract title, chapters, paragraphs
      ↓
cleaner.ts      → Remove ads, normalize content
      ↓
discover.ts     → Sequential chapter enumeration
      ↓
metadata.ts     → Extract cover, author, genres, rating
      ↓
importer.ts     → Orchestrate all, export JSON
```

## Files

| File | Purpose |
|------|---------|
| `fetch.ts` | Network layer - fetch HTML with proper headers |
| `parser.ts` | Parse HTML with Cheerio, extract content |
| `cleaner.ts` | Filter ads, normalize paragraphs |
| `discover.ts` | Find all chapters sequentially |
| `metadata.ts` | Extract novel info (NEW) |
| `importer.ts` | Main orchestrator, JSON export |
| `types.ts` | TypeScript type definitions |
| `test.ts` | Test script for debugging |
| `ARCHITECTURE.md` | Detailed design documentation |
| `IMPLEMENTATION_GUIDE.md` | How-to guide with examples |

## What's New (Phase 1)

### Metadata Extraction (`metadata.ts`)

Separate module for extracting novel page metadata:

```typescript
export async function fetchNovelPageHtml(novelId: string): Promise<string>
export function extractMetadata(html: string): NovelMetadata
export function mergeMetadata(novel: any, metadata: NovelMetadata): any
```

**Extracts:**
- Title, Author
- Cover image (with URL normalization)
- Description/Synopsis
- Genres & Tags (smart classification)
- Status (ongoing/completed/unknown)
- Rating (normalized to 0-5 scale)
- Alternative titles

## Output Format

```json
{
  "id": "mvlempyr-5117",
  "title": "Mythical Era: My Evolution Into A Celestial Beast",
  "author": "Author Name",
  "sourceUrl": "https://www.mvlempyr.io/novel/5117",
  "isCompleted": false,
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "image": "https://cdn.example.com/cover.jpg",
  "alternative": "Alt Title 1; Alt Title 2",
  "genres": ["Fantasy", "Cultivation", "Action"],
  "status": "ongoing",
  "rating": 4.5,
  "tags": ["Popular", "Trending"],
  "description": "Full novel description here...",
  "chapters": [
    {
      "id": "5117-1",
      "order": 1,
      "title": "Chapter 1: Beginning",
      "content": ["Paragraph 1...", "Paragraph 2..."]
    }
  ]
}
```

## Testing

```bash
npx ts-node test.ts
```

## Detailed Documentation

- **`ARCHITECTURE.md`** - Deep dive into design, module responsibilities, data flow, memory considerations, extensibility
- **`IMPLEMENTATION_GUIDE.md`** - Complete usage examples, error handling, selector debugging, performance tips

## Performance

- **Sequential processing:** Low memory, mobile-safe
- **For 50 chapters:** ~0.5-2MB JSON, 2-5 minutes
- **For 1000 chapters:** ~10-40MB JSON, 30-90 minutes
- **Memory usage:** <50MB peak

## Requirements

- Node.js 14+
- TypeScript 4.5+
- cheerio (no Puppeteer/Playwright)

## Support

1. Check `ARCHITECTURE.md` for design details
2. Check `IMPLEMENTATION_GUIDE.md` for usage
3. Run `test.ts` to debug
4. Use browser DevTools to inspect selectors

---

**Status:** Production-ready Phase 1 ✓
