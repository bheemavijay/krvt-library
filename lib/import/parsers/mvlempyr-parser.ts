import * as cheerio from "cheerio";

const MVLEMPYR_BASE_URL = "https://www.mvlempyr.io";

export type MvlempyrNovelDetails = {
  title: string;
  author: string;
  description: string;
  tags: string[];
  coverImage: string;
};

export type MvlempyrChapter = {
  title: string;
  content: string[];
};

export type MvlempyrParsedNovel = MvlempyrNovelDetails & {
  chapters: string[];
};

export function parseNovelDetails(html: string): MvlempyrNovelDetails {
  const $ = parseHtml(html);
  removeNoise($);
  const title = firstText($, [
    "h1.novel-title",
    ".novel-hero h1",
    "main h1",
    "article h1",
    "h1",
  ]);
  const author = firstText($, [
    "div.mobileauthorname",
    ".novel-meta [class*='author']",
    "[class*='author']",
    "[data-author]",
  ]);
  const description = firstText($, [
    "div.synopsis p",
    ".novel-meta .synopsis",
    "div.synopsis",
    "meta[name='description']",
  ]);
  const tags = uniqueStrings(
    queryTexts($, [".genere-tagslist a", ".genere-tagslist button", "[class*='genre'] a"])
      .map((tag) => tag.replace(/^#/, ""))
      .filter(isLikelyTag),
  );
  const coverImage = cleanUrl(
    firstAttribute($, [".novel-image-wrapper img", ".novel-hero img", "main img", "img"], [
      "src",
      "data-src",
    ]),
  );

  return {
    title,
    author,
    description,
    tags,
    coverImage,
  };
}

export function parseChapterList(html: string): string[] {
  const raw = parseHtml(html);
  const chapterCount = extractChapterCount(raw);
  const $ = parseHtml(html);
  removeNoise($);
  const links = uniqueStrings(
    queryAttributes(
      $,
      [
        ".chapter-list a.chapter-item",
        ".chapter-list a[href*='/chapter/']",
        "[class*='chapter'] a[href*='/chapter/']",
        "a.chapter-item",
      ],
      "href",
    )
      .map((href) => normalizeUrl(href))
      .filter((href) => href.includes("/chapter/"))
      .filter(Boolean),
  );

  if (links.length > 0) {
    return links;
  }

  const slug = extractSlugFromCover($);

  if (!slug || !chapterCount || chapterCount < 1) {
    return [];
  }

  return Array.from({ length: chapterCount }, (_, index) =>
    `${MVLEMPYR_BASE_URL}/chapter/${slug}-${index + 1}`,
  );
}

export function parseChapter(html: string): MvlempyrChapter {
  const $ = parseHtml(html);
  removeNoise($);
  const title = firstText($, [".cha-tit h1", ".chapter-shell h1", "#chapter h1", "main h1", "h1"]);
  const content = extractChapterParagraphs($);

  return {
    title,
    content,
  };
}

export function parseNovel(html: string): MvlempyrParsedNovel {
  return {
    ...parseNovelDetails(html),
    chapters: parseChapterList(html),
  };
}

function parseHtml(html: string) {
  return cheerio.load(html);
}

function removeNoise($: cheerio.CheerioAPI) {
  $(
    "script, style, svg, path, noscript, iframe, button, canvas, form, nav, .ads, .advertisement, [class*='ad-'], [id*='ad-'], [aria-hidden='true']",
  ).remove();
}

function firstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const element = $(selector).first();
    const text = selector.startsWith("meta[")
      ? cleanText(element.attr("content"))
      : cleanText(element.text());

    if (text) {
      return text;
    }
  }

  return "";
}

function extractChapterParagraphs($: cheerio.CheerioAPI) {
  const roots = [
    $(".cha-words").first(),
    $(".chapter-shell .cha-words").first(),
    $("#chapter-content").first(),
    $("main article").first(),
    $("main").first(),
  ].filter((root) => root.length > 0);

  for (const root of roots) {
    const paragraphs = uniqueParagraphs(
      root
        .find("p, div")
        .map((_, element) => cleanText($(element).text()))
        .get(),
    );

    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  return [];
}

function firstAttribute(
  $: cheerio.CheerioAPI,
  selectors: string[],
  attributes: string[],
) {
  for (const selector of selectors) {
    const element = $(selector).first();

    if (element.length === 0) {
      continue;
    }

    for (const attribute of attributes) {
      const value = element.attr(attribute);

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function queryTexts($: cheerio.CheerioAPI, selectors: string[]) {
  const values: string[] = [];

  for (const selector of selectors) {
    values.push(
      ...$(selector)
        .map((_, element) => cleanText($(element).text()))
        .get()
        .filter(Boolean),
    );
  }

  return values;
}

function queryAttributes(
  $: cheerio.CheerioAPI,
  selectors: string[],
  attribute: string,
) {
  const values: string[] = [];

  for (const selector of selectors) {
    values.push(
      ...$(selector)
        .map((_, element) => {
          const current = $(element);
          const href = current.attr(attribute);

          if (href) {
            return href;
          }

          return current.closest("a").attr(attribute) ?? "";
        })
        .get()
        .filter(Boolean),
    );
  }

  return values;
}

function extractSlugFromCover($: cheerio.CheerioAPI) {
  const coverImage = cleanUrl(
    firstAttribute($, ["div.novel-image-wrapper img", "img"], ["src", "data-src"]),
  );

  if (!coverImage) {
    return "";
  }

  const fileName = coverImage.split("/").pop() ?? "";

  return fileName.split(".")[0] ?? "";
}

function extractChapterCount($: cheerio.CheerioAPI) {
  const chapterCountText = cleanText($("div#chapter-count").first().text());
  const directCount = Number.parseInt(chapterCountText, 10);

  if (Number.isFinite(directCount) && directCount > 0) {
    return directCount;
  }

  const scripts = $("script")
    .map((_, script) => $(script).html() ?? "")
    .get()
    .join("\n");
  const match = scripts.match(/numberOfChapters.*?(\d+)/i);

  return match ? Number.parseInt(match[1], 10) : 0;
}

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function cleanUrl(value: string | null | undefined) {
  const normalized = cleanText(value);

  if (!normalized) {
    return "";
  }

  return normalizeUrl(normalized);
}

function normalizeUrl(value: string) {
  try {
    return new URL(value, MVLEMPYR_BASE_URL).toString();
  } catch {
    return "";
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)));
}

function uniqueParagraphs(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((paragraph) => cleanText(paragraph))
        .filter((paragraph) => paragraph.length > 20 && !isJunkParagraph(paragraph)),
    ),
  );
}

function isLikelyTag(value: string) {
  return /^[A-Za-z][A-Za-z\s/-]{1,40}$/.test(value) && !value.toLowerCase().includes("chapter");
}

function isJunkParagraph(value: string) {
  const lowered = value.toLowerCase();

  return (
    lowered.includes("svg") ||
    lowered.includes("path") ||
    lowered.includes("next chapter") ||
    lowered.includes("previous chapter") ||
    lowered.includes("report chapter") ||
    lowered.includes("bookmark") ||
    lowered.includes("read latest") ||
    lowered.includes("advertisement") ||
    lowered.includes("share this chapter") ||
    lowered.includes("comments") ||
    lowered.includes("login to comment")
  );
}
