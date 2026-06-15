"use client";

import { useMemo, useState } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import { Button } from "@/components/ui/button";
import { importNovel } from "@/lib/importer";
import { enableWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import {
  isSupportedImportUrl,
  normalizeImportUrl,
} from "@/lib/novels";

export function ImportBox() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<any>(null);

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

    const normalizedUrl = normalizeImportUrl(url);

    console.info("krvt.debug.frontend.import.start", {
      inputUrl: url,
      normalizedUrl,
      supported: isSupportedUrl,
    });

    setIsLoading(true);
    setMessage({ text: "Starting download...", isError: false });
    setDownloadProgress(null);
    await enableWakeLock();

    try {
      console.info("krvt.debug.frontend.import.invoke", {
        normalizedUrl,
      });

      await importNovel(normalizedUrl, {
        onProgress: setDownloadProgress,
        onMessage: setMessage,
      });

      console.info("krvt.debug.frontend.import.success", {
        normalizedUrl,
      });

      setMessage({
        text: `Imported successfully.`,
        isError: false,
      });
      
      setUrl("");

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error: any) {
      console.error("krvt.debug.frontend.import.error", {
        normalizedUrl,
        error: error?.message || error,
      });
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