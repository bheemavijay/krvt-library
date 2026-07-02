// TODO: [KRVT-ARCH-V2] These types define the contract for the import feature.

/**
 * Represents the progress of a novel import operation.
 * Used to update the UI.
 */
export type ImportProgress = {
  novelId: string;
  totalChapters: number;
  downloadedChapters: number;
  failedChapters: number;
  lastSuccessfulChapter: number;
  lastError: string | null;
  startTime: string;
  updatedTime: string;
};

/**
 * Configuration options for the import process.
 */
export type ImporterOptions = {
  maxFailures?: number;
  maxChapters?: number;
  skipMetadata?: boolean;
  onProgress?: (progress: ImportProgress) => void;
};
