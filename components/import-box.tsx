"use client";

import { useMemo, useState } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import { Button } from "@/components/ui/button";
import { getImportApiUrl } from "@/lib/import-api";
import { enableWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import {
  isSupportedImportUrl,
  mergeNovelChapters,
  normalizeImportUrl,
  normalizeNovelRecord,
  normalizeNovelUrlKey,
} from "@/lib/novels";
import { addNovel, getNovel, getNovelSummaries } from "@/lib/storage/indexeddb";
import type { Novel } from "@/types";

type ImportResponse = {
  id?: string;
  title: string;
  author?: string;
  image?: string;
  alternative?: string;
  genres?: string[];
  tags?: string[];
  status?: string;
  rating?: number | null;
  description?: string;
  sourceUrl?: string;
  totalChapters?: number;
  importedFrom?: number;
  chapters?: Array<{
    id?: string;
    title: string;
    content: string[] | string;
  }>;
};

type PreviewState = {
  title: string;
  author: string;
  genres: string[];
  status: string;
  rating?: number;
  chapters: number;
};

type NetworkInformation = {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
};

export function ImportBox() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    downloadedChapters: number;
    totalChapters: number | null;
    batchStart: number;
    batchEnd: number;
    complete: boolean;
  } | null>(null);

  const isSupportedUrl = useMemo(() => isSupportedImportUrl(url), [url]);

  const handleImport = async () => {
    if (!url.trim()) {
      setMessage({ text: "Please enter a valid URL.", isError: true });
      return;
    }

    if (!isSupportedUrl) {
      setMessage({
        text: "Only NovelFull and MVLEMPYR URLs are supported.",
        isError: true,
      });
      return;
    }

    const network = getNetworkInformation();
    if (network && shouldWarnForMeteredConnection(network)) {
      const continueImport = window.confirm(
        "You appear to be on mobile data or a metered connection. Large downloads work best on Wi-Fi. Continue anyway?",
      );
      if (!continueImport) {
        setMessage({ text: "Download cancelled. Connect to Wi-Fi and try again.", isError: true });
        return;
      }
    }

    setIsLoading(true);
    setMessage({ text: "Starting download...", isError: false });
    setPreview(null);
    setDownloadProgress(null);
    await enableWakeLock();

    try {
      const importApiUrl = getImportApiUrl();
      if (!importApiUrl) {
        throw new Error("Import API is not available in this mobile build. Set NEXT_PUBLIC_IMPORT_API_URL before building the APK.");
      }

      const normalizedUrl = normalizeImportUrl(url);
      const normalizedUrlKey = normalizeNovelUrlKey(normalizedUrl);
      const storedNovels = await getNovelSummaries();
      const currentSummary = storedNovels.find(
        (n) => normalizeNovelUrlKey(n.sourceUrl) === normalizedUrlKey,
      );
      let currentNovel = currentSummary ? await getNovel(currentSummary.id) : null;
      let baseChapterCount = currentSummary?.chapterCount ?? currentNovel?.chapters.length ?? 0;
      const batchSize = 50;
      const allChapters: NonNullable<ImportResponse["chapters"]> = [];
      let meta: ImportResponse | null = null;
      let latestData: ImportResponse | null = null;
      let completedBy409 = false;

      console.info("[import-box] start", {
        inputUrl: url,
        normalizedUrl,
        normalizedUrlKey,
        storedNovelCount: storedNovels.length,
        matchedNovelId: currentSummary?.id ?? null,
        matchedNovelSourceUrl: currentSummary?.sourceUrl ?? null,
        existingChapterCount: baseChapterCount,
      });

      while (true) {
        const batchStart = baseChapterCount + allChapters.length + 1;
        setMessage({
          text: `Downloading chapters ${batchStart} to ${batchStart + batchSize - 1}...`,
          isError: false,
        });
        setDownloadProgress({
          downloadedChapters: currentNovel?.chapters.length ?? baseChapterCount,
          totalChapters: latestData?.totalChapters ?? null,
          batchStart,
          batchEnd: batchStart + batchSize - 1,
          complete: false,
        });

        console.info("[import-box] request-batch", {
          normalizedUrl,
          batchStart,
          existingChapterCount: currentNovel?.chapters.length ?? 0,
        });
        const chapterCount = currentNovel?.chapters?.length ?? 0;

        const response = await fetch(importApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            existingNovel: currentNovel
              ? {
                  title: currentNovel.title,
                  novelUrl: currentNovel.sourceUrl ?? normalizedUrl,
                  lastChapterIndex: chapterCount - 1,
                  chapterCount: chapterCount,
                }
              : null,
          }),
        });

        const data = (await response.json()) as ImportResponse & { error?: string };
        latestData = data;

        if (!response.ok) {
          if (response.status === 409) {
            completedBy409 = true;
            break;
          }
          throw new Error(data.error || "Failed to import novel.");
        }

        if (!meta) {
          meta = data;
        }

        if (!data.chapters || data.chapters.length === 0) {
          if (allChapters.length === 0) {
            throw new Error("No chapters fetched");
          }
          break;
        }

        const chapters = data.chapters;
        allChapters.push(...chapters);

        const nextBatch = chapters.map((chapter, index) => ({
          id: chapter.id ?? String((currentNovel?.chapters.length ?? 0) + index + 1),
          order: (currentNovel?.chapters.length ?? 0) + index + 1,
          title: chapter.title,
          content: Array.isArray(chapter.content)
            ? chapter.content
            : [chapter.content],
        }));

        const mergedChapters = mergeNovelChapters(
          currentNovel?.id ?? normalizeNovelRecord({ title: data.title ?? meta?.title ?? "Unknown Title" }).id,
          currentNovel?.chapters ?? [],
          nextBatch,
        );

        if (currentNovel && mergedChapters.length < currentNovel.chapters.length) {
          setMessage({
            text: "Skipped older import batch because it had fewer chapters than your saved copy.",
            isError: false,
          });
          break;
        }

        const persistedNovel: Novel = normalizeNovelRecord({
          ...currentNovel,
          title: data.title ?? meta?.title ?? currentNovel?.title ?? "Unknown Title",
          author: data.author ?? meta?.author ?? currentNovel?.author ?? "Unknown",
          sourceUrl: data.sourceUrl ?? meta?.sourceUrl ?? currentNovel?.sourceUrl ?? normalizedUrl,
          image: data.image ?? meta?.image ?? currentNovel?.image,
          alternative: data.alternative ?? meta?.alternative ?? currentNovel?.alternative,
          genres: data.genres ?? meta?.genres ?? currentNovel?.genres,
          tags: data.tags ?? meta?.tags ?? currentNovel?.tags,
          status: data.status ?? meta?.status ?? currentNovel?.status,
          rating:
            typeof data.rating === "number"
              ? data.rating
              : typeof meta?.rating === "number"
              ? meta.rating
              : currentNovel?.rating,
          description: pickDescription(
            data.description,
            meta?.description,
            currentNovel?.description,
          ),
          lastUpdated: new Date().toISOString(),
          isCompleted:
            currentNovel?.isCompleted ||
            /\b(completed|complete|full)\b/i.test(data.status ?? meta?.status ?? ""),
          chapters: mergedChapters,
        });

        await addNovel(persistedNovel);
        currentNovel = persistedNovel;

        console.info("[import-box] persisted-batch", {
          novelId: persistedNovel.id,
          sourceUrl: persistedNovel.sourceUrl,
          totalPersistedChapters: persistedNovel.chapters.length,
          receivedBatchChapters: nextBatch.length,
        });

        setPreview({
          title: persistedNovel.title,
          author: persistedNovel.author,
          genres: persistedNovel.genres ?? [],
          status: persistedNovel.status ?? "Unknown",
          rating: persistedNovel.rating,
          chapters: persistedNovel.chapters.length,
        });
        setDownloadProgress({
          downloadedChapters: persistedNovel.chapters.length,
          totalChapters: data.totalChapters ?? null,
          batchStart,
          batchEnd: batchStart + chapters.length - 1,
          complete: data.totalChapters ? persistedNovel.chapters.length >= data.totalChapters : chapters.length < batchSize,
        });

        if (chapters.length < batchSize) {
          break;
        }
      }

      const mappedChapters = (Array.isArray(allChapters) ? allChapters : []).map((chapter, index) => ({
        id: chapter.id ?? String(baseChapterCount + index + 1),
        order: baseChapterCount + index + 1,
        title: chapter.title,
        content: Array.isArray(chapter.content)
          ? chapter.content
          : [chapter.content],
      }));

      if (!mappedChapters.length) {
        if (completedBy409) {
          setMessage({
            text: "Download complete",
            isError: false,
          });
          setDownloadProgress((current) =>
            current ? { ...current, complete: true } : current,
          );
          return;
        }
        throw new Error("No chapters fetched");
      }

      const data = meta ?? latestData;
      const novel: Novel = normalizeNovelRecord({
        ...currentNovel,
        title: data?.title || currentNovel?.title || "Unknown Title",
        author: data?.author || currentNovel?.author || "Unknown",
        sourceUrl: data?.sourceUrl || currentNovel?.sourceUrl || normalizedUrl,
        image: data?.image || currentNovel?.image,
        alternative: data?.alternative || currentNovel?.alternative,
        genres: data?.genres || currentNovel?.genres,
        tags: data?.tags || currentNovel?.tags,
        status: data?.status || currentNovel?.status,
        rating: typeof data?.rating === "number" ? data.rating : currentNovel?.rating,
        description: pickDescription(data?.description, currentNovel?.description),
        lastUpdated: new Date().toISOString(),
        isCompleted:
          currentNovel?.isCompleted || /\b(completed|complete|full)\b/i.test(data?.status ?? ""),
        chapters: currentNovel?.chapters ?? mappedChapters,
      });

      await addNovel(novel);

      console.info("[import-box] import-complete", {
        novelId: novel.id,
        sourceUrl: novel.sourceUrl,
        totalChapters: novel.chapters.length,
        importedThisRun: mappedChapters.length,
      });

      setMessage({
        text: `Imported ${mappedChapters.length} new chapters successfully.`,
        isError: false,
      });
      setDownloadProgress((current) =>
        current
          ? {
              ...current,
              downloadedChapters: novel.chapters.length,
              totalChapters: current.totalChapters ?? novel.chapters.length,
              complete: true,
            }
          : current,
      );

      setUrl("");

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error(error);
      setMessage({
        text: error instanceof Error ? error.message : "An error occurred.",
        isError: true,
      });
    } finally {
      setIsLoading(false);
      releaseWakeLock();
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5">
      <div>
        <h3 className="text-xl text-white">Import from URL</h3>
        <p className="text-sm text-white/60">
          Paste a NovelFull or MVLEMPYR URL to download chapters offline.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.mvlempyr.io/novel/..."
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
          disabled={isLoading}
        />

        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading ? "Downloading..." : "Download"}
        </Button>
      </div>

      {preview && (
        <div className="p-4 border border-white/10 rounded-xl">
          <h4>{preview.title}</h4>
          <p>{preview.author}</p>
          <p>{preview.chapters} chapters</p>
        </div>
      )}

      {downloadProgress ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3 text-sm text-white/75">
            <span>
              Chapters {downloadProgress.batchStart}-{downloadProgress.batchEnd}
            </span>
            <span>
              {getImportPercent(downloadProgress)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
              style={{ width: `${getImportPercent(downloadProgress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {downloadProgress.totalChapters
              ? `${downloadProgress.downloadedChapters} of ${downloadProgress.totalChapters} chapters saved`
              : `${downloadProgress.downloadedChapters} chapters saved`}
            {downloadProgress.complete ? " - Complete" : ""}
          </p>
        </div>
      ) : null}

      {isLoading && !downloadProgress ? (
        <div className="overflow-hidden rounded-xl border border-[#d4b16a]/15 bg-black/30">
          <KrvtLoader compact className="min-h-[220px] bg-transparent" />
        </div>
      ) : null}

      {message && (
        <p className={message.isError ? "text-red-400" : "text-green-400"}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function getImportPercent(progress: {
  downloadedChapters: number;
  totalChapters: number | null;
  complete: boolean;
}) {
  if (progress.complete) {
    return 100;
  }

  if (!progress.totalChapters || progress.totalChapters <= 0) {
    return Math.min(95, Math.max(5, progress.downloadedChapters > 0 ? 55 : 8));
  }

  return Math.min(
    100,
    Math.max(1, Math.round((progress.downloadedChapters / progress.totalChapters) * 100)),
  );
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