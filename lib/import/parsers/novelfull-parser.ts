import * as cheerio from "cheerio";

const NOVELFULL_BASE_URL = "https://novelfull.net";

export type NovelfullChapter = {
  title: string;
  content: string[];
};

export type NovelfullParsedNovel = {
  title: string;
  cover: string;
  description: string;
  genres: string[];
  chapters: string[];
};

type ParseNovelOptions = {
  novelUrl?: string;
  fetchHtml?: (url: string) => Promise<string>;
};

export function parseNovel(html: string): NovelfullParsedNovel;
export function parseNovel(
  html: string,
  options: ParseNovelOptions,
): Promise<NovelfullParsedNovel>;
export function parseNovel(html: string, options?: ParseNovelOptions) {
  const $ = cheerio.load(html);
  const metadata = extractMetadata($);
  const chapters = extractChapterLinks($);

  if (!options?.novelUrl || !options.fetchHtml) {
    return {
      ...metadata,
      chapters,
    };
  }

  return parseNovelWithPagination(metadata, options);
}

export function parseChapter(html: string): NovelfullChapter {
  const $ = cheerio.load(html);

  const title = cleanText(
    $(".chapter-title, .chr-title, #chapter-title, h1").first().text(),
  );

  const content = uniqueParagraphs(
    $("#chapter-content p, .chapter-content p")
      .map((_, el) => cleanText($(el).text()))
      .get(),
  );

  return { title, content };
}

/* ---------------- METADATA ---------------- */

function extractMetadata($: cheerio.CheerioAPI) {
  const title =
    cleanText($("h3.title").first().text()) ||
    cleanText($("h1").first().text());

  let cover = $(".book img").attr("src") || "";
  if (cover && !cover.startsWith("http")) {
    cover = normalizeUrl(cover);
  }

  const description = cleanText($("#noidungm").text());

  const genres = uniqueStrings(
    $(".info a[href*='/genre/']")
      .map((_, el) => $(el).text())
      .get(),
  );

  return { title, cover, description, genres };
}
function extractChapterLinks($: cheerio.CheerioAPI) {
  return Array.from(
    new Set(
      $("#list-chapter li a, .panel-story-chapter-list li a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .map((href) => normalizeUrl(href))
        .filter((href) => href.includes("/chapter-")),
    ),
  );
}
/* ---------------- PAGINATION ---------------- */

async function parseNovelWithPagination(
  metadata: Omit<NovelfullParsedNovel, "chapters">,
  options: ParseNovelOptions,
) {
  const fetchHtml = options.fetchHtml!;
  const baseUrl = options.novelUrl!;

  const allChapters: string[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= 100; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;

    console.log(`Fetching list page: ${page}`);

    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      const links = $("#list-chapter li a, .panel-story-chapter-list li a")
        .map((_, el) => $(el).attr("href"))
        .get()
        .map(normalizeUrl)
        .filter((href) => href.includes("/chapter-"));

      console.log(`Page ${page} → ${links.length}`);

      if (links.length === 0) break;

      let newCount = 0;

      for (const link of links) {
        if (!seen.has(link)) {
          seen.add(link);
          allChapters.push(link);
          newCount++;
        }
      }

      if (newCount === 0) break;
    } catch {
      break;
    }
  }

  return {
    ...metadata,
    chapters: allChapters,
  };
}

/* ---------------- HELPERS ---------------- */

function normalizeUrl(url: string) {
  try {
    return new URL(url, NOVELFULL_BASE_URL).toString();
  } catch {
    return "";
  }
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function uniqueStrings(arr: string[]) {
  return Array.from(new Set(arr.map(cleanText).filter(Boolean)));
}

function uniqueParagraphs(arr: string[]) {
  return Array.from(
    new Set(
      arr.filter(
        (p) =>
          p.length > 20 &&
          !p.toLowerCase().includes("next chapter") &&
          !p.toLowerCase().includes("previous chapter"),
      ),
    ),
  );
}