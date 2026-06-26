const axios = require("axios");
const cheerio = require("cheerio");

const {
  buildStructuredLog,
  dedupeChapters,
  getImportConfig,
  normalizeGenresAndTags,
  normalizeNovelTitle,
  normalizeNovelUrl,
  normalizeNovelUrlKey,
  normalizeStringArray,
} = require("../../utils/normalize");

const BASE_URL = "https://www.mvlempyr.io";
const DEFAULT_COVER = "https://via.placeholder.com/300x400?text=No+Cover";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtmlWithRetry(url, options = {}) {
  const config = getImportConfig();
  const retries = options.retries ?? config.requestRetries;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: options.timeoutMs ?? config.requestTimeoutMs,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
          Referer: BASE_URL,
        },
        responseType: "text",
      });

      return response.data;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retriable =
        error?.code === "ECONNABORTED" ||
        error?.code === "ECONNRESET" ||
        status === 429 ||
        (typeof status === "number" && status >= 500);

      console.warn(
        JSON.stringify(
          buildStructuredLog("import.mvlempyr.fetch.retry", {
            url,
            attempt,
            retries,
            status: status ?? null,
            code: error?.code ?? null,
            message: error?.message ?? "Unknown request error",
          }),
        ),
      );

      if (!retriable || attempt === retries) {
        break;
      }

      await delay(450 * attempt);
    }
  }

  throw lastError;
}

function toAbsoluteLink(link) {
  try {
    return new URL(link, BASE_URL).toString();
  } catch {
    return "";
  }
}

function extractNovelKey(inputUrl) {
  const parsed = new URL(inputUrl);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "";

  if (segments.includes("chapter")) {
    const match = lastSegment.match(/^(.+)-(\d+)$/);
    return match?.[1] ?? lastSegment;
  }

  return lastSegment.replace(/\.html$/i, "");
}

function getResumeIndex({ metadata, novelBaseUrl, existingNovel, incomingNovelUrl, incomingLastChapterIndex }) {
  const canonicalTitle = normalizeNovelTitle(metadata.title);
  const requestedNovelKey = normalizeNovelUrlKey(novelBaseUrl);
  const incomingNovelKey = normalizeNovelUrlKey(incomingNovelUrl);
  const existingUrlKey = normalizeNovelUrlKey(existingNovel?.url);
  const existingNovelUrlKey = normalizeNovelUrlKey(existingNovel?.novelUrl ?? existingNovel?.sourceUrl);

  const existingMatchesByTitle =
    existingNovel?.title && canonicalTitle
      ? normalizeNovelTitle(existingNovel.title) === canonicalTitle
      : false;
  const existingMatchesByUrl =
    existingUrlKey === requestedNovelKey ||
    existingNovelUrlKey === requestedNovelKey ||
    incomingNovelKey === requestedNovelKey;

  const lastSavedChapterIndex =
    existingMatchesByTitle || existingMatchesByUrl
      ? Number(
          existingNovel?.lastChapterIndex ??
            incomingLastChapterIndex ??
            (Number.isFinite(Number(existingNovel?.chapterCount)) ? Number(existingNovel.chapterCount) - 1 : undefined) ??
            -1,
        )
      : -1;

  console.info(
    JSON.stringify(
      buildStructuredLog("import.mvlempyr.resume-check", {
        requestedNovelKey,
        incomingNovelKey,
        existingUrlKey,
        existingNovelUrlKey,
        existingMatchesByTitle,
        existingMatchesByUrl,
        lastSavedChapterIndex,
      }),
    ),
  );

  return Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex : -1;
}

function removeNoise($) {
  $(
    "script, style, svg, path, noscript, iframe, button, canvas, form, nav, .ads, .advertisement, [class*='ad-'], [id*='ad-'], [aria-hidden='true']",
  ).remove();
}

function cleanText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function firstText($, selectors) {
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

function firstAttribute($, selectors, attributes) {
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

function extractMetadata(html, normalizedUrl, novelBaseUrl) {
  const $ = cheerio.load(html);
  removeNoise($);
  const slugTitle = extractNovelKey(normalizedUrl).replace(/[-_]+/g, " ");
  const title =
    firstText($, ["h1.novel-title", ".novel-hero h1", "main h1", "article h1", "h1"]) ||
    slugTitle ||
    "Unknown Title";
  const author =
    firstText($, ["div.mobileauthorname", ".novel-meta [class*='author']", "[class*='author']", "[data-author]"]) ||
    "Unknown";
  const description =
    firstText($, ["div.synopsis p", ".novel-meta .synopsis", "div.synopsis", "meta[name='description']"]) ||
    "";
  const allLabels = normalizeStringArray(
    queryTexts($, [".genere-tagslist a", ".genere-tagslist button", "[class*='genre'] a"])
      .map((tag) => tag.replace(/^#/, ""))
      .filter(isLikelyTag),
  );

  const { genres, tags } = normalizeGenresAndTags(allLabels);
  
  const rawImage =
    firstAttribute($, [".novel-image-wrapper img", ".novel-hero img", "main img", "img"], ["src", "data-src"]) ||
    DEFAULT_COVER;
  const image = rawImage.startsWith("http") ? rawImage : toAbsoluteLink(rawImage);

  return {
    title,
    author,
    image,
    alternative: "",
    genres,
    tags,
    status: "",
    rating: null,
    description,
    sourceUrl: novelBaseUrl,
    lastUpdated: new Date().toISOString(),
  };
}

function queryTexts($, selectors) {
  const values = [];

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

function queryAttributes($, selectors, attribute) {
  const values = [];

  for (const selector of selectors) {
    values.push(
      ...$(selector)
        .map((_, element) => {
          const current = $(element);
          const value = current.attr(attribute) || current.closest("a").attr(attribute) || "";
          return value ? toAbsoluteLink(value) : "";
        })
        .get()
        .filter(Boolean),
    );
  }

  return values;
}

function isLikelyTag(value) {
  return /^[A-Za-z][A-Za-z\s/-]{1,40}$/.test(value) && !value.toLowerCase().includes("chapter");
}

function extractChapterCount($) {
  const directCount = Number.parseInt(cleanText($("div#chapter-count").first().text()), 10);
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

function extractChapterBaseIdFromHtml(html) {
  const hrefMatch = html.match(/\/chapter\/(\d+)-/);
  if (hrefMatch?.[1]) {
    return hrefMatch[1];
  }

  const scriptMatch = html.match(/(?:novelId|novel_id|bookId|book_id)["'\s:]+(\d+)/i);
  if (scriptMatch?.[1]) {
    return scriptMatch[1];
  }

  return null;
}

function collectChapterLinksFromNovelPage(html, novelKey, requestId) {
  console.info("krvt.debug.mvlempyr.chapterLinks.start", { requestId, novelUrl: novelKey });

  const idx = html.indexOf("/chapter/");
  if (idx >= 0) {
    console.info("krvt.debug.mvlempyr.chapterLinks.htmlSnippet", {
      requestId,
      snippet: html.substring(
        Math.max(0, idx - 500),
        Math.min(html.length, idx + 1000)
      ),
    });
  } else {
    console.warn("krvt.debug.mvlempyr.chapterLinks.noChapterHref", {
      requestId,
    });
  }

  const $ = cheerio.load(html);
  const selectors = [
    "a.novelreadbutton[href*='/chapter/']",
    "a.continuebutton[href*='/chapter/']",
    "a[href*='/chapter/']",
    ".chapter-list a.chapter-item",
    ".chapter-list a[href*='/chapter/']",
    "[class*='chapter'] a[href*='/chapter/']",
    "a.chapter-item",
  ];
  
  const elements = $(selectors.join(", "));
  console.info("krvt.debug.mvlempyr.chapterLinks.queryResult", { requestId, matchedElements: elements.length });

  const links = normalizeStringArray(
    queryAttributes(
      $,
      selectors,
      "href",
    ).filter((href) => href.includes("/chapter/")),
  );

  console.info("krvt.debug.mvlempyr.chapterLinks.extracted", {
    requestId,
    totalLinks: links.length,
    first: links[0] || null,
    last: links[links.length - 1] || null,
  });

  if (links.length > 0) {
    return links;
  }

  const chapterCount = extractChapterCount($);
  if (!chapterCount) {
    return [];
  }

  console.warn("krvt.debug.mvlempyr.chapterLinks.fallback.triggered", {
    requestId,
    reason: "No chapter links extracted from novel page",
    novelUrl: novelKey,
    extractedCount: links.length,
  });

  const chapterBaseId = extractChapterBaseIdFromHtml(html);
  const key = chapterBaseId || novelKey;

  if (chapterBaseId || /^\d+$/.test(novelKey)) {
    return Array.from({ length: chapterCount }, (_, index) => `${BASE_URL}/chapter/${key}-${index + 1}`);
  }

  return [];
}

async function discoverChapterLinks(novelKey, requiredCount, incrementalStart, requestId, chapterBaseId) {
  const config = getImportConfig();
  const links = [];
  let chapterNumber = Math.max(1, incrementalStart + 1);
  let consecutiveFailures = 0;
  const maxChaptersToDiscover = Math.min(config.batchSize, requiredCount);
  const key = chapterBaseId || novelKey;

  console.info(
      "krvt.debug.mvlempyr.discover.inputs",
      {
        requestId,
        novelKey,
        chapterBaseId,
        incrementalStart,
        requiredCount,
        startChapterNumber: chapterNumber,
        maxChaptersToDiscover
      }
  );

  while (links.length < maxChaptersToDiscover && consecutiveFailures < 3) {
    const url = `${BASE_URL}/chapter/${key}-${chapterNumber}`;

    try {
      const html = await fetchHtmlWithRetry(url, { timeoutMs: 15000 });
      const chapter = parseChapter(html);

      if (chapter.title && chapter.content.length >= 3) {
        links.push(url);
        consecutiveFailures = 0;
      } else {
        consecutiveFailures += 1;
      }
    } catch {
      consecutiveFailures += 1;
    }

    chapterNumber += 1;
  }

  console.info("krvt.debug.mvlempyr.discover.finish", { requestId, discoveredLinks: links.length, finalChapterNumber: chapterNumber });
  return links;
}

function parseChapter(html) {
  const $ = cheerio.load(html);
  removeNoise($);

  const novelUrl = extractNovelUrl($);

  const title =
      firstText($, [
        ".cha-tit h1",
        ".chapter-shell h1",
        "#chapter h1",
        "#chapter-name",
        "main h1",
        "h1",
      ]) || "Unknown Chapter";

  const roots = [
    $(".cha-words").first(),
    $(".chapter-shell .cha-words").first(),
    $("#chapter-content").first(),
    $("#chapter").first(),
    $("main article").first(),
    $("main").first(),
  ].filter((root) => root.length > 0);

  for (const root of roots) {
    let content = uniqueParagraphs(
        root
            .find("p")
            .map((_, element) => cleanText($(element).text()))
            .get()
    );

    if (
        content.length > 0 &&
        (
            content[0].trim() === title.trim() ||
            content[0].trim().startsWith("Chapter ")
        )
    ) {
      content.shift();
    }

    if (content.length > 0) {
      return {
        title,
        content,
        novelUrl,
      };
    }
  }

  return {
    title,
    content: [],
    novelUrl,
  };
}

function extractNovelUrl($) {
  const selectors = [
    "a[href*='/novel/']",
    "link[rel='canonical']",
    "meta[property='og:url']",
  ];

  for (const selector of selectors) {
    let url = "";

    if (selector.startsWith("meta[")) {
      url = $(selector).attr("content") || "";
    } else {
      url = $(selector).attr("href") || "";
    }

    if (!url) {
      continue;
    }

    if (url.includes("/novel/")) {
      const absolute = toAbsoluteLink(url);

      return absolute;
    }
  }
  return "";
}

function uniqueParagraphs(values) {
  return Array.from(
    new Set(
      values
        .map((paragraph) => cleanText(paragraph))
        .filter((paragraph) => paragraph.length > 20 && !isJunkParagraph(paragraph)),
    ),
  );
}

function isJunkParagraph(value) {
  const lowered = value.toLowerCase();

  return (
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

async function collectChapters({ selectedLinks, incrementalStart, requestId }) {
  const config = getImportConfig();
  const chapters = [];

  for (let index = 0; index < selectedLinks.length; index += 1) {
    const chapterUrl = selectedLinks[index];
    await delay(config.chapterDelayMs);

    try {
      const html = await fetchHtmlWithRetry(chapterUrl);
      const chapter = parseChapter(html);

      chapters.push({
        id: String(incrementalStart + index),
        title: chapter.title || `Chapter ${incrementalStart + index}`,
        content: chapter.content,
      });
    } catch (error) {
      console.warn(
        JSON.stringify(
          buildStructuredLog("import.mvlempyr.chapter.skipped", {
            requestId,
            chapterUrl,
            message: error?.message ?? "Failed chapter fetch",
          }),
        ),
      );
    }
  }

  return dedupeChapters(chapters);
}

async function importNovel(payload) {
  const requestId = payload?.requestId;
  console.info("krvt.debug.mvlempyr.start", {
    requestId,
    url: payload.url,
    existingNovel: !!payload.existingNovel,
  });

  const normalizedUrl = normalizeNovelUrl(payload.url);
  const parsed = new URL(normalizedUrl);
  
  const novelKey = extractNovelKey(normalizedUrl);
  const isNovelPage = parsed.pathname.includes("/novel/");

  let novelBaseUrl = isNovelPage
      ? normalizedUrl
      : "";

  let metadataHtml = "";

  if (isNovelPage) {
    metadataHtml = await fetchHtmlWithRetry(normalizedUrl);
  } else {
    try {
      const firstChapterHtml = await fetchHtmlWithRetry(normalizedUrl);
      const parsedChapter = parseChapter(firstChapterHtml);

      console.info("krvt.debug.mvlempyr.chapterUrl.parsed", {
        requestId,
        chapterUrl: normalizedUrl,
        detectedNovelUrl: parsedChapter.novelUrl,
      });

      if (parsedChapter.novelUrl) {
        novelBaseUrl = parsedChapter.novelUrl;
        metadataHtml = await fetchHtmlWithRetry(novelBaseUrl);
      } else {
        metadataHtml = "";
      }
    } catch {
      metadataHtml = "";
    }
  }

  const config = getImportConfig();
  
  const metadata = metadataHtml
    ? extractMetadata(metadataHtml, novelBaseUrl, novelBaseUrl)
    : {
        title: novelKey.replace(/[-_]+/g, " ") || "Unknown Title",
        author: "Unknown",
        image: DEFAULT_COVER,
        alternative: "",
        genres: [],
        tags: [],
        status: "",
        rating: null,
        description: "",
        sourceUrl: novelBaseUrl,
        lastUpdated: new Date().toISOString(),
      };

  console.info("krvt.debug.mvlempyr.metadata", {
    requestId,
    title: metadata?.title,
    sourceUrl: metadata?.sourceUrl,
  });

  const lastSavedChapterIndex = getResumeIndex({
    metadata,
    novelBaseUrl,
    existingNovel: payload.existingNovel,
    incomingNovelUrl: payload.novelUrl,
    incomingLastChapterIndex: payload.lastChapterIndex,
  });
  const safeOffset = Number.isFinite(Number(payload.offset)) ? Math.max(0, Number(payload.offset)) : 0;
  const incrementalStart = Math.max(
    safeOffset,
    Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex + 1 : 0,
  );

  let links = metadataHtml ? collectChapterLinksFromNovelPage(metadataHtml, novelKey, requestId) : [];
  let wasDiscovered = false;

  if (links.length > 0) {
    console.info("krvt.debug.mvlempyr.chapterLinks.collected", {
      requestId,
      count: links.length,
      first: links[0],
      last: links[links.length - 1],
    });
  }
  
  if (links.length <= incrementalStart + config.batchSize) {
    const currentLinks = links.length;
    const chapterBaseId = extractChapterBaseIdFromHtml(metadataHtml);
    console.info("krvt.debug.mvlempyr.chapterBaseId.detected", { requestId, chapterBaseId });

    const discoveryStart = Math.max(incrementalStart, currentLinks);
    const requiredCount = discoveryStart + config.batchSize - currentLinks;

    console.warn("krvt.debug.mvlempyr.chapterLinks.fallback", {
      requestId,
      novelKey,
      requiredCount,
      currentLinks,
      incrementalStart,
    });
    
    const discoveredLinks = await discoverChapterLinks(novelKey, requiredCount, discoveryStart, requestId, chapterBaseId);
    links.push(...discoveredLinks);
    wasDiscovered = discoveredLinks.length > 0 && incrementalStart >= currentLinks;
  }

  const selectedLinks = wasDiscovered
    ? links.slice(links.length - config.batchSize)
    : links.slice(incrementalStart, incrementalStart + config.batchSize);

  console.info("krvt.debug.mvlempyr.incremental", {
    requestId,
    totalLinks: links.length,
    incrementalStart,
    wasDiscovered,
    selectedCount: selectedLinks.length,
    firstSelected: selectedLinks[0] ?? null,
    lastSelected: selectedLinks[selectedLinks.length - 1] ?? null,
  });

  if (!selectedLinks.length && incrementalStart >= links.length) {
    const error = new Error("No new chapters available");
    error.statusCode = 409;
    throw error;
  }

  const chapters = await collectChapters({ selectedLinks, incrementalStart, requestId });

  console.info("krvt.debug.mvlempyr.finish", {
    requestId,
    title: metadata?.title,
    returnedChapters: chapters.length,
  });

  return {
    ...metadata,
    totalChapters: links.length,
    importedFrom: incrementalStart,
    chapters,
  };
}

module.exports = {
  importNovel,
};