"use client";

import { useMemo, useState, useEffect } from "react";

import { KrvtLoader } from "@/components/brand/krvt-loader";
import { Button } from "@/components/ui/button";
import { useImport } from "@/features/import/hooks/useImport";
import {
  isSupportedImportUrl,
  normalizeImportUrl,
} from "@/lib/novels";

export function ImportBox() {
  const [url, setUrl] = useState("");
  const { isImporting, progress, error, startImport } = useImport();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const isSupportedUrl = useMemo(() => isSupportedImportUrl(url), [url]);

  useEffect(() => {
    if (error) {
      setMessage({ text: error, isError: true });
    }
  }, [error]);

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
    setMessage({ text: "Starting download...", isError: false });
    await startImport(normalizedUrl);

    if (!error) {
      setMessage({
        text: `Imported successfully.`,
        isError: false,
      });
      
      setUrl("");

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
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
          disabled={isImporting}
        />

        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? "Downloading..." : "Download"}
        </Button>
      </div>

      {progress ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3 text-sm text-white/75">
            <span>
              Chapters
            </span>
            <span>
              {getImportPercent(progress)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#d4b16a] transition-[width] duration-300"
              style={{ width: `${getImportPercent(progress)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            {progress.totalChapters
              ? `${progress.downloadedChapters} of ${progress.totalChapters} chapters saved`
              : `${progress.downloadedChapters} chapters saved`}
          </p>
        </div>
      ) : null}

      {isImporting && !progress ? (
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
}) {
  if (!progress.totalChapters || progress.totalChapters <= 0) {
    return Math.min(95, Math.max(5, progress.downloadedChapters > 0 ? 55 : 8));
  }

  return Math.min(
    100,
    Math.max(1, Math.round((progress.downloadedChapters / progress.totalChapters) * 100)),
  );
}