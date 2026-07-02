// TODO: [KRVT-ARCH-V2] This is a temporary file for the new architecture.
// The contents of this file will replace the original types.ts.

export type ParsedChapter = {
  novelTitle: string;
  novelUrl: string;
  chapterTitle: string;
  paragraphs: string[];
};

export type NovelMetadata = {
  title: string;
  author: string;
  coverImage: string;
  description: string;
  genres: string[];
  tags: string[];
  status: "ongoing" | "completed" | "unknown";
  rating: number;
  alternativeTitles: string[];
};

export type Chapter = {
  id: string;
  order: number;
  title: string;
  content: string[];
};

export type KrvtNovel = {
  id: string;
  title: string;
  author: string;
  sourceUrl: string;
  isCompleted: boolean;
  lastUpdated: string;
  image: string;
  alternative: string;
  genres: string[];
  status: string;
  rating: number;
  tags: string[];
  description: string;
  chapters: Chapter[];
};

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

export type ImporterOptions = {
  maxFailures?: number;
  maxChapters?: number;
  skipMetadata?: boolean;
  onProgress?: (progress: ImportProgress) => void;
};
