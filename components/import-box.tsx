"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  mergeNovelChapters,
  normalizeImportUrl,
  normalizeNovelRecord,
  normalizeNovelUrlKey,
} from "@/lib/novels";
import { addNovel, getAllNovels } from "@/lib/storage/indexeddb";
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

export function ImportBox() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const isNovelFullUrl = useMemo(() => /novelfull\.(com|net)/i.test(url), [url]);

  const handleImport = async () => {
    if (!url.trim()) {
      setMessage({ text: "Please enter a valid URL.", isError: true });
      return;
    }

    if (!isNovelFullUrl) {
      setMessage({
        text: "Only novelfull.com and novelfull.net URLs are supported.",
        isError: true,
      });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "Starting download...", isError: false });
    setPreview(null);

    try {
      const normalizedUrl = normalizeImportUrl(url);
      const normalizedUrlKey = normalizeNovelUrlKey(normalizedUrl);
      const storedNovels = await getAllNovels();
      let currentNovel = storedNovels.find(
        (n) => normalizeNovelUrlKey(n.sourceUrl) === normalizedUrlKey,
      );
      let baseChapterCount = currentNovel?.chapters.length ?? 0;
      let offset = 0;
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
        matchedNovelId: currentNovel?.id ?? null,
        matchedNovelSourceUrl: currentNovel?.sourceUrl ?? null,
        existingChapterCount: currentNovel?.chapters.length ?? 0,
      });

      while (true) {
        const batchStart = baseChapterCount + offset + 1;
        setMessage({
          text: `Downloading chapters ${batchStart} to ${batchStart + batchSize - 1}...`,
          isError: false,
        });

        console.info("[import-box] request-batch", {
          normalizedUrl,
          offset,
          batchStart,
          existingChapterCount: currentNovel?.chapters.length ?? 0,
        });
        const chapterCount = currentNovel?.chapters?.length ?? 0;

        console.log("Sending existingNovel:", {
          chapters: chapterCount,
          lastIndex: chapterCount - 1,
          sourceUrl: currentNovel?.sourceUrl,
        });

        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            offset,
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
          description: data.description ?? meta?.description ?? currentNovel?.description,
          lastUpdated: new Date().toISOString(),
          isCompleted:
            currentNovel?.isCompleted ||
            /\b(completed|complete|full)\b/i.test(data.status ?? meta?.status ?? ""),
          chapters: mergeNovelChapters(
            currentNovel?.id ?? normalizeNovelRecord({ title: data.title ?? meta?.title ?? "Unknown Title" }).id,
            currentNovel?.chapters ?? [],
            nextBatch,
          ),
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

        if (chapters.length < batchSize) {
          break;
        }

        offset += batchSize;
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
        description: data?.description || currentNovel?.description,
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
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:p-5">
      <div>
        <h3 className="text-xl text-white">Import from URL</h3>
        <p className="text-sm text-white/60">
          Paste a NovelFull URL to download chapters offline.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://novelfull.com/..."
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

      {message && (
        <p className={message.isError ? "text-red-400" : "text-green-400"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
