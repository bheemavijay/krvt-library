import * as cheerio from "cheerio";
import type { NovelMetadata } from "./types";

/**
 * Fetch metadata from novel page (not chapter page)
 * 
 * This is separate from chapter fetching for:
 * - Clarity of intent
 * - Reusability for novel listing
 * - Future caching of metadata
 */
export async function fetchNovelPageHtml(
  novelUrl: string
): Promise<string> {
  const response = await fetch(novelUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch novel page: ${response.status}`);
  }

  return await response.text();
}

/**
 * Extract metadata from novel HTML page
 * 
 * Extracts:
 * - Title
 * - Author
 * - Cover image
 * - Description
 * - Genres
 * - Status (ongoing/completed)
 * - Rating
 * - Alternative titles
 * - Tags
 * 
 * Uses fallback selectors for robustness
 */
export function extractMetadata(html: string): NovelMetadata {
  const $ = cheerio.load(html);

  // Extract title - try multiple selectors
  const title = extractTitle($);

  // Extract author - try multiple selectors
  const author = extractAuthor($);

  // Extract cover image URL
  const coverImage = extractCoverImage($);

  // Extract description/synopsis
  const description = extractDescription($);

  // Extract genres and tags
  const { genres, tags } = extractGenresAndTags($);

  // Extract status (ongoing/completed)
  const status = extractStatus($);

  // Extract rating
  const rating = extractRating($);

  // Extract alternative titles
  const alternativeTitles = extractAlternativeTitles($);

  return {
    title,
    author,
    coverImage,
    description,
    genres,
    tags,
    status,
    rating,
    alternativeTitles,
  };
}

/**
 * Extract novel title from multiple possible selectors
 */
function extractTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    "h1.novel-title",           // common pattern
    "h1[class*='title']",       // h1 with title in class
    ".novel-header h1",         // h1 in header
    ".book-title",
    "h1",                       // fallback to first h1
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text && text.length > 0 && text.length < 300) {
      return text;
    }
  }

  return "Unknown Novel";
}

/**
 * Extract author from metadata section
 */
function extractAuthor($: cheerio.CheerioAPI): string {
  // Try specific author field patterns
  const selectors = [
    "span:contains('Author')",
    "[data-label='Author']",
    ".author-name",
    ".novel-meta span:contains('Author')",
  ];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      // Author might be in next element or sibling
      const text = el.next().text().trim() || el.text().trim();
      const cleaned = text.replace(/Author[:\s]*/i, "").trim();
      if (cleaned && cleaned.length > 0 && cleaned.length < 100) {
        return cleaned;
      }
    }
  }

  // Fallback: look in meta tags
  const metaAuthor = $('meta[name="author"]').attr("content")?.trim();
  if (metaAuthor) return metaAuthor;

  return "Unknown Author";
}

/**
 * Extract cover image URL
 */
function extractCoverImage($: cheerio.CheerioAPI): string {
  // Try common cover image selectors
  const selectors = [
    ".novel-cover img",
    ".book-cover img",
    ".cover-image img",
    ".novel-poster img",
    "img[alt*='cover' i]",
    "img[alt*='book' i]",
    ".sidebar img:first",
    "img[src*='cover']",
    "img[src*='image']",
  ];

  for (const selector of selectors) {
    const src = $(selector).first().attr("src");
    if (src && src.length > 0 && (src.startsWith("http") || src.startsWith("/"))) {
      // Convert relative URLs to absolute
      if (src.startsWith("/")) {
        return `https://www.mvlempyr.io${src}`;
      }
      return src;
    }
  }

  return "";
}

/**
 * Extract description/synopsis
 */
function extractDescription($: cheerio.CheerioAPI): string {
  // Try common description selectors
  const selectors = [
    ".novel-description",
    ".synopsis",
    ".description",
    ".novel-summary",
    ".book-description",
    "section:contains('Description')",
    "[class*='description']",
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      let text = el.text().trim();

      // Remove header labels like "Description:" if present
      text = text.replace(/^(Description|Synopsis)[:\s]*/i, "").trim();

      if (text.length > 20 && text.length < 5000) {
        // Clean up whitespace
        text = text.replace(/\s+/g, " ").trim();
        return text;
      }
    }
  }

  // Fallback: meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  if (metaDesc && metaDesc.length > 20) {
    return metaDesc;
  }

  return "";
}

/**
 * Extract genres and tags
 */
function extractGenresAndTags(
  $: cheerio.CheerioAPI
): { genres: string[]; tags: string[] } {
  const genres: Set<string> = new Set();
  const tags: Set<string> = new Set();

  // Genre/tag selectors
  const genreSelectors = [
    ".genre",
    ".genres a",
    ".tag",
    ".tags a",
    "[data-tag]",
    "span[class*='genre']",
    "span[class*='tag']",
    "a[class*='genre']",
    "a[class*='tag']",
  ];

  for (const selector of genreSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 0 && text.length < 50) {
        // Classify as genre or tag based on common patterns
        const lower = text.toLowerCase();
        if (
          [
            "fantasy",
            "sci-fi",
            "romance",
            "action",
            "adventure",
            "mystery",
            "thriller",
            "horror",
            "comedy",
            "drama",
            "slice of life",
            "supernatural",
            "martial arts",
            "cultivation",
            "game",
            "system",
            "regression",
            "transmigration",
            "reincarnation",
            "school",
            "modern",
            "historical",
          ].some((g) => lower.includes(g))
        ) {
          genres.add(text);
        } else {
          tags.add(text);
        }
      }
    });
  }

  return {
    genres: Array.from(genres),
    tags: Array.from(tags),
  };
}

/**
 * Extract status (ongoing/completed)
 */
function extractStatus(
  $: cheerio.CheerioAPI
): "ongoing" | "completed" | "unknown" {
  const statusSelectors = [
    "span:contains('Status')",
    "[data-label='Status']",
    ".status",
  ];

  for (const selector of statusSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      const text = (el.next().text() || el.text()).toLowerCase().trim();

      if (text.includes("completed") || text.includes("finished")) {
        return "completed";
      }

      if (text.includes("ongoing") || text.includes("updating")) {
        return "ongoing";
      }
    }
  }

  return "unknown";
}

/**
 * Extract rating (0-5 or 0-10 scale)
 */
function extractRating($: cheerio.CheerioAPI): number {
  const ratingSelectors = [
    ".rating-value",
    ".rating",
    "[data-rating]",
    "span:contains('Rating')",
  ];

  for (const selector of ratingSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      const text = el.attr("data-rating") || el.text();
      const match = text.match(/(\d+\.?\d*)/);

      if (match) {
        const rating = parseFloat(match[1]);
        // Normalize to 0-5 scale if needed
        if (rating > 5 && rating <= 10) {
          return rating / 2;
        }
        if (rating >= 0 && rating <= 5) {
          return rating;
        }
      }
    }
  }

  return 0;
}

/**
 * Extract alternative titles (if novel has multiple names)
 */
function extractAlternativeTitles($: cheerio.CheerioAPI): string[] {
  const alts: Set<string> = new Set();

  const selectors = [
    ".alternative-title",
    ".alt-title",
    "[class*='alternative']",
    "span:contains('Also known as')",
  ];

  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0) {
      const text = el
        .text()
        .replace(/Also known as[:\s]*/i, "")
        .trim();

      // Alternative titles are often comma-separated
      text.split(",").forEach((title) => {
        const cleaned = title.trim();
        if (cleaned && cleaned.length > 0 && cleaned.length < 300) {
          alts.add(cleaned);
        }
      });
    }
  }

  return Array.from(alts);
}

/**
 * Merge metadata with existing novel data
 * Useful when you already have chapters but need metadata
 */
export function mergeMetadata(
  novelData: any,
  metadata: NovelMetadata
): any {
  return {
    ...novelData,
    title: metadata.title || novelData.title,
    author: metadata.author || novelData.author,
    image: metadata.coverImage || novelData.image,
    description: metadata.description || novelData.description,
    genres: metadata.genres.length > 0 ? metadata.genres : novelData.genres,
    tags: metadata.tags.length > 0 ? metadata.tags : novelData.tags,
    status: metadata.status !== "unknown" ? metadata.status : novelData.status,
    rating:
      metadata.rating > 0
        ? metadata.rating
        : novelData.rating || 0,
    alternative:
      metadata.alternativeTitles.length > 0
        ? metadata.alternativeTitles.join("; ")
        : novelData.alternative,
  };
}
