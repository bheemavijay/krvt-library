// This service retrieves the most recently updated novels.

import type { NovelSummary } from "@/shared/types";

export function getRecentNovels(novels: NovelSummary[], count: number): NovelSummary[] {
  return [...novels]
    .sort((a, b) => Date.parse(b.lastUpdated || "1970-01-01") - Date.parse(a.lastUpdated || "1970-01-01"))
    .slice(0, count);
}
