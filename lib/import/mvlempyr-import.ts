/*
import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  createNovelStoragePaths,
  saveNovelMetadata,
} from "./local-import-storage";

const MVLEMPYR_API_BASE_URL =
  "https://chap.heliosarchive.online/wp-json/wp/v2/mvl-novels";
const DEFAULT_NOVEL_SLUG = "mythical-era-my-evolution-into-a-celestial-beast";

type ImportNovelRecord = {
  title: string;
  slug: string;
  cover: string;
  description: string;
  genres: string[];
  chapters: string[];
};

type WordPressRenderedField = {
  rendered?: string;
};

type MvlempyrApiRecord = {
  slug?: string;
  title?: WordPressRenderedField;
  excerpt?: WordPressRenderedField;
  content?: WordPressRenderedField;
  genres?: string[];
  _embedded?: {
    ["wp:term"]?: Array<Array<{ name?: string; taxonomy?: string }>>;
    ["wp:featuredmedia"]?: Array<{ source_url?: string }>;
  };
  acf?: {
    cover?: string;
    cover_image?: string;
    image?: string;
    genres?: string[] | string;
    description?: string;
    synopsis?: string;
  };
  meta?: {
    cover?: string;
    cover_image?: string;
    description?: string;
    genres?: string[] | string;
  };
};

export async function fetchNovelFromAPI(slug: string): Promise<ImportNovelRecord> {
  const apiUrl = `${MVLEMPYR_API_BASE_URL}?slug=${encodeURIComponent(slug)}&_embed`;
  console.log(`API URL: ${apiUrl}`);

  const response = await axios.get(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    },
    timeout: 30000,
  });

  const payload = Array.isArray(response.data) ? response.data : [];
  console.log(`Response size: ${JSON.stringify(payload).length}`);

  const novel = payload[0] as MvlempyrApiRecord | undefined;

  if (!novel) {
    throw new Error(`No mvlempyr API record found for slug: ${slug}`);
  }

  const title = stripHtml(novel.title?.rendered) || slug;
  const description =
    stripHtml(novel.acf?.description) ||
    stripHtml(novel.acf?.synopsis) ||
    stripHtml(novel.meta?.description) ||
    stripHtml(novel.excerpt?.rendered) ||
    stripHtml(novel.content?.rendered);
  const cover =
    cleanUrl(novel.acf?.cover) ||
    cleanUrl(novel.acf?.cover_image) ||
    cleanUrl(novel.acf?.image) ||
    cleanUrl(novel.meta?.cover) ||
    cleanUrl(novel.meta?.cover_image) ||
    cleanUrl(novel._embedded?.["wp:featuredmedia"]?.[0]?.source_url);
  const genres = uniqueStrings([
    ...normalizeGenres(novel.genres),
    ...normalizeGenres(novel.acf?.genres),
    ...normalizeGenres(novel.meta?.genres),
    ...extractEmbeddedGenres(novel),
  ]);

  console.log(`Extracted title: ${title}`);

  return {
    title,
    slug: cleanText(novel.slug) || slug,
    cover,
    description,
    genres,
    chapters: [],
  };
}

async function run() {
  const input = process.argv[2] ?? DEFAULT_NOVEL_SLUG;
  const slug = extractSlug(input);
  const novel = await fetchNovelFromAPI(slug);
  const storagePaths = createNovelStoragePaths(novel.title);
  saveNovelMetadata(storagePaths.metaPath, novel);

  console.log(`Novel: ${novel.title}`);
  console.log(`Slug: ${novel.slug}`);
  console.log(`Genres: ${novel.genres.join(", ")}`);
  console.log(`Chapters: ${novel.chapters.length}`);
}

function extractSlug(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);

    return segments[segments.length - 1] ?? DEFAULT_NOVEL_SLUG;
  } catch {
    return value;
  }
}

function extractEmbeddedGenres(record: MvlempyrApiRecord) {
  return (
    record._embedded?.["wp:term"]
      ?.flat()
      .filter((term) => term.taxonomy?.includes("genre"))
      .map((term) => cleanText(term.name))
      .filter(Boolean) ?? []
  );
}

function normalizeGenres(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanText(entry)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => cleanText(entry))
      .filter(Boolean);
  }

  return [];
}

function stripHtml(value: string | undefined) {
  return cleanText((value ?? "").replace(/<[^>]+>/g, " "));
}

function cleanUrl(value: string | undefined) {
  return cleanText(value);
}

function cleanText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

void run().catch(console.error);
 */
