import type { NovelSummary } from "@/shared/types";

export function searchLibrary(novels: NovelSummary[], searchQuery: string): NovelSummary[] {
  const query = searchQuery.toLowerCase().trim();
  if (!query) return novels;

  return novels.filter(
    (n) =>
      n.title.toLowerCase().includes(query) ||
      n.author?.toLowerCase().includes(query) ||
      n.genres?.some((g) => g.toLowerCase().includes(query)) ||
      n.tags?.some((t) => t.toLowerCase().includes(query))
  );
}
