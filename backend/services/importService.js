const axios = require("axios");
const cheerio = require("cheerio");

const {
  buildStructuredLog,
  dedupeChapters,
  getImportConfig,
  getNovelBaseUrl,
  normalizeNovelTitle,
  normalizeNovelUrl,
  normalizeNovelUrlKey,
  normalizeStringArray,
} = require("../utils/normalize");

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
          Referer: "https://novelfull.net/",
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
          buildStructuredLog("import.fetch.retry", {
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

function toAbsoluteLink(link, origin) {
  return link.startsWith("http") ? link : `${origin}${link}`;
}

function getResumeIndex({ title, novelBaseUrl, existingNovel, incomingNovelUrl, incomingLastChapterIndex }) {
  const canonicalTitle = normalizeNovelTitle(title);
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
            existingNovel?.chapterCount ??
            -1,
        )
      : -1;

  console.info(
    JSON.stringify(
      buildStructuredLog("import.resume-check", {
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

async function collectChapterLinks({ normalizedUrl, novelBaseUrl, baseUrl, isNovelFull }) {
  const config = getImportConfig();
  const links = [];
  let previousFirstLink = "";
  const seenPageSignatures = new Set();
  const seenChapterLinks = new Set();

  for (let page = 1; ; page += 1) {
    await delay(config.listingDelayMs);

    let $page;
    try {
      const pageUrl =
        page === 1
          ? normalizedUrl
          : `${normalizedUrl}${normalizedUrl.includes("?") ? "&" : "?"}page=${page}&per-page=50`;
      const pageHtml = await fetchHtmlWithRetry(pageUrl);
      $page = cheerio.load(pageHtml);
    } catch (error) {
      console.warn(
        JSON.stringify(
          buildStructuredLog("import.listing-page.skipped", {
            normalizedUrl,
            page,
            message: error?.message ?? "Failed listing page",
          }),
        ),
      );
      continue;
    }

    const found = [];

    $page(".list-chapter a, #list-chapter a, .chapter-list a[href*='/chapter-']").each((_, el) => {
      const link = $page(el).attr("href");
      if (!link) {
        return;
      }

      const absoluteLink = toAbsoluteLink(link, baseUrl);
      if (isNovelFull && !absoluteLink.startsWith(`${novelBaseUrl}/chapter-`)) {
        return;
      }

      if (seenChapterLinks.has(absoluteLink)) {
        return;
      }

      seenChapterLinks.add(absoluteLink);
      found.push(absoluteLink);
    });

    const signature = found.slice(0, 5).join("|");
    if (!found.length || found[0] === previousFirstLink || seenPageSignatures.has(signature)) {
      break;
    }

    seenPageSignatures.add(signature);
    previousFirstLink = found[0];
    links.push(...found);
  }

  return Array.from(new Set(links));
}

function extractNovelMetadata($, normalizedUrl, novelBaseUrl) {
  const parsed = new URL(normalizedUrl);
  const titleFromSlug =
    parsed.pathname
      .split("/")
      .pop()
      ?.replace(/\.html$/i, "")
      .replace(/[-_]+/g, " ")
      .trim() || "novel";

  const title = $("h3.title").first().text().trim() || titleFromSlug;
  const author = $('.info a[href*="author"]').first().text().trim() || "Unknown";
  const genres = normalizeStringArray(
    $('.info a[href*="genre"]')
      .map((_, el) => $(el).text().trim())
      .get(),
  );
  const tags = normalizeStringArray(
    $(".info a[href*='/tag/'], a[href*='/tag/']")
      .map((_, el) => $(el).text().trim())
      .get(),
  );
  const infoText = $(".info").text();
  const status = infoText.includes("Completed") ? "Completed" : "Ongoing";
  const description = $("#noidungm").first().text().trim() || "";
  const image =
    $(".book img, .info-image img, .cover img").first().attr("src")?.trim() || DEFAULT_COVER;
  const alternative =
    $(".other-name, .info h3:contains('Alternative') + p").first().text().trim() || "";
  const ratingRaw =
    $(".small strong span[itemprop='ratingValue']").first().text().trim() ||
    $(".rating strong, .rating").first().text().trim();
  const rating = Number.parseFloat(ratingRaw);

  return {
    title,
    author,
    image,
    alternative,
    genres,
    tags,
    status,
    rating: Number.isFinite(rating) ? rating : null,
    description,
    sourceUrl: novelBaseUrl,
    lastUpdated: new Date().toISOString(),
  };
}

async function collectChapters({ selectedLinks, incrementalStart, title, isNovelFull }) {
  const config = getImportConfig();
  const chapters = [];
  const seenChapterUrls = new Set();
  const canonicalTitle = normalizeNovelTitle(title);

  for (let index = 0; index < selectedLinks.length; index += 1) {
    const chapterUrl = selectedLinks[index];
    await delay(config.chapterDelayMs);

    try {
      const html = await fetchHtmlWithRetry(chapterUrl);
      const $chapter = cheerio.load(html);
      const pageTitle = $chapter("title").first().text().trim();

      if (isNovelFull && canonicalTitle) {
        const normalizedPageTitle = normalizeNovelTitle(pageTitle);
        if (!normalizedPageTitle.includes(canonicalTitle) && !/chapter/i.test(pageTitle)) {
          continue;
        }
      }

      if (seenChapterUrls.has(chapterUrl)) {
        continue;
      }

      seenChapterUrls.add(chapterUrl);

      let content = [];
      $chapter("#chapter-content p").each((_, el) => {
        const text = $chapter(el).text().trim();
        if (text) {
          content.push(text);
        }
      });

      if (!content.length) {
        content = $chapter("#chapter-content")
          .text()
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
      }

      chapters.push({
        id: String(incrementalStart + index + 1),
        title: $chapter(".chr-title").text().trim() || `Chapter ${incrementalStart + index + 1}`,
        content,
      });
    } catch (error) {
      console.warn(
        JSON.stringify(
          buildStructuredLog("import.chapter.skipped", {
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
  const normalizedInputUrl = normalizeNovelUrl(payload.url);
  const parsed = new URL(normalizedInputUrl);
  const baseUrl = parsed.origin;
  const novelBaseUrl = getNovelBaseUrl(normalizedInputUrl);
  const isNovelFull = /novelfull\.(com|net)/i.test(parsed.hostname);

  const html = await fetchHtmlWithRetry(normalizedInputUrl);
  const $ = cheerio.load(html);
  const metadata = extractNovelMetadata($, normalizedInputUrl, novelBaseUrl);

  const lastSavedChapterIndex = getResumeIndex({
    title: metadata.title,
    novelBaseUrl,
    existingNovel: payload.existingNovel,
    incomingNovelUrl: payload.novelUrl,
    incomingLastChapterIndex: payload.lastChapterIndex,
  });

  const links = await collectChapterLinks({
    normalizedUrl: normalizedInputUrl,
    novelBaseUrl,
    baseUrl,
    isNovelFull,
  });

  const config = getImportConfig();
  const safeOffset = Number.isFinite(Number(payload.offset)) ? Math.max(0, Number(payload.offset)) : 0;
  const incrementalStart = Math.max(
    safeOffset,
    Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex + 1 : 0,
  );
  const selectedLinks = links.slice(incrementalStart, incrementalStart + config.batchSize);

  console.info(
    JSON.stringify(
      buildStructuredLog("import.batch-selection", {
        novelBaseUrl,
        totalLinks: links.length,
        incrementalStart,
        selectedCount: selectedLinks.length,
        offset: safeOffset,
      }),
    ),
  );

  if (!selectedLinks.length && links.length > 0 && incrementalStart >= links.length) {
    const error = new Error("No new chapters available");
    error.statusCode = 409;
    throw error;
  }

  const chapters = await collectChapters({
    selectedLinks,
    incrementalStart,
    title: metadata.title,
    isNovelFull,
  });

  return {
    ...metadata,
    chapters,
  };
}

module.exports = {
  importNovel,
};
