"use client";

import { HomeSection } from "@/components/home/HomeSection";
import { BookmarkCard } from "@/components/home/BookmarkCard";
import type { NovelSummary } from "@/shared/types";

type BookmarkItem = {
  novel: NovelSummary;
  bookmark: {
    chapterIndex: number;
    createdAt: number;
  };
};

type BookmarksSectionProps = {
  bookmarks: BookmarkItem[];
};

export function BookmarksSection({ bookmarks }: BookmarksSectionProps) {
  if (!bookmarks.length) return null;

  return (
    <HomeSection title="Bookmarks" viewAllHref="/?view=history">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {bookmarks.slice(0, 4).map((item) => (
          <BookmarkCard key={`${item.novel.id}-${item.bookmark.chapterIndex}`} item={item} />
        ))}
      </div>
    </HomeSection>
  );
}
