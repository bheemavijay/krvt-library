/**
 * Fetch raw HTML from chapter URL
 * 
 * Pattern: https://www.mvlempyr.io/chapter/{novel-id}-{chapter-number}
 * Example: https://www.mvlempyr.io/chapter/5117-1
 */
export async function fetchChapterHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to fetch chapter`);
  }

  const html = await response.text();

  if (!html || html.length < 100) {
    throw new Error("Response too small (likely invalid page)");
  }

  return html;
}
