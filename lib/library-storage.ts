import type {
  Novel,
  UploadedLibraryState,
  UploadedNovelRecord,
  UploadedNovelSaveResult,
} from "@/types";

import { getLibraryNovels } from "@/lib/db";
import { parseTxtNovel } from "@/lib/parser";
import { persistNovelToSupabase } from "@/lib/supabase-service";
import { isBrowser, normalizeNovelTitle } from "@/lib/utils";

const STORAGE_KEY = "krvt-library-uploaded-novels";
const STORAGE_EVENT = "krvt-library-uploaded-novels-change";

const defaultState: UploadedLibraryState = {
  novels: [],
};

let cachedState: UploadedLibraryState = defaultState;
let cachedStorageValue: string | null = null;

export function getUploadedLibraryState(): UploadedLibraryState {
  if (!isBrowser()) {
    return defaultState;
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === cachedStorageValue) {
    return cachedState;
  }

  cachedStorageValue = storedValue;
  cachedState = normalizeUploadedLibraryState(storedValue);

  return cachedState;
}

export function getServerUploadedLibraryState(): UploadedLibraryState {
  return defaultState;
}

export function subscribeToUploadedLibrary(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustomEvent);
  };
}

export function getUploadedNovels() {
  return getUploadedLibraryState().novels;
}

export function getUploadedNovelById(id: string) {
  return getUploadedNovels().find((entry) => entry.novel.id === id)?.novel;
}

export async function saveUploadedNovelFromFile(file: File) {
  validateTxtFile(file);

  const rawText = await file.text();
  return saveUploadedNovelFromText(rawText, file.name);
}

export async function saveUploadedNovelFromText(rawText: string, sourceName = "Pasted Novel") {
  validateNovelText(rawText);

  const parsedNovel = parseTxtNovel(rawText);
  const parsedLocalNovel = buildNovelFromParsedText(parsedNovel, sourceName);
  const currentState = getUploadedLibraryState();

  if (
    novelAlreadyExists(
      parsedLocalNovel.title,
      currentState.novels.map((entry) => entry.novel),
    )
  ) {
    throw new Error("This novel already exists in your library");
  }

  let persistedNovel = parsedLocalNovel;
  let persistence: UploadedNovelSaveResult["persistence"] = "local";

  try {
    const supabaseNovelId = await persistNovelToSupabase(parsedLocalNovel);

    persistedNovel = {
      ...parsedLocalNovel,
      id: supabaseNovelId,
      chapters: parsedLocalNovel.chapters.map((chapter, index) => ({
        ...chapter,
        id: `${supabaseNovelId}-chapter-${index + 1}`,
      })),
    };
    persistence = "supabase";
  } catch {
    persistedNovel = parsedLocalNovel;
  }

  const nextRecord: UploadedNovelRecord = {
    fileName: sourceName,
    novel: persistedNovel,
    uploadedAt: new Date().toISOString(),
  };

  const nextState: UploadedLibraryState = {
    novels: [nextRecord, ...currentState.novels],
  };

  cachedState = nextState;
  cachedStorageValue = JSON.stringify(nextState);
  window.localStorage.setItem(STORAGE_KEY, cachedStorageValue);
  window.dispatchEvent(new Event(STORAGE_EVENT));

  return {
    record: nextRecord,
    persistence,
  } satisfies UploadedNovelSaveResult;
}

export function previewParsedNovelText(rawText: string, sourceName = "Pasted Novel") {
  validateNovelText(rawText);

  const parsedNovel = parseTxtNovel(rawText);
  const novel = buildNovelFromParsedText(parsedNovel, sourceName);
  const previewParagraphs = novel.chapters[0]?.content.slice(0, 3) ?? [];

  return {
    parsedNovel,
    novel,
    previewParagraphs,
  };
}

export function buildNovelFromParsedText(
  parsedNovel: ReturnType<typeof parseTxtNovel>,
  fileName: string,
): Novel {
  const fallbackTitle = cleanNovelTitle(fileName.replace(/\.txt$/i, "")) || "Untitled Novel";
  const novelTitle =
    cleanNovelTitle(parsedNovel.title) && parsedNovel.title !== "Untitled Novel"
      ? cleanNovelTitle(parsedNovel.title)
      : fallbackTitle;
  const baseId = createSlug(novelTitle);

  return {
    id: `uploaded-${baseId}`,
    title: novelTitle,
    author: "Uploaded TXT",
    chapters: parsedNovel.chapters.map((chapter, index) => ({
      id: `${baseId}-chapter-${index + 1}`,
      order: index + 1,
      title: chapter.title.trim() || `Chapter ${index + 1}`,
      content: splitParagraphs(chapter.content),
    })),
  };
}

function splitParagraphs(content: string) {
  const paragraphs = content
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\n+/g, " ").trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [content.trim()];
}

function validateTxtFile(file: File) {
  const isTxtFile =
    file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

  if (!isTxtFile) {
    throw new Error("Please upload a valid .txt file.");
  }
}

function validateNovelText(rawText: string) {
  const normalizedText = rawText.trim();

  if (!normalizedText) {
    throw new Error("Please paste some novel content.");
  }

  if (normalizedText.length < 200) {
    throw new Error("Please paste at least 200 characters of novel content.");
  }
}

function novelAlreadyExists(title: string, uploadedNovels: Novel[]) {
  const normalizedTitle = normalizeNovelTitle(title);
  const existingNovels = [...getLibraryNovels(), ...uploadedNovels];

  return existingNovels.some(
    (novel) => normalizeNovelTitle(novel.title) === normalizedTitle,
  );
}

function cleanNovelTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUploadedLibraryState(
  storedValue: string | null,
): UploadedLibraryState {
  if (!storedValue) {
    return defaultState;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<UploadedLibraryState>;

    return {
      novels: Array.isArray(parsedValue.novels) ? parsedValue.novels : defaultState.novels,
    };
  } catch {
    return defaultState;
  }
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
