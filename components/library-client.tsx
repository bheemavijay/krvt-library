"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { Novel, NovelSummary } from "@/types";

import { Button } from "@/components/ui/button";
import { ContinueReadingCard } from "@/components/continue-reading-card";
import { NovelGrid } from "@/components/novel-grid";
import { PasteImportForm } from "@/components/paste-import-form";
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
type FilteredNovelSummary = NovelSummary & {
  category: string | null;
  tags: string[];
};
type NovelMetadataShape = {
  category?: unknown;
  tags?: unknown;
};

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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

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

  const fallbackNovelSummaries = useMemo<FilteredNovelSummary[]>(
    () => [
      ...uploadedLibrary.novels.map((entry) => ({
        id: entry.novel.id,
        title: entry.novel.title,
        author: entry.novel.author,
        chapterCount: entry.novel.chapters.length,
        category: getNovelCategory(entry.novel),
        tags: getNovelTags(entry.novel),
      })),
      ...novels.map((novel) => ({
        id: novel.id,
        title: novel.title,
        author: novel.author,
        chapterCount: novel.chapters.length,
        category: getNovelCategory(novel),
        tags: getNovelTags(novel),
      })),
    ],
    [novels, uploadedLibrary.novels],
  );
  const localNovelDetails = useMemo(
    () => [...uploadedLibrary.novels.map((entry) => entry.novel), ...novels],
    [novels, uploadedLibrary.novels],
  );

  const remoteNovelSummaries = useMemo<FilteredNovelSummary[]>(
    () =>
      remoteNovels.map((novel) => ({
        ...novel,
        category: null,
        tags: [],
      })),
    [remoteNovels],
  );
  const novelSummaries = useMemo(
    () => mergeNovelSummaries(remoteNovelSummaries, fallbackNovelSummaries),
    [fallbackNovelSummaries, remoteNovelSummaries],
  );
  const categoryOptions = useMemo(
    () => [...new Set(novelSummaries.map((novel) => novel.category).filter(Boolean))].sort(),
    [novelSummaries],
  );
  const tagOptions = useMemo(
    () => [...new Set(novelSummaries.flatMap((novel) => novel.tags))].sort(),
    [novelSummaries],
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

    const categoryFilteredNovels = searchedNovels.filter((novel) => {
      if (categoryFilter === "all") {
        return true;
      }

      return novel.category === categoryFilter;
    });

    const tagFilteredNovels = categoryFilteredNovels.filter((novel) => {
      if (tagFilter === "all") {
        return true;
      }

      return novel.tags.includes(tagFilter);
    });

    return [...tagFilteredNovels].sort((left, right) => {
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
  }, [categoryFilter, novelSummaries, searchTerm, sortOption, tagFilter]);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    sortOption !== "recent" ||
    categoryFilter !== "all" ||
    tagFilter !== "all";
  const showLoadingSkeletons =
    isLoadingRemoteNovels && novelSummaries.length === 0 && !hasActiveFilters;
  const featuredNovels = useMemo(
    () => novelSummaries.slice(0, 3),
    [novelSummaries],
  );
  const handleResetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTagFilter("all");
    setSortOption("recent");
  };

  return (
    <main className="space-y-10 md:space-y-16">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:items-stretch">
        <div className="flex flex-col justify-center">
          <div className="max-w-xl space-y-6">
            <p className="text-xs tracking-widest text-royal-gold">
              PERSONAL READING PLATFORM
            </p>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold text-foreground md:text-5xl">
                Your private reading room.
              </h1>
              <p className="max-w-xl text-base text-white/70 sm:text-lg">
                A focused, distraction-free space to read, organize, and continue your
                novels.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                href={filteredNovels[0] ? `/novel/${filteredNovels[0].id}` : "#library-grid"}
                className="bg-royal-purple text-white hover:bg-royal-crimson"
              >
                Start Reading
              </Button>
              <Button href="#add-to-library" className="border border-white/20 bg-transparent">
                Upload Novel
              </Button>
            </div>
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-royal-purple/10 to-transparent p-6 shadow-lg shadow-black/30 transition-all duration-300">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs tracking-widest text-royal-gold">RECENT READING</p>
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                A library built for momentum
              </h2>
              <p className="text-sm text-white/70">
                Pick up where you left off, jump between chapters, and keep your shelf
                organized without friction.
              </p>
            </div>
            <div className="space-y-3">
              {featuredNovels.length > 0 ? (
                featuredNovels.map((novel, index) => (
                  <div
                    key={novel.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-black/30"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs tracking-widest text-royal-gold">
                          {index === 0 ? "Continue Now" : "On Your Shelf"}
                        </p>
                        <h3 className="font-heading text-lg font-semibold text-foreground">
                          {novel.title}
                        </h3>
                        <p className="text-sm text-white/65">{novel.author}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">
                        {novel.chapterCount} ch
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-white/70">
                    Your recent reading activity and shelf highlights will appear here as
                    your library grows.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>

      <section className="space-y-6">
        <ContinueReadingCard novels={filteredNovels} novelDetails={localNovelDetails} />
      </section>

      <section id="add-to-library" className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs tracking-widest text-royal-gold">LIBRARY INPUT</p>
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Add to your library
          </h2>
          <p className="text-sm text-white/70 sm:text-base">
            Import an existing text file or paste raw content to turn it into a clean,
            readable novel.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
          <PasteImportForm className="h-full rounded-[1rem] border border-white/10 bg-white/5 p-6 shadow-none transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-black/30" />
          <UploadNovelForm className="h-full rounded-[1rem] border border-white/10 bg-white/5 p-6 shadow-none transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-black/30" />
        </div>
      </section>

      <section className="space-y-4">
        {isLoadingRemoteNovels ? (
          <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            <span className="size-4 animate-spin rounded-full border-2 border-royal-gold/30 border-t-royal-gold" />
            Syncing your library...
          </div>
        ) : null}
        {remoteError ? (
          <p className="rounded-[1.25rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {remoteError}
          </p>
        ) : null}
      </section>

      <section className="space-y-6">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="sr-only" htmlFor="library-search">
              Search novels
            </label>
            <input
              id="library-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or author"
              className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50"
            />
            <div className="grid gap-3 sm:grid-cols-3 lg:w-auto">
              <div>
                <label className="sr-only" htmlFor="library-category">
                  Filter by category
                </label>
                <select
                  id="library-category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 lg:min-w-44"
                >
                  <option value="all">All categories</option>
                  {categoryOptions.filter((category): category is string => category !== null)
                      .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="library-tag">
                  Filter by tag
                </label>
                <select
                  id="library-tag"
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 lg:min-w-44"
                >
                  <option value="all">All tags</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="library-sort">
                  Sort novels
                </label>
                <select
                  id="library-sort"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as SortOption)}
                  className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 lg:min-w-44"
                >
                  <option value="recent">Recently Added</option>
                  <option value="title">A-Z</option>
                  <option value="chapters">Chapter Count</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              {filteredNovels.length === 0
                ? "No results found."
                : `${filteredNovels.length} novel${filteredNovels.length === 1 ? "" : "s"} shown.`}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition hover:border-accent/50 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset filters
            </button>
          </div>
        </section>

        {showLoadingSkeletons ? (
          <NovelGridSkeleton count={6} />
        ) : filteredNovels.length === 0 ? (
          <section className="rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-12 text-center shadow-lg shadow-black/20">
            <p className="text-xs tracking-widest text-royal-gold">No Results Found</p>
            <h2 className="mt-4 font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Try a different search or filter.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
              Adjust the title search, category, tag, or sorting controls to broaden your
              library results.
            </p>
          </section>
        ) : (
          <div id="library-grid">
            <NovelGrid novels={filteredNovels} />
          </div>
        )}
      </section>
    </main>
  );
}

function mergeNovelSummaries(primary: FilteredNovelSummary[], fallback: FilteredNovelSummary[]) {
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

function getNovelCategory(novel: Novel) {
  const metadata = novel as Novel & NovelMetadataShape;

  return typeof metadata.category === "string" && metadata.category.trim()
    ? metadata.category.trim()
    : null;
}

function getNovelTags(novel: Novel) {
  const metadata = novel as Novel & NovelMetadataShape;

  if (!Array.isArray(metadata.tags)) {
    return [];
  }

  return metadata.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function NovelGridSkeleton({ count }: { count: number }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-xl bg-white/5"
        >
          <div className="h-full rounded-xl bg-white/5" />
        </div>
      ))}
    </section>
  );
}
