const NOVELFULL_HOST_PATTERN = /novelfull\.(com|net)/i;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);

function normalizeNovelTitle(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/chapter\s*\d+.*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeNovelUrl(inputUrl) {
  const candidate = String(inputUrl ?? "").trim();
  const parsed = new URL(candidate);

  if (NOVELFULL_HOST_PATTERN.test(parsed.hostname)) {
    if (!parsed.pathname.includes("/chapter-") && !parsed.pathname.endsWith(".html")) {
      parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}.html`;
    }
  }

  return parsed.toString();
}

function normalizeNovelUrlKey(inputUrl) {
  if (!inputUrl) {
    return "";
  }

  try {
    const normalized = new URL(normalizeNovelUrl(inputUrl));
    const normalizedPath = normalized.pathname.replace(/\.html\/?$/i, "").replace(/\/$/, "");
    return `${normalized.origin}${normalizedPath}`.toLowerCase();
  } catch {
    return String(inputUrl).trim().toLowerCase();
  }
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeChapterContent(value) {
  if (Array.isArray(value)) {
    return value
      .map((line) => String(line ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  return [];
}

function dedupeChapters(chapters) {
  const seen = new Set();
  const unique = [];

  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const normalizedContent = normalizeChapterContent(chapter.content);
    const title = String(chapter.title ?? "").trim();
    const key = `${title.toLowerCase()}::${normalizedContent[0] ?? ""}`;

    if (!title || normalizedContent.length < 3 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push({
      id: String(chapter.id ?? unique.length + 1),
      title,
      content: normalizedContent,
    });
  }

  return unique;
}

function validateImportPayload(body) {
  const url = String(body?.url ?? "").trim();

  if (!url) {
    return { ok: false, message: "URL required" };
  }

  try {
    const normalizedUrl = normalizeNovelUrl(url);
    const parsed = new URL(normalizedUrl);

    if (!NOVELFULL_HOST_PATTERN.test(parsed.hostname)) {
      return { ok: false, message: "Only novelfull.com and novelfull.net URLs are supported." };
    }

    return { ok: true, normalizedUrl };
  } catch {
    return { ok: false, message: "Invalid URL" };
  }
}

function buildStructuredLog(event, payload) {
  return {
    timestamp: new Date().toISOString(),
    event,
    ...payload,
  };
}

function getNovelBaseUrl(normalizedUrl) {
  const parsed = new URL(normalizedUrl);
  const basePath = parsed.pathname.replace(/\.html\/?$/i, "").replace(/\/$/, "");
  return `${parsed.origin}${basePath}`;
}

function getImportConfig() {
  return {
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    requestRetries: 3,
    listingDelayMs: 300,
    chapterDelayMs: 300,
    batchSize: 50,
  };
}

module.exports = {
  NOVELFULL_HOST_PATTERN,
  buildStructuredLog,
  dedupeChapters,
  getImportConfig,
  getNovelBaseUrl,
  normalizeChapterContent,
  normalizeNovelTitle,
  normalizeNovelUrl,
  normalizeNovelUrlKey,
  normalizeStringArray,
  validateImportPayload,
};
