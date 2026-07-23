import { useCallback } from "react";
import { exportLibrary, importLibrary } from "@/features/backup/services/backupService";
import type { ExportLibraryOptions, ImportLibraryOptions } from "@/features/backup/services/backupService";

export function useBackup() {
  const exportBackup = useCallback((options: ExportLibraryOptions = {}) => {
    return exportLibrary(options);
  }, []);

  const importBackup = useCallback((file: File, options: ImportLibraryOptions = {}) => {
    return importLibrary(file, options);
  }, []);

  return {
    exportBackup,
    importBackup,
  };
}
