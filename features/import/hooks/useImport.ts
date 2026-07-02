// TODO: [KRVT-ARCH-V2] This hook manages the UI state for the import process.

import { useState, useCallback } from "react";
import { importNovel } from "@/features/import/services/importService";
import type { ImportProgress, ImporterOptions } from "@/features/import/types";
import { enableWakeLock, releaseWakeLock } from "@/core/platform/wake-lock";

/**
 * Custom hook to manage the state and logic of importing a novel.
 */
export function useImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProgress = useCallback((progress: ImportProgress) => {
    setProgress(progress);
  }, []);

  const startImport = useCallback(
    async (novelId: string, options: ImporterOptions = {}) => {
      setIsImporting(true);
      setError(null);
      setProgress(null);
      await enableWakeLock();

      try {
        await importNovel(novelId, {
          ...options,
          onProgress: handleProgress,
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(errorMessage);
      } finally {
        setIsImporting(false);
        releaseWakeLock();
      }
    },
    [handleProgress]
  );

  const cancelImport = useCallback(() => {
    // TODO: Implement cancellation logic.
    // This would require changes in the core importer.
    setIsImporting(false);
    releaseWakeLock();
  }, []);

  return {
    isImporting,
    progress,
    error,
    startImport,
    cancelImport,
  };
}
