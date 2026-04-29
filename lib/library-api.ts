import type { Chapter, Novel, NovelSummary } from "@/types";

type ChapterFetchOptions = {
  chapterNumber?: number;
  mode?: "list" | "full";
};

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const payload = (await response.json()) as { error?: unknown };

      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error;
      }
    } catch {
      // Ignore invalid JSON and use the fallback message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getNovels() {
  const response = await fetch("/api/novels", {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<NovelSummary[]>(
    response,
    "Unable to load the local library.",
  );
}

export async function getNovelById(novelId: string) {
  const response = await fetch(`/api/novels?id=${encodeURIComponent(novelId)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  return parseJsonResponse<NovelSummary>(
    response,
    "Unable to load this novel from the local library.",
  );
}

export async function getChapters(novelId: string, options: ChapterFetchOptions = {}) {
  const searchParams = new URLSearchParams({
    novelId,
    mode: options.mode ?? "full",
  });

  if (typeof options.chapterNumber === "number") {
    searchParams.set("chapter", String(options.chapterNumber));
  }

  const response = await fetch(`/api/chapters?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return [] satisfies Chapter[];
  }

  return parseJsonResponse<Chapter[]>(
    response,
    "Unable to load chapters from the local library.",
  );
}

export async function saveNovel(novel: Novel) {
  const response = await fetch("/api/novels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ novel }),
  });

  return parseJsonResponse<typeof novel>(
    response,
    "Unable to save this novel to local storage.",
  );
}
