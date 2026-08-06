import Link from "next/link";
import type { NovelSummary } from "@/shared/types";

type BookmarkItem = {
  novel: NovelSummary;
  bookmark: {
    chapterIndex: number;
    createdAt: number;
  };
};

function formatRelativeDate(value?: string | number) {
  if (!value) return "Not available";
  const timestamp = typeof value === 'string' ? Date.parse(value) : value;
  if (Number.isNaN(timestamp)) return "Not available";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

export function BookmarkCard({ item }: { item: BookmarkItem }) {
  const chapterTitle = item.novel.chapterTitles?.[item.bookmark.chapterIndex] ?? `Chapter ${item.bookmark.chapterIndex + 1}`;

  return (
    <Link
      href={`/reader?id=${item.novel.id}&chapter=${item.bookmark.chapterIndex + 1}`}
      className="block rounded-xl border border-[var(--krvt-border)] bg-[var(--krvt-panel-strong)] p-4 transition-colors hover:bg-[var(--krvt-panel)] h-full"
    >
      <p className="line-clamp-1 font-medium text-base text-[var(--krvt-fg)]">{item.novel.title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--krvt-fg)]/70">{chapterTitle}</p>
      <p className="mt-3 text-xs text-[var(--krvt-fg)]/50">{formatRelativeDate(item.bookmark.createdAt)}</p>
    </Link>
  );
}
