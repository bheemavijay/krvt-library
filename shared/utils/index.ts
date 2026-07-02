import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatChapterLabel(chapterCount: number) {
  return `${chapterCount} chapter${chapterCount === 1 ? "" : "s"}`;
}

export function clampChapterIndex(index: number, chapterCount: number) {
  return Math.min(Math.max(index, 0), chapterCount - 1);
}

export function getReadingProgress(currentChapter: number, totalChapters: number) {
  if (totalChapters <= 0) {
    return "0%";
  }

  const progress = Math.round((Math.min(currentChapter, totalChapters) / totalChapters) * 100);
  return `${progress}%`;
}

export function isBrowser() {
  return typeof window !== "undefined";
}

export function normalizeNovelTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
