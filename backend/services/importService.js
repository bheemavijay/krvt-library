const axios = require("axios");
const cheerio = require("cheerio");

const {
  buildStructuredLog,
  dedupeChapters,
  getImportConfig,
  getNovelBaseUrl,
  normalizeGenresAndTags,
  normalizeNovelTitle,
  normalizeNovelUrl,
  normalizeNovelUrlKey,
  normalizeStringArray,
  getProviderForUrl,
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
          Referer: new URL(url).origin,
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

      console.warn("Request failed, retrying...", {
        url,
        attempt,
        retries,
        status: status ?? null,
        code: error?.code ?? null,
      });

      if (!retriable || attempt === retries) {
        break;
      }

      await delay(750 * attempt);
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

  return Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex : -1;
}

async function collectChapterLinks({ normalizedUrl, novelBaseUrl, baseUrl, provider }) {
  const config = getImportConfig();
  const links = new Set();
  let previousFirstLink = "";
  const seenPageSignatures = new Set();

  for (let page = 1; ; page += 1) {
    await delay(config.listingDelayMs);

    let $page;
    try {
      const pageUrl =
        page === 1
          ? normalizedUrl
          : `${normalizedUrl}${normalizedUrl.includes("?") ? "&" : "?"}page=${page}&per-page=50`;
      $page = cheerio.load(await fetchHtmlWithRetry(pageUrl));
    } catch (error) {
      console.warn("Failed to fetch chapter listing page, stopping collection.", { normalizedUrl, page, message: error?.message });
      break; // Stop if a page fails to prevent gaps
    }

    const foundOnPage = new Set();
    $page(".list-chapter a, #list-chapter a, .chapter-list a[href*='/chapter-']").each((_, el) => {
      const link = $page(el).attr("href");
      if (!link) return;

      const absoluteLink = toAbsoluteLink(link, baseUrl);
      if (provider === 'novelfull' && !absoluteLink.startsWith(`${novelBaseUrl}/chapter-`)) {
        return;
      }
      foundOnPage.add(absoluteLink);
    });

    const foundArray = [...foundOnPage];
    const signature = foundArray.slice(0, 5).join("|");
    if (foundArray.length === 0 || foundArray[0] === previousFirstLink || seenPageSignatures.has(signature)) {
      break;
    }

    seenPageSignatures.add(signature);
    previousFirstLink = foundArray[0];
    foundArray.forEach(link => links.add(link));
  }

  return [...links];
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

  const title =
    $("h3.title, h1.title, .bookname h1, [itemprop='name']").first().text().trim() ||
    $("meta[property='og:title']").attr("content")?.trim() ||
    titleFromSlug;
  const author =
    $('.info a[href*="author"], [itemprop="author"], a[href*="/author/"]').first().text().trim() ||
    $(".info div:contains('Author') a, .info p:contains('Author') a").first().text().trim() ||
    "Unknown";
  const allLabels = normalizeStringArray(
    $('.info a[href*="genre"], a[href*="/genre/"], .genres a, [class*="genre"] a')
      .map((_, el) => $(el).text().trim())
      .get(),
  );

  const { genres, tags } = normalizeGenresAndTags(allLabels);

  const infoText = $(".info").text();
  const status =
    /completed|complete|full/i.test(infoText)
      ? "Completed"
      : /ongoing|updating|in progress/i.test(infoText)
        ? "Ongoing"
        : "";
  const description =
    $("#noidungm, #tab-description, .desc, .description, [itemprop='description']").first().text().trim() ||
    $("meta[name='description']").attr("content")?.trim() ||
    "";
  const rawImage =
    $(".book img, .info-image img, .cover img, [itemprop='image'], meta[property='og:image']").first().attr("src")?.trim() ||
    $("meta[property='og:image']").attr("content")?.trim() ||
    DEFAULT_COVER;
  const image = rawImage.startsWith("http") ? rawImage : toAbsoluteLink(rawImage, baseUrlFrom(novelBaseUrl));
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

async function collectChapters({ selectedLinks, incrementalStart, title, provider }) {
  const config = getImportConfig();
  const chapters = [];
  const seenChapterUrls = new Set();
  const canonicalTitle = normalizeNovelTitle(title);

  for (let index = 0; index < selectedLinks.length; index += 1) {
    const chapterUrl = selectedLinks[index];
    if (seenChapterUrls.has(chapterUrl)) continue;
    seenChapterUrls.add(chapterUrl);

    await delay(config.chapterDelayMs);

    try {
      const html = await fetchHtmlWithRetry(chapterUrl);
      const $chapter = cheerio.load(html);
      const pageTitle = $chapter("title").first().text().trim();

      if (provider === 'novelfull' && canonicalTitle && !normalizeNovelTitle(pageTitle).includes(canonicalTitle) && !/chapter/i.test(pageTitle)) {
        continue;
      }

      let content = [];
      $chapter("#chapter-content p").each((_, el) => {
        const text = $chapter(el).text().trim();
        if (text) content.push(text);
      });

      if (content.length === 0) {
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
      console.warn("Chapter skipped due to fetch error", { chapterUrl, message: error?.message });
    }
  }

  return dedupeChapters(chapters);
}

async function importNovel(payload) {
  const normalizedInputUrl = normalizeNovelUrl(payload.url);
  const parsed = new URL(normalizedInputUrl);
  const baseUrl = parsed.origin;
  const novelBaseUrl = getNovelBaseUrl(normalizedInputUrl);
  const provider = getProviderForUrl(normalizedInputUrl);

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
    provider,
  });

  const config = getImportConfig();
  const safeOffset = Number.isFinite(Number(payload.offset)) ? Math.max(0, Number(payload.offset)) : 0;
  const incrementalStart = Math.max(
    safeOffset,
    Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex + 1 : 0,
  );
  const selectedLinks = links.slice(incrementalStart, incrementalStart + config.batchSize);

  if (selectedLinks.length === 0 && incrementalStart >= links.length) {
    const error = new Error("No new chapters available");
    error.statusCode = 409;
    throw error;
  }

  const chapters = await collectChapters({
    selectedLinks,
    incrementalStart,
    title: metadata.title,
    provider,
  });

  return {
    ...metadata,
    totalChapters: links.length,
    importedFrom: incrementalStart,
    chapters,
  };
}

function baseUrlFrom(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "https://novelfull.com";
  }
}

module.exports = {
  importNovel,
};