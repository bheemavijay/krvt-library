"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getNovel } from "@/lib/storage/indexeddb";
import type { Novel } from "@/types";

export default function NovelPageClient({ novelId }: { novelId: string }) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getNovel(novelId).then((data) => {
      if (!cancelled) {
        setNovel(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [novelId]);

  const chapterCount = novel?.chapters.length ?? 0;
  const hasLongDescription = (novel?.description?.length ?? 0) > 280;
  const visibleDescription = !novel?.description
    ? "Add a summary to this novel to give readers a stronger overview before they start."
    : isDescriptionExpanded || !hasLongDescription
      ? novel.description
      : `${novel.description.slice(0, 280).trim()}...`;

  if (!novel) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <main className="space-y-10 pb-12">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,#16121b_0%,#10131a_52%,#0b0c10_100%)] shadow-[var(--shadow)]">
        <div className="grid gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[260px_1fr] lg:px-10 lg:py-10">
          <div
            className="min-h-[320px] rounded-[1.5rem] border border-white/10 bg-cover bg-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            style={getNovelCoverStyle(novel)}
          />

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.28em] text-white/70">
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
              <p className="text-xs uppercase tracking-[0.32em] text-accent">Novel Profile</p>
              <h1 className="mt-3 max-w-4xl font-heading text-4xl text-white sm:text-5xl">
                {novel.title}
              </h1>
              <p className="mt-3 text-sm text-white/80 sm:text-base">by {novel.author}</p>
              {novel.alternative ? (
                <p className="mt-2 text-sm italic text-white/60">{novel.alternative}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {novel.genres?.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs text-accent transition-all duration-200"
                >
                  {genre}
                </span>
              ))}
              {novel.categories?.map((category) => (
                <span
                  key={category}
                  className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/80 transition-all duration-200"
                >
                  {category}
                </span>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Status" value={novel.status || "Unknown"} />
              <StatCard label="Genres" value={String(novel.genres?.length ?? 0)} />
              <StatCard
                label="Rating"
                value={typeof novel.rating === "number" ? novel.rating.toFixed(1) : "N/A"}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/novel/${novel.id}/1`}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.01]"
              >
                Read First Chapter
              </Link>
              <Link
                href={`/novel/${novel.id}/${Math.max(chapterCount, 1)}`}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                Jump to Latest
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-panel/75 p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-accent">Synopsis</p>
                <h2 className="mt-2 font-heading text-3xl text-foreground">Story Overview</h2>
              </div>
              {hasLongDescription ? (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((current) => !current)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-all duration-200 hover:bg-white/10"
                >
                  {isDescriptionExpanded ? "Collapse" : "Expand"}
                </button>
              ) : null}
            </div>
            <p className="mt-5 text-sm leading-8 text-white/80 sm:text-base">{visibleDescription}</p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-panel/75 p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-accent">Chapters</p>
                <h2 className="mt-2 font-heading text-3xl text-foreground">Reading List</h2>
              </div>
              <span className="text-sm text-white/50">{chapterCount} total</span>
            </div>

            <div className="mt-6 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {novel.chapters.map((chapter, index) => (
                <Link
                  key={chapter.id ?? `${novel.id}-${index}`}
                  href={`/novel/${novel.id}/${index + 1}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition-all duration-200 hover:border-accent/35 hover:bg-black/30"
                >
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Chapter {index + 1}
                    </p>
                    <p className="truncate text-sm font-medium text-white sm:text-base">
                      {chapter.title}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/40">Read</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-panel/75 p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Metadata</p>
            <h2 className="mt-2 font-heading text-3xl text-foreground">Novel Details</h2>
            <div className="mt-6 space-y-4">
              <MetadataRow label="Author" value={novel.author} />
              <MetadataRow label="Status" value={novel.status || "Unknown"} />
              <MetadataRow
                label="Rating"
                value={typeof novel.rating === "number" ? `${renderStars(novel.rating)} ${novel.rating.toFixed(1)}` : "N/A"}
              />
              <MetadataRow label="Genres" value={(novel.genres || []).join(", ") || "None"} />
              <MetadataRow
                label="Categories"
                value={(novel.categories || []).join(", ") || "None"}
              />
              <MetadataRow label="Tags" value={(novel.tags || []).join(", ") || "None"} />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-panel/75 p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-accent">Reader Actions</p>
            <h2 className="mt-2 font-heading text-3xl text-foreground">Quick Start</h2>
            <div className="mt-6 space-y-3">
              <Link
                href={`/novel/${novel.id}/1`}
                className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white transition-all duration-200 hover:border-accent/35 hover:bg-black/30"
              >
                Start from chapter 1
              </Link>
              <Link
                href={`/novel/${novel.id}/${Math.max(chapterCount, 1)}`}
                className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white transition-all duration-200 hover:border-accent/35 hover:bg-black/30"
              >
                Open latest available chapter
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 text-sm leading-7 text-white/75">{value}</p>
    </div>
  );
}

function renderStars(rating: number) {
  const filled = Math.round(Math.max(0, Math.min(rating, 5)));
  return `${"\u2605".repeat(filled)}${"\u2606".repeat(Math.max(0, 5 - filled))}`;
}

function getNovelCoverStyle(novel: Novel) {
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
