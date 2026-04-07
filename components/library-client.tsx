"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { Novel, NovelSummary } from "@/types";

import { ContinueReadingCard } from "@/components/continue-reading-card";
import { LibraryHeader } from "@/components/layout/library-header";
import { NovelGrid } from "@/components/novel-grid";
import { UploadNovelForm } from "@/components/upload-novel-form";
import {
  getServerUploadedLibraryState,
  getUploadedLibraryState,
  subscribeToUploadedLibrary,
} from "@/lib/library-storage";
import { getNovels as getSupabaseNovels } from "@/lib/supabase-service";
import { normalizeNovelTitle } from "@/lib/utils";

type LibraryClientProps = {
  novels: Novel[];
};

type SortOption = "recent" | "title" | "chapters";

export function LibraryClient({ novels }: LibraryClientProps) {
  const uploadedLibrary = useSyncExternalStore(
    subscribeToUploadedLibrary,
    getUploadedLibraryState,
    getServerUploadedLibraryState,
  );
  const [remoteNovels, setRemoteNovels] = useState<NovelSummary[]>([]);
  const [isLoadingRemoteNovels, setIsLoadingRemoteNovels] = useState(true);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  useEffect(() => {
    let isActive = true;

    async function loadRemoteNovels() {
      setIsLoadingRemoteNovels(true);
      setRemoteError(null);

      try {
        const fetchedNovels = await getSupabaseNovels();

        if (!isActive) {
          return;
        }

        setRemoteNovels(fetchedNovels);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRemoteError(
          error instanceof Error
            ? `Supabase is unavailable. Showing local library instead. ${error.message}`
            : "Supabase is unavailable. Showing local library instead.",
        );
        setRemoteNovels([]);
      } finally {
        if (isActive) {
          setIsLoadingRemoteNovels(false);
        }
      }
    }

    void loadRemoteNovels();

    return () => {
      isActive = false;
    };
  }, []);

  const fallbackNovelSummaries = useMemo(
    () => [
      ...uploadedLibrary.novels.map((entry) => ({
        id: entry.novel.id,
        title: entry.novel.title,
        author: entry.novel.author,
        chapterCount: entry.novel.chapters.length,
      })),
      ...novels.map((novel) => ({
        id: novel.id,
        title: novel.title,
        author: novel.author,
        chapterCount: novel.chapters.length,
      })),
    ],
    [novels, uploadedLibrary.novels],
  );

  const novelSummaries = useMemo(
    () => mergeNovelSummaries(remoteNovels, fallbackNovelSummaries),
    [fallbackNovelSummaries, remoteNovels],
  );
  const filteredNovels = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const searchedNovels = novelSummaries.filter((novel) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      return (
        novel.title.toLowerCase().includes(normalizedSearchTerm) ||
        novel.author.toLowerCase().includes(normalizedSearchTerm)
      );
    });

    return [...searchedNovels].sort((left, right) => {
      if (sortOption === "title") {
        return left.title.localeCompare(right.title);
      }

      if (sortOption === "chapters") {
        if (right.chapterCount !== left.chapterCount) {
          return right.chapterCount - left.chapterCount;
        }

        return left.title.localeCompare(right.title);
      }

      return 0;
    });
  }, [novelSummaries, searchTerm, sortOption]);

  return (
    <main className="space-y-6 sm:space-y-10">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.95fr)] xl:items-stretch">
        <LibraryHeader
          eyebrow="Phase 1 Foundation"
          title="Your private reading room."
          description="A focused personal library with a premium dark interface, ready to grow into a full reader platform."
          className="h-full"
        />
        <UploadNovelForm className="h-full" />
      </section>
      {isLoadingRemoteNovels ? (
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-panel/50 px-4 py-3 text-sm text-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          Loading library from Supabase...
        </div>
      ) : null}
      {remoteError ? (
        <p className="rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {remoteError}
        </p>
      ) : null}
      <ContinueReadingCard novels={filteredNovels} />

      <section className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-panel/70 p-4 shadow-[var(--shadow)] backdrop-blur sm:p-5 lg:flex-row lg:items-center">
        <label className="sr-only" htmlFor="library-search">
          Search novels
        </label>
        <input
          id="library-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by title or author"
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50"
        />
        <label className="sr-only" htmlFor="library-sort">
          Sort novels
        </label>
        <select
          id="library-sort"
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value as SortOption)}
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 lg:w-64"
        >
          <option value="recent">Recently Added</option>
          <option value="title">A-Z</option>
          <option value="chapters">Chapter Count</option>
        </select>
      </section>

      <NovelGrid novels={filteredNovels} />
    </main>
  );
}

function mergeNovelSummaries(primary: NovelSummary[], fallback: NovelSummary[]) {
  const merged = [...primary, ...fallback];
  const seenTitles = new Set<string>();

  return merged.filter((novel) => {
    const normalizedTitle = normalizeNovelTitle(novel.title);

    if (seenTitles.has(normalizedTitle)) {
      return false;
    }

    seenTitles.add(normalizedTitle);

    return true;
  });
}
