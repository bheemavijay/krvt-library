"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { addNovel, getAllNovels } from "@/lib/storage/indexeddb";
import type { Novel } from "@/types";

type ImportResponse = {
  id?: string;
  title: string;
  author?: string;
  image?: string;
  alternative?: string;
  genres?: string[];
  categories?: string[];
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
      let offset = 0;
      const batchSize = 50; // ✅ FIXED (match backend)
      const allChapters: NonNullable<ImportResponse["chapters"]> = [];
      let meta: ImportResponse | null = null;
      let latestData: ImportResponse | null = null;
      let completedBy409 = false;

      while (true) {
        setMessage({
          text: `Downloading chapters ${offset + 1} to ${offset + batchSize}...`,
          isError: false,
        });

        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, offset }),
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

        setPreview({
          title: data.title ?? meta?.title ?? "Importing...",
          author: data.author ?? meta?.author ?? "Unknown Author",
          genres: data.genres ?? meta?.genres ?? [],
          status: data.status ?? meta?.status ?? "Unknown",
          rating:
            typeof data.rating === "number"
              ? data.rating
              : typeof meta?.rating === "number"
              ? meta.rating
              : undefined,
          chapters: allChapters.length,
        });

        if (chapters.length < batchSize) break;

        offset += batchSize;
      }

      const mappedChapters = (Array.isArray(allChapters) ? allChapters : []).map((chapter, index) => ({
        id: chapter.id ?? String(index + 1),
        order: index + 1,
        title: chapter.title,
        content: Array.isArray(chapter.content)
          ? chapter.content
          : typeof chapter.content === "string"
          ? chapter.content
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean)
          : [],
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
      const existingNovel = (await getAllNovels()).find(
        (n) =>
          (n.sourceUrl && n.sourceUrl === url.trim()) ||
          n.title.toLowerCase().trim() === (data?.title || "").toLowerCase().trim()
      );

      const novel: Novel = {
        id: existingNovel?.id || crypto.randomUUID(),
        title: data?.title || "Unknown Title",
        author: data?.author || "Unknown",
        chapters: mappedChapters,
        genres: Array.isArray(data?.genres) ? data.genres : [],
        description: data?.description || "",
        sourceUrl: url.trim(),
        lastUpdated: new Date().toISOString(),
        isCompleted: false,
        image: data?.image || "",
        alternative: data?.alternative || "",
        categories: Array.isArray(data?.categories) ? data.categories : [],
        tags: Array.isArray(data?.tags) ? data.tags : [],
        status: data?.status || "",
        rating: typeof data?.rating === "number" ? data.rating : undefined,
      };

      await addNovel(novel);

      setMessage({
        text: `Imported ${mappedChapters.length} chapters successfully.`,
        isError: false,
      });

      setUrl("");

      // ✅ FIXED redirect
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