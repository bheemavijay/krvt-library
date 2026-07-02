"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import { getNovelChapterList, getNovelSummary } from "@/features/library";
import type { Chapter, NovelSummary } from "@/shared/types";

export default function NovelPageClient({ novelId }: { novelId: string }) {
  const [novel, setNovel] = useState<NovelSummary | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"synopsis" | "chapters">("synopsis");
  const [chapterOrder, setChapterOrder] = useState<"latest" | "oldest">("latest");

  useEffect(() => {
    let cancelled = false;

    const safeId = decodeURIComponent(novelId.trim());

    Promise.all([getNovelSummary(safeId), getNovelChapterList(safeId)]).then(([data, nextChapters]) => {
      if (!cancelled) {
        setNovel(data);
        setChapters(nextChapters);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [novelId]);

  const chapterCount = novel?.chapterCount ?? chapters.length;
  const hasLongDescription = (novel?.description?.length ?? 0) > 280;
  const visibleDescription = !novel?.description
    ? "No description available"
    : isDescriptionExpanded || !hasLongDescription
      ? novel.description
      : `${novel.description.slice(0, 280).trim()}...`;

  const sortedChapters =
    chapterOrder === "latest" ? [...chapters].reverse() : chapters;

  if (!novel) {
    return <KrvtLoader />;
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 space-y-6 sm:space-y-10 pb-12 pt-6">
      <section className="overflow-hidden rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,#16121b_0%,#10131a_52%,#0b0c10_100%)] shadow-xl">
        <div className="grid gap-6 sm:gap-8 p-4 sm:p-6 lg:grid-cols-[300px_1fr] lg:p-10">
          <div
            className="w-full h-auto aspect-[3/4] bg-cover bg-center rounded-xl sm:rounded-[1.5rem] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            style={getNovelCoverStyle(novel)}
          />

          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs uppercase tracking-[0.28em] text-white/70">
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1">
                {novel.status || "Library"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1">
                {chapterCount} chapters
              </span>
              {typeof novel.rating === "number" ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1">
                  {renderStars(novel.rating)} {novel.rating.toFixed(1)}
                </span>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-accent">Novel Profile</p>
              <h1 className="mt-2 sm:mt-3 max-w-4xl font-heading text-2xl sm:text-4xl md:text-5xl text-white">
                {novel.title}
              </h1>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/80">by {novel.author}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {novel.genres?.map((genre) => (
                <Link
                  key={genre}
                  href={`/?view=novels&q=${encodeURIComponent(genre)}`}
                  className="rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-[10px] sm:text-xs text-accent transition-all duration-200 hover:bg-accent-soft/80"
                >
                  {genre}
                </Link>
              ))}
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
              <StatCard label="Status" value={novel.status || "Unknown"} />
              <StatCard label="Genres" value={String(novel.genres?.length ?? 0)} />
              <StatCard
                label="Rating"
                value={typeof novel.rating === "number" ? novel.rating.toFixed(1) : "N/A"}
              />
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                href={`/reader?id=${novel.id}&chapter=1`}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-full bg-accent px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.01]"
              >
                Read First Chapter
              </Link>
              <Link
                href={`/reader?id=${novel.id}&chapter=${Math.max(chapterCount, 1)}`}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                Jump to Latest
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 border-b border-white/10">
        <TabButton
          label="Synopsis"
          isActive={activeTab === "synopsis"}
          onClick={() => setActiveTab("synopsis")}
        />
        <TabButton
          label="Chapters"
          isActive={activeTab === "chapters"}
          onClick={() => setActiveTab("chapters")}
        />
      </div>

      {activeTab === "synopsis" ? (
        <section className="space-y-6">
          <div className="rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-[#14151a]/80 p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent">Synopsis</p>
                <h2 className="mt-1 sm:mt-2 font-heading text-xl sm:text-3xl text-foreground">Story Overview</h2>
              </div>
              {hasLongDescription ? (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((current) => !current)}
                  className="self-start min-h-[36px] rounded-full border border-white/10 bg-white/5 px-4 text-xs sm:text-sm text-white/80 transition-all duration-200 hover:bg-white/10"
                >
                  {isDescriptionExpanded ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>
            <p className="mt-4 sm:mt-5 text-sm sm:text-base leading-relaxed sm:leading-8 text-white/80">{visibleDescription}</p>
          </div>

          {Array.isArray(novel.tags) && novel.tags.length > 0 ? (
            <div className="rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-[#14151a]/80 p-4 sm:p-6 shadow-lg">
              <h2 className="font-heading text-xl sm:text-3xl text-foreground">Tags</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {novel.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?view=novels&q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs sm:text-sm text-white/80 transition-all duration-200 hover:bg-white/10"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "chapters" ? (
        <section className="space-y-6">
          <div className="rounded-2xl sm:rounded-[1.5rem] border border-white/10 bg-[#14151a]/80 p-4 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-accent">Chapters</p>
                <h2 className="mt-1 sm:mt-2 font-heading text-xl sm:text-3xl text-foreground">Reading List</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-white/50">{chapterCount} total</span>
                <button
                  type="button"
                  onClick={() => setChapterOrder(chapterOrder === "latest" ? "oldest" : "latest")}
                  className="min-h-[36px] rounded-full border border-white/10 bg-white/5 px-4 text-xs sm:text-sm text-white/80 transition-all duration-200 hover:bg-white/10"
                >
                  {chapterOrder === "latest" ? "Latest First" : "Oldest First"}
                </button>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 max-h-[500px] sm:max-h-[720px] space-y-2 sm:space-y-3 overflow-y-auto pr-1">
              {sortedChapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/reader?id=${novel.id}&chapter=${chapter.order}`}
                  className="flex items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-white/10 bg-black/20 px-3 sm:px-4 py-3 sm:py-4 transition-all duration-200 hover:border-accent/35 hover:bg-black/30"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-white/45">
                      Chapter {chapter.order}
                    </p>
                    <p className="truncate text-sm font-medium text-white sm:text-base mt-0.5 sm:mt-0">
                      {chapter.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/40">Read</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium text-center transition-all duration-200 ${
        isActive
          ? "text-accent border-b-2 border-accent"
          : "text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl sm:rounded-[1.25rem] border border-white/10 bg-black/20 px-3 sm:px-4 py-3 sm:py-4">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-1 sm:mt-2 text-base sm:text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function renderStars(rating: number) {
  const filled = Math.round(Math.max(0, Math.min(rating, 5)));
  return `${"\u2605".repeat(filled)}${"\u2606".repeat(Math.max(0, 5 - filled))}`;
}

function getNovelCoverStyle(novel: NovelSummary) {
  if (novel.image?.trim()) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(7,7,10,0.08), rgba(7,7,10,0.68)), url("${novel.image}")`,
    };
  }

  return {
    background:
      "linear-gradient(180deg, rgba(212,177,106,0.18) 0%, rgba(76,57,119,0.25) 38%, rgba(11,11,15,0.92) 100%)",
  };
}
