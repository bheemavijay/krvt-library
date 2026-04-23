import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// ✅ mimic browser
async function fetchPage(url: string) {
  return fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
}

export async function POST(req: Request) {
  try {
    const { url, offset = 0 } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const baseUrl = new URL(url).origin;

    // 🔹 MAIN PAGE
    const res = await fetchPage(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const info = $(".info");

    const title =
      $("h3.title").text().trim() ||
      $("h1").first().text().trim() ||
      "Unknown Title";

    const author = info.find('a[href*="author"]').text().trim();

    const alternative = info
      .find("h3")
      .filter((_, el) => $(el).text().includes("Alternative"))
      .next()
      .text()
      .trim();

    const genre = info
      .find('a[href*="genre"]')
      .map((_, el) => $(el).text())
      .get()
      .join(", ");

    const status = info.text().includes("Completed")
      ? "Completed"
      : "Ongoing";

    const rating = $(".small span[itemprop='ratingValue']").text().trim();

    const description = $("#tab-description")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // 🖼️ COVER
    let image =
      $(".book img").attr("src") ||
      $(".info img").attr("src") ||
      $("img").first().attr("src") ||
      "";

    if (image.startsWith("/")) image = baseUrl + image;

    // 🔥 GET ALL CHAPTER LINKS (with duplicate stop)
    let chapterLinks: string[] = [];
    let prevFirst = "";

    for (let page = 1; ; page++) {
      const pageUrl = `${url}?page=${page}&per-page=50`;

      const pageRes = await fetchPage(pageUrl);
      const pageHtml = await pageRes.text();

      const $$ = cheerio.load(pageHtml);

      const found: string[] = [];

      $$(".list-chapter a").each((_, el) => {
        const link = $$(el).attr("href");

        if (link) {
          const full = link.startsWith("http")
            ? link
            : baseUrl + link;

          found.push(full);
        }
      });

      console.log(`Page ${page}: ${found.length}`);

      if (found.length === 0) break;

      // 🔥 STOP duplicate pages
      if (found[0] === prevFirst) {
        console.log("Duplicate page detected → stopping");
        break;
      }

      prevFirst = found[0];

      chapterLinks.push(...found);
    }

    chapterLinks = [...new Set(chapterLinks)];

    console.log("TOTAL CHAPTERS:", chapterLinks.length);

    if (chapterLinks.length === 0) {
      return NextResponse.json(
        { error: "No chapters found" },
        { status: 500 }
      );
    }

    // 🔥 OFFSET + BATCH
    const BATCH_SIZE = 100;
    const selectedLinks = chapterLinks.slice(offset, offset + BATCH_SIZE);

    console.log(
      "Returning chapters:",
      offset,
      "→",
      offset + selectedLinks.length
    );

    const chapters = [];

    for (let i = 0; i < selectedLinks.length; i++) {
      const chRes = await fetchPage(selectedLinks[i]);
      const chHtml = await chRes.text();

      const $$ = cheerio.load(chHtml);

      const chTitle =
        $$(".chr-title").text().trim() ||
        $$("h3").first().text().trim() ||
        `Chapter ${offset + i + 1}`;

      // 🔥 CONTENT EXTRACTION (FIXED)
      const container =
        $$("#chapter-content") ||
        $$("#chr-content") ||
        $$(".chapter-content");

      let paragraphs: string[] = [];

      // ✅ Try proper <p> extraction
      container.find("p").each((_, el) => {
        const text = $$(el).text().trim();
        if (text) paragraphs.push(text);
      });

      // ⚠️ fallback if no <p>
      if (paragraphs.length === 0) {
        const raw = container.text();

        paragraphs = raw
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }

      chapters.push({
        id: String(offset + i + 1),
        title: chTitle,
        content: paragraphs, // ✅ always array
      });
    }

    return NextResponse.json({
      title,
      author,
      alternative,
      genre,
      status,
      rating,
      description,
      image,
      chapters,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Scraping failed" },
      { status: 500 }
    );
  }
}