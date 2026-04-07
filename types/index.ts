export type Chapter = {
  id: string;
  order: number;
  title: string;
  content: string[];
};

export type ParsedChapter = {
  title: string;
  content: string;
};

export type ParsedNovel = {
  title: string;
  chapters: ParsedChapter[];
};

export type Novel = {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
};

export type NovelSummary = Pick<Novel, "id" | "title" | "author"> & {
  chapterCount: number;
};

export type NovelReadingProgress = {
  novelId: string;
  chapterIndex: number;
  fontSize: number;
  chapterScrollPositions?: Record<string, number>;
  updatedAt: string;
};

export type ReaderTheme = "dark" | "light" | "sepia";

export type ReaderLineHeight = 1.6 | 1.8 | 2;

export type LibraryReadingState = {
  fontSize: number;
  lineHeight: ReaderLineHeight;
  theme: ReaderTheme;
  lastOpenedNovelId: string | null;
  progressByNovel: Record<string, NovelReadingProgress>;
};

export type UploadedNovelRecord = {
  fileName: string;
  novel: Novel;
  uploadedAt: string;
};

export type UploadedLibraryState = {
  novels: UploadedNovelRecord[];
};

export type UploadedNovelSaveResult = {
  record: UploadedNovelRecord;
  persistence: "supabase" | "local";
};
