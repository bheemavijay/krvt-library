export type Chapter = {
  id: string;
  order: number;
  title: string;
  content: string[];
};

export type ReaderFontFamily = "Times New Roman" | "Georgia" | "Iowan Old Style";

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
  sourceUrl: string;
  isCompleted: boolean;
  lastUpdated: string;
  image: string;
  alternative: string;
  genres: string[];
  status: string;
  rating?: number;
  tags: string[];
  description: string;
  chapters: Chapter[];
};

export type NovelSummary = Pick<
  Novel,
  "id" | "title" | "author" | "isCompleted" | "status" | "image" | "description"
> & {
  chapterCount: number;
};

export type NovelReadingProgress = {
  novelId: string;
  chapterIndex: number;
  fontSize: number;
  chapterScrollPositions?: Record<string, number>;
  updatedAt: string;
};

export type NovelBookmark = {
  chapterIndex: number;
  title: string;
  createdAt: string;
};

export type LibraryBookmarksState = Record<string, NovelBookmark[]>;

export type ReaderTheme = "dark" | "light" | "sepia";

export type ReaderLineHeight = 1.6 | 1.8 | 1.9 | 2;

export type TTSSettings = {
  voiceURI: string;
  rate: number;
  pitch: number;
};

export type LibraryReadingState = {
  fontFamily: ReaderFontFamily;
  fontSize: number;
  lineHeight: ReaderLineHeight;
  theme: ReaderTheme;

  lastOpenedNovelId: string | null;
  progressByNovel: Record<string, NovelReadingProgress>;

  tts: TTSSettings; // ✅ ADD THIS
};

export type AppAccentColor = "gold" | "purple" | "crimson";

export type AppThemeMode = "dark" | "black";

export type AppSettingsState = {
  accentColor: AppAccentColor;
  themeMode: AppThemeMode;
  fontFamily?: string;
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
  persistence: "local";
};
