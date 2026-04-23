"use client";

import Link from "next/link";
import {
  isChapterBookmarked,
  saveNovelBookmark,
  subscribeToBookmarks,
} from "@/lib/storage/bookmarks";

type Props = {
  novel: any;
  chapterIndex: number;
  onOpenSettings: () => void;
  onToggleTts?: () => void;
  onBookmark?: () => void;
  onOpenChapters?: () => void;
  isBookmarked?: boolean;
};

export default function ReaderControls({
  novel,
  chapterIndex,
  onOpenSettings,
  onToggleTts,
  onBookmark,
  onOpenChapters,
  isBookmarked, // ✅ ADD THIS
}: Props) {
  const prevHref =
    chapterIndex > 0
      ? `/novel/${novel.id}/${chapterIndex}`
      : undefined;

  const nextHref =
    chapterIndex < novel.chapters.length - 1
      ? `/novel/${novel.id}/${chapterIndex + 2}`
      : undefined;

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur border-b border-white/10">
      <div className="w-full px-4 flex justify-between items-center h-16">

        {/* LEFT */}
        <div className="flex items-center gap-3 overflow-x-auto">

          {/* LOGO */}
          <img src="/logo.png" className="h-6 w-auto mr-3" />

          {/* PREV */}
          {prevHref ? (
            <Link href={prevHref} className="btn">
              Prev
            </Link>
          ) : (
            <button className="btn opacity-40" disabled>
              Prev
            </button>
          )}

          {/* BOOKMARK */}
          <button
            onClick={onBookmark}
            className={`btn ${
              isBookmarked ? "bg-yellow-500 text-black" : ""
            }`}
          >
            {isBookmarked ? "Saved" : "Bookmark"}
          </button>

          {/* INFO */}
          <Link href={`/novel/${novel.id}`} className="btn">
            Info
          </Link>

          {/* SETTINGS */}
          <button onClick={onOpenSettings} className="btn">
            Settings
          </button>

          {/* TTS */}
          <button onClick={onToggleTts} className="btn">
            TTS
          </button>

          {/* CHAPTER LIST */}
          <button onClick={onOpenChapters} className="btn">
            Chapters
          </button>
        </div>

        {/* RIGHT */}
        {nextHref ? (
          <Link href={nextHref} className="btn">
            Next
          </Link>
        ) : (
          <button className="btn opacity-40" disabled>
            Next
          </button>
        )}
      </div>
    </div>
  );
}