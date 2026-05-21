import * as cheerio from "cheerio";

import { cleanParagraphs } from "./cleaner";
import type { ParsedChapter } from "./types";

/**
 * Parse chapter HTML and extract:
 * - Novel title
 * - Chapter title
 * - Paragraph content
 * 
 * Uses multiple selector fallbacks for robustness
 */
export function parseChapter(html: string): ParsedChapter {
  const $ = cheerio.load(html);

  // Extract novel title
  const novelTitle = extractNovelTitle($);

  // Extract novel URL
  const novelUrl = extractNovelUrl($);

  // Extract chapter title
  const chapterTitle = extractChapterTitle($);

  // Extract paragraphs
  const paragraphs = extractParagraphs($);

  return {
    novelTitle,
    novelUrl,
    chapterTitle,
    paragraphs: cleanParagraphs(paragraphs),
  };
}

/**
 * Extract novel URL from chapter page
 */
function extractNovelUrl($: cheerio.CheerioAPI): string {
  const href =
    $("a[href*='/novel/']").first().attr("href") ||
    $("link[rel='canonical']").first().attr("href") ||
    $("meta[property='og:url']").first().attr("content") ||
    "";

  if (!href) {
    return "";
  }

  try {
    return new URL(href, "https://www.mvlempyr.io").toString();
  } catch {
    return "";
  }
}

/**
 * Extract novel title from chapter page
 */
function extractNovelTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    "#novel-name",
    "h1.NovelName",
    ".novel-name",
    "a[href*='/novel/']",
    "h1",
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
 * Extract chapter title from chapter page
 */
function extractChapterTitle($: cheerio.CheerioAPI): string {
  const selectors = [
    "#chapter-name",
    "h2.ChapterName",
    ".chapter-name",
    "h2",
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text && text.length > 0 && text.length < 300) {
      return text;
    }
  }

  return "Unknown Chapter";
}

/**
 * Extract paragraph content from chapter
 * Tries multiple selectors to handle layout variations
 */
function extractParagraphs($: cheerio.CheerioAPI): string[] {
  const selectors = [
    "#chapter p",
    ".ChapterContentWrapper p",
    "article p",
    ".entry-content p",
    ".prose p",
    ".chapter-content p",
    ".story-content p",
  ];

  for (const selector of selectors) {
    const paragraphs = $(selector)
      .map((_, el) => $(el).text().trim())
      .get();

    // If we found paragraphs, return them
    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  // Fallback: return empty array if no paragraphs found
  return [];
}
