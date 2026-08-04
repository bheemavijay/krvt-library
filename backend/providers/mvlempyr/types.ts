export type ParsedChapter = {
  novelTitle: string;
  novelUrl: string;
  chapterTitle: string;
  paragraphs: string[];
};

export type RawNovelMetadata = {
  provider: "mvlempyr";
  sourceUrl: string;
  title: string;
  alternativeTitles: string[];
  author: string;
  description: string;
  coverUrl: string;
  status: string;
  labels: string[];
  rating: number;
  // Not available on this provider, but part of the standard
  artist?: string;
  ratingCount?: number;
  views?: number;
  bookmarks?: number;
  chapterCount?: number;
  firstChapterUrl?: string;
  lastChapterUrl?: string;
  language?: string;
  raw?: Record<string, any>;
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
