import * as cheerio from "cheerio";

import { cleanParagraphs } from "./cleaner";
import type { ParsedChapter } from "./types";

export function parseChapter(html: string): ParsedChapter {
  const $ = cheerio.load(html);

  const novelTitle = extractNovelTitle($);
  const novelUrl = extractNovelUrl($);
  const chapterTitle = extractChapterTitle($);
  const paragraphs = extractParagraphs($);

  return {
    novelTitle,
    novelUrl,
    chapterTitle,
    paragraphs: cleanParagraphs(paragraphs),
  };
}

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

function extractNovelUrl($: cheerio.CheerioAPI): string {
  const selectors = [
    "a[href*='/novel/']",
    "link[rel='canonical']",
    "meta[property='og:url']",
  ];

  for (const selector of selectors) {
    let url = "";

    if (selector.includes("meta")) {
      url = $(selector).attr("content") || "";
    } else {
      url = $(selector).attr("href") || "";
    }

    if (url.includes("/novel/")) {
      if (url.startsWith("/")) {
        return `https://www.mvlempyr.io${url}`;
      }

      return url;
    }
  }

  return "";
}

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

    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  return [];
}