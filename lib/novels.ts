import type { Chapter, Novel } from "@/types";

const FALLBACK_COVER =
  "https://via.placeholder.com/300x400?text=No+Cover";

type NovelInput = Partial<Novel> & {
  genre?: string | string[];
  categories?: string[] | string;
  tags?: string[] | string;
  chapters?: Array<Partial<Chapter> & { content?: string[] | string }>;
};

export function fixImageUrl(url?: string): string {
  if (!url) return "";

  // already correct
  if (url.startsWith("http")) return url;

  // fix relative novelfull paths
  if (url.startsWith("/")) {
    return `https://novelfull.com${url}`;
  }

  return url;
}

export function normalizeImportUrl(input: string) {
  try {
    const url = new URL(input.trim());

    if (/novelfull\.(com|net)/i.test(url.hostname)) {
      if (!url.pathname.includes("/chapter-") && !url.pathname.endsWith(".html")) {
        url.pathname = `${url.pathname.replace(/\/$/, "")}.html`;
      }
    }

    return url.toString();
  } catch {
    return input.trim();
  }
}

export function normalizeNovelUrlKey(input: string | undefined) {
  if (!input) {
    return "";
  }

  try {
    const url = new URL(normalizeImportUrl(input));
    const normalizedPath = url.pathname.replace(/\.html\/?$/i, "").replace(/\/$/, "");
    return `${url.origin}${normalizedPath}`.toLowerCase();
  } catch {
    return normalizeImportUrl(input).toLowerCase();
  }
}

export function slugifyNovelId(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "novel";
}

export function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (Array.isArray(value)) {
            return value;
          }

          if (typeof value === "string") {
            return value.split(",");
          }

          return [];
        })
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeChapterContent(content: unknown) {
  if (Array.isArray(content)) {
    return content
      .map((line) => String(line ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  if (typeof content === "string") {
    return content
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeChapterTitle(title: unknown, order: number) {
  const normalized = String(title ?? "").trim();
  return normalized || `Chapter ${order}`;
}

export function normalizeChapter(
  novelId: string,
  chapter: Partial<Chapter> & { content?: string[] | string },
  fallbackOrder: number,
) {
  const parsedOrder = Number(chapter.order);
  const order = Number.isInteger(parsedOrder) && parsedOrder > 0 ? parsedOrder : fallbackOrder;

  return {
    id: `${novelId}-chapter-${order}`,
    order,
    title: normalizeChapterTitle(chapter.title, order),
    content: normalizeChapterContent(chapter.content),
  } satisfies Chapter;
}

export function mergeNovelChapters(
  novelId: string,
  existing: Array<Partial<Chapter> & { content?: string[] | string }> = [],
  incoming: Array<Partial<Chapter> & { content?: string[] | string }> = [],
) {
  const normalized = [...existing, ...incoming].map((chapter, index) =>
    normalizeChapter(novelId, chapter, index + 1),
  );

  const byOrder = new Map<number, Chapter>();

  for (const chapter of normalized) {
    const current = byOrder.get(chapter.order);

    if (!current) {
      byOrder.set(chapter.order, chapter);
      continue;
    }

    const currentScore = current.content.length;
    const nextScore = chapter.content.length;

    if (nextScore >= currentScore) {
      byOrder.set(chapter.order, chapter);
    }
  }

  return Array.from(byOrder.values())
    .sort((left, right) => left.order - right.order)
    .map((chapter, index) => ({
      ...chapter,
      id: `${novelId}-chapter-${index + 1}`,
      order: index + 1,
      title: normalizeChapterTitle(chapter.title, index + 1),
      content: normalizeChapterContent(chapter.content),
    }));
}

export function normalizeNovelRecord(input: NovelInput): Novel {
  const title = String(input.title ?? "").trim() || "Unknown Title";
  const id = slugifyNovelId(title);
  const normalizedSourceUrl =
    typeof input.sourceUrl === "string" && input.sourceUrl.trim()
      ? normalizeNovelUrlKey(input.sourceUrl)
      : `local://novel/${id}`;
  const genres = uniqueStrings([input.genres, input.genre, input.categories]);
  const tags = uniqueStrings([input.tags]);
  const rating = Number(input.rating);

  return {
    id,
    title,
    author: String(input.author ?? "").trim() || "Unknown",
    sourceUrl: normalizedSourceUrl,
    isCompleted: Boolean(input.isCompleted),
    lastUpdated:
      typeof input.lastUpdated === "string" && input.lastUpdated.trim()
        ? input.lastUpdated
        : new Date().toISOString(),
    image:
      typeof input.image === "string" && input.image.trim()
        ? fixImageUrl(input.image.trim())
        : FALLBACK_COVER,
    alternative: typeof input.alternative === "string" ? input.alternative.trim() : "",
    genres,
    status: typeof input.status === "string" ? input.status.trim() : "",
    rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
    tags,
    description:
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : "No description available",
    chapters: mergeNovelChapters(id, [], input.chapters ?? []),
  };
}
