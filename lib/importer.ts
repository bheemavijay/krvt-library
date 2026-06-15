import { getImportApiUrl } from "@/lib/import-api";
import {
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

export type ImportProgress = {
  downloadedChapters: number;
  totalChapters: number | null;
  batchStart: number;
  batchEnd: number;
  complete: boolean;
};

export async function importNovel(
  url: string,
  callbacks?: {
    onProgress?: (progress: ImportProgress) => void;
    onMessage?: (message: { text: string; isError: boolean }) => void;
  }
): Promise<Novel> {
  console.info("krvt.debug.importer.start", { url });

  const importApiUrl = getImportApiUrl();
  if (!importApiUrl) {
    throw new Error("Import API is not available in this mobile build. Set NEXT_PUBLIC_IMPORT_API_URL before building the APK.");
  }

  const normalizedUrl = normalizeImportUrl(url);
  const normalizedUrlKey = normalizeNovelUrlKey(normalizedUrl);
  
  console.info("krvt.debug.importer.normalize", {
    originalUrl: url,
    normalizedUrl,
    normalizedUrlKey,
  });

  const storedNovels = await getNovelSummaries();
  const currentSummary = storedNovels.find(
    (n) => normalizeNovelUrlKey(n.sourceUrl) === normalizedUrlKey,
  );

  console.info("krvt.debug.importer.lookup", {
    storedNovelCount: storedNovels.length,
    matchedSummary: currentSummary
      ? {
          id: currentSummary.id,
          title: currentSummary.title,
          chapterCount: currentSummary.chapterCount,
          sourceUrl: currentSummary.sourceUrl,
        }
      : null,
  });

  let currentNovel = currentSummary ? await getNovel(currentSummary.id) : null;
  
  console.info("krvt.debug.importer.currentNovel", {
    exists: !!currentNovel,
    chapterCount: currentNovel?.chapters?.length,
    sourceUrl: currentNovel?.sourceUrl,
  });

  let baseChapterCount = currentSummary?.chapterCount ?? currentNovel?.chapters.length ?? 0;
  const batchSize = 50;
  const allChapters: NonNullable<ImportResponse["chapters"]> = [];
  let meta: ImportResponse | null = null;
  let latestData: ImportResponse | null = null;
  let completedBy409 = false;

  while (true) {
    const batchStart = baseChapterCount + allChapters.length + 1;
    
    console.info("krvt.debug.importer.batch.start", {
      batchStart,
      batchEnd: batchStart + batchSize - 1,
      currentSavedChapters: currentNovel?.chapters?.length ?? 0,
    });

    callbacks?.onMessage?.({
      text: `Downloading chapters ${batchStart} to ${batchStart + batchSize - 1}...`,
      isError: false,
    });
    callbacks?.onProgress?.({
      downloadedChapters: currentNovel?.chapters.length ?? baseChapterCount,
      totalChapters: latestData?.totalChapters ?? null,
      batchStart,
      batchEnd: batchStart + batchSize - 1,
      complete: false,
    });

    const chapterCount = currentNovel?.chapters?.length ?? 0;
    
    const existingNovelPayload = currentNovel
      ? {
          title: currentNovel.title,
          novelUrl: currentNovel.sourceUrl ?? normalizedUrl,
          lastChapterIndex: chapterCount - 1,
          chapterCount: chapterCount,
        }
      : null;

    console.info("krvt.debug.importer.fetch.request", {
      apiUrl: importApiUrl,
      payload: {
        url: normalizedUrl,
        existingNovel: existingNovelPayload,
      },
    });

    const response = await fetch(importApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: normalizedUrl,
        existingNovel: existingNovelPayload,
      }),
    });

    console.info("krvt.debug.importer.fetch.response", {
      status: response.status,
      ok: response.ok,
    });

    let data;
    try {
      data = (await response.json()) as ImportResponse & { error?: string };
    } catch (e) {
      console.error("krvt.debug.importer.error", { error: "Failed to parse JSON response" });
      throw e;
    }
    
    latestData = data;

    console.info("krvt.debug.importer.response.data", {
      title: data.title,
      totalChapters: data.totalChapters,
      returnedChapters: data.chapters?.length ?? 0,
      sourceUrl: data.sourceUrl,
    });

    if (!response.ok) {
      if (response.status === 409) {
        console.info("krvt.debug.importer.complete.409", {
          title: currentNovel?.title,
          savedChapters: currentNovel?.chapters?.length,
        });
        completedBy409 = true;
        break;
      }
      
      const errorMessage = data.error || "Failed to import novel.";
      console.error("krvt.debug.importer.error", { error: errorMessage });
      throw new Error(errorMessage);
    }

    if (!meta) {
      meta = data;
    }

    if (!data.chapters || data.chapters.length === 0) {
      if (allChapters.length === 0) {
        const errorMessage = "No chapters fetched";
        console.error("krvt.debug.importer.error", { error: errorMessage });
        throw new Error(errorMessage);
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

    console.info("krvt.debug.importer.merge.before", {
      existingChapterCount: currentNovel?.chapters?.length ?? 0,
      incomingChapterCount: nextBatch.length,
    });

    const mergedChapters = mergeNovelChapters(
      currentNovel?.id ?? normalizeNovelRecord({ title: data.title ?? meta?.title ?? "Unknown Title" }).id,
      currentNovel?.chapters ?? [],
      nextBatch,
    );

    console.info("krvt.debug.importer.merge.after", {
      mergedChapterCount: mergedChapters.length,
    });

    if (currentNovel && mergedChapters.length < currentNovel.chapters.length) {
      callbacks?.onMessage?.({
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
      description: data.description ?? currentNovel?.description,
      lastUpdated: new Date().toISOString(),
      isCompleted:
        currentNovel?.isCompleted ||
        /\b(completed|complete|full)\b/i.test(data.status ?? meta?.status ?? ""),
      chapters: mergedChapters,
    });

    console.info("krvt.debug.importer.storage.save", {
      title: persistedNovel.title,
      chapters: persistedNovel.chapters.length,
    });

    await addNovel(persistedNovel);
    currentNovel = persistedNovel;

    console.info("krvt.debug.importer.storage.saved", {
      title: persistedNovel.title,
      chapters: persistedNovel.chapters.length,
    });

    callbacks?.onProgress?.({
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

  if (completedBy409) {
    callbacks?.onMessage?.({
      text: "Download complete",
      isError: false,
    });
    if (currentNovel) {
      callbacks?.onProgress?.({
        downloadedChapters: currentNovel.chapters.length,
        totalChapters: latestData?.totalChapters ?? currentNovel.chapters.length,
        batchStart: currentNovel.chapters.length,
        batchEnd: currentNovel.chapters.length,
        complete: true,
      });
    }
    
    console.info("krvt.debug.importer.finish", {
      title: currentNovel?.title,
      finalChapterCount: currentNovel?.chapters?.length,
    });

    if (!currentNovel) {
      throw new Error("Import failed to produce a novel.");
    }
    return currentNovel;
  }

  if (!currentNovel) {
    throw new Error("Import failed to produce a novel.");
  }

  console.info("krvt.debug.importer.finish", {
    title: currentNovel?.title,
    finalChapterCount: currentNovel?.chapters?.length,
  });

  return currentNovel;
}