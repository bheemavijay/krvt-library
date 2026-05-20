"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ContinueReadingCard } from "@/components/continue-reading-card";
import { NovelCard } from "@/components/novel-card";
import { getImportApiUrl } from "@/lib/import-api";
import { mergeNovelChapters, normalizeNovelRecord } from "@/lib/novels";
import { getReadingState } from "@/lib/reader-storage";
import { getBookmarksState } from "@/lib/storage/bookmarks";
import { exportLibrary, importLibrary } from "@/lib/storage/backup";
import {
  addNovel,
  clearAllNovels,
  deleteNovel,
  getNovel,
  getNovelSummaries,
} from "@/lib/storage/indexeddb";
import type { Novel, NovelSummary } from "@/types";

type LibrarySort = "lastImported" | "lastRead" | "chapterCount";
type ChapterFilter = "all" | "short" | "medium" | "long";
type NetworkInformation = {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
};

function getLastReadAt(novelId: string) {
  return getReadingState().progressByNovel[novelId]?.updatedAt ?? "";
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function pickDescription(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "No description available";
}

function getNetworkInformation(): NetworkInformation | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (
    (navigator as Navigator & {
      connection?: NetworkInformation;
      mozConnection?: NetworkInformation;
      webkitConnection?: NetworkInformation;
    }).connection ??
    (navigator as Navigator & { mozConnection?: NetworkInformation }).mozConnection ??
    (navigator as Navigator & { webkitConnection?: NetworkInformation }).webkitConnection ??
    null
  );
}

function shouldWarnForMeteredConnection(network: NetworkInformation) {
  const type = network.type?.toLowerCase() ?? "";
  const effectiveType = network.effectiveType?.toLowerCase() ?? "";

  return (
    network.saveData === true ||
    type === "cellular" ||
    effectiveType === "2g" ||
    effectiveType === "3g"
  );
}

function matchesChapterFilter(novel: NovelSummary, filter: ChapterFilter) {
  const count = novel.chapterCount;
  if (filter === "short") return count < 50;
  if (filter === "medium") return count >= 50 && count < 200;
  if (filter === "long") return count >= 200;
  return true;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <HomePageClient />
      </div>
    </Suspense>
  );
}

function HomePageClient() {
  const searchParams = useSearchParams();

  const [novels, setNovels] = useState<NovelSummary[]>([]);
  const [isLibraryHydrated, setIsLibraryHydrated] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupExportProgress, setBackupExportProgress] = useState<{
    processedNovels: number;
    totalNovels: number;
    writtenBytes: number;
  } | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [busyNovelId, setBusyNovelId] = useState<string | null>(null);
  const [isClearingLibrary, setIsClearingLibrary] = useState(false);
  const [librarySort, setLibrarySort] = useState<LibrarySort>("lastImported");
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>("all");
  const [libraryPage, setLibraryPage] = useState(1);
  const [backupImportProgress, setBackupImportProgress] = useState<{
    processedNovels: number;
    processedBytes: number;
    totalBytes: number;
    failedNovels: string[];
  } | null>(null);
  const [backupImportFailures, setBackupImportFailures] = useState<string[]>([]);

  const searchQuery = searchParams.get("q") ?? "";
  const view = searchParams.get("view") ?? "home";
  useEffect(() => {
    let cancelled = false;
    const uniqueById = (list: NovelSummary[]) => {
      const map = new Map<string, NovelSummary>();
      list.forEach((n) => map.set(n.id, n));
      return Array.from(map.values());
    };

    const refresh = async () => {
      try {
        const firstPageSize = 24;
        const pageSize = 60;
        let offset = 0;
        let accumulated: NovelSummary[] = [];

        while (!cancelled) {
          const limit = offset === 0 ? firstPageSize : pageSize;
          const page = await getNovelSummaries({ offset, limit });
          if (page.length === 0) break;
          accumulated = uniqueById([...accumulated, ...page]);
          if (!cancelled) setNovels(accumulated);
          if (page.length < limit) break;
          offset += limit;
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
        if (!cancelled) setIsLibraryHydrated(true);
      } catch {
        if (!cancelled) {
          setNovels([]);
          setIsLibraryHydrated(true);
        }
      }
    };

    const handleLibraryUpdated = () => {
      setIsLibraryHydrated(false);
      void refresh();
    };

    void refresh();
    window.addEventListener("library:updated", handleLibraryUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("library:updated", handleLibraryUpdated);
    };
  }, []);

  // ✅ FILTER (no duplicate)
  const filteredBySearch = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return novels;

    return novels.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.author?.toLowerCase().includes(query)
    );
  }, [novels, searchQuery]);

  const filteredNovels = useMemo(() => {
    if (selectedGenre === "All") return filteredBySearch;
    const genreQuery = selectedGenre.toLowerCase();
    return filteredBySearch.filter((novel) =>
      (novel.genres ?? []).some((genre) => genre.toLowerCase() === genreQuery)
    );
  }, [filteredBySearch, selectedGenre]);

  // ✅ DERIVED DATA (clean)
  const featured = filteredNovels[0] ?? null;

  const popular = useMemo(() => {
    return [...filteredNovels]
      .sort((a, b) => b.chapterCount - a.chapterCount)
      .slice(0, 8);
  }, [filteredNovels]);

  const genres = useMemo(() => {
    return ["All", ...Array.from(
      new Set(
        novels.flatMap((n) => n.genres ?? []).filter(Boolean)
      )
    ).slice(0, 12)];
  }, [novels]);

  const updates = useMemo(() => {
    return [...filteredNovels].reverse().slice(0, 12);
  }, [filteredNovels]);

  const readingState = getReadingState();
  const bookmarkState = getBookmarksState();
  const continueReadingItems = useMemo(() => {
    return novels
      .map((novel) => {
        const progress = readingState.progressByNovel[novel.id];
        if (!progress) return null;
        return { novel, progress };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (!left || !right) return 0;
        return Date.parse(right.progress.updatedAt) - Date.parse(left.progress.updatedAt);
      })
      .slice(0, 8);
  }, [novels, readingState.progressByNovel]);
  const bookmarkItems = useMemo(() => {
    return novels.flatMap((novel) =>
      (bookmarkState[novel.id] ?? []).map((bookmark) => ({
        novel,
        bookmark,
      })),
    );
  }, [bookmarkState, novels]);

  const managedLibraryNovels = useMemo(() => {
    const filtered = novels.filter((novel) => matchesChapterFilter(novel, chapterFilter));
    return filtered.sort((left, right) => {
      if (librarySort === "chapterCount") {
        return right.chapterCount - left.chapterCount;
      }

      if (librarySort === "lastRead") {
        return Date.parse(getLastReadAt(right.id) || "1970-01-01") - Date.parse(getLastReadAt(left.id) || "1970-01-01");
      }

      return Date.parse(right.lastUpdated || "1970-01-01") - Date.parse(left.lastUpdated || "1970-01-01");
    });
  }, [chapterFilter, librarySort, novels]);

  useEffect(() => {
    setLibraryPage(1);
  }, [chapterFilter, librarySort]);


  // ✅ BACKUP
  const handleExport = async () => {
    try {
      setBackupExportProgress({ processedNovels: 0, totalNovels: novels.length, writtenBytes: 0 });
      setBackupMessage("Preparing export...");
      const result = await exportLibrary({
        onProgress: (progress) => setBackupExportProgress(progress),
      });
      setBackupMessage(
        result.platform === "android"
          ? `Export saved to Documents: ${result.fileName}`
          : `Backup exported: ${result.fileName}`,
      );
    } catch (error) {
      console.error("Export failed", error);
      setBackupMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBackupExportProgress(null);
    }
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBackupImportFailures([]);
      setBackupImportProgress({
        processedNovels: 0,
        processedBytes: 0,
        totalBytes: file.size,
        failedNovels: [],
      });
      setBackupMessage("Importing backup...");
      const result = await importLibrary(file, {
        onProgress: (progress) => setBackupImportProgress(progress),
      });
      setBackupImportFailures(result.failedNovels);
      setBackupMessage(
        result.failedNovels.length > 0
          ? `Imported ${result.importedCount} novels. ${result.failedNovels.length} failed.`
          : `Imported ${result.importedCount} novels`,
      );
      setNovels(await getNovelSummaries());
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBackupImportProgress(null);
      e.target.value = "";
    }
  };

  const handleDeleteNovel = async (novel: NovelSummary) => {
    if (!window.confirm("Delete this novel?")) return;
    try {
      setBusyNovelId(novel.id);
      await deleteNovel(novel.id);
      setNovels((prev) => prev.filter((n) => n.id !== novel.id));
      setBackupMessage(`Deleted "${novel.title}"`);
    } catch {
      setBackupMessage("Delete failed");
    } finally {
      setBusyNovelId(null);
    }
  };

  const handleUpdateNovel = async (summary: NovelSummary) => {
    const novel = await getNovel(summary.id);
    if (!novel) {
      setBackupMessage("Update failed: novel content missing");
      return;
    }

    if (!/^https?:/i.test(novel.sourceUrl)) {
      setBackupMessage("Update failed: source URL missing");
      return;
    }

    const network = getNetworkInformation();
    if (network && shouldWarnForMeteredConnection(network)) {
      const shouldContinue = window.confirm(
        "This update may use mobile data. Connect to Wi-Fi for large downloads, or continue anyway.",
      );
      if (!shouldContinue) {
        setBackupMessage("Update cancelled. Connect to Wi-Fi and try again.");
        return;
      }
    }

    try {
      setBusyNovelId(novel.id);
      const incoming: Novel["chapters"] = [];
      let latestMeta: {
        title?: string;
        author?: string;
        image?: string;
        alternative?: string;
        genres?: string[];
        tags?: string[];
        status?: string;
        rating?: number | null;
        description?: string;
      } | null = null;

      if (!navigator.onLine) {
        setBackupMessage("No internet connection");
        return;
      }
const apiUrl = getImportApiUrl();
if (!apiUrl) {
  setBackupMessage("Import not supported in this environment");
  return;
}

let response: Response;

try {
  response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: novel.sourceUrl,
      existingNovel: {
        title: novel.title,
        novelUrl: novel.sourceUrl,
        lastChapterIndex:
          summary.chapterCount > 0 ? summary.chapterCount - 1 : -1,
        chapterCount: summary.chapterCount,
      },
    }),
  });
} catch (err) {
  console.error("Network error:", err);
  throw new Error("Network request failed");
}

let data: {
  error?: string;
  title?: string;
  author?: string;
  image?: string;
  alternative?: string;
  genres?: string[];
  tags?: string[];
  status?: string;
  rating?: number | null;
  description?: string;
  chapters?: Array<{
    id?: string;
    title: string;
    content: string[] | string;
  }>;
} = {};

try {
  data = await response.json();
} catch (e) {
  console.error("Invalid API response:", e);
  throw new Error("Invalid response from server");
}

if (!response.ok) {
  if (response.status !== 409) {
    throw new Error(data.error || "Update failed");
  }
} else {
        latestMeta = data;
        const fetched = Array.isArray(data.chapters) ? data.chapters : [];

        for (let i = 0; i < fetched.length; i++) {
          const chapter = fetched[i];
          incoming.push({
            id: chapter.id ?? String(summary.chapterCount + incoming.length + 1),
            order: summary.chapterCount + incoming.length + 1,
            title: chapter.title,
            content: Array.isArray(chapter.content)
              ? chapter.content
              : String(chapter.content ?? "")
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean),
          });
        }
      }

      const merged = mergeNovelChapters(novel.id, novel.chapters, incoming);
      const addedCount = merged.length - novel.chapters.length;
      const nextNovel: Novel = normalizeNovelRecord({
        ...novel,
        title: latestMeta?.title || novel.title,
        author: latestMeta?.author || novel.author,
        image: latestMeta?.image || novel.image,
        alternative: latestMeta?.alternative || novel.alternative,
        genres: Array.isArray(latestMeta?.genres) ? latestMeta.genres : novel.genres,
        tags: Array.isArray(latestMeta?.tags) ? latestMeta.tags : novel.tags,
        status: latestMeta?.status || novel.status,
        rating: typeof latestMeta?.rating === "number" ? latestMeta.rating : novel.rating,
        description: pickDescription(latestMeta?.description, novel.description),
        isCompleted:
          novel.isCompleted || /\b(completed|complete|full)\b/i.test(latestMeta?.status ?? ""),
        lastUpdated: new Date().toISOString(),
        chapters: merged,
      });

      await addNovel(nextNovel);
      setNovels(await getNovelSummaries());
      setBackupMessage(
        addedCount > 0
          ? `Updated "${novel.title}" with ${addedCount} new chapters`
          : `No new chapters for "${novel.title}"`
      );
    } catch (e: any) {
        console.error(e);
        setBackupMessage(e?.message || `Update failed for "${novel.title}"`);
      } finally {
      setBusyNovelId(null);
    }
  };

  const handleClearLibrary = async () => {
    if (!window.confirm("Clear Library?")) return;
    try {
      setIsClearingLibrary(true);
      await clearAllNovels();
      setNovels([]);
      setBackupMessage("Library cleared");
    } catch {
      setBackupMessage("Clear library failed");
    } finally {
      setIsClearingLibrary(false);
    }
  };

  // =========================
  // VIEW SWITCHES
  // =========================

  if (view === "novels") {
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-10">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">
            All Novels ({filteredNovels.length})
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65">
            Your full offline library from IndexedDB.
          </p>
          <GenreFilter
            genres={genres}
            selectedGenre={selectedGenre}
            onSelect={setSelectedGenre}
          />
        </section>

        <Grid novels={filteredNovels} />
        </div>
      </div>
    );
  }

  if (view === "library") {
    return (
      <div className="space-y-6 sm:space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Your Library</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65">
            Manage updates, deletes, and backup from one place.
          </p>

          <div className="mt-4 sm:mt-5 flex flex-wrap gap-2 sm:gap-3">
            <button onClick={handleExport} className="min-h-[40px] rounded-lg border border-white/10 bg-white/5 px-4 text-sm hover:bg-white/10 transition-colors">
              Export
            </button>

            <label className="min-h-[40px] flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm cursor-pointer hover:bg-white/10 transition-colors">
              Import Backup
              <input type="file" hidden onChange={handleImportChange} />
            </label>

            <button
              onClick={handleClearLibrary}
              disabled={isClearingLibrary}
              className="min-h-[40px] rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-sm text-red-200 hover:bg-red-500/20 transition-colors"
            >
              {isClearingLibrary ? "Clearing..." : "Clear Library"}
            </button>
          </div>

          {backupMessage && <p className="mt-3 text-sm text-[#d4b16a]">{backupMessage}</p>}
          {backupExportProgress ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
              <p>
                Exported {backupExportProgress.processedNovels} of{" "}
                {backupExportProgress.totalNovels} novels
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
                  style={{
                    width: `${
                      backupExportProgress.totalNovels > 0
                        ? Math.round(
                            (backupExportProgress.processedNovels /
                              backupExportProgress.totalNovels) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          {backupImportProgress ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
              <p>
                Imported {backupImportProgress.processedNovels} novels
                {backupImportProgress.totalBytes > 0
                  ? ` • ${Math.min(
                      100,
                      Math.round(
                        (backupImportProgress.processedBytes / backupImportProgress.totalBytes) * 100,
                      ),
                    )}%`
                  : ""}
              </p>
              {backupImportProgress.failedNovels.length > 0 ? (
                <p className="mt-1 text-red-300">
                  Failed so far: {backupImportProgress.failedNovels.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
          {backupImportFailures.length > 0 ? (
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Failed novels: {backupImportFailures.join(", ")}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-sm text-white/70">
              <span className="block text-xs uppercase tracking-[0.22em] text-white/45">Sort By</span>
              <select
                value={librarySort}
                onChange={(event) => setLibrarySort(event.target.value as LibrarySort)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none"
              >
                <option value="lastImported">Last Imported</option>
                <option value="lastRead">Last Read</option>
                <option value="chapterCount">Chapter Count</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-white/70">
              <span className="block text-xs uppercase tracking-[0.22em] text-white/45">Chapter Range</span>
              <select
                value={chapterFilter}
                onChange={(event) => setChapterFilter(event.target.value as ChapterFilter)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none"
              >
                <option value="all">All novels</option>
                <option value="short">Under 50 chapters</option>
                <option value="medium">50 to 199 chapters</option>
                <option value="long">200+ chapters</option>
              </select>
            </label>

            <DashboardStat label="Managed novels" value={String(managedLibraryNovels.length)} />
            <DashboardStat label="Current page" value={String(libraryPage)} />
          </div>
        </section>

        <LibraryManagementGrid
          novels={managedLibraryNovels}
          busyNovelId={busyNovelId}
          onDelete={handleDeleteNovel}
          onUpdate={handleUpdateNovel}
          page={libraryPage}
          onPageChange={setLibraryPage}
        />
      </div>
    );
  }

  if (view === "rankings") {
    return (
      <div className="space-y-6 sm:space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Rankings</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65">
            Sorted by chapter count from your local library.
          </p>
        </section>
        <Grid novels={popular} />
      </div>
    );
  }

  if (view === "updates") {
    return (
      <div className="space-y-6 sm:space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Updates</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65">
            Recently added novels from IndexedDB.
          </p>
        </section>
        <Grid novels={updates} />
      </div>
    );
  }

  if (view === "history") {
    return (
      <div className="space-y-6 sm:space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Reading History</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/65">
            Continue reading, bookmarks, and recent chapter activity from this device.
          </p>
        </section>

        <HistorySection title="Continue Reading" items={continueReadingItems} />
        <BookmarkSection items={bookmarkItems} />
        <HistorySection title="Recent Chapters" items={continueReadingItems.slice(0, 6)} />
      </div>
    );
  }

  // =========================
  // DEFAULT HOME
  // =========================

  return (
    <div className="space-y-6 sm:space-y-10">

      <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-[#1e2d1f] via-[#10161c] to-black p-5 sm:p-7 shadow-2xl">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3 sm:space-y-4">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-white/55">KRVT Dashboard</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white md:text-4xl">
              Offline library management for import, reading, and cleanup
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-white/75">
              IndexedDB is now the single source of truth. Use this dashboard to review covers,
              update imports, and delete broken records without leaving the home screen.
            </p>
            <GenreFilter
              genres={genres}
              selectedGenre={selectedGenre}
              onSelect={setSelectedGenre}
            />
          </div>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-1">
            <DashboardStat label="Total novels" value={String(novels.length)} />
            <DashboardStat label="Filtered" value={String(filteredNovels.length)} />
            <DashboardStat label="Ongoing" value={String(novels.filter((novel) => !novel.isCompleted).length)} />
          </div>
        </div>
      </section>

      <ContinueReadingCard
        novels={novels}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Bookmarks & History</h2>
            <p className="text-xs sm:text-sm text-white/60">
              Resume from your latest chapter or jump back to saved places.
            </p>
          </div>
          <Link
            href="/?view=history"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:bg-white/10"
          >
            Open History
          </Link>
        </div>
      </section>

      {featured && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-sm">
          <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-semibold text-white">Featured Spotlight</h2>
          <Link href={`/novel?id=${featured.id}`}>
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 shadow-lg transition hover:bg-white/[0.08]">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {featured.title}
              </h3>
              <p className="mt-1 text-sm text-white/65">{featured.author}</p>
            </div>
          </Link>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-sm">
        <div className="mb-4 sm:mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Explore Library</h2>
            <p className="text-xs sm:text-sm text-white/60">
              Keep the home screen focused on browsing and jump into the Library view for update and delete actions.
            </p>
          </div>
          <Link
            href="/?view=library"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:bg-white/10"
          >
            Open Library Manager
          </Link>
        </div>
        <Grid novels={filteredNovels.slice(0, 12)} isLoading={!isLibraryHydrated && novels.length === 0} />
      </section>
    </div>
  );
}

// =========================
// GRID
// =========================

function Grid({ novels, isLoading = false }: { novels: NovelSummary[]; isLoading?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (window.localStorage.getItem("krvt-view-mode") as "grid" | "list") || "grid";
    }
    return "grid";
  });

  const displayNovels = showAll ? novels : novels.slice(0, 12);

  const toggleViewMode = () => {
    const nextMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(nextMode);
    try {
      window.localStorage.setItem("krvt-view-mode", nextMode);
    } catch {
      // ignore
    }
  };

  if (!novels.length && isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-white/45">Loading library...</p>
      </div>
    );
  }

  if (!novels.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="text-white/60">No novels found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-end mb-2 sm:mb-4">
        <button
          onClick={toggleViewMode}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          title={`Switch to ${viewMode === "grid" ? "List" : "Grid"} view`}
        >
          {viewMode === "grid" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          )}
        </button>
      </div>
      <div
        className={`grid gap-3 sm:gap-4 ${
          viewMode === "grid"
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {displayNovels.map((n) => (
          <NovelCard key={n.id} novel={n} viewMode={viewMode} />
        ))}
      </div>
      {novels.length > 12 && !showAll && (
        <div className="text-center pt-4">
          <button
            onClick={() => setShowAll(true)}
            className="min-h-[40px] rounded-lg border border-white/10 bg-white/5 px-6 text-sm hover:bg-white/10 transition-colors"
          >
            See More ({novels.length - 12} hidden)
          </button>
        </div>
      )}
    </div>
  );
}

function HistorySection({
  title,
  items,
}: {
  title: string;
  items: Array<{
    novel: NovelSummary;
    progress: { chapterIndex: number; updatedAt: string };
  } | null>;
}) {
  const safeItems = items.filter(Boolean) as Array<{
    novel: NovelSummary;
    progress: { chapterIndex: number; updatedAt: string };
  }>;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {safeItems.length === 0 ? (
          <p className="text-sm text-white/50">No reading activity yet.</p>
        ) : (
          safeItems.map(({ novel, progress }) => (
            <Link
              key={`${title}-${novel.id}`}
              href={`/reader?id=${novel.id}&chapter=${progress.chapterIndex + 1}`}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <p className="line-clamp-1 font-medium text-white">{novel.title}</p>
              <p className="mt-1 text-sm text-white/55">
                Chapter {progress.chapterIndex + 1} of {novel.chapterCount}
              </p>
              <p className="mt-2 text-xs text-white/40">{formatRelativeDate(progress.updatedAt)}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function BookmarkSection({
  items,
}: {
  items: Array<{
    novel: NovelSummary;
    bookmark: { chapterIndex: number; title: string; createdAt: string };
  }>;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-white">Bookmarks</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-sm text-white/50">No bookmarks yet.</p>
        ) : (
          items.slice(0, 12).map(({ novel, bookmark }) => (
            <Link
              key={`${novel.id}-${bookmark.chapterIndex}`}
              href={`/reader?id=${novel.id}&chapter=${bookmark.chapterIndex + 1}`}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <p className="line-clamp-1 font-medium text-white">{novel.title}</p>
              <p className="mt-1 line-clamp-1 text-sm text-white/55">{bookmark.title}</p>
              <p className="mt-2 text-xs text-white/40">{formatRelativeDate(bookmark.createdAt)}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function GenreFilter({
  genres,
  selectedGenre,
  onSelect,
}: {
  genres: string[];
  selectedGenre: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onSelect(genre)}
          className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs sm:text-sm transition ${
            selectedGenre === genre
              ? "border-amber-300/60 bg-amber-300/15 text-white"
              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}

function LibraryManagementGrid({
  novels,
  busyNovelId,
  onDelete,
  onUpdate,
  page,
  onPageChange,
}: {
  novels: NovelSummary[];
  busyNovelId: string | null;
  onDelete: (novel: NovelSummary) => void;
  onUpdate: (novel: NovelSummary) => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(novels.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const displayNovels = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return novels.slice(start, start + pageSize);
  }, [novels, safePage]);

  if (!novels.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="text-white/60">No novels found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {displayNovels.map((novel) => {
          const isBusy = busyNovelId === novel.id;
          const canUpdate = /^https?:/i.test(novel.sourceUrl ?? "");
          return (
            <div
              key={novel.id}
              className="flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.04] text-white shadow-lg"
            >
              <Link href={`/novel?id=${novel.id}`} className="block relative w-full h-[140px] sm:h-[160px] md:h-[180px]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${novel.image}")` }}
                />
              </Link>
              <div className="flex flex-col flex-1 p-3 sm:p-4">
                <h3 className="line-clamp-2 text-sm sm:text-base font-semibold">{novel.title}</h3>
                <p className="text-xs text-white/70 mt-1">{novel.author}</p>
                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-white/60 mt-2">
                  <span>{novel.chapterCount} ch</span>
                  <span>{novel.isCompleted ? "Completed" : novel.status || "Ongoing"}</span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] text-white/45">
                  <p>Imported: {formatRelativeDate(novel.lastUpdated)}</p>
                  <p>Last read: {formatRelativeDate(getLastReadAt(novel.id))}</p>
                </div>

                <div className="mt-auto pt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy || !canUpdate}
                      onClick={() => onUpdate(novel)}
                      className="flex-1 min-w-[100px] min-h-[36px] rounded-lg bg-white/10 text-xs font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                      {isBusy ? "..." : "Update"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDelete(novel)}
                      className="flex-1 min-w-[100px] min-h-[36px] rounded-lg bg-red-500/20 text-red-200 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm text-white/50">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
              className="min-h-[40px] rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
              className="min-h-[40px] rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
