"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ContinueReadingCard } from "@/components/continue-reading-card";
import { exportLibrary, importLibrary } from "@/lib/storage/backup";
import { addNovel, getAllNovels } from "@/lib/storage/indexeddb";
import type { Novel } from "@/types";

// ✅ CLEAN NAV LINKS (fixed duplicate)
const HOME_LINKS = [
  { label: "Home", href: "/" },
  { label: "Novels", href: "/?view=novels" },
  { label: "Rankings", href: "/?view=rankings" },
  { label: "Updates", href: "/?view=updates" },
  { label: "Library", href: "/?view=library" },
];

export default function HomePage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [backupMessage, setBackupMessage] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [busyNovelId, setBusyNovelId] = useState<string | null>(null);
  const [isClearingLibrary, setIsClearingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const view = searchParams.get("view") ?? "home";

  const loadNovels = async () => {
    let cancelled = false;

    try {
      const data = await getAllNovels();
      if (!cancelled) setNovels(data ?? []);
    } catch {
      if (!cancelled) setNovels([]);
    }

    return () => {
      cancelled = true;
    };
  };

  // ✅ LOAD NOVELS (single clean useEffect)
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getAllNovels()
        .then((data) => {
          if (!cancelled) {
            setNovels(data ?? []);
          }
        })
        .catch(() => setNovels([]));
    };

    refresh();
    window.addEventListener("library:updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("library:updated", refresh);
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
  const featured = novels[0] ?? null;

  const popular = useMemo(() => {
    return [...filteredNovels]
      .sort((a, b) => (b.chapters.length ?? 0) - (a.chapters.length ?? 0))
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

  const newArrivals = useMemo(() => {
    return [...filteredNovels].slice(-12).reverse();
  }, [filteredNovels]);

  // ✅ BACKUP
  const handleExport = async () => {
    try {
      await exportLibrary();
      setBackupMessage("Backup exported");
    } catch {
      setBackupMessage("Export failed");
    }
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importLibrary(file);
      setBackupMessage(`Imported ${count} novels`);
      setNovels(await getAllNovels());
    } catch {
      setBackupMessage("Import failed");
    }
  };

  const handleDeleteNovel = async (novel: Novel) => {
    if (!window.confirm("Delete this novel?")) return;
    try {
      setBusyNovelId(novel.id);
      await deleteNovelById(novel.id);
      setNovels((prev) => prev.filter((n) => n.id !== novel.id));
      setBackupMessage(`Deleted "${novel.title}"`);
    } catch {
      setBackupMessage("Delete failed");
    } finally {
      setBusyNovelId(null);
    }
  };

  const handleUpdateNovel = async (novel: Novel) => {
    if (!novel.sourceUrl) {
      setBackupMessage("Update failed: source URL missing");
      return;
    }

    try {
      setBusyNovelId(novel.id);
      let offset = 0;
      const batchSize = 50;
      const incoming: Novel["chapters"] = [];
      let latestMeta: {
        title?: string;
        author?: string;
        image?: string;
        alternative?: string;
        genres?: string[];
        categories?: string[];
        tags?: string[];
        status?: string;
        rating?: number | null;
        description?: string;
      } | null = null;

      while (true) {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: novel.sourceUrl,
            offset,
            existingNovel: novel,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          title?: string;
          author?: string;
          image?: string;
          alternative?: string;
          genres?: string[];
          categories?: string[];
          tags?: string[];
          status?: string;
          rating?: number | null;
          description?: string;
          chapters?: Array<{ id?: string; title: string; content: string[] | string }>;
        };

        if (!response.ok) {
          if (response.status === 409) break;
          throw new Error(data.error || "Update failed");
        }

        latestMeta = data;
        const fetched = Array.isArray(data.chapters) ? data.chapters : [];
        if (!fetched.length) break;

        for (let i = 0; i < fetched.length; i++) {
          const chapter = fetched[i];
          incoming.push({
            id: chapter.id ?? String(novel.chapters.length + incoming.length + 1),
            order: novel.chapters.length + incoming.length + 1,
            title: chapter.title,
            content: Array.isArray(chapter.content)
              ? chapter.content
              : String(chapter.content ?? "")
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean),
          });
        }

        if (fetched.length < batchSize) break;
        offset += batchSize;
      }

      const merged = mergeUniqueChapters(novel.chapters, incoming);
      const addedCount = merged.length - novel.chapters.length;
      const nextNovel: Novel = {
        ...novel,
        title: latestMeta?.title || novel.title,
        author: latestMeta?.author || novel.author,
        image: latestMeta?.image || novel.image,
        alternative: latestMeta?.alternative || novel.alternative,
        genres: Array.isArray(latestMeta?.genres) ? latestMeta.genres : novel.genres,
        categories: Array.isArray(latestMeta?.categories) ? latestMeta.categories : novel.categories,
        tags: Array.isArray(latestMeta?.tags) ? latestMeta.tags : novel.tags,
        status: latestMeta?.status || novel.status,
        rating: typeof latestMeta?.rating === "number" ? latestMeta.rating : novel.rating,
        description: latestMeta?.description || novel.description,
        isCompleted:
          novel.isCompleted || /\b(completed|complete|full)\b/i.test(latestMeta?.status ?? ""),
        lastUpdated: new Date().toISOString(),
        chapters: merged,
      };

      await addNovel(nextNovel);
      setNovels((prev) => prev.map((n) => (n.id === novel.id ? nextNovel : n)));
      setBackupMessage(
        addedCount > 0
          ? `Updated "${novel.title}" with ${addedCount} new chapters`
          : `No new chapters for "${novel.title}"`
      );
    } catch {
      setBackupMessage(`Update failed for "${novel.title}"`);
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
      <div className="space-y-8">
        <NavBar currentView={view} />

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-white">
            All Novels ({filteredNovels.length})
          </h1>
          <p className="mt-2 text-sm text-white/65">
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
    );
  }

  if (view === "library") {
    return (
      <div className="space-y-8">
        <NavBar currentView={view} />

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-white">Your Library</h1>
          <p className="mt-2 text-sm text-white/65">
            Backup and restore your complete collection.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={handleExport} className="btn">
              Export
            </button>

            <label className="btn cursor-pointer">
              Import Backup
              <input type="file" hidden onChange={handleImportChange} />
            </label>

            <button
              onClick={handleClearLibrary}
              disabled={isClearingLibrary}
              className="btn"
            >
              {isClearingLibrary ? "Clearing..." : "Clear Library"}
            </button>
          </div>

          <p className="mt-3 text-sm text-white/70">{backupMessage}</p>
        </section>

        <LibraryManagementGrid
          novels={novels}
          busyNovelId={busyNovelId}
          onDelete={handleDeleteNovel}
          onUpdate={handleUpdateNovel}
        />
      </div>
    );
  }

  if (view === "rankings") {
    return (
      <div className="space-y-8">
        <NavBar currentView={view} />
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-white">Rankings</h1>
          <p className="mt-2 text-sm text-white/65">
            Sorted by chapter count from your local library.
          </p>
        </section>
        <Grid novels={popular} />
      </div>
    );
  }

  if (view === "updates") {
    return (
      <div className="space-y-8">
        <NavBar currentView={view} />
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl font-semibold text-white">Updates</h1>
          <p className="mt-2 text-sm text-white/65">
            Recently added novels from IndexedDB.
          </p>
        </section>
        <Grid novels={updates} />
      </div>
    );
  }

  // =========================
  // DEFAULT HOME
  // =========================

  return (
    <div className="space-y-10">

      <NavBar currentView={view} />

      {/* HERO */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-700/35 via-violet-900/35 to-black/80 p-7 shadow-2xl">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">MVLEMPYR-inspired library</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Discover Web Novels by Genre, Rank, and Updates
            </h1>
            <p className="mt-3 max-w-2xl text-white/75">
              Explore your offline collection with smart sections, modern cards, and quick genre filtering.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/?view=novels" className="btn">
                Explore Novels
              </Link>
              <Link href="/?view=updates" className="btn">
                Latest Updates
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-white/65">Library Snapshot</p>
            <p className="mt-3 text-3xl font-semibold text-white">{novels.length}</p>
            <p className="text-sm text-white/60">Total novels</p>
            <p className="mt-4 text-sm text-white/65">{popular.length} in popular</p>
            <p className="text-sm text-white/65">{updates.length} in updates</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Genres</h2>
          <p className="text-sm text-white/60">Filter across all home sections</p>
        </div>
        <GenreFilter
          genres={genres}
          selectedGenre={selectedGenre}
          onSelect={setSelectedGenre}
        />
      </section>

      {/* CONTINUE */}
      <ContinueReadingCard
        novels={novels.map((n) => ({
          id: n.id,
          title: n.title,
          author: n.author,
          chapterCount: n.chapters.length,
        }))}
        novelDetails={novels}
      />

      {/* FEATURED */}
      {featured && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">Featured Spotlight</h2>

          <Link href={`/novel/${featured.id}`}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg transition hover:bg-white/[0.08]">
              <h3 className="text-lg font-semibold text-white">
                {featured.title}
              </h3>
              <p className="mt-1 text-white/65">{featured.author}</p>
            </div>
          </Link>
        </section>
      )}

      {/* NEW ARRIVALS */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">New Arrivals</h2>
        <Grid novels={newArrivals} />
      </section>

      {/* POPULAR */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Popular</h2>
        <Grid novels={popular} />
      </section>

      {/* TRENDING UPDATES */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">New Updates</h2>
        <Grid novels={updates} />
      </section>

      {/* GENRES */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Genre Chips</h2>

        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                selectedGenre === g
                  ? "border-amber-300/60 bg-amber-300/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// =========================
// NAVBAR (FIXED)
// =========================

function NavBar({ currentView }: { currentView: string }) {
  return (
    <div className="relative z-10 flex flex-wrap gap-2">
      {HOME_LINKS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`btn ${isActiveNav(item.href, currentView) ? "border-amber-300/60 bg-amber-300/15 text-white" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function isActiveNav(href: string, currentView: string) {
  if (href === "/") return currentView === "home";
  const viewParam = href.split("view=")[1];
  return viewParam === currentView;
}

// =========================
// GRID
// =========================

function Grid({ novels }: { novels: Novel[] }) {
  if (!novels.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="text-white/60">No novels found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {novels.map((n) => (
        <NovelCard key={n.id} novel={n} />
      ))}
    </div>
  );
}

// =========================
// CARD
// =========================

function NovelCard({ novel }: { novel: Novel }) {
  return (
    <Link
      href={`/novel/${novel.id}`}
      className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
    >
      <h2 className="text-lg font-semibold group-hover:text-amber-100">
        {novel.title}
      </h2>
      <p className="mt-1 text-sm text-white/70">{novel.author}</p>
      <p className="mt-3 text-xs text-white/50">
        {novel.chapters.length} chapters
      </p>
    </Link>
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
    <div className="mt-4 flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onSelect(genre)}
          className={`rounded-full border px-3 py-2 text-sm transition ${
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
}: {
  novels: Novel[];
  busyNovelId: string | null;
  onDelete: (novel: Novel) => void;
  onUpdate: (novel: Novel) => void;
}) {
  if (!novels.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
        <p className="text-white/60">No novels found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {novels.map((novel) => {
        const isBusy = busyNovelId === novel.id;
        return (
          <div
            key={novel.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white shadow-lg"
          >
            <h3 className="text-lg font-semibold">{novel.title}</h3>
            <p className="mt-1 text-sm text-white/70">{novel.author}</p>
            <p className="mt-2 text-xs text-white/55">{novel.chapters.length} chapters</p>
            <p className="mt-1 text-xs text-white/55">
              Status: {novel.isCompleted ? "Completed" : "Ongoing"}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Last Updated: {novel.lastUpdated ? new Date(novel.lastUpdated).toLocaleString() : "N/A"}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={isBusy || !novel.sourceUrl}
                onClick={() => onUpdate(novel)}
                className="btn"
              >
                {isBusy ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onDelete(novel)}
                className="btn"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function mergeUniqueChapters(existing: Novel["chapters"], incoming: Novel["chapters"]) {
  const seen = new Set(
    existing.map((chapter) => `${chapter.id}::${chapter.title.toLowerCase().trim()}`)
  );
  const merged = [...existing];

  for (const chapter of incoming) {
    const key = `${chapter.id}::${chapter.title.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(chapter);
  }

  return merged.map((chapter, index) => ({
    ...chapter,
    order: index + 1,
    id: chapter.id || String(index + 1),
  }));
}

async function deleteNovelById(id: string) {
  const db = await openNovelsDB();
  await runStoreRequest<undefined>(db, "readwrite", (store) => store.delete(id));
}

async function clearAllNovels() {
  const db = await openNovelsDB();
  await runStoreRequest<undefined>(db, "readwrite", (store) => store.clear());
}

function openNovelsDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("krvt-library", 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("novels", mode);
    const store = tx.objectStore("novels");
    const req = action(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}