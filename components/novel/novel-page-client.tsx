"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import type { Chapter, Novel } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getServerUploadedLibraryState,
  getUploadedLibraryState,
  subscribeToUploadedLibrary,
} from "@/lib/library-storage";
import {
  getReadingState,
  getServerReadingState,
  subscribeToReadingState,
} from "@/lib/reader-storage";
import {
  getChapters as getSupabaseChapters,
  getNovelById as getSupabaseNovelById,
} from "@/lib/supabase-service";
import { formatChapterLabel } from "@/lib/utils";

type NovelPageClientProps = {
  initialNovel: Novel | null;
  novelId: string;
};

export function NovelPageClient({ initialNovel, novelId }: NovelPageClientProps) {
  const uploadedLibrary = useSyncExternalStore(
    subscribeToUploadedLibrary,
    getUploadedLibraryState,
    getServerUploadedLibraryState,
  );
  const readingState = useSyncExternalStore(
    subscribeToReadingState,
    getReadingState,
    getServerReadingState,
  );

  const uploadedNovel =
    uploadedLibrary.novels.find((entry) => entry.novel.id === novelId)?.novel ?? null;
  const [remoteNovel, setRemoteNovel] = useState<Novel | null>(null);
  const [isLoadingRemoteNovel, setIsLoadingRemoteNovel] = useState(
    !initialNovel && !uploadedNovel,
  );
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    if (initialNovel || uploadedNovel) {
      setIsLoadingRemoteNovel(false);
      return;
    }

    let isActive = true;

    async function loadRemoteNovel() {
      setIsLoadingRemoteNovel(true);
      setRemoteError(null);

      try {
        const [novelSummary, chapters] = await Promise.all([
          getSupabaseNovelById(novelId),
          getSupabaseChapters(novelId),
        ]);

        if (!isActive) {
          return;
        }

        if (!novelSummary) {
          setRemoteNovel(null);
          return;
        }

        setRemoteNovel({
          id: novelSummary.id,
          title: novelSummary.title,
          author: novelSummary.author,
          chapters,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRemoteError(
          error instanceof Error
            ? `Supabase could not load this novel. Showing local fallback if available. ${error.message}`
            : "Supabase could not load this novel. Showing local fallback if available.",
        );
        setRemoteNovel(null);
      } finally {
        if (isActive) {
          setIsLoadingRemoteNovel(false);
        }
      }
    }

    void loadRemoteNovel();

    return () => {
      isActive = false;
    };
  }, [initialNovel, novelId, uploadedNovel]);

  const novel = useMemo(
    () => initialNovel ?? uploadedNovel ?? remoteNovel,
    [initialNovel, remoteNovel, uploadedNovel],
  );
  const savedChapterIndex = novel ? readingState.progressByNovel[novel.id]?.chapterIndex ?? 0 : 0;
  const hasContinueReading = Boolean(
    novel && novel.chapters.length > 0 && readingState.lastOpenedNovelId === novel.id,
  );
  const synopsis = novel ? buildSynopsis(novel) : "";

  if (isLoadingRemoteNovel && !novel) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        <p className="text-sm text-muted">Loading novel from Supabase...</p>
      </main>
    );
  }

  if (!novel) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">Missing story</p>
        <h1 className="font-heading text-3xl text-foreground">
          This novel is not available in your library.
        </h1>
        <p className="max-w-md text-sm leading-7 text-muted">
          It may have been removed from local storage or the link is invalid.
        </p>
        {remoteError ? (
          <p className="max-w-xl rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {remoteError}
          </p>
        ) : null}
        <Button href="/">Return to library</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 py-2 sm:gap-6">
      {remoteError ? (
        <p className="rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {remoteError}
        </p>
      ) : null}

      <Card className="rounded-[2rem] bg-panel-strong/90 p-5 sm:p-8">
        <div className="mb-5">
          <Link href="/" className="text-sm text-muted transition hover:text-accent">
            Back to library
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
          <div className="mx-auto w-full max-w-xs lg:mx-0">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(212,177,106,0.22),rgba(15,17,22,0.96))] p-5 shadow-[var(--shadow)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_36%)]" />
              <div className="relative flex aspect-[3/4] flex-col justify-between rounded-[1.25rem] border border-white/8 bg-black/15 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-accent">KRVT Library</p>
                <div className="space-y-3">
                  <h2 className="font-heading text-2xl leading-tight text-foreground sm:text-3xl">
                    {novel.title}
                  </h2>
                  <p className="text-sm text-muted-strong">{novel.author}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-accent">Novel details</p>
              <h1 className="font-heading text-3xl text-foreground sm:text-5xl">
                {novel.title}
              </h1>
              <p className="text-base text-muted sm:text-lg">by {novel.author}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetaBlock label="Author" value={novel.author} />
              <MetaBlock label="Chapters" value={String(novel.chapters.length)} />
              <MetaBlock
                label="Status"
                value={novel.chapters.length > 0 ? "Ready to read" : "No chapters"}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {hasContinueReading ? (
                <Button
                  href={`/novel/${novel.id}/${savedChapterIndex + 1}`}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              ) : novel.chapters.length > 0 ? (
                <Button href={`/novel/${novel.id}/1`} className="w-full sm:w-auto">
                  Start Reading
                </Button>
              ) : null}
              {novel.chapters.length === 0 ? (
                <Button type="button" disabled className="w-full sm:w-auto">
                  Start Reading
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] bg-panel/80 p-5 sm:p-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-accent">Synopsis</p>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
              A brief look inside
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-8 text-muted sm:text-base">
            {synopsis}
          </p>
        </div>
      </Card>

      <Card className="rounded-[2rem] bg-panel/80 p-5 sm:p-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-accent">Chapters</p>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
              Chapter list
            </h2>
          </div>

          {novel.chapters.length === 0 ? (
            <p className="text-sm text-muted">No chapters are available for this novel yet.</p>
          ) : (
            <div className="space-y-3">
              {novel.chapters.map((chapter, index) => (
                <ChapterListItem
                  key={chapter.id}
                  novelId={novel.id}
                  chapter={chapter}
                  chapterNumber={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}

type ChapterListItemProps = {
  novelId: string;
  chapter: Chapter;
  chapterNumber: number;
};

function ChapterListItem({ novelId, chapter, chapterNumber }: ChapterListItemProps) {
  return (
    <Link
      href={`/novel/${novelId}/${chapterNumber}`}
      className="group block rounded-[1.5rem] border border-border bg-panel-strong/72 px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-accent/45 hover:bg-panel-strong sm:px-5 sm:py-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.32em] text-accent">
            Chapter {chapterNumber}
          </p>
          <h3 className="font-heading text-lg leading-snug text-foreground transition group-hover:text-accent sm:text-xl">
            {`Chapter ${chapterNumber}: ${chapter.title}`}
          </h3>
        </div>
        <span className="shrink-0 text-sm text-muted-strong transition group-hover:text-accent">
          Read
        </span>
      </div>
    </Link>
  );
}

type MetaBlockProps = {
  label: string;
  value: string;
};

function MetaBlock({ label, value }: MetaBlockProps) {
  return (
    <div className="rounded-[1.25rem] border border-white/8 bg-white/4 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.28em] text-accent">{label}</p>
      <p className="mt-2 text-sm text-muted-strong sm:text-base">{value}</p>
    </div>
  );
}

function buildSynopsis(novel: Novel) {
  const previewText = novel.chapters[0]?.content[0] ?? "";
  const normalizedPreview = previewText.replace(/\s+/g, " ").trim();

  if (!normalizedPreview) {
    return `${novel.title} follows ${novel.author}'s world across ${formatChapterLabel(
      novel.chapters.length,
    )}, with a focused reading flow designed for long-form reading.`;
  }

  const trimmedPreview =
    normalizedPreview.length > 280
      ? `${normalizedPreview.slice(0, 277).trimEnd()}...`
      : normalizedPreview;

  return trimmedPreview;
}
