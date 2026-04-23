"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addNovel } from "@/lib/storage/indexeddb";

export function ImportBox() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      setMessage({ text: "Please enter a valid URL.", isError: true });
      return;
    }

    setIsLoading(true);
    setMessage({ text: "Starting download...", isError: false });

    try {
      let offset = 0;
      const BATCH_SIZE = 100;

      let allChapters: any[] = [];
      let meta: any = null;

      while (true) {
        setMessage({
          text: `Downloading chapters ${offset} → ${offset + BATCH_SIZE}...`,
          isError: false,
        });

        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, offset }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to import novel.");
        }

        // Save metadata once
        if (!meta) {
          meta = data;
        }

        const chapters = data.chapters || [];

        if (chapters.length === 0) break;

        allChapters.push(...chapters);

        console.log("Collected:", allChapters.length);

        // Stop when last batch
        if (chapters.length < BATCH_SIZE) break;

        offset += BATCH_SIZE;
      }

      // 🔥 MAP CHAPTERS
      const mappedChapters = allChapters.map((ch: any, index: number) => ({
        id: ch.id ?? String(index + 1),
        order: index + 1,
        title: ch.title,
        content: Array.isArray(ch.content)
          ? ch.content
          : ch.content
              .split(/\n+/)
              .map((l: string) => l.trim())
              .filter(Boolean),
      }));

      const novel = {
        id: crypto.randomUUID(),
        title: meta.title,
        author: meta.author || "Unknown",
        image: meta.image || "",
        alternative: meta.alternative || "",
        genre: meta.genre || "",
        status: meta.status || "",
        rating: meta.rating || "",
        description: meta.description || "",
        chapters: mappedChapters,
      };

      await addNovel(novel);

      setMessage({
        text: `✅ Imported ${mappedChapters.length} chapters successfully!`,
        isError: false,
      });

      setUrl("");

      setTimeout(() => {
        window.location.reload();
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
    <div className="flex w-full flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 sm:p-5 shadow-none transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-black/30">
      <div>
        <h3 className="font-heading text-xl text-foreground">Import from URL</h3>
        <p className="mt-1 text-sm text-muted">
          Paste a NovelFull URL below to download it into your local library.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row mt-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://novelfull.net/..."
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 disabled:opacity-50"
          disabled={isLoading}
        />

        <Button
          onClick={handleImport}
          disabled={isLoading}
          aria-busy={isLoading}
          className="py-3 px-6 h-auto text-base"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Downloading...
            </span>
          ) : (
            "Download"
          )}
        </Button>
      </div>

      {message && (
        <p
          className={`mt-1 text-sm ${
            message.isError ? "text-rose-400" : "text-emerald-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}