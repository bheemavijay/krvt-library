"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { Novel } from "@/types";

import { ReaderShell } from "@/components/reader/reader-shell";
import { Button } from "@/components/ui/button";
import {
  getServerUploadedLibraryState,
  getUploadedLibraryState,
  subscribeToUploadedLibrary,
} from "@/lib/library-storage";
import {
  getChapters as getSupabaseChapters,
  getNovelById as getSupabaseNovelById,
} from "@/lib/supabase-service";

type ReaderPageClientProps = {
  initialNovel: Novel | null;
  novelId: string;
  chapterParam: string;
};

export function ReaderPageClient({
  initialNovel,
  novelId,
  chapterParam,
}: ReaderPageClientProps) {
  const uploadedLibrary = useSyncExternalStore(
    subscribeToUploadedLibrary,
    getUploadedLibraryState,
    getServerUploadedLibraryState,
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

        if (!novelSummary || chapters.length === 0) {
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
  const chapterNumber = Number(chapterParam);
  const chapterIndex = Number.isInteger(chapterNumber) ? chapterNumber - 1 : -1;

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

  if (chapterIndex < 0 || chapterIndex >= novel.chapters.length) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">Missing chapter</p>
        <h1 className="font-heading text-3xl text-foreground">
          This chapter is not available.
        </h1>
        <p className="max-w-md text-sm leading-7 text-muted">
          Choose another chapter from the novel details page.
        </p>
        <Button href={`/novel/${novel.id}`}>Back to novel</Button>
      </main>
    );
  }

  return (
    <>
      {remoteError ? (
        <p className="mx-auto mb-4 w-full max-w-5xl rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {remoteError}
        </p>
      ) : null}
      <ReaderShell novel={novel} chapterIndex={chapterIndex} />
    </>
  );
}
