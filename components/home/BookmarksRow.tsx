"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAllBookmarks } from "@/features/library";
import type { NovelSummary } from "@/shared/types";
import { BookmarkCard } from "@/components/home/BookmarkCard";

type BookmarksRowProps = {
  allNovels: NovelSummary[];
};

export function BookmarksRow({ allNovels }: BookmarksRowProps) {
  const { bookmarkItems, isLoading } = useAllBookmarks(allNovels);

  if (isLoading || !bookmarkItems.length) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="font-heading text-2xl font-medium text-[var(--krvt-fg)] sm:text-3xl">
            Bookmarks
          </h2>
          <Link href="/?view=history" className="flex items-center gap-2 text-sm text-[var(--krvt-accent)] transition-colors hover:text-[var(--krvt-fg)]">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {bookmarkItems.slice(0, 4).map((item) => (
            <BookmarkCard key={`${item.novel.id}-${item.bookmark.chapterIndex}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
