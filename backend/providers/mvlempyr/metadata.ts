import * as cheerio from "cheerio";
import type { RawNovelMetadata } from "./types";

/**
 * Fetches the HTML content of a novel's main page.
 */
export async function fetchNovelPageHtml(novelUrl: string): Promise<string> {
  const response = await fetch(novelUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch novel page: ${response.status}`);
  }

  return await response.text();
}

/**
 * Extracts raw, un-normalized metadata from the novel's HTML page.
 * The provider is only responsible for parsing what it sees.
 * Normalization (e.g., genre/tag splitting, status mapping) is handled by a separate Normalizer layer.
 */
export function extractMetadata(html: string, sourceUrl: string): RawNovelMetadata {
  const $ = cheerio.load(html);

  const title = extractTitle($);
  const author = extractAuthor($);
  const coverUrl = extractCoverUrl($);
  const description = extractDescription($);
  const labels = extractLabels($);
  const status = extractStatus($);
  const rating = extractRating($);
  const alternativeTitles = extractAlternativeTitles($);

  return {
    provider: "mvlempyr",
    sourceUrl,
    title,
    author,
    coverUrl,
    description,
    labels,
    status,
    rating,
    alternativeTitles,
  };
}

function extractTitle($: cheerio.CheerioAPI): string {
  const selectors = ["h1.novel-title", "h1[class*='title']", ".book-title", "h1"];
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }
  return "Unknown Title";
}

function extractAuthor($: cheerio.CheerioAPI): string {
  const selectors = ["span:contains('Author')", "[data-label='Author']", ".author-name"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = (el.next().text() || el.text()).replace(/Author[:\s]*/i, "").trim();
      if (text) return text;
    }
  }
  const metaAuthor = $('meta[name="author"]').attr("content")?.trim();
  return metaAuthor || "Unknown Author";
}

function extractCoverUrl($: cheerio.CheerioAPI): string {
  const selectors = [".novel-cover img", ".book-cover img", "img[alt*='cover' i]"];
  for (const selector of selectors) {
    const src = $(selector).first().attr("src");
    if (src) return src;
  }
  return "";
}

function extractDescription($: cheerio.CheerioAPI): string {
  const selectors = [".novel-description", ".synopsis", ".description"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = el.text().replace(/^(Description|Synopsis)[:\s]*/i, "").trim();
      if (text) return text.replace(/\s+/g, " ").trim();
    }
  }
  const metaDesc = $('meta[name="description"]').attr("content")?.trim();
  return metaDesc || "";
}

/**
 * Extracts all genre-like or tag-like labels from the page.
 * No distinction is made between genres and tags at this stage.
 */
function extractLabels($: cheerio.CheerioAPI): string[] {
  const labels: Set<string> = new Set();
  const selectors = [".genre", ".genres a", ".tag", ".tags a", "[data-tag]"];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        labels.add(text);
      }
    });
  }

  return Array.from(labels);
}

/**
 * Extracts the raw status string (e.g., "Completed", "On-Going").
 */
function extractStatus($: cheerio.CheerioAPI): string {
  const selectors = ["span:contains('Status')", "[data-label='Status']", ".status"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = (el.next().text() || el.text()).trim();
      if (text) return text;
    }
  }
  return "Unknown";
}

function extractRating($: cheerio.CheerioAPI): number {
  const selectors = [".rating-value", ".rating", "[data-rating]"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = el.attr("data-rating") || el.text();
      const match = text.match(/(\d+\.?\d*)/);
      if (match) {
        const rating = parseFloat(match[1]);
        // Return raw rating. Normalization (e.g., to a 5-star scale) is a separate concern.
        return rating;
      }
    }
  }
  return 0;
}

function extractAlternativeTitles($: cheerio.CheerioAPI): string[] {
  const alts: Set<string> = new Set();
  const selectors = [".alternative-title", ".alt-title", "span:contains('Also known as')"];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const text = el.text().replace(/Also known as[:\s]*/i, "").trim();
      text.split(",").forEach((title) => {
        const cleaned = title.trim();
        if (cleaned) alts.add(cleaned);
      });
    }
  }
  return Array.from(alts);
}
