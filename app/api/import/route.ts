import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function safeFetch(url: string, retries = 3): Promise<Response> {
  const maxAttempts = Math.max(1, retries);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
      });

      if (response.ok) return response;

      if (attempt < maxAttempts && (response.status >= 500 || response.status === 429)) {
        await delay(450 * attempt);
        continue;
      }

      throw new Error(`HTTP ${response.status} for ${url}`);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isConnReset = /ECONNRESET/i.test(message);

      if (attempt < maxAttempts && isConnReset) {
        await delay(450 * attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

function normalizeNovelTitle(raw: string) {
  return raw
    .toLowerCase()
    .replace(/chapter\s*\d+.*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toAbsoluteLink(link: string, origin: string) {
  return link.startsWith("http") ? link : origin + link;
}

function normalizeNovelUrl(inputUrl: string) {
  try {
    const u = new URL(inputUrl);

    if (/novelfull\.(com|net)/i.test(u.hostname)) {
      if (!u.pathname.includes("/chapter-") && !u.pathname.endsWith(".html")) {
        u.pathname = `${u.pathname.replace(/\/$/, "")}.html`;
      }
    }

    return u.toString();
  } catch {
    return inputUrl;
  }
}

function normalizeNovelUrlKey(inputUrl: string | undefined) {
  if (!inputUrl) {
    return "";
  }

  try {
    const normalized = new URL(normalizeNovelUrl(inputUrl));
    const normalizedPath = normalized.pathname.replace(/\.html\/?$/i, "").replace(/\/$/, "");
    return `${normalized.origin}${normalizedPath}`.toLowerCase();
  } catch {
    return normalizeNovelUrl(inputUrl).toLowerCase();
  }
}

export async function POST(req: Request) {
  try {
    const {
      url,
      offset = 0,
      existingNovel,
      existingNovels,
      title: incomingTitle,
      novelUrl: incomingNovelUrl,
      lastChapterIndex: incomingLastChapterIndex,
    } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const normalizedInputUrl = normalizeNovelUrl(url);
    const normalizedUrl = new URL(normalizedInputUrl);
    const baseUrl = normalizedUrl.origin;
    const isNovelFull = /novelfull\.(com|net)/i.test(normalizedUrl.hostname);
    const novelBasePath = normalizedUrl.pathname.replace(/\.html\/?$/i, "").replace(/\/$/, "");
    const novelBaseUrl = `${normalizedUrl.origin}${novelBasePath}`;
    const requestedNovelKey = normalizeNovelUrlKey(novelBaseUrl);
    const incomingNovelKey = normalizeNovelUrlKey(incomingNovelUrl);

    const res = await safeFetch(normalizedInputUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    const rawTitle = $("h3.title").first().text().trim();
    const titleFromSlug =
      normalizedUrl.pathname
        .split("/")
        .pop()
        ?.replace(/\.html$/i, "")
        .replace(/[-_]+/g, " ")
        .trim() || "novel";
    const title = rawTitle || titleFromSlug;
    const author = $('.info a[href*="author"]').first().text().trim();
    const genres = $('.info a[href*="genre"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    const infoText = $(".info").text();
    const status = infoText.includes("Completed") ? "Completed" : "Ongoing";
    const description = $("#noidungm").first().text().trim();
    const image =
      $(".book img, .info-image img, .cover img").first().attr("src")?.trim() ||
      "https://via.placeholder.com/300x400?text=No+Cover";
    const alternative =
      $(".other-name, .info h3:contains('Alternative') + p").first().text().trim() ?? "";
    const tags = $(".info a[href*='/tag/'], a[href*='/tag/']")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    const ratingRaw =
      $(".small strong span[itemprop='ratingValue']").first().text().trim() ||
      $(".rating strong, .rating").first().text().trim();
    const rating = Number.parseFloat(ratingRaw);

    const slug = normalizedUrl.pathname.split("/").pop() || "novel";
    const canonicalTitle = normalizeNovelTitle(title || incomingTitle || "");

    const matchedExistingFromList = Array.isArray(existingNovels)
      ? existingNovels.find((n: { title?: string; url?: string; novelUrl?: string; lastChapterIndex?: number; chapterCount?: number }) => {
          const byTitle =
            n?.title && title && normalizeNovelTitle(n.title) === normalizeNovelTitle(title);
          const byUrl =
            n?.url === novelBaseUrl ||
            n?.novelUrl === novelBaseUrl ||
            n?.url === url ||
            n?.novelUrl === url;
          return Boolean(byTitle || byUrl);
        })
      : null;

    const existingCandidate = matchedExistingFromList ?? existingNovel ?? null;
    const existingMatchesByTitle =
      existingCandidate?.title && canonicalTitle
        ? normalizeNovelTitle(existingCandidate.title) === canonicalTitle
        : false;
    const existingNovelUrlKey = normalizeNovelUrlKey(existingCandidate?.novelUrl);
    const existingUrlKey = normalizeNovelUrlKey(existingCandidate?.url);
    const existingMatchesByUrl =
      existingUrlKey === requestedNovelKey ||
      existingNovelUrlKey === requestedNovelKey ||
      incomingNovelKey === requestedNovelKey;

    const lastSavedChapterIndex =
      existingMatchesByTitle || existingMatchesByUrl
        ? Number(
            existingCandidate?.lastChapterIndex ??
              incomingLastChapterIndex ??
              existingCandidate?.chapterCount ??
              -1
          )
        : -1;

    console.info("[api/import] resume-check", {
      requestedNovelKey,
      incomingNovelKey,
      existingUrlKey,
      existingNovelUrlKey,
      existingMatchesByTitle,
      existingMatchesByUrl,
      lastSavedChapterIndex,
      offset,
    });

    // 🔥 GET LINKS
    let links: string[] = [];
    let prev = "";
    const seenPageSignatures = new Set<string>();
    const seenChapterLinks = new Set<string>();

    for (let page = 1; ; page++) {
      await delay(300); // 🔥 anti-block

      let $$: cheerio.CheerioAPI;
      try {
        const pageUrl =
          page === 1
            ? normalizedInputUrl
            : `${normalizedInputUrl}${normalizedInputUrl.includes("?") ? "&" : "?"}page=${page}&per-page=50`;
        const pageRes = await safeFetch(pageUrl);
        $$ = cheerio.load(await pageRes.text());
      } catch {
        // Skip broken listing page without crashing full import.
        continue;
      }

      const found: string[] = [];

      $$(".list-chapter a, #list-chapter a, .chapter-list a[href*='/chapter-']").each((_, el) => {
        const link = $$(el).attr("href");
        if (!link) return;
        const absoluteLink = toAbsoluteLink(link, baseUrl);

        if (isNovelFull) {
          // Only keep chapter links for the same novel.
          if (!absoluteLink.startsWith(`${novelBaseUrl}/chapter-`)) return;
        }

        if (seenChapterLinks.has(absoluteLink)) return;
        seenChapterLinks.add(absoluteLink);
        found.push(absoluteLink);
      });

      const signature = found.slice(0, 5).join("|");
      if (!found.length || found[0] === prev || seenPageSignatures.has(signature)) break;

      seenPageSignatures.add(signature);
      prev = found[0];
      links.push(...found);
    }

    links = [...new Set(links)];

    const incrementalStart = Math.max(offset, Number.isFinite(lastSavedChapterIndex) ? lastSavedChapterIndex + 1 : 0);

    const BATCH = 50;
    const selected = links.slice(incrementalStart, incrementalStart + BATCH);

    console.info("[api/import] batch-selection", {
      novelBaseUrl,
      totalLinks: links.length,
      incrementalStart,
      selectedCount: selected.length,
      offset,
    });

    if (selected.length === 0 && links.length > 0 && incrementalStart >= links.length) {
      return NextResponse.json({ error: "No new chapters available" }, { status: 409 });
    }

    const chapters = [];
    const seenChapterUrls = new Set<string>();

    for (let i = 0; i < selected.length; i++) {
      await delay(300);

      try {
        const chRes = await safeFetch(selected[i]);
        const $$ = cheerio.load(await chRes.text());
        const pageTitle = $$("title").first().text().trim();

        if (isNovelFull && canonicalTitle) {
          const normalizedPageTitle = normalizeNovelTitle(pageTitle);
        
          if (!normalizedPageTitle.includes(canonicalTitle)) {
            const isLikelyChapter = /chapter/i.test(pageTitle);
        
            if (!isLikelyChapter) {
              continue;
            }
          }
        }

        const title =
          $$(".chr-title").text().trim() || `Chapter ${incrementalStart + i + 1}`;

        const chapterUrl = selected[i];
        if (seenChapterUrls.has(chapterUrl)) continue;
        seenChapterUrls.add(chapterUrl);

        let content: string[] = [];

        $$("#chapter-content p").each((_, el) => {
          const txt = $$(el).text().trim();
          if (txt) content.push(txt);
        });
        if (!content.length) {
          content = $$("#chapter-content")
            .text()
            .split(/\n+/)
            .map(t => t.trim())
            .filter(Boolean);
        }
        if (content.length < 3) continue;
        
        chapters.push({
          id: String(incrementalStart + i + 1),
          title,
          content,
        });
      } catch (e) {
        console.log(`Skipped chapter: ${selected[i]}`, e);
      }
    }

    return NextResponse.json({
      id: slug,
      title,
      author,
      image,
      alternative,
      genres,
      tags,
      status,
      rating: Number.isFinite(rating) ? rating : undefined,
      description,
      sourceUrl: novelBaseUrl || url,
      chapters,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
